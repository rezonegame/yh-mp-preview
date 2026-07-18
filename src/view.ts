import { ItemView, WorkspaceLeaf, MarkdownRenderer, TFile, setIcon, Notice, Modal } from 'obsidian';
import { MPConverter } from './converter';
import { CopyManager } from './copyManager';
import type { TemplateManager } from './templateManager';

import type { SettingsManager } from './settings/settings';
import { BackgroundManager } from './backgroundManager';
import { ThemeGalleryModal } from './settings/ThemeGalleryModal';
import { createCustomSelect, type SelectOption, type CustomSelectControl } from './ui/CustomSelect';
import { handleImageAltEdit } from './ui/ImageAltModal';
import { applyArticleRecipe } from './core/recipe/articleRecipeFormatter';
import { prepareLegacyWechatFragment } from './core/render/legacyWechatPipeline';
import type { ValidationReport } from './core/validation/wechatHtmlValidator';
// @ts-ignore - html2canvas has no type declarations
import html2canvas from 'html2canvas';
export const VIEW_TYPE_MP = 'yh-mp-preview';

export class MPView extends ItemView {
    private previewEl: HTMLElement;
    private currentFile: TFile | null = null;
    private updateTimer: NodeJS.Timeout | null = null;
    private isPreviewLocked: boolean = false;
    private isEditMode: boolean = false;
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

    private fontSizeSelect: HTMLInputElement;
    private backgroundManager: BackgroundManager;

    constructor(
        leaf: WorkspaceLeaf,
        templateManager: TemplateManager,
        settingsManager: SettingsManager
    ) {
        super(leaf);
        this.templateManager = templateManager;
        this.settingsManager = settingsManager;
        this.backgroundManager = new BackgroundManager(this.settingsManager);
    }

    getViewType() {
        return VIEW_TYPE_MP;
    }

    getDisplayText() {
        return 'yh-mp-preview';
    }

