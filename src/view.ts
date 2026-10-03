import { ItemView, WorkspaceLeaf, MarkdownRenderer, TFile, setIcon, Notice, Modal, Component, Menu } from 'obsidian';
import { replaceWithSafeHtml } from './core/security/safeDom';
import { PreviewSession } from './core/render/previewSession';
import { boundedCanvasRender, queueCanvasRender, shouldIgnoreExportElement } from './core/render/exportCanvas';
import { createWorkbenchControls } from './ui/workbenchControls';
import { observePreviewWorkspace, togglePreviewFocus, renderPreviewValidation } from './ui/previewWorkspace';
import { recipeOptions, recipeSummaryLabel } from './ui/recipeLabels';
import { bindAsyncEvent, runAction } from './ui/asyncActions';
import { MPConverter } from './converter';
import { CopyManager } from './copyManager';
import { TemplateManager } from './templateManager';

import type { SettingsManager, LayoutSnapshot } from './settings/settings';
import { BackgroundManager } from './backgroundManager';
import { ThemeGalleryModal } from './settings/ThemeGalleryModal';
import { createCustomSelect, type SelectOption, type CustomSelectControl } from './ui/CustomSelect';
import { handleImageAltEdit } from './ui/ImageAltModal';
import { applyArticleRecipe, resetArticleRecipe } from './core/recipe/articleRecipeFormatter';
import { normalizeArticleText } from './core/render/articleText';
import { prepareLegacyWechatFragment } from './core/render/legacyWechatPipeline';
import { resolveWechatAppearance, snapshotAppearance, appearanceConflictKey, type ResolvedWechatAppearance } from './core/theme/wechatAppearance';
import type { AppearancePreferences } from './core/theme/themeRevisionRegistry';
import { capturePreviewAnchor, restorePreviewAnchor } from './core/render/previewAnchor';
import { galleryExampleMarkdown } from './ui/themeGalleryPreview';
import type { ValidationReport } from './core/validation/wechatHtmlValidator';
// @ts-ignore - html2canvas has no type declarations
import html2canvas from 'html2canvas';
export const VIEW_TYPE_MP = 'yh-mp-preview';
const EXPORT_IMAGE_TIMEOUT_MS = 10_000;

export class MPView extends ItemView {
    private previewEl: HTMLElement;
    private currentFile: TFile | null = null;
    private updateTimer: number | null = null;
    private isPreviewLocked: boolean = false;
    private isEditMode: boolean = false;
    private isPhonePreview: boolean = false;
    private readonly session = new PreviewSession();
    private renderComponent: Component | null = null;
    private readonly exportController = new AbortController();
    private get trialTemplateId(): string | null { return this.session.trialTemplateId; }
    private set trialTemplateId(value: string | null) { this.session.trialTemplateId = value; }
    private lockButton: HTMLButtonElement;
    private editButton: HTMLButtonElement;
    private copyButton: HTMLButtonElement;
    private validationPanel: HTMLElement;
    private validationReport: ValidationReport | null = null;
    private templateManager: TemplateManager;
    private settingsManager: SettingsManager;

    // Updated to use the controller interface
    private customFontSelect: CustomSelectControl;
    private customBackgroundSelect: CustomSelectControl;
    private recipeSelect: CustomSelectControl;
    private recipeSummary: HTMLElement;

    private fontSizeSelect: HTMLInputElement;
    private backgroundManager: BackgroundManager;
    private gallery: ThemeGalleryModal | null = null;
    private galleryBaseline: HTMLElement | null = null;
    private galleryLastPaint = '';
    private galleryObserver: MutationObserver | null = null;
    private trialAppearance: ResolvedWechatAppearance | null = null;

    private getActiveWechatAppearance(): ResolvedWechatAppearance {
        return this.trialAppearance ?? resolveWechatAppearance(this.settingsManager.getSettings(), this.getActiveWechatTemplateId());
    }

    private getActiveWechatTemplateId(): string {
        return this.trialTemplateId || this.settingsManager.getSettings().templateId;
    }

    private updateRecipeSummary(recipeId: string): void {
        const active = recipeId !== 'legacy-compatible';
        this.recipeSummary.setText(recipeSummaryLabel(recipeId));
        this.recipeSummary.parentElement?.toggleClass('is-active', active);
    }

    private applyThemeTrial(templateId: string, revision?: string, preferences?: AppearancePreferences): void {
        const savedId = this.settingsManager.getSettings().templateId;
        this.trialTemplateId = templateId === savedId ? null : templateId;
        this.trialAppearance = resolveWechatAppearance(this.settingsManager.getSettings(),templateId,revision,preferences);
        const article = this.previewEl.querySelector<HTMLElement>('.mp-content-section');
        const anchor = article ? capturePreviewAnchor(this.previewEl, article) : null;
        if (this.galleryBaseline && article) article.replaceWith(this.galleryBaseline.cloneNode(true));
        this.applyPresentation(this.previewEl);
        const nextArticle = this.previewEl.querySelector<HTMLElement>('.mp-content-section');
        if (anchor && nextArticle) restorePreviewAnchor(this.previewEl, nextArticle, anchor);
        this.galleryLastPaint = nextArticle?.outerHTML ?? '';
        this.galleryObserver?.takeRecords();
        this.refreshValidationReport();
    }

    constructor(
        leaf: WorkspaceLeaf,
        templateManager: TemplateManager,
        settingsManager: SettingsManager
    ) {
        super(leaf);
        this.templateManager = new TemplateManager(this.app, settingsManager);
        this.settingsManager = settingsManager;
        this.backgroundManager = new BackgroundManager(this.settingsManager);
    }

    getViewType() {
        return VIEW_TYPE_MP;
    }

    async onClose(): Promise<void> {
        this.gallery?.invalidate(); this.galleryObserver?.disconnect(); this.galleryObserver = null;
        this.session.close(); this.exportController.abort();
        if(this.updateTimer) window.clearTimeout(this.updateTimer);
        this.renderComponent?.unload(); this.renderComponent=null;
    }

    private applyPresentation(host: HTMLElement, themeId = this.getActiveWechatTemplateId(), override?: ResolvedWechatAppearance, recipeId?: string): void {
        const section=host.querySelector<HTMLElement>('.mp-content-section');
        if(!section) return;
        resetArticleRecipe(section);
        const settings=this.settingsManager.getSettings();
        const appearance=override ?? (this.trialAppearance?.reference.id === themeId ? this.trialAppearance : resolveWechatAppearance(settings,themeId));
        this.templateManager.setCurrentTemplate(themeId);
        this.templateManager.setFont(settings.fontFamily);
        this.templateManager.setFontSize(settings.fontSize);
        this.templateManager.applyTemplate(host,appearance.template);
        this.backgroundManager.setBackground(settings.backgroundId);
        this.backgroundManager.applyBackground(host,appearance.template.reading,{family:settings.fontFamily,size:settings.fontSize});
        applyArticleRecipe(section,recipeId ?? settings.v3.selectedRecipeId,appearance.palette);
        normalizeArticleText(section);
    }

