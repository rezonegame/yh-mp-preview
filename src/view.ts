import { ItemView, WorkspaceLeaf, MarkdownRenderer, TFile, setIcon, Notice } from 'obsidian';
import { MPConverter } from './converter';
import { CopyManager } from './copyManager';
import type { TemplateManager } from './templateManager';

import type { SettingsManager } from './settings/settings';
import { BackgroundManager } from './backgroundManager';
import html2canvas from 'html2canvas';
export const VIEW_TYPE_MP = 'mp-preview';

interface SelectOption {
    label: string;
    value: string;
    header?: boolean;
}

interface CustomSelectControl {
    container: HTMLElement;
    updateOptions: (newOptions: SelectOption[]) => void;
    setValue: (value: string) => void;
}

export class MPView extends ItemView {
    private previewEl: HTMLElement;
    private currentFile: TFile | null = null;
    private updateTimer: NodeJS.Timeout | null = null;
    private isPreviewLocked: boolean = false;
    private lockButton: HTMLButtonElement;
    private copyButton: HTMLButtonElement;
    private templateManager: TemplateManager;
    private settingsManager: SettingsManager;

    // Updated to use the controller interface
    private customTemplateSelect: CustomSelectControl;
    private customFontSelect: CustomSelectControl;
    private customBackgroundSelect: CustomSelectControl;
    // New Series Select
    private customSeriesSelect: CustomSelectControl;

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
        return '公众号预览';
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

        // Removed old actionGroup (Header/Footer/Lock) from here as they moved to bottom bar
        const actionGroup = toolbar.createEl('div', { cls: 'mp-actions-group' });
        // We might keep actionGroup for right-aligned items if any, 
        // or just let it be empty for spacing if needed.
        // Currently empty based on plan.

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