    getIcon() {
        return 'eye';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.classList.remove('view-content');
        container.classList.add('mp-view-content');

        // 顶部工具栏
        const toolbar = container.createEl('div', { cls: 'mp-toolbar' });
        const controlsGroup = toolbar.createEl('div', { cls: 'mp-controls-group' });

        // === 辅助工具行（图标按钮，位于顶部工具栏下方） ===
        const secondaryRow = toolbar.createEl('div', { cls: 'mp-controls-group mp-secondary-row' });

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
        refreshButton.addEventListener('click', async () => {
            await this.updatePreview();
            new Notice('预览已刷新');
        });

        // Lock Button
        this.lockButton = secondaryRow.createEl('button', {
            cls: 'mp-lock-button mp-icon-btn',
            attr: { 'aria-label': '开启实时预览状态', 'title': '锁定预览' }
        });
        setIcon(this.lockButton, 'unlock');
        this.lockButton.addEventListener('click', () => this.togglePreviewLock());

        // Edit Mode Button
        this.editButton = secondaryRow.createEl('button', {
            cls: 'mp-action-button mp-icon-btn',
            attr: { 'aria-label': '编辑模式', 'title': '编辑预览内容' }
        });
        setIcon(this.editButton, 'pencil');
        this.editButton.addEventListener('click', () => this.toggleEditMode());

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
        helpButton.style.position = 'relative';
        // 帮助提示框
        secondaryRow.createEl('div', {
            cls: 'mp-help-tooltip',
            text: `使用指南：
                1. 左侧选择「系列」快速过滤
                2. 右侧选择「主题」预览效果
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


        this.customBackgroundSelect = createCustomSelect(
            controlsGroup, // Append to main controls
            'mp-background-select',
            backgroundOptions,
            async (value) => {
                this.backgroundManager.setBackground(value);
                await this.settingsManager.updateSettings({
                    backgroundId: value
                });
                this.backgroundManager.applyBackground(this.previewEl);
            }
        );

        // --- 主题选择区域逻辑优化 ---

        // 1. 获取所有可选主题
        const allTemplates = await this.getTemplateOptions();

        // 2. 提取系列列表
        const seriesSet = new Set<string>();
        seriesSet.add('全部'); // 默认选项

        allTemplates.forEach(t => {
            if (t.header) {
                // 如果已经是 header 项，跳过，或者作为系列名（如果我们的 getTemplateOptions 已经返回了分组结构）
                // 现有的 getTemplateOptions 返回的是带 header 的扁平列表
                // 我们需要解析一下系列名
                seriesSet.add(t.label);
            }
        });

        // 由于 getTemplateOptions 返回的是混合了 header 和 item 的扁平数组，
        // 我们最好有一个更原始的数据源或者重新处理一下 logic。
        // 为了方便，我们这里重新定义一下获取系列的逻辑。

        const seriesOptions: SelectOption[] = [
            { label: '全部系列', value: 'all' },
            { label: '基础主题', value: '基础主题' },
            { label: 'Minimal', value: 'Minimal 系列' },
            { label: 'Focus', value: 'Focus 系列' },
            { label: 'Elegant', value: 'Elegant 系列' },
            { label: 'Bold', value: 'Bold 系列' },
            { label: '其他', value: '其他主题' }
        ];

        // 3. 主题画廊按钮
        const galleryBtn = controlsGroup.createEl('button', {
            cls: 'mp-gallery-btn',
            attr: { 'aria-label': '打开主题画廊', 'title': '主题画廊' }
        });
        setIcon(galleryBtn, 'palette');
        galleryBtn.addEventListener('click', () => this.openThemeGallery());

        // 字体选择器
        this.customFontSelect = createCustomSelect(
            controlsGroup,
            'mp-font-select',
            this.getFontOptions(),
            async (value) => {
                this.templateManager.setFont(value);
                await this.settingsManager.updateSettings({
                    fontFamily: value
                });
                this.templateManager.applyTemplate(this.previewEl);
            }
        );
        this.customFontSelect.container.id = 'font-select';

        // 字号调整
        const fontSizeGroup = controlsGroup.createEl('div', { cls: 'mp-font-size-group' });
        const decreaseButton = fontSizeGroup.createEl('button', {
            cls: 'mp-font-size-btn',
            text: '-'
        });
        this.fontSizeSelect = fontSizeGroup.createEl('input', {
            cls: 'mp-font-size-input',
            type: 'text',
            value: '16',
            attr: {
                style: 'border: none; outline: none; background: transparent;'
            }
        });
        const increaseButton = fontSizeGroup.createEl('button', {
            cls: 'mp-font-size-btn',
            text: '+'
        });



        // 恢复设置状态
        const settings = this.settingsManager.getSettings();

        const recipeSelect = createCustomSelect(
            controlsGroup,
            'mp-recipe-select',
            [
                { label: '通用长文', value: 'legacy-compatible' },
                { label: '教程与步骤', value: 'tutorial' },
                { label: '清单与方法论', value: 'checklist' },
                { label: '产品或工具介绍', value: 'product-intro' },
                { label: '观点与评论', value: 'commentary' },
                { label: '周报与复盘', value: 'review' },
            ],
            async (value) => {
                await this.settingsManager.updateSettings({
                    v3: {
                        ...this.settingsManager.getSettings().v3,
                        selectedRecipeId: value,
                    },
                });
                await this.updatePreview();
            },
        );
        recipeSelect.setValue(settings.v3.selectedRecipeId);

        // 恢复背景
        if (settings.backgroundId) {
            this.customBackgroundSelect.setValue(settings.backgroundId);
            this.backgroundManager.setBackground(settings.backgroundId);
        }

        // 恢复主题和系列
        if (settings.templateId) {
            // 1. 找到该主题所属的系列
            let targetSeries = 'all';
            const templateId = settings.templateId;

            // 简单的判断逻辑 (复用 getTemplateOptions 里的逻辑或者直接在这里check)
            if (templateId.startsWith('minimal-')) targetSeries = 'Minimal 系列';
            else if (templateId.startsWith('focus-')) targetSeries = 'Focus 系列';
            else if (templateId.startsWith('elegant-')) targetSeries = 'Elegant 系列';
            else if (templateId.startsWith('bold-')) targetSeries = 'Bold 系列';
            // 其他归类为基础或其他，为了简单，我们可以保持系列为 'all' 或者尝试匹配
            // 如果我们想让用户知道当前属于哪个系列，可以设置 seriesSelect
            // 但如果用户之前选的是 "全部" 下的某个主题，强制切到子系列可能会感到突兀
            // 策略：默认保留在 "全部系列" (value='all')，除非我们想强制联动。
            // 鉴于用户体验，保持 'All' 是最安全的，只有用户主动筛选时才变。

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
            const size = parseInt(this.fontSizeSelect.value);
            this.templateManager.setFontSize(size);
            await this.settingsManager.updateSettings({
                fontSize: size
            });
            this.templateManager.applyTemplate(this.previewEl);
        };

        // 字号调整按钮事件
        decreaseButton.addEventListener('click', () => {
            const currentSize = parseInt(this.fontSizeSelect.value);
            if (currentSize > 12) {
                this.fontSizeSelect.value = (currentSize - 1).toString();
                updateFontSize();
            }
        });

        increaseButton.addEventListener('click', () => {
            const currentSize = parseInt(this.fontSizeSelect.value);
            if (currentSize < 30) {
                this.fontSizeSelect.value = (currentSize + 1).toString();
                updateFontSize();
            }
        });

        this.fontSizeSelect.addEventListener('change', updateFontSize);
        // 预览区域
        this.previewEl = container.createEl('div', { cls: 'mp-preview-area' });
        this.validationPanel = container.createEl('section', { cls: 'mp-validation-panel' });

        // 点击图片 → 编辑 Alt Text
        this.previewEl.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName.toLowerCase() === 'img') {
                e.stopPropagation();
                if (!this.currentFile) return;
                await handleImageAltEdit(this.app, this.currentFile, target as HTMLImageElement);
            }
        });


        // 底部工具栏
        const bottomBar = container.createEl('div', { cls: 'mp-bottom-bar' });

        // === 主要操作（复制 + 导出） ===
        const primaryRow = bottomBar.createEl('div', { cls: 'mp-controls-group mp-primary-row' });

        // 复制按钮
        this.copyButton = primaryRow.createEl('button', {
            text: 'Pub 复制',
            cls: 'mp-copy-button',
        });

        // 导出长图按钮
        const exportImageButton = primaryRow.createEl('button', {
            text: '导出长图',
            cls: 'mp-export-button'
        });

        // 导出逻辑
        exportImageButton.addEventListener('click', async () => {
            if (this.previewEl) {
                exportImageButton.disabled = true;
                const originalText = exportImageButton.innerText;
                exportImageButton.setText('生成中...');

                try {
                    // @ts-ignore
                    const canvas = await html2canvas(this.previewEl, {
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff', // 强制白色背景，避免透明
                        scale: 2 // 提高清晰度
                    });

                    const link = document.createElement('a');
                    link.download = `yh-mp-preview-${Date.now()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();

                    exportImageButton.setText('导出成功');
                } catch (error) {
                    console.error('导出失败:', error);
                    exportImageButton.setText('导出失败');
                } finally {
                    setTimeout(() => {
                        exportImageButton.disabled = false;
                        exportImageButton.setText(originalText);
                    }, 2000);
                }
            }
        });