    getDisplayText() {
        return 'yh-mp-preview';
    }

    getIcon() {
        return 'eye';
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.classList.remove('view-content', 'mp-preview-focused', 'mp-compact-workspace');
        container.classList.add('mp-view-content');

        // 顶部工具栏
        const { toolbar, controlsGroup, secondaryRow, disclosure, header } = createWorkbenchControls(container);
        this.register(observePreviewWorkspace(container, disclosure));

        // Inject Header
        const headerBtn = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': '插入自定义头部', 'title': '插入头部' }
        });
        setIcon(headerBtn, 'arrow-down-to-line');
        headerBtn.addEventListener('click', () => this.toggleHeader());

        // Inject Footer
        const footerBtn = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': '插入自定义尾部', 'title': '插入尾部' }
        });
        setIcon(footerBtn, 'arrow-up-to-line');
        footerBtn.addEventListener('click', () => this.toggleFooter());

        // 刷新按钮
        const refreshButton = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': '刷新预览', 'title': '刷新预览' }
        });
        setIcon(refreshButton, 'refresh-cw');
        bindAsyncEvent(refreshButton,'click', async () => {
            if (await this.updatePreview()) new Notice('预览已刷新');
        });

        // Lock Button
        this.lockButton = secondaryRow.createEl('button', {
            cls: 'mp-lock-button mp-icon-btn',
            attr: { 'aria-label': '开启实时预览状态', 'title': '锁定预览' }
        });
        setIcon(this.lockButton, 'unlock');
        bindAsyncEvent(this.lockButton,'click', () => this.togglePreviewLock());

        // Edit Mode Button
        this.editButton = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': '编辑模式', 'title': '编辑预览内容' }
        });
        setIcon(this.editButton, 'pencil');
        this.editButton.addEventListener('click', () => this.toggleEditMode());

        const snapshotButton = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': '保存排版快照', title: '保存排版快照' },
        });
        setIcon(snapshotButton, 'save');
        bindAsyncEvent(snapshotButton,'click', () => this.saveCurrentSnapshot());

        const restoreButton = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': '恢复最近快照', title: '恢复最近快照' },
        });
        setIcon(restoreButton, 'history');
        bindAsyncEvent(restoreButton,'click', () => this.restoreLatestSnapshot());

        // SEO Hidden Text Button
        const seoButton = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': 'SEO 隐藏文字', 'title': '插入 SEO 隐藏关键词' }
        });
        setIcon(seoButton, 'search');
        seoButton.addEventListener('click', () => this.insertSeoText());

        // 帮助按钮
        const helpButton = secondaryRow.createEl('button', {
            cls: 'mp-help-button mp-icon-btn',
            attr: { 'aria-label': '使用指南' }
        });
        setIcon(helpButton, 'help');
        helpButton.setCssStyles({ position: 'relative' });
        // 帮助提示框
        secondaryRow.createDiv({
            cls: 'mp-help-tooltip',
            text: `使用指南：
                1. 打开主题画廊，按场景筛选
                2. 点选主题试用，再确认应用
                3. 调整字体和字号
                4. 点击【复制按钮】即可粘贴到公众号
                5. ✏️ 编辑模式可直接修改预览文字
                6. 🔍 SEO 按钮可插入隐藏关键词
                `
        });

        // 添加背景选择器
        // Fix: Removed duplicate 'No Background' option as it's included in getVisibleBackgrounds or handled by logic
        const backgroundOptions = [
            ...(this.settingsManager.getVisibleBackgrounds()?.map(bg => ({
                value: bg.id,
                label: bg.name
            })) || [])
        ];

        // Ensure "No Background" (none) is present if not in list, usually 'none' is a valid ID in manager
        // If backgroundManager returns 'none', we don't need to add it manually.
        // If we need a default empty option:
        if (!backgroundOptions.find(o => o.value === 'none')) {
            backgroundOptions.unshift({ value: 'none', label: '无背景' });
        }
        // If 'default' is needed
        if (!backgroundOptions.find(o => o.value === 'default')) {
            backgroundOptions.unshift({ value: 'default', label: '默认' });
        }


        const backgroundField = controlsGroup.createDiv('mp-toolbar-field mp-background-field');
        backgroundField.createSpan({ cls: 'mp-toolbar-label', text: '背景' });
        this.customBackgroundSelect = createCustomSelect(
            backgroundField,
            'mp-background-select',
            backgroundOptions,
            async (value) => {
                await this.settingsManager.updateSettings({
                    backgroundId: value
                });
                this.applyPresentation(this.previewEl);
            }
        );

        // 场景筛选由主题画廊负责，不再计算已退出界面的旧系列选择器。
        const galleryBtn = controlsGroup.createEl('button', {
            cls: 'mp-gallery-btn',
            attr: { 'aria-label': '打开主题画廊', 'title': '主题画廊' }
        });
        setIcon(galleryBtn, 'palette');
        galleryBtn.addEventListener('click', () => this.openThemeGallery());
        controlsGroup.prepend(galleryBtn);

        // 字体选择器
        const fontField = controlsGroup.createDiv('mp-toolbar-field mp-font-field');
        fontField.createSpan({ cls: 'mp-toolbar-label', text: '字体' });
        this.customFontSelect = createCustomSelect(
            fontField,
            'mp-font-select',
            this.getFontOptions(),
            async (value) => {
                await this.settingsManager.updateSettings({
                    fontFamily: value
                });
                this.templateManager.setFont(value);
                this.applyPresentation(this.previewEl);
            }
        );

        // 字号调整
        const sizeField = controlsGroup.createDiv('mp-toolbar-field mp-size-field');
        sizeField.createSpan({ cls: 'mp-toolbar-label', text: '字号' });
        const fontSizeGroup = sizeField.createDiv({ cls: 'mp-font-size-group' });
        const decreaseButton = fontSizeGroup.createEl('button', {
            cls: 'mp-font-size-btn',
            text: '-', attr:{'aria-label':'减小字号',type:'button'}
        });
        this.fontSizeSelect = fontSizeGroup.createEl('input', {
            cls: 'mp-font-size-input',
            type: 'text',
            value: '16',
            attr: {
                style: 'border: none; outline: none; background: transparent;'
                , 'aria-label':'正文字号（12 至 30）', inputmode:'numeric'
            }
        });
        const increaseButton = fontSizeGroup.createEl('button', {
            cls: 'mp-font-size-btn',
            text: '+', attr:{'aria-label':'增大字号',type:'button'}
        });



        // 恢复设置状态
        const settings = this.settingsManager.getSettings();

        const advanced = toolbar.createEl('details', { cls: 'mp-advanced-typesetting' });
        this.recipeSummary = advanced.createEl('summary');
        advanced.createEl('h3', { cls: 'mp-tools-heading', text: '文章操作' });
        advanced.appendChild(secondaryRow);
        const enhancement = advanced.createDiv('mp-enhancement-group');
        const enhancementHeader = enhancement.createDiv('mp-tools-section-header');
        enhancementHeader.createEl('h3', { cls: 'mp-tools-heading', text: '局部排版增强' });
        const enhancementHelp = enhancementHeader.createEl('details', { cls: 'mp-enhancement-help' });
        enhancementHelp.createEl('summary', { text: '说明' });
        enhancementHelp.createEl('p', {
            cls: 'mp-advanced-hint',
            text: '主题决定整体视觉，这里只强化局部结构。选择“不额外增强”则仅使用主题；所有选项都不修改 Markdown 原文。',
        });
        const recipeField = enhancement.createDiv('mp-toolbar-field mp-recipe-field');
        recipeField.createSpan({ cls: 'mp-toolbar-label', text: '效果' });
        this.recipeSelect = createCustomSelect(
            recipeField,
            'mp-recipe-select',
            recipeOptions,
            async (value) => {
                await this.settingsManager.updateSettings({
                    v3: {
                        ...this.settingsManager.getSettings().v3,
                        selectedRecipeId: value,
                    },
                });
                this.updateRecipeSummary(value);
                this.applyPresentation(this.previewEl);
                this.refreshValidationReport();
            },
        );
        this.recipeSelect.setValue(settings.v3.selectedRecipeId);
        this.updateRecipeSummary(settings.v3.selectedRecipeId);

        // 恢复背景
        if (settings.backgroundId) {
            this.customBackgroundSelect.setValue(settings.backgroundId);
            this.backgroundManager.setBackground(settings.backgroundId);
        }

        // 恢复主题和系列
        if (settings.templateId) {
            this.templateManager.setCurrentTemplate(settings.templateId);
        }

        // 恢复字体
        if (settings.fontFamily) {
            this.customFontSelect.setValue(settings.fontFamily);
            this.templateManager.setFont(settings.fontFamily);
        }

        if (settings.fontSize) {
            this.fontSizeSelect.value = settings.fontSize.toString();
            this.templateManager.setFontSize(settings.fontSize);
        }

        // 更新字号调整事件
        const updateFontSize = async () => {
            const parsed = Number(this.fontSizeSelect.value);
            const size = Number.isFinite(parsed) ? Math.max(12,Math.min(30,Math.round(parsed))) : this.settingsManager.getSettings().fontSize;
            await this.settingsManager.updateSettings({
                fontSize: size
            });
            this.fontSizeSelect.value=String(size);
            this.applyPresentation(this.previewEl);
        };

        // 字号调整按钮事件
        decreaseButton.addEventListener('click', () => {
            const currentSize = parseInt(this.fontSizeSelect.value);
            if (currentSize > 12) {
                this.fontSizeSelect.value = (currentSize - 1).toString();
                runAction(updateFontSize);
            }
        });

        increaseButton.addEventListener('click', () => {
            const currentSize = parseInt(this.fontSizeSelect.value);
            if (currentSize < 30) {
                this.fontSizeSelect.value = (currentSize + 1).toString();
                runAction(updateFontSize);
            }
        });

        bindAsyncEvent(this.fontSizeSelect,'change', updateFontSize);
        // Preview width controls belong to the preview, not the article styling toolbar.
        const previewWidthBar = header.createDiv('mp-preview-width-bar');
        previewWidthBar.setAttribute('aria-label', '预览视图控制');
        const widthChoices = previewWidthBar.createDiv('mp-preview-width-choices');
        const adaptiveButton = widthChoices.createEl('button', {
            text: '自适应',
            attr: { type: 'button', 'aria-pressed': 'true' },
        });
        const phoneButton = widthChoices.createEl('button', {
            text: '手机 375px',
            attr: { type: 'button', 'aria-pressed': 'false' },
        });
        const widthHint = previewWidthBar.createSpan({
            cls: 'mp-preview-width-hint',
            text: '仅影响预览，不影响复制与导出',
        });
        const focusButton = previewWidthBar.createEl('button', {
            cls: 'mp-focus-button mp-icon-btn',
            attr: { type: 'button', 'aria-label': '专注预览', 'aria-pressed': 'false', title: '专注预览，收起辅助区域' },
        });
        setIcon(focusButton, 'maximize');
        focusButton.addEventListener('click', () => {
            setIcon(focusButton, togglePreviewFocus(container, focusButton) ? 'minimize' : 'maximize');
        });
        widthChoices.title = '仅影响预览，不影响复制与导出';
        this.previewEl = container.createDiv({ cls: 'mp-preview-area' });
        const setPreviewWidth = (phone: boolean) => {
            this.isPhonePreview = phone;
            this.previewEl.toggleClass('mp-phone-preview', phone);
            adaptiveButton.setAttribute('aria-pressed', String(!phone));
            phoneButton.setAttribute('aria-pressed', String(phone));
        };
        const refreshWidthAvailability = () => {
            const style = window.getComputedStyle(this.previewEl);
            const available = this.previewEl.clientWidth
                - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0');
            const narrow = available <= 375;
            phoneButton.disabled = narrow;
            phoneButton.title = narrow ? '当前预览区域已不宽于 375px，拉宽面板后可比较手机效果' : '以 375px 检查手机排版';
            widthHint.setText(narrow ? '当前面板已是手机宽度' : '仅影响预览，不影响复制与导出');
        };
        adaptiveButton.addEventListener('click', () => setPreviewWidth(false));
        phoneButton.addEventListener('click', () => setPreviewWidth(true));
        const widthObserver = new ResizeObserver(refreshWidthAvailability);
        widthObserver.observe(this.previewEl);
        this.register(() => widthObserver.disconnect());
        refreshWidthAvailability();
        this.validationPanel = container.createEl('section', { cls: 'mp-validation-panel' });

        // 点击图片 → 编辑 Alt Text
        bindAsyncEvent(this.previewEl,'click', async (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName.toLowerCase() === 'img') {
                e.stopPropagation();
                if (!this.currentFile) return;
                await handleImageAltEdit(this.app, this.currentFile, target as HTMLImageElement);
            }
        });


        // 底部工具栏
        const bottomBar = container.createDiv({ cls: 'mp-bottom-bar' });

        // === 主要操作（复制 + 导出） ===
        const primaryRow = bottomBar.createDiv({ cls: 'mp-controls-group mp-primary-row' });

        // 复制按钮
        this.copyButton = primaryRow.createEl('button', {
            text: 'Pub 复制',
            cls: 'mp-copy-button',
        });

        const exportButton = primaryRow.createEl('button', {
            text: '导出…', cls: 'mp-export-button',
            attr: { type: 'button', 'aria-label': '导出文章', 'aria-haspopup': 'menu' },
        });
        exportButton.addEventListener('click', (event) => {
            const menu = new Menu();
            menu.addItem(item => item.setTitle('导出长图').setIcon('image').onClick(() => runAction(() => this.exportLongImage(exportButton))));
            menu.addItem(item => item.setTitle('导出 HTML').setIcon('file-code').onClick(() => runAction(() => this.exportHtmlFragment(exportButton))));
            menu.addItem(item => item.setTitle('导出分段图').setIcon('images').onClick(() => runAction(() => this.exportSegmentedImages(exportButton))));
            if (event.detail === 0) {
                const bounds = exportButton.getBoundingClientRect();
                menu.showAtPosition({ x: bounds.left, y: bounds.top });
            } else menu.showAtMouseEvent(event);
        });

        bindAsyncEvent(this.copyButton,'click', async () => {
            if (this.previewEl) {
                const validation = this.refreshValidationReport();
                if (validation?.errors) {
                    new Notice(`发现 ${validation.errors} 项阻断问题，请先在“检查”区域处理`);
                    return;
                }
                this.copyButton.disabled = true;
                this.copyButton.setText('复制中...');

                try {
                    const copySettings = this.settingsManager.getSettings();
                    const themeId = this.getActiveWechatTemplateId();
                    const validation = await CopyManager.copyToClipboard(this.previewEl, {
                        themeId,
                        recipeId: copySettings.v3.selectedRecipeId,
                        palette: this.getActiveWechatAppearance().palette,
                    }, {signal:this.exportController.signal});
                    this.copyButton.setText(validation.warnings > 0
                        ? `复制成功（${validation.warnings} 项兼容性提示）`
                        : '复制成功');

                    window.setTimeout(() => {
                        this.copyButton.disabled = false;
                        this.copyButton.setText('Pub 复制'); // Fixed: Consistent text reset
                    }, 2000);
                } catch (error: unknown) {
                    this.copyButton.setText('复制失败');
                    window.setTimeout(() => {
                        this.copyButton.disabled = false;
                        this.copyButton.setText('Pub 复制'); // Fixed: Consistent text reset
                    }, 2000);
                }
            }
        });

        // 监听文档变化
        this.registerEvent(
            this.app.workspace.on('file-open', file => { runAction(() => this.onFileOpen(file)); })
        );

        // 监听文档内容变化
        this.registerEvent(
            this.app.vault.on('modify', file => { if (file instanceof TFile) this.onFileModify(file); })
        );

        // 检查当前打开的文件
        const currentFile = this.app.workspace.getActiveFile();
        await this.onFileOpen(currentFile);
    }

    private updateControlsState(enabled: boolean) {
        this.lockButton.disabled = !enabled;

        // 更新所有自定义选择器
        [this.customFontSelect, this.customBackgroundSelect].forEach(ctrl => {
            if (ctrl && ctrl.container) {
                const selectEl = ctrl.container.querySelector<HTMLSelectElement>('select.custom-select');
                if (selectEl) {
                    selectEl.classList.toggle('disabled', !enabled);
                    selectEl.disabled = !enabled;
                }
            }
        });

        this.fontSizeSelect.disabled = !enabled;
        this.copyButton.disabled = !enabled || (this.validationReport?.errors || 0) > 0;

        const fontSizeButtons = this.containerEl.querySelectorAll('.mp-font-size-btn');
        fontSizeButtons.forEach(button => {
            (button as HTMLButtonElement).disabled = !enabled;
        });

    }

    private refreshValidationReport(): ValidationReport | null {
        const contentSection = this.previewEl?.querySelector<HTMLElement>('.mp-content-section');
        if (!contentSection) {
            this.validationReport = null;
            this.renderValidationReport();
            return null;
        }

        const settings = this.settingsManager.getSettings();
        const themeId = this.getActiveWechatTemplateId();
        this.validationReport = prepareLegacyWechatFragment(contentSection, {
            themeId,
            recipeId: settings.v3.selectedRecipeId,
            palette: this.getActiveWechatAppearance().palette,
        }).validation;
        this.renderValidationReport();
        this.copyButton.disabled = this.validationReport.errors > 0;
        return this.validationReport;
    }

    private renderValidationReport(): void {
        renderPreviewValidation(this.validationPanel, this.validationReport);
    }

    private async saveCurrentSnapshot(): Promise<void> {
        if (this.gallery || this.trialTemplateId) { new Notice('请先在画廊确认应用主题，再保存快照。'); return; }
        if (!this.currentFile) {
            new Notice('请先打开一篇 Markdown 笔记');
            return;
        }
        const file = this.currentFile;
        const content = await this.app.vault.cachedRead(file);
        if (this.currentFile?.path !== file.path) throw new Error('文章已切换，请重新保存快照');
        const settings = this.settingsManager.getSettings();
        const validation = this.refreshValidationReport() || { errors: 0, warnings: 0 };
        const snapshot: LayoutSnapshot = {
            appearance: snapshotAppearance(settings),
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            filePath: file.path,
            contentHash: this.hashText(content),
            templateId: settings.templateId,
            backgroundId: settings.backgroundId,
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            recipeId: settings.v3.selectedRecipeId,
            validation: { errors: validation.errors, warnings: validation.warnings },
        };
        await this.settingsManager.saveLayoutSnapshot(snapshot);
        new Notice('已保存排版快照');
    }

    private async restoreLatestSnapshot(): Promise<void> {
        this.gallery?.invalidate();
        const snapshot = this.settingsManager.getSettings().layoutSnapshots[0];
        if (!snapshot) {
            new Notice('尚无可恢复的排版快照');
            return;
        }
        await this.settingsManager.restoreLayoutSnapshot(snapshot);
        this.customFontSelect.setValue(snapshot.fontFamily);
        this.customBackgroundSelect.setValue(snapshot.backgroundId);
        this.fontSizeSelect.value = String(snapshot.fontSize);
        this.recipeSelect.setValue(snapshot.recipeId);
        this.updateRecipeSummary(snapshot.recipeId);
        await this.updatePreview();
        new Notice(`已恢复 ${new Date(snapshot.createdAt).toLocaleString()} 的排版快照`);
    }

    private hashText(value: string): string {
        let hash = 5381;
        for (let index = 0; index < value.length; index += 1) {
            hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
        }
        return (hash >>> 0).toString(16);
    }

    /**
     * Creates an unconstrained copy of the article. The live preview is a
     * scroll container, so capturing it directly only includes its viewport.
     */
    private async createExportSnapshot(): Promise<{
        element: HTMLElement;
        width: number;
        height: number;
        cleanup: () => void;
    }> {
        const content = this.previewEl.querySelector<HTMLElement>('.mp-content-section');
        if (!content) throw new Error('Preview content is not available');

        // The phone-width switch is viewport-only. Export at the adaptive width
        // that this pane would use without the switch.
        const exportDocument = this.previewEl.ownerDocument;
        const exportWindow = exportDocument.defaultView;
        if (!exportWindow) throw new Error('预览窗口已关闭');
        const previewStyle = exportWindow.getComputedStyle(this.previewEl);
        const width = Math.max(1, Math.ceil(this.previewEl.clientWidth
            - parseFloat(previewStyle.paddingLeft || '0')
            - parseFloat(previewStyle.paddingRight || '0')));
        const snapshotHost = exportDocument.createElement('div');
        snapshotHost.className = 'mp-preview-area mp-export-snapshot';
        snapshotHost.setCssStyles({ cssText: [
            'position: fixed',
            'left: -100000px',
            'top: 0',
            `width: ${width}px`,
            'height: auto',
            'min-height: 0',
            'margin: 0',
            'padding: 0',
            'overflow: visible',
            'background: #ffffff',
            'border: 0',
            'box-shadow: none',
            'pointer-events: none',
        ].join(';') });

        const cleanup = () => snapshotHost.remove();
        try {
            const snapshot = (await CopyManager.prepareForExport(content, {
                themeId:this.getActiveWechatTemplateId(), recipeId:this.settingsManager.getSettings().v3.selectedRecipeId,
                palette:this.getActiveWechatAppearance().palette,
            },{signal:this.exportController.signal})).root;
            const computed = exportWindow.getComputedStyle(content);
            snapshot.setCssStyles({ cssText: snapshot.style.cssText + (`;${[
                `width: ${width}px`,
                'max-width: none',
                'height: auto',
                'max-height: none',
                'min-height: 0',
                'overflow: visible',
                'box-sizing: border-box',
                `font-family: ${computed.fontFamily}`,
                `font-size: ${computed.fontSize}`,
                `line-height: ${computed.lineHeight}`,
                `color: ${computed.color}`,
                ...(this.getActiveWechatAppearance().template.reading ? [] : ['background: #ffffff']),
            ].join(';')};`) });
            snapshotHost.appendChild(snapshot);
            exportDocument.body.appendChild(snapshotHost);

            const imageResults = await Promise.all(Array.from(snapshot.querySelectorAll('img')).map((image) => this.waitForExportImage(image)));
            const failedImages = imageResults.filter((loaded) => !loaded).length;
            if (failedImages > 0) {
                throw new Error(`${failedImages} 张图片未能在 ${EXPORT_IMAGE_TIMEOUT_MS / 1000} 秒内加载`);
            }

            return {
                element: snapshot,
                width,
                height: Math.max(1, Math.ceil(snapshot.scrollHeight)),
                cleanup,
            };
        } catch (error) {
            cleanup();
            throw error;
        }
    }

    private waitForExportImage(image: HTMLImageElement): Promise<boolean> {
        const signal = this.exportController.signal;
        if (signal.aborted) return Promise.resolve(false);
        if (image.complete) return Promise.resolve(image.naturalWidth > 0);
        return new Promise((resolve) => {
            let settled = false;
            const finish = (loaded: boolean) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                image.removeEventListener('load', onLoad);
                image.removeEventListener('error', onError);
                signal.removeEventListener('abort', onAbort);
                resolve(loaded);
            };
            const onLoad = () => finish(image.naturalWidth > 0);
            const onError = () => finish(false);
            const onAbort = () => finish(false);
            const timeoutId = window.setTimeout(() => finish(false), EXPORT_IMAGE_TIMEOUT_MS);
            image.addEventListener('load', onLoad, { once: true });
            image.addEventListener('error', onError, { once: true });
            signal.addEventListener('abort', onAbort, { once: true });
        });
    }

    private async renderExportCanvas(
        element: HTMLElement,
        width: number,
        height: number,
        scale: number,
        y = 0,
    ): Promise<HTMLCanvasElement> {
        // @ts-ignore html2canvas has no bundled TypeScript declarations.
        this.exportController.signal.throwIfAborted();
        const owner = element.ownerDocument.defaultView;
        if (!owner) throw new Error('导出窗口已关闭');
        return queueCanvasRender(element.ownerDocument, async () => {
        const previousFrames = new Set(Array.from(element.ownerDocument.querySelectorAll('.html2canvas-container')));
        try {
        const canvas = await boundedCanvasRender(owner, this.exportController.signal, () => html2canvas(element, {
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            scale,
            x: 0,
            y,
            width,
            height,
            windowWidth: width,
            windowHeight: height,
            scrollX: 0,
            scrollY: 0,
            ignoreElements: (candidate: Element) => shouldIgnoreExportElement(candidate, element),
        }));
        this.exportController.signal.throwIfAborted();
        return canvas;
        } finally {
            element.ownerDocument.querySelectorAll('.html2canvas-container').forEach(frame => { if (!previousFrames.has(frame)) frame.remove(); });
        }
        });
    }

    private async exportLongImage(button: HTMLButtonElement): Promise<void> {
        const originalText = button.textContent || '导出长图';
        button.disabled = true;
        button.setText('生成中...');
        let cleanup: (() => void) | undefined;
        try {
            const snapshot = await this.createExportSnapshot();
            cleanup = snapshot.cleanup;
            // Keep the full article in one image while staying below practical
            // Chromium canvas limits on unusually long notes.
            const maxDimension = 16384;
            const maxPixels = 64_000_000;
            const scale = Math.min(
                2,
                maxDimension / snapshot.width,
                maxDimension / snapshot.height,
                Math.sqrt(maxPixels / (snapshot.width * snapshot.height)),
            );
            if (!Number.isFinite(scale) || scale < 0.01) {
                throw new Error('文章过长，无法生成单张长图，请改用“导出分段图”');
            }
            const canvas = await this.renderExportCanvas(snapshot.element, snapshot.width, snapshot.height, scale);
            const link = createEl('a');
            link.download = `yh-mp-preview-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            if (scale < 2) new Notice('文章较长，已自动降低长图分辨率以完整导出；可使用“导出分段图”获得高清切片。');
            button.setText('导出成功');
        } catch (error) {
            const message = error instanceof Error ? error.message : '未知错误';
            console.error('导出长图失败:', error);
            new Notice(`长图导出失败：${message}`);
            button.setText('导出失败');
        } finally {
            cleanup?.();
            window.setTimeout(() => {
                button.disabled = false;
                button.setText(originalText);
            }, 2000);
        }
    }

    private async exportHtmlFragment(button: HTMLButtonElement): Promise<void> {
        const contentSection = this.previewEl.querySelector<HTMLElement>('.mp-content-section');
        if (!contentSection) return;
        const originalText = button.textContent || '导出 HTML';
        button.disabled = true;
        try {
            const settings = this.settingsManager.getSettings();
            const themeId = this.getActiveWechatTemplateId();
            const prepared = await CopyManager.prepareForExport(contentSection, {
                themeId,
                recipeId: settings.v3.selectedRecipeId,
                palette: this.getActiveWechatAppearance().palette,
            },{signal:this.exportController.signal});
            if (prepared.validation.errors > 0) {
                new Notice(`存在 ${prepared.validation.errors} 项阻断问题，无法导出 HTML`);
                return;
            }
            const blob = new Blob([prepared.html], { type: 'text/html;charset=utf-8' });
            this.exportController.signal.throwIfAborted();
            const url = URL.createObjectURL(blob);
            const link = createEl('a');
            link.href = url;
            link.download = `yh-mp-preview-${Date.now()}.html`;
            link.click();
            window.setTimeout(() => URL.revokeObjectURL(url),1000);
            new Notice('已导出 HTML 片段');
        } catch(error) {
            new Notice(`HTML 导出失败：${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            button.disabled = false;
            button.setText(originalText);
        }
    }

    private async exportSegmentedImages(button: HTMLButtonElement): Promise<void> {
        const originalText = button.textContent || '导出分段图';
        button.disabled = true;
        button.setText('生成中...');
        let cleanup: (() => void) | undefined;
        let completed = 0;
        try {
            const snapshot = await this.createExportSnapshot();
            cleanup = snapshot.cleanup;
            // Render each slice directly from the full article snapshot. This
            // avoids both viewport cropping and a single oversized canvas.
            const segmentHeight = Math.max(1, Math.round(snapshot.width * 4 / 3));
            const total = Math.ceil(snapshot.height / segmentHeight);
            const exportedAt = Date.now();
            for (let index = 0; index < total; index += 1) {
                const sourceY = index * segmentHeight;
                const height = Math.min(segmentHeight, snapshot.height - sourceY);
                button.setText(`生成中 ${index + 1}/${total}...`);
                const segment = await this.renderExportCanvas(
                    snapshot.element,
                    snapshot.width,
                    height,
                    2,
                    sourceY,
                );
                const link = createEl('a');
                link.download = `yh-mp-preview-${exportedAt}-${index + 1}.png`;
                link.href = segment.toDataURL('image/png');
                link.click();
                completed += 1;
            }
            new Notice(`已导出 ${total} 张 1:1.33 分段图`);
        } catch (error) {
            const message = error instanceof Error ? error.message : '未知错误';
            console.error('分段图导出失败', error);
            new Notice(`分段图导出失败：${message}${completed > 0 ? `（已完成 ${completed} 张）` : ''}`);
        } finally {
            cleanup?.();
            button.disabled = false;
            button.setText(originalText);
        }
    }

    async onFileOpen(file: TFile | null) {
        this.gallery?.invalidate();
        this.session.invalidate();
        this.previewEl.removeAttribute('aria-busy');
        if (this.currentFile?.path !== file?.path) {
            this.isEditMode = false;
            this.previewEl.contentEditable = 'false';
            this.previewEl.classList.remove('mp-edit-mode');
            setIcon(this.editButton, 'pencil');
            this.editButton.setAttribute('title', '编辑预览文字');
            this.renderComponent?.unload(); this.renderComponent = null;
            this.previewEl.empty();
        }
        if(this.currentFile?.path !== file?.path) { this.session.headerEnabled=false;this.session.footerEnabled=false; }
        this.currentFile = file;
        if (!file || file.extension !== 'md') {
            this.previewEl.empty();
            this.previewEl.createDiv({
                text: '只能预览 markdown 文本文档',
                cls: 'mp-empty-message'
            });
            this.validationReport = null;
            this.renderValidationReport();
            this.updateControlsState(false);
            return;
        }

        this.updateControlsState(true);
        this.setPreviewLocked(false);
        await this.updatePreview();
    }

    private setPreviewLocked(pause: boolean): void {
        this.isPreviewLocked = pause;
        setIcon(this.lockButton, pause ? 'lock' : 'unlock');
        this.lockButton.setAttribute('aria-pressed', String(pause));
        const label = pause ? '已暂停实时预览，点击恢复' : '实时预览中，点击暂停';
        this.lockButton.setAttribute('aria-label', label);
        this.lockButton.setAttribute('title', label);
    }

    private async togglePreviewLock() {
        const pause = !this.isPreviewLocked;
        this.setPreviewLocked(pause);
        if (pause) return;
        await this.updatePreview();
    }

    private toggleEditMode() {
        this.gallery?.invalidate();
        this.isEditMode = !this.isEditMode;

        if (this.isEditMode) {
            // 进入编辑模式
            this.previewEl.contentEditable = 'true';
            this.previewEl.classList.add('mp-edit-mode');
            setIcon(this.editButton, 'pencil-off');
            this.editButton.setAttribute('title', '退出编辑模式');

            // 自动锁定预览（防止编辑内容被刷新覆盖）
            if (!this.isPreviewLocked) {
                this.setPreviewLocked(true);
            }

            new Notice('已进入编辑模式 — 修改仅影响复制内容');
        } else {
            // 退出编辑模式
            this.previewEl.contentEditable = 'false';
            this.previewEl.classList.remove('mp-edit-mode');
            setIcon(this.editButton, 'pencil');
            this.editButton.setAttribute('title', '编辑预览内容');

            new Notice('已退出编辑模式');
        }
    }

    private insertSeoText() {
        // 使用 Obsidian Modal 替代 window.prompt
        const modal = new class extends Modal {
            result: string = '';
            view: MPView;

            constructor(view: MPView) {
                super(view.app);
                this.view = view;
            }

            onOpen() {
                const { contentEl } = this;
                contentEl.createEl('h3', { text: '🔍 插入 SEO 隐藏关键词' });
                contentEl.createEl('p', {
                    text: '输入的文字复制到公众号后不可见，但可被搜索引擎索引。',
                    attr: { style: 'color: #888; font-size: 13px; margin-bottom: 12px;' }
                });

                const textarea = contentEl.createEl('textarea', {
                    attr: {
                        placeholder: '输入 SEO 关键词，多个关键词用空格分隔...',
                        rows: '3',
                        style: 'width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--background-modifier-border); font-size: 14px; resize: vertical;'
                    }
                });
                textarea.focus();

                const btnContainer = contentEl.createDiv({
                    attr: { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;' }
                });

                const cancelBtn = btnContainer.createEl('button', { text: '取消' });
                cancelBtn.addEventListener('click', () => this.close());

                const submitBtn = btnContainer.createEl('button', {
                    text: '插入',
                    attr: { style: 'background: var(--text-accent); color: var(--text-on-accent); border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer;' }
                });
                submitBtn.addEventListener('click', () => {
                    this.result = textarea.value;
                    this.close();
                });

                // Enter 键提交
                textarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.result = textarea.value;
                        this.close();
                    }
                });
            }

            onClose() {
                if (this.result.trim()) {
                    this.view.applySeoText(this.result.trim());
                }
            }
        }(this);

        modal.open();
    }

    public applySeoText(seoText: string) {
        // 查找现有 SEO 块并更新，或创建新的
        let seoSection = this.previewEl.querySelector('.mp-seo-hidden') as HTMLElement;

        if (seoSection) {
            // 追加内容
            seoSection.textContent = (seoSection.textContent || '') + ' ' + seoText;
        } else {
            // 创建新的 SEO 隐藏块
            seoSection = createEl('section');
            seoSection.className = 'mp-seo-hidden';
            seoSection.setCssStyles({ cssText: 'font-size: 0; color: transparent; line-height: 0; height: 0; overflow: hidden; opacity: 0; position: absolute; left: -9999px;' });
            seoSection.textContent = seoText;

            // 插入到预览内容末尾
            const contentSection = this.previewEl.querySelector('.mp-content-section');
            if (contentSection) {
                contentSection.appendChild(seoSection);
            } else {
                this.previewEl.appendChild(seoSection);
            }
        }

        // 自动锁定防止刷新丢失
        if (!this.isPreviewLocked) {
            this.setPreviewLocked(true);
        }

        new Notice('SEO 隐藏文字已插入');
    }

    onFileModify(file: TFile): void {
        if (file === this.currentFile && !this.isPreviewLocked) {
            if (this.updateTimer) {
                window.clearTimeout(this.updateTimer);
            }

            this.updateTimer = window.setTimeout(() => {
                runAction(() => this.updatePreview());
            }, 500);
        }
    }

    async updatePreview(): Promise<boolean> {
        this.gallery?.invalidate();
        if (!this.currentFile) return false;
        const file=this.currentFile;
        const lease=this.session.begin();
        const component=new Component();
        component.load();
        const staging=this.previewEl.ownerDocument.createElement('div');
        const scrollHeight = this.previewEl.scrollHeight;
        const scrollRatio = scrollHeight > 0 ? this.previewEl.scrollTop / scrollHeight : 0;
        const isAtBottom = (scrollHeight - this.previewEl.scrollTop) <= (this.previewEl.clientHeight + 100);
        let committed=false;
        this.previewEl.setAttribute('aria-busy','true');
        try {
            const content=await this.app.vault.cachedRead(file);
            if(!lease.isCurrent()) return false;
            await MarkdownRenderer.render(this.app,content,staging,file.path,component);
            if(!lease.isCurrent() || this.currentFile?.path !== file.path) return false;
            MPConverter.formatContent(staging,content,this.settingsManager);
            this.applyPresentation(staging);
            this.injectArticleChrome(staging);
            if(!lease.isCurrent()) return false;
            this.renderComponent?.unload();
            this.previewEl.replaceChildren(...Array.from(staging.childNodes));
            this.renderComponent=component; committed=true;
            this.refreshValidationReport();
            window.requestAnimationFrame(() => {
                if(!lease.isCurrent()) return;
                this.previewEl.scrollTop=isAtBottom ? this.previewEl.scrollHeight : scrollRatio*this.previewEl.scrollHeight;
            });
            return true;
        } catch(error) {
            if(lease.isCurrent()) new Notice(`预览更新失败，保留上次内容：${error instanceof Error ? error.message : '未知错误'}`);
            return false;
        } finally {
            if(!committed) component.unload();
            if(lease.isCurrent()) this.previewEl.removeAttribute('aria-busy');
        }
    }

    private toggleHeader() {
        this.gallery?.invalidate();
        if(!this.settingsManager.getSettings().customHeader) { new Notice('请先在设置中填写自定义头部');return; }
        this.session.headerEnabled=!this.session.headerEnabled;
        this.previewEl.querySelector('.mp-custom-header')?.remove();
        this.injectArticleChrome(this.previewEl);this.refreshValidationReport();
    }

    private toggleFooter() {
        this.gallery?.invalidate();
        if(!this.settingsManager.getSettings().customFooter) { new Notice('请先在设置中填写自定义尾部');return; }
        this.session.footerEnabled=!this.session.footerEnabled;
        this.previewEl.querySelector('.mp-custom-footer')?.remove();
        this.injectArticleChrome(this.previewEl);this.refreshValidationReport();
    }

    private injectArticleChrome(host: HTMLElement): void {
        const article=host.querySelector<HTMLElement>('.mp-content-section');
        if(!article) return;
        const settings=this.settingsManager.getSettings();
        for(const [kind,enabled,html] of [
            ['header',this.session.headerEnabled,settings.customHeader],
            ['footer',this.session.footerEnabled,settings.customFooter],
        ] as const) {
            if(!enabled || !html || article.querySelector(`.mp-custom-${kind}`)) continue;
            const block=article.ownerDocument.createElement('div');block.className=`mp-custom-${kind}`;
            block.setAttribute('data-mp-block-id',kind);
            const removed=replaceWithSafeHtml(block,html);
            if(removed>0) new Notice('自定义头尾的不安全内容已过滤；原设置未改写。');
            if(kind==='header') article.prepend(block); else article.append(block);
        }
    }

    private async getTemplateOptions(): Promise<SelectOption[]> {
        const templates = this.settingsManager.getVisibleTemplates();

        if (templates.length === 0) {
            return [{ value: 'default', label: '默认模板' }];
        }

        const seriesOrder = ['基础主题', 'Minimal 系列', 'Focus 系列', 'Elegant 系列', 'Bold 系列', '其他主题'];

        const groups: { [key: string]: typeof templates } = {
            '基础主题': [],
            'Minimal 系列': [],
            'Focus 系列': [],
            'Elegant 系列': [],
            'Bold 系列': [],
            '其他主题': []
        };

        const isNewSeries = (id: string) =>
            id.startsWith('minimal-') ||
            id.startsWith('focus-') ||
            id.startsWith('elegant-') ||
            id.startsWith('bold-');

        templates.forEach(t => {
            if (t.id.startsWith('minimal-')) {
                groups['Minimal 系列'].push(t);
            } else if (t.id.startsWith('focus-')) {
                groups['Focus 系列'].push(t);
            } else if (t.id.startsWith('elegant-')) {
                groups['Elegant 系列'].push(t);
            } else if (t.id.startsWith('bold-')) {
                groups['Bold 系列'].push(t);
            } else if (!isNewSeries(t.id)) {
                groups['基础主题'].push(t);
            } else {
                groups['其他主题'].push(t);
            }
        });

        const options: SelectOption[] = [];

        seriesOrder.forEach(series => {
            if (groups[series] && groups[series].length > 0) {
                options.push({ label: series, value: '', header: true });
                groups[series].forEach(t => {
                    options.push({ label: t.name, value: t.id });
                });
            }
        });

        return options;
    }

    /**
     * 打开主题画廊弹窗
     */
    private openThemeGallery() {
        if (this.gallery) { new Notice('画廊仍在试用或保存，请先完成当前操作。'); return; }
        const settings = this.settingsManager.getSettings();
        const currentTemplateId = this.settingsManager.getSettings().templateId;
        const filePath = this.currentFile?.path ?? null;
        const expectedKey = appearanceConflictKey(settings);
        this.galleryBaseline = this.previewEl.querySelector<HTMLElement>('.mp-content-section')?.cloneNode(true) as HTMLElement | null;
        this.galleryLastPaint = this.galleryBaseline?.outerHTML ?? '';
        let valid = true;
        let settled = false;
        let examplePromise: Promise<HTMLElement> | null = null;
        let component: Component | null = null;
        let disposed = false;
        const cleanup = (applied = false) => {
            this.trialTemplateId = null;
            this.trialAppearance = null;
            if (applied && disposed) { this.applyPresentation(this.previewEl); this.refreshValidationReport(); }
            if (!applied) {
                const current = this.previewEl.querySelector<HTMLElement>('.mp-content-section');
                const anchor = current ? capturePreviewAnchor(this.previewEl, current) : null;
                if (current && this.galleryBaseline) current.replaceWith(this.galleryBaseline.cloneNode(true));
                if (!valid || appearanceConflictKey(this.settingsManager.getSettings()) !== expectedKey) this.applyPresentation(this.previewEl);
                const restored = this.previewEl.querySelector<HTMLElement>('.mp-content-section');
                if (anchor && restored) restorePreviewAnchor(this.previewEl, restored, anchor);
                this.galleryObserver?.takeRecords(); this.refreshValidationReport();
            }
            this.galleryBaseline = null;
            this.galleryObserver?.disconnect(); this.galleryObserver = null;
            this.gallery = null;
        };
        const modal = new ThemeGalleryModal(
            this.app,
            this.settingsManager,
            currentTemplateId,
            // onSelect 回调
            async (templateId: string, revision?: string, preferences?: AppearancePreferences) => {
                if (!valid || this.currentFile?.path !== (filePath ?? undefined) || appearanceConflictKey(this.settingsManager.getSettings()) !== expectedKey) throw new Error('文章或全局外观已变化，请重新打开画廊。');
                const appearance = resolveWechatAppearance(settings, templateId, revision, preferences);
                await this.settingsManager.commitWechatAppearance(appearance.reference, appearance.preferences, expectedKey);
                const template = this.settingsManager.getTemplate(templateId);
                new Notice(`已应用主题: ${template?.name || templateId}`);
            },
            // previewCallback 回调 - 实时预览
            (templateId: string, revision?: string, preferences?: AppearancePreferences) => {
                this.applyThemeTrial(templateId, revision, preferences);
            },
            {
                fontFamily: this.previewEl.ownerDocument.defaultView?.getComputedStyle(this.previewEl).fontFamily ?? settings.fontFamily,
                fontSize: parseFloat(this.previewEl.ownerDocument.defaultView?.getComputedStyle(this.previewEl).fontSize ?? '') || settings.fontSize,
                isValid: () => valid && (this.currentFile?.path ?? null) === filePath && (this.previewEl.querySelector('.mp-content-section')?.outerHTML ?? '') === this.galleryLastPaint,
                cancel: () => { settled = true; cleanup(); },
                settled: applied => { settled = true; cleanup(applied); },
                disposed: () => {
                    disposed = true; unsubscribe(); component?.unload(); component = null;
                    this.galleryObserver?.disconnect(); this.galleryObserver = null;
                    if (modal.isSaving) {
                        // A pending disk write is not cancelled, but its old article draft must stop owning this pane.
                        valid = false; this.trialTemplateId = null; this.trialAppearance = null; this.galleryBaseline = null;
                        this.applyPresentation(this.previewEl); this.refreshValidationReport();
                    } else if (!settled) cleanup();
                },
                renderPreview: async (id, saved, example, revision, preferences) => {
                    let source = saved ? this.galleryBaseline : this.previewEl.querySelector<HTMLElement>('.mp-content-section');
                    if (example) {
                        if (!examplePromise) examplePromise = (async () => {
                            const sampleComponent = new Component(); component = sampleComponent; sampleComponent.load();
                            const host = this.previewEl.ownerDocument.defaultView!.createDiv();
                            await MarkdownRenderer.render(this.app, galleryExampleMarkdown, host, filePath ?? '', sampleComponent);
                            if (disposed) { sampleComponent.unload(); throw new Error('画廊已关闭'); }
                            MPConverter.formatContent(host, galleryExampleMarkdown, this.settingsManager);
                            return host.querySelector<HTMLElement>('.mp-content-section')!;
                        })();
                        source = await examplePromise;
                    }
                    if (!source) return null;
                    if (!example) return source;
                    const host = this.previewEl.ownerDocument.defaultView!.createDiv(); host.appendChild(source.cloneNode(true));
                    const sampleId = saved ? currentTemplateId : id;
                    this.applyPresentation(host, sampleId, resolveWechatAppearance(settings,sampleId,saved ? undefined : revision,saved ? undefined : preferences),'legacy-compatible');
                    return host.querySelector<HTMLElement>('.mp-content-section');
                },
            }
        );
        const unsubscribe = this.settingsManager.subscribe(() => {
            if (appearanceConflictKey(this.settingsManager.getSettings()) === expectedKey || modal.isSaving) return;
            valid = false; modal.invalidate(); new Notice('全局外观已变化，未保存试用已取消。');
        });
        const win = this.previewEl.ownerDocument.defaultView;
        if (win) {
            this.galleryObserver = new win.MutationObserver(() => {
                if ((this.previewEl.querySelector('.mp-content-section')?.outerHTML ?? '') === this.galleryLastPaint) return;
                valid = false;
                this.galleryBaseline = this.previewEl.querySelector<HTMLElement>('.mp-content-section')?.cloneNode(true) as HTMLElement | null;
                modal.invalidate(); new Notice('文章内容已变化，主题试用已取消。');
            });
            this.galleryObserver.observe(this.previewEl, { childList: true, subtree: true, characterData: true });
        }
        this.gallery = modal;
        modal.open();
    }

    private getFontOptions(): SelectOption[] {
        return this.settingsManager.getFontOptions();
    }
}