        this.customBackgroundSelect = this.createCustomSelect(
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

        // 3. 创建系列筛选器
        this.customSeriesSelect = this.createCustomSelect(
            controlsGroup,
            'mp-series-select',
            seriesOptions,
            (seriesValue) => {
                // 筛选主题
                let filteredOptions: SelectOption[] = [];
                if (seriesValue === 'all') {
                    filteredOptions = allTemplates;
                } else {
                    // 找到对应的 ranges
                    // 简单的做法: 遍历 allTemplates，找到 headers，匹配 current header，然后收集 subsequent items until next header
                    let capturing = false;
                    for (const opt of allTemplates) {
                        if (opt.header) {
                            capturing = (opt.label === seriesValue);
                            // 如果只显示特定系列，我们不需要 header 本身，只需要 items
                            // 或者保留 header 也可以，但单一系列没必要显示 header
                            continue;
                        }
                        if (capturing) {
                            filteredOptions.push(opt);
                        }
                    }
                }

                // 更新主题选择器的选项
                this.customTemplateSelect.updateOptions(filteredOptions);

                // 如果当前选中的主题不在新列表中，选中第一个
                // (CustomSelect 内部逻辑处理，或者在这里显式处理)
                if (filteredOptions.length > 0) {
                    // 尝试保持当前选中值，如果不在新列表中，则选中第一个
                    // 这里需要 access current value，暂时简化为选中第一个
                    // 更好的体验是：检查 settings.templateId 是否在 filteredOptions 中
                    const currentTemplateId = this.settingsManager.getSettings().templateId;
                    const exists = filteredOptions.find(o => o.value === currentTemplateId);
                    if (!exists) {
                        const firstVal = filteredOptions[0].value;
                        if (firstVal) {
                            this.customTemplateSelect.setValue(firstVal);
                            // 触发变更
                            this.templateManager.setCurrentTemplate(firstVal);
                            this.settingsManager.updateSettings({ templateId: firstVal });
                            this.templateManager.applyTemplate(this.previewEl);
                        }
                    }
                }
            }
        );
        // 设置系列选择器样式，稍微窄一点
        this.customSeriesSelect.container.style.width = '100px';

        // 4. 创建主题选择器 (初始显示全部)
        this.customTemplateSelect = this.createCustomSelect(
            controlsGroup,
            'mp-template-select',
            allTemplates,
            async (value) => {
                this.templateManager.setCurrentTemplate(value);
                await this.settingsManager.updateSettings({
                    templateId: value
                });
                this.templateManager.applyTemplate(this.previewEl);
            }
        );
        this.customTemplateSelect.container.id = 'template-select';

        // 字体选择器
        this.customFontSelect = this.createCustomSelect(
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
            // 所以这里只设置 templateSelect

            this.customTemplateSelect.setValue(settings.templateId);
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

        // Add Image Click Listener for Alt Text Editing
        this.previewEl.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName.toLowerCase() === 'img') {
                e.stopPropagation();

                // Only allow editing if file is valid
                if (!this.currentFile) return;

                const img = target as HTMLImageElement;
                const currentSrc = img.getAttribute('src');
                const currentAlt = img.getAttribute('alt') || '';

                // Prompt user for new alt text
                // Using a simple prompt for GUI (Obsidian has Modal, but prompt is standard browser API, 
                // might be blocked or ugly. Better to use Obsidian Modal if possible, but for "Super Simple GUI"
                // browser prompt is simplest. User said "Super Simple GUI").
                // Let's use a browser prompt first. If user wants better, we can upgrade to Modal.
                // Updated: User said "Super Simple GUI", maybe a small popup.
                // Let's stick with browser prompt for v1.7.0 as it's simplest.

                // However, browser prompt might block thread. 
                // Let's use a custom modal for better UX as "Super Simple GUI".
                // Actually, let's just use `window.prompt`. It IS a super simple GUI.

                // Prompt user for new alt text
                const newAlt = window.prompt('编辑图片注释 (Alt Text):', currentAlt);

                if (newAlt !== null && newAlt !== currentAlt) {
                    console.log(`[MP Preview] Updating Alt Text: "${currentAlt}" -> "${newAlt}" for src: "${currentSrc}"`);
                    // Update File Content
                    try {
                        let fileContent = await this.app.vault.read(this.currentFile);


                        // Need to find the image in markdown.
                        // Common formats: ![alt](src) or ![[src|alt]] (Obsidian internal)
                        // `markdown-renderer` usually resolves internal links to actual http/app urls.
                        // Converting rendered src back to markdown logic is tricky.
                        // Strategy: We just simple-search for the ALT text if it's unique context, or src.

                        // We can try to regex replace.
                        // Case 1: Standard Markdown ![alt](src)
                        // This is tricky because `src` in DOM is fully resolved (e.g. app://...)
                        // but logic in MD is relative or wikilink.

                        // Simplified approach for v1.7.0:
                        // Just search for the EXACT standard markdown image syntax that matches known patterns?
                        // No, that's fragile. 

                        // Better approach: 
                        // Just search for the Alt Text usage? ![currentAlt]
                        // What if multiple images have same alt?
                        // What if no alt? ![]

                        // Let's accept that for this feature to work robustly, we might need a parser.
                        // BUT, for a "Simple" feature:
                        // We will try to replace `![currentAlt](` with `![newAlt](`
                        // AND `![[...|currentAlt]]` with `![[...|newAlt]]`

                        // Issues:
                        // 1. If currentAlt is empty string, we are replacing `![]` with `![newAlt]`.
                        //    This matches ALL images without alt. GLOBAL REPLACE? No, first one?
                        //    User said "Super Simple".

                        // Regex for standard MD image: /!\[(.*?)\]\((.*?)\)/g
                        // Regex for Wikilink: /!\[\[(.*?)(?:\|(.*?))?\]\]/g

                        // Let's notify user this is experimental if we can't be precise.
                        // But let's try to be smart.

                        let newFileContent = fileContent;
                        let replaced = false;

                        // 1. Try to use linktext for WikiLinks (Robust)
                        const linktext = img.dataset.linktext;

                        if (linktext) {
                            // It's a WikiLink: ![[linktext]] or ![[linktext|alt]]
                            // Escape linktext for regex
                            const escapedLinktext = linktext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                            console.log(`[MP Preview] Found WikiLink linktext: "${linktext}"`);

                            // Regex to find ![[linktext]] or ![[linktext|oldAlt]]
                            // We look for ![[ followed by linktext, then optional pipe and anything, then ]]
                            // Note: We use 'g' to replace all? Or just first? 
                            // If user edits one image, we probably want to edit that specific one.
                            // But detecting "which one" is hard without index.
                            // For "Super Simple GUI", let's replace the first one or all?
                            // Let's replace the first occurrence that matches.

                            const wikiRegex = new RegExp(`!\\[\\[\\s*${escapedLinktext}\\s*(?:\\|.*?)?\\]\\]`);

                            if (wikiRegex.test(newFileContent)) {
                                newFileContent = newFileContent.replace(wikiRegex, `![[${linktext}|${newAlt}]]`);
                                replaced = true;
                                console.log('[MP Preview] Replaced WikiLink via linktext match');
                            }
                        }

                        // 2. If not replaced (Standard Markdown OR WikiLink fallback), try Alt Text matching
                        if (!replaced) {
                            // Escape regex special chars in currentAlt
                            const escapedAlt = currentAlt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                            // Standard Markdown: ![alt](src)
                            // Regex: !\[ (escapedAlt) \] \(
                            const stdRegex = new RegExp(`!\\[\\s*${escapedAlt}\\s*\\]\\(`, '');

                            if (stdRegex.test(newFileContent)) {
                                newFileContent = newFileContent.replace(stdRegex, `![${newAlt}](`);
                                replaced = true;
                                console.log('[MP Preview] Replaced Standard Markdown via Alt Text');
                            } else if (currentAlt) {
                                // Fallback for WikiLink if linktext failed or missing
                                // Try finding simple `|alt]]` end of wikilink
                                const wikiAltRegex = new RegExp(`\\|\\s*${escapedAlt}\\s*\\]\\]`, '');
                                if (wikiAltRegex.test(newFileContent)) {
                                    newFileContent = newFileContent.replace(wikiAltRegex, `|${newAlt}]]`);
                                    replaced = true;
                                    console.log('[MP Preview] Replaced WikiLink via Alt Text pipe');
                                }
                            }
                        }

                        if (replaced) {
                            await this.app.vault.modify(this.currentFile, newFileContent);
                            new Notice('图片注释已更新');
                        } else {
                            console.warn(`[MP Preview] Update failed. Linktext: ${linktext}, Alt: ${currentAlt}`);
                            new Notice('无法在文档中精确定位此图片，请检查是否为标准格式。');
                        }

                    } catch (err) {
                        console.error('Failed to update image alt text', err);
                        new Notice('更新失败');
                    }
                }
            }
        });


        // 底部工具栏
        const bottomBar = container.createEl('div', { cls: 'mp-bottom-bar' });
        // 创建中间控件容器
        const bottomControlsGroup = bottomBar.createEl('div', { cls: 'mp-controls-group' });

        // --- Added/Moved Header/Footer/Lock Buttons to Bottom Bar ---

        // Inject Header
        const headerBtn = bottomControlsGroup.createEl('button', {
            cls: 'mp-action-button',
            attr: { 'aria-label': '插入自定义头部', 'title': '插入头部' }
        });
        setIcon(headerBtn, 'arrow-down-to-line');
        headerBtn.addEventListener('click', () => this.toggleHeader());

        // Inject Footer
        const footerBtn = bottomControlsGroup.createEl('button', {
            cls: 'mp-action-button',
            attr: { 'aria-label': '插入自定义尾部', 'title': '插入尾部' }
        });
        setIcon(footerBtn, 'arrow-up-to-line');
        footerBtn.addEventListener('click', () => this.toggleFooter());

        // Lock Button
        this.lockButton = bottomControlsGroup.createEl('button', {
            cls: 'mp-lock-button',
            attr: { 'aria-label': '开启实时预览状态', 'title': '锁定预览' }
        });
        setIcon(this.lockButton, 'unlock');
        this.lockButton.addEventListener('click', () => this.togglePreviewLock());

        // --- End of Moved Buttons ---


        // 帮助按钮
        const helpButton = bottomControlsGroup.createEl('button', {
            cls: 'mp-help-button',
            attr: { 'aria-label': '使用指南' }
        });
        setIcon(helpButton, 'help');
        // 帮助提示框
        bottomControlsGroup.createEl('div', {
            cls: 'mp-help-tooltip',
            text: `使用指南：
                1. 左侧选择「系列」快速过滤
                2. 右侧选择「主题」预览效果
                3. 调整字体和字号
                4. 点击【复制按钮】即可粘贴到公众号
                `
        });



        const buttonGroup = bottomControlsGroup.createEl('div', { cls: 'mp-button-group' });

        // 复制按钮
        this.copyButton = buttonGroup.createEl('button', {
            text: 'Pub 复制', // Shortened text
            cls: 'mp-copy-button',
            attr: { style: 'margin-right: 8px;' }
        });

        // 导出长图按钮
        const exportImageButton = buttonGroup.createEl('button', {
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
                    link.download = `mp-preview-${Date.now()}.png`;
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
                this.copyButton.disabled = true;
                this.copyButton.setText('复制中...');

                try {
                    await CopyManager.copyToClipboard(this.previewEl);
                    this.copyButton.setText('复制成功');

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
        [this.customTemplateSelect, this.customFontSelect, this.customBackgroundSelect, this.customSeriesSelect].forEach(ctrl => {
            if (ctrl && ctrl.container) {
                const selectEl = ctrl.container.querySelector('.custom-select');
                if (selectEl) {
                    selectEl.classList.toggle('disabled', !enabled);
                    selectEl.setAttribute('style', `pointer-events: ${enabled ? 'auto' : 'none'}`);
                }
            }
        });

        this.fontSizeSelect.disabled = !enabled;
        this.copyButton.disabled = !enabled;

        const fontSizeButtons = this.containerEl.querySelectorAll('.mp-font-size-btn');
        fontSizeButtons.forEach(button => {
            (button as HTMLButtonElement).disabled = !enabled;
        });
    }

    async onFileOpen(file: TFile | null) {
        this.currentFile = file;
        if (!file || file.extension !== 'md') {
            this.previewEl.empty();
            this.previewEl.createEl('div', {
                text: '只能预览 markdown 文本文档',
                cls: 'mp-empty-message'
            });
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

        // 保存当前滚动位置和内容高度
        const scrollPosition = this.previewEl.scrollTop;
        const prevHeight = this.previewEl.scrollHeight;
        const isAtBottom = (this.previewEl.scrollHeight - this.previewEl.scrollTop) <= (this.previewEl.clientHeight + 100);

        this.previewEl.empty();
        const content = await this.app.vault.cachedRead(this.currentFile);

        await MarkdownRenderer.render(
            this.app,
            content,
            this.previewEl,
            this.currentFile.path,
            this
        );

        MPConverter.formatContent(this.previewEl);

        // Apply manual header/footer content if settings allow
        // Note: The structure requires buttons to inject these into the preview DOM
        // but user might want them to persist. 
        // For now, these methods below mimic 'injection' by interacting with the preview content.

        this.templateManager.applyTemplate(this.previewEl);
        this.backgroundManager.applyBackground(this.previewEl);

        if (isAtBottom) {
            requestAnimationFrame(() => {
                this.previewEl.scrollTop = this.previewEl.scrollHeight;
            });
        } else {
            const heightDiff = this.previewEl.scrollHeight - prevHeight;
            this.previewEl.scrollTop = scrollPosition + heightDiff;
        }
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

    // Refactored createCustomSelect to return a controller
    private createCustomSelect(
        parent: HTMLElement,
        className: string,
        initialOptions: SelectOption[],
        onChange: (value: string) => void
    ): CustomSelectControl {
        const container = parent.createEl('div', { cls: 'custom-select-container' });
        if (className) container.classList.add(className);

        const select = container.createEl('div', { cls: 'custom-select' });
        const selectedText = select.createEl('span', { cls: 'selected-text' });
        const arrow = select.createEl('span', { cls: 'select-arrow', text: '▾' });

        const dropdown = container.createEl('div', { cls: 'select-dropdown' });

        let currentOptions = initialOptions;
        let currentValue = '';

        // Function to render options
        const renderOptions = (opts: SelectOption[]) => {
            dropdown.empty();
            opts.forEach(option => {
                if (option.header) {
                    dropdown.createEl('div', {
                        cls: 'select-group-header',
                        text: option.label,
                        attr: {
                            style: 'padding: 8px 12px; font-weight: bold; color: var(--text-muted); font-size: 0.8em; background-color: var(--background-secondary); border-bottom: 1px solid var(--background-modifier-border); border-top: 1px solid var(--background-modifier-border); pointer-events: none;'
                        }
                    });
                    return;
                }

                const item = dropdown.createEl('div', {
                    cls: 'select-item',
                    text: option.label
                });

                item.dataset.value = option.value;
                if (option.value === currentValue) {
                    item.classList.add('selected');
                }

                item.addEventListener('click', () => {
                    setValue(option.value);
                    dropdown.classList.remove('show');
                    onChange(option.value);
                });
            });
        };

        // Function to set value programmatically
        const setValue = (value: string) => {
            const option = currentOptions.find(o => o.value === value && !o.header);
            if (option) {
                currentValue = value;
                selectedText.textContent = option.label;
                select.dataset.value = value;

                // Update active class in dropdown
                dropdown.querySelectorAll('.select-item').forEach(el => {
                    if ((el as HTMLElement).dataset.value === value) {
                        el.classList.add('selected');
                    } else {
                        el.classList.remove('selected');
                    }
                });
            }
        };

        // Initial render
        renderOptions(currentOptions);

        // Set initial default (first filtered non-header option)
        const firstOption = currentOptions.find(o => !o.header);
        if (firstOption && firstOption.value) {
            setValue(firstOption.value);
        }

        // Event listeners
        select.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.select-dropdown.show').forEach(el => {
                if (el !== dropdown) el.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });

        return {
            container,
            updateOptions: (newOptions: SelectOption[]) => {
                currentOptions = newOptions;
                renderOptions(newOptions);
                // Try to keep current value if it exists in new options, else select first
                if (currentOptions.length > 0) {
                    const exists = currentOptions.find(o => o.value === currentValue && !o.header);
                    if (!exists) {
                        const first = currentOptions.find(o => !o.header);
                        if (first) setValue(first.value);
                    } else {
                        setValue(currentValue); // Re-render selection state
                    }
                }
            },
            setValue
        };
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

    private getFontOptions(): SelectOption[] {
        return this.settingsManager.getFontOptions();
    }
}