        // 添加复制按钮点击事件
        this.copyButton.addEventListener('click', async () => {
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
                    const validation = await CopyManager.copyToClipboard(this.previewEl, {
                        themeId: copySettings.templateId,
                        recipeId: copySettings.v3.selectedRecipeId,
                    });
                    this.copyButton.setText(validation.warnings > 0
                        ? `复制成功（${validation.warnings} 项兼容性提示）`
                        : '复制成功');

                    setTimeout(() => {
                        this.copyButton.disabled = false;
                        this.copyButton.setText('Pub 复制'); // Fixed: Consistent text reset
                    }, 2000);
                } catch (error) {
                    this.copyButton.setText('复制失败');
                    setTimeout(() => {
                        this.copyButton.disabled = false;
                        this.copyButton.setText('Pub 复制'); // Fixed: Consistent text reset
                    }, 2000);
                }
            }
        });

        // 监听文档变化
        this.registerEvent(
            this.app.workspace.on('file-open', this.onFileOpen.bind(this))
        );

        // 监听文档内容变化
        this.registerEvent(
            this.app.vault.on('modify', this.onFileModify.bind(this))
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
                const selectEl = ctrl.container.querySelector('.custom-select');
                if (selectEl) {
                    selectEl.classList.toggle('disabled', !enabled);
                    selectEl.setAttribute('style', `pointer-events: ${enabled ? 'auto' : 'none'}`);
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
        const contentSection = this.previewEl?.querySelector('.mp-content-section') as HTMLElement | null;
        if (!contentSection) {
            this.validationReport = null;
            this.renderValidationReport();
            return null;
        }

        const settings = this.settingsManager.getSettings();
        this.validationReport = prepareLegacyWechatFragment(contentSection, {
            themeId: settings.templateId,
            recipeId: settings.v3.selectedRecipeId,
        }).validation;
        this.renderValidationReport();
        this.copyButton.disabled = this.validationReport.errors > 0;
        return this.validationReport;
    }

    private renderValidationReport(): void {
        this.validationPanel.empty();
        const report = this.validationReport;
        if (!report) {
            this.validationPanel.style.display = 'none';
            return;
        }

        this.validationPanel.style.display = 'block';
        const status = this.validationPanel.createDiv({
            cls: `mp-validation-summary ${report.errors > 0 ? 'is-error' : report.warnings > 0 ? 'is-warning' : 'is-ok'}`,
        });
        status.setText(report.errors > 0
            ? `检查：${report.errors} 项阻断问题，已禁止复制`
            : report.warnings > 0
                ? `检查：可复制，${report.warnings} 项兼容性提示`
                : '检查：可复制，未发现兼容性问题');

        if (report.issues.length > 0) {
            const list = this.validationPanel.createEl('ul', { cls: 'mp-validation-issues' });
            report.issues.slice(0, 4).forEach((issue) => {
                list.createEl('li', {
                    text: `${issue.severity === 'error' ? '阻断' : '提示'} · ${issue.message}（${issue.path}）`,
                    cls: issue.severity === 'error' ? 'is-error' : 'is-warning',
                });
            });
            if (report.issues.length > 4) {
                this.validationPanel.createDiv({
                    text: `另有 ${report.issues.length - 4} 项提示未展开`,
                    cls: 'mp-validation-more',
                });
            }
        }
    }

    async onFileOpen(file: TFile | null) {
        this.currentFile = file;
        if (!file || file.extension !== 'md') {
            this.previewEl.empty();
            this.previewEl.createEl('div', {
                text: '只能预览 markdown 文本文档',
                cls: 'mp-empty-message'
            });
            this.validationReport = null;
            this.renderValidationReport();
            this.updateControlsState(false);
            return;
        }

        this.updateControlsState(true);
        this.isPreviewLocked = false;
        setIcon(this.lockButton, 'unlock');
        await this.updatePreview();
    }

    private async togglePreviewLock() {
        this.isPreviewLocked = !this.isPreviewLocked;
        const lockIcon = this.isPreviewLocked ? 'lock' : 'unlock';
        const lockStatus = this.isPreviewLocked ? '开启实时预览状态' : '关闭实时预览状态';
        setIcon(this.lockButton, lockIcon);
        this.lockButton.setAttribute('aria-label', lockStatus);

        if (!this.isPreviewLocked) {
            await this.updatePreview();
        }
    }

    private toggleEditMode() {
        this.isEditMode = !this.isEditMode;

        if (this.isEditMode) {
            // 进入编辑模式
            this.previewEl.contentEditable = 'true';
            this.previewEl.classList.add('mp-edit-mode');
            setIcon(this.editButton, 'pencil-off');
            this.editButton.setAttribute('title', '退出编辑模式');

            // 自动锁定预览（防止编辑内容被刷新覆盖）
            if (!this.isPreviewLocked) {
                this.isPreviewLocked = true;
                setIcon(this.lockButton, 'lock');
                this.lockButton.setAttribute('aria-label', '开启实时预览状态');
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

                const btnContainer = contentEl.createEl('div', {
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
            seoSection = document.createElement('section');
            seoSection.className = 'mp-seo-hidden';
            seoSection.style.cssText = 'font-size: 0; color: transparent; line-height: 0; height: 0; overflow: hidden; opacity: 0; position: absolute; left: -9999px;';
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
            this.isPreviewLocked = true;
            setIcon(this.lockButton, 'lock');
            this.lockButton.setAttribute('aria-label', '开启实时预览状态');
        }

        new Notice('SEO 隐藏文字已插入');
    }

    async onFileModify(file: TFile) {
        if (file === this.currentFile && !this.isPreviewLocked) {
            if (this.updateTimer) {
                clearTimeout(this.updateTimer);
            }

            this.updateTimer = setTimeout(() => {
                this.updatePreview();
            }, 500);
        }
    }

    async updatePreview() {
        if (!this.currentFile) return;

        // 保存当前滚动位置（使用百分比以应对 DOM 重建后高度变化）
        const scrollHeight = this.previewEl.scrollHeight;
        const scrollRatio = scrollHeight > 0 ? this.previewEl.scrollTop / scrollHeight : 0;
        const isAtBottom = (scrollHeight - this.previewEl.scrollTop) <= (this.previewEl.clientHeight + 100);

        this.previewEl.empty();
        const content = await this.app.vault.cachedRead(this.currentFile);

        await MarkdownRenderer.render(
            this.app,
            content,
            this.previewEl,
            this.currentFile.path,
            this
        );

        MPConverter.formatContent(this.previewEl, content, this.settingsManager);

        // Apply manual header/footer content if settings allow
        // Note: The structure requires buttons to inject these into the preview DOM
        // but user might want them to persist. 
        // For now, these methods below mimic 'injection' by interacting with the preview content.

        this.templateManager.applyTemplate(this.previewEl);
        this.backgroundManager.applyBackground(this.previewEl);
        const contentSection = this.previewEl.querySelector('.mp-content-section') as HTMLElement | null;
        if (contentSection) {
            applyArticleRecipe(contentSection, this.settingsManager.getSettings().v3.selectedRecipeId);
        }
        this.refreshValidationReport();

        // 恢复滚动位置
        requestAnimationFrame(() => {
            if (isAtBottom) {
                this.previewEl.scrollTop = this.previewEl.scrollHeight;
            } else {
                this.previewEl.scrollTop = scrollRatio * this.previewEl.scrollHeight;
            }
        });
    }

    private toggleHeader() {
        const headerContent = this.settingsManager.getSettings().customHeader;
        if (!headerContent) {
            // Optionally notify user no header content is set
            return;
        }

        const existingHeader = this.previewEl.querySelector('.mp-custom-header');
        if (existingHeader) {
            existingHeader.remove();
        } else {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'mp-custom-header';
            headerDiv.innerHTML = headerContent;

            // Add click to remove
            const removeBtn = document.createElement('button');
            removeBtn.style.cssText = 'position:absolute; top:-10px; right:10px; font-size:10px; cursor:pointer; padding:2px 6px; border-radius:4px; border:none; background:var(--text-muted); color:white;';
            removeBtn.innerText = '移除头部';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                headerDiv.remove();
            };
            // Actually the CSS ::after handles the visual label, we just need functionality if we want explicit btn,
            // but for now let's just insert content.
            // The requirement was simple toggle.

            this.previewEl.prepend(headerDiv);
        }
    }

    private toggleFooter() {
        const footerContent = this.settingsManager.getSettings().customFooter;
        if (!footerContent) return;

        const existingFooter = this.previewEl.querySelector('.mp-custom-footer');
        if (existingFooter) {
            existingFooter.remove();
        } else {
            const footerDiv = document.createElement('div');
            footerDiv.className = 'mp-custom-footer';
            footerDiv.innerHTML = footerContent;
            this.previewEl.append(footerDiv);
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
        const currentTemplateId = this.settingsManager.getSettings().templateId;

        const modal = new ThemeGalleryModal(
            this.app,
            this.settingsManager,
            currentTemplateId,
            // onSelect 回调
            async (templateId: string) => {
                this.templateManager.setCurrentTemplate(templateId);
                await this.settingsManager.updateSettings({ templateId });
                this.templateManager.applyTemplate(this.previewEl);

                const template = this.settingsManager.getTemplate(templateId);
                new Notice(`已应用主题: ${template?.name || templateId}`);
            },
            // previewCallback 回调 - 实时预览
            (templateId: string) => {
                this.templateManager.setCurrentTemplate(templateId);
                this.templateManager.applyTemplate(this.previewEl);
            }
        );

        modal.open();
    }

    private getFontOptions(): SelectOption[] {
        return this.settingsManager.getFontOptions();
    }
}
