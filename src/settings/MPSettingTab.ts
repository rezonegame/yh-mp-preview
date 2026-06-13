import { App, PluginSettingTab, Setting, setIcon, Notice } from 'obsidian';
import MPPlugin from '../main'; // 修改插件名以匹配类名
import { CreateTemplateModal } from './CreateTemplateModal';
import { CreateFontModal } from './CreateFontModal';
import { CreateBackgroundModal } from './CreateBackgroundModal'; // 添加导入
import { ConfirmModal } from './ConfirmModal';
import { TemplatePreviewModal } from './templatePreviewModal'; // 添加导入
import type { MPSettings } from './settings';
export class MPSettingTab extends PluginSettingTab {
    plugin: MPPlugin; // 修改插件类型以匹配类名
    private expandedSections: Set<string> = new Set();

    constructor(app: App, plugin: MPPlugin) { // 修改插件类型以匹配类名
        super(app, plugin);
        this.plugin = plugin;
    }

    private createSection(containerEl: HTMLElement, title: string, renderContent: (contentEl: HTMLElement) => void) {
        const section = containerEl.createDiv('settings-section');
        const header = section.createDiv('settings-section-header');

        const toggle = header.createSpan('settings-section-toggle');
        setIcon(toggle, 'chevron-right');

        header.createEl('h4', { text: title });

        const content = section.createDiv('settings-section-content');
        renderContent(content);

        header.addEventListener('click', () => {
            const isExpanded = !section.hasClass('is-expanded');
            section.toggleClass('is-expanded', isExpanded);
            setIcon(toggle, isExpanded ? 'chevron-down' : 'chevron-right');
            if (isExpanded) {
                this.expandedSections.add(title);
            } else {
                this.expandedSections.delete(title);
            }
        });

        if (this.expandedSections.has(title) || (!containerEl.querySelector('.settings-section'))) {
            section.addClass('is-expanded');
            setIcon(toggle, 'chevron-down');
            this.expandedSections.add(title);
        }

        return section;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('mp-settings');

        const header = containerEl.createDiv({ cls: 'mp-settings-header' });
        header.createEl('h2', { text: 'yh-mp-preview', attr: { style: 'display: inline-block; margin-bottom: 0;' } });
        header.createEl('span', { text: ` v${this.plugin.manifest.version}`, attr: { style: 'font-size: 0.8em; color: var(--text-muted); margin-left: 10px;' } });

        this.createSection(containerEl, '基本选项', el => this.renderBasicSettings(el));
        this.createSection(containerEl, '模板选项', el => this.renderTemplateSettings(el));
        this.createSection(containerEl, '背景选项', el => this.renderBackgroundSettings(el));
        this.createSection(containerEl, '排版增强', el => this.renderLayoutEnhancementSettings(el));
        this.createSection(containerEl, '高级选项', el => this.renderAdvancedSettings(el));
    }

    private renderBasicSettings(containerEl: HTMLElement): void {
        // 字体管理区域
        const fontSection = containerEl.createDiv('mp-settings-subsection');
        const fontHeader = fontSection.createDiv('mp-settings-subsection-header');
        const fontToggle = fontHeader.createSpan('mp-settings-subsection-toggle');
        setIcon(fontToggle, 'chevron-right');

        fontHeader.createEl('h3', { text: '字体管理' });

        const fontContent = fontSection.createDiv('mp-settings-subsection-content');

        // 折叠/展开逻辑
        fontHeader.addEventListener('click', () => {
            const isExpanded = !fontSection.hasClass('is-expanded');
            fontSection.toggleClass('is-expanded', isExpanded);
            setIcon(fontToggle, isExpanded ? 'chevron-down' : 'chevron-right');
        });

        // 字体列表
        const fontList = fontContent.createDiv('font-management');
        this.plugin.settingsManager.getFontOptions().forEach(font => {
            const fontItem = fontList.createDiv('font-item');
            const setting = new Setting(fontItem)
                .setName(font.label)
                .setDesc(font.value);

            // 只为非预设字体添加编辑和删除按钮
            if (!font.isPreset) {
                setting
                    .addExtraButton(btn =>
                        btn.setIcon('pencil')
                            .setTooltip('编辑')
                            .onClick(() => {
                                new CreateFontModal(
                                    this.app,
                                    async (updatedFont) => {
                                        await this.plugin.settingsManager.updateFont(font.value, updatedFont);
                                        this.display();
                                        new Notice('请重启 Obsidian 或重新加载以使更改生效');
                                    },
                                    font
                                ).open();
                            }))
                    .addExtraButton(btn =>
                        btn.setIcon('trash')
                            .setTooltip('删除')
                            .onClick(() => {
                                // 新增确认模态框
                                new ConfirmModal(
                                    this.app,
                                    '确认删除字体',
                                    `确定要删除「${font.label}」字体配置吗？`,
                                    async () => {
                                        await this.plugin.settingsManager.removeFont(font.value);
                                        this.display();
                                        new Notice('请重启 Obsidian 或重新加载以使更改生效');
                                    }
                                ).open();
                            }));
            }
        });

        // 添加新字体按钮
        new Setting(fontContent)
            .addButton(btn => btn
                .setButtonText('+ 添加字体')
                .setCta()
                .onClick(() => {
                    new CreateFontModal(
                        this.app,
                        async (newFont) => {
                            await this.plugin.settingsManager.addCustomFont(newFont);
                            this.display();
                            new Notice('请重启 Obsidian 或重新加载以使更改生效');
                        }
                    ).open();
                }));
    }

    private renderTemplateSettings(containerEl: HTMLElement): void {
        // 模板显示设置部分 - 从基本设置移动到这里
        const templateVisibilitySection = containerEl.createDiv('mp-settings-subsection');
        const templateVisibilityHeader = templateVisibilitySection.createDiv('mp-settings-subsection-header');

        const templateVisibilityToggle = templateVisibilityHeader.createSpan('mp-settings-subsection-toggle');
        setIcon(templateVisibilityToggle, 'chevron-right');

        templateVisibilityHeader.createEl('h3', { text: '模板显示选项' });

        const templateVisibilityContent = templateVisibilitySection.createDiv('mp-settings-subsection-content');

        // 折叠/展开逻辑
        templateVisibilityHeader.addEventListener('click', () => {
            const isExpanded = !templateVisibilitySection.hasClass('is-expanded');
            templateVisibilitySection.toggleClass('is-expanded', isExpanded);
            setIcon(templateVisibilityToggle, isExpanded ? 'chevron-down' : 'chevron-right');
        });

        // 模板选择容器
        const templateSelectionContainer = templateVisibilityContent.createDiv('template-selection-container');

        // 左侧：所有模板列表
        const allTemplatesContainer = templateSelectionContainer.createDiv('all-templates-container');
        allTemplatesContainer.createEl('h4', { text: '隐藏模板' });
        const allTemplatesList = allTemplatesContainer.createDiv('templates-list');

        // 中间：控制按钮
        const controlButtonsContainer = templateSelectionContainer.createDiv('control-buttons-container');
        const addButton = controlButtonsContainer.createEl('button', { text: '>' });
        const removeButton = controlButtonsContainer.createEl('button', { text: '<' });

        // 右侧：显示的模板列表
        const visibleTemplatesContainer = templateSelectionContainer.createDiv('visible-templates-container');
        visibleTemplatesContainer.createEl('h4', { text: '显示模板' });
        const visibleTemplatesList = visibleTemplatesContainer.createDiv('templates-list');

        // 获取所有模板
        const allTemplates = this.plugin.settingsManager.getAllTemplates();

        // 渲染模板列表
        const renderTemplateLists = () => {
            // 清空列表
            allTemplatesList.empty();
            visibleTemplatesList.empty();

            // 填充左侧列表（所有未显示的模板）
            allTemplates
                .filter(template => template.isVisible === false)
                .forEach(template => {
                    const templateItem = allTemplatesList.createDiv('template-list-item');
                    templateItem.textContent = template.name;
                    templateItem.dataset.templateId = template.id;

                    // 点击选中/取消选中
                    templateItem.addEventListener('click', () => {
                        templateItem.toggleClass('selected', !templateItem.hasClass('selected'));
                    });
                });

            // 填充右侧列表（所有显示的模板）
            allTemplates
                .filter(template => template.isVisible !== false) // 默认显示
                .forEach(template => {
                    const templateItem = visibleTemplatesList.createDiv('template-list-item');
                    templateItem.textContent = template.name;
                    templateItem.dataset.templateId = template.id;

                    // 点击选中/取消选中
                    templateItem.addEventListener('click', () => {
                        templateItem.toggleClass('selected', !templateItem.hasClass('selected'));
                    });
                });
        };

        // 初始渲染
        renderTemplateLists();

        // 添加按钮事件
        addButton.addEventListener('click', async () => {
            const selectedItems = Array.from(allTemplatesList.querySelectorAll('.template-list-item.selected'));
            if (selectedItems.length === 0) return;

            for (const item of selectedItems) {
                const templateId = (item as HTMLElement).dataset.templateId;
                if (!templateId) continue;

                const template = allTemplates.find(t => t.id === templateId);
                if (template) {
                    template.isVisible = true;
                    await this.plugin.settingsManager.updateTemplate(templateId, template);
                }
            }

            renderTemplateLists();
            new Notice('请重启 Obsidian 或重新加载以使更改生效');
        });

        // 移除按钮事件
        removeButton.addEventListener('click', async () => {
            const selectedItems = Array.from(visibleTemplatesList.querySelectorAll('.template-list-item.selected'));
            if (selectedItems.length === 0) return;

            for (const item of selectedItems) {
                const templateId = (item as HTMLElement).dataset.templateId;
                if (!templateId) continue;

                const template = allTemplates.find(t => t.id === templateId);
                if (template) {
                    template.isVisible = false;
                    await this.plugin.settingsManager.updateTemplate(templateId, template);
                }
            }

            renderTemplateLists();
            new Notice('请重启 Obsidian 或重新加载以使更改生效');
        });

        // 模板管理区域
        const templateList = containerEl.createDiv('template-management');
        // 渲染自定义模板
        templateList.createEl('h4', { text: '自定义模板', cls: 'template-custom-header' });
        this.plugin.settingsManager.getAllTemplates()
            .filter(template => !template.isPreset)
            .forEach(template => {
                const templateItem = templateList.createDiv('template-item');
                new Setting(templateItem)
                    .setName(template.name)
                    .setDesc(template.description)
                    .addExtraButton(btn =>
                        btn.setIcon('eye')
                            .setTooltip('预览')
                            .onClick(() => {
                                new TemplatePreviewModal(this.app, template, this.plugin.templateManager).open(); // 修改为使用预览模态框
                            }))
                    .addExtraButton(btn =>
                        btn.setIcon('pencil')
                            .setTooltip('编辑')
                            .onClick(() => {
                                new CreateTemplateModal(
                                    this.app,
                                    this.plugin,
                                    (updatedTemplate) => {
                                        this.plugin.settingsManager.updateTemplate(template.id, updatedTemplate);
                                        this.display();
                                        new Notice('请重启 Obsidian 或重新加载以使更改生效');
                                    },
                                    template
                                ).open();
                            }))
                    .addExtraButton(btn =>
                        btn.setIcon('trash')
                            .setTooltip('删除')
                            .onClick(() => {
                                // 新增确认模态框
                                new ConfirmModal(
                                    this.app,
                                    '确认删除模板',
                                    `确定要删除「${template.name}」模板吗？此操作不可恢复。`,
                                    async () => {
                                        await this.plugin.settingsManager.removeTemplate(template.id);
                                        this.display();
                                        new Notice('请重启 Obsidian 或重新加载以使更改生效');
                                    }
                                ).open();
                            }));
            });

        // 添加新模板按钮
        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('+ 新建模板')
                .setCta()
                .onClick(() => {
                    new CreateTemplateModal(
                        this.app,
                        this.plugin,
                        async (newTemplate) => {
                            await this.plugin.settingsManager.addCustomTemplate(newTemplate);
                            this.display();
                            new Notice('请重启 Obsidian 或重新加载以使更改生效');
                        }
                    ).open();
                }));
    }

    private renderBackgroundSettings(containerEl: HTMLElement): void {
        // 背景显示设置部分
        const backgroundVisibilitySection = containerEl.createDiv('mp-settings-subsection');
        const backgroundVisibilityHeader = backgroundVisibilitySection.createDiv('mp-settings-subsection-header');

        const backgroundVisibilityToggle = backgroundVisibilityHeader.createSpan('mp-settings-subsection-toggle');
        setIcon(backgroundVisibilityToggle, 'chevron-right');

        backgroundVisibilityHeader.createEl('h3', { text: '背景显示' });

        const backgroundVisibilityContent = backgroundVisibilitySection.createDiv('mp-settings-subsection-content');

        // 折叠/展开逻辑
        backgroundVisibilityHeader.addEventListener('click', () => {
            const isExpanded = !backgroundVisibilitySection.hasClass('is-expanded');
            backgroundVisibilitySection.toggleClass('is-expanded', isExpanded);
            setIcon(backgroundVisibilityToggle, isExpanded ? 'chevron-down' : 'chevron-right');
        });

        // 背景选择容器
        const backgroundSelectionContainer = backgroundVisibilityContent.createDiv('background-selection-container');

        // 左侧：所有背景列表
        const allBackgroundsContainer = backgroundSelectionContainer.createDiv('all-backgrounds-container');
        allBackgroundsContainer.createEl('h4', { text: '隐藏背景' });
        const allBackgroundsList = allBackgroundsContainer.createDiv('backgrounds-list');

        // 中间：控制按钮
        const controlButtonsContainer = backgroundSelectionContainer.createDiv('control-buttons-container');
        const addButton = controlButtonsContainer.createEl('button', { text: '>' });
        const removeButton = controlButtonsContainer.createEl('button', { text: '<' });

        // 右侧：显示的背景列表
        const visibleBackgroundsContainer = backgroundSelectionContainer.createDiv('visible-backgrounds-container');
        visibleBackgroundsContainer.createEl('h4', { text: '显示背景' });
        const visibleBackgroundsList = visibleBackgroundsContainer.createDiv('backgrounds-list');

        // 获取所有背景
        const allBackgrounds = this.plugin.settingsManager.getAllBackgrounds();

        // 渲染背景列表
        const renderBackgroundLists = () => {
            // 清空列表
            allBackgroundsList.empty();
            visibleBackgroundsList.empty();

            // 填充左侧列表（所有未显示的背景）
            allBackgrounds
                .filter(background => background.isVisible === false)
                .forEach(background => {
                    const backgroundItem = allBackgroundsList.createDiv('background-list-item');
                    backgroundItem.textContent = background.name;
                    backgroundItem.dataset.backgroundId = background.id;

                    // 点击选中/取消选中
                    backgroundItem.addEventListener('click', () => {
                        backgroundItem.toggleClass('selected', !backgroundItem.hasClass('selected'));
                    });
                });

            // 填充右侧列表（所有显示的背景）
            allBackgrounds
                .filter(background => background.isVisible !== false) // 默认显示
                .forEach(background => {
                    const backgroundItem = visibleBackgroundsList.createDiv('background-list-item');
                    backgroundItem.textContent = background.name;
                    backgroundItem.dataset.backgroundId = background.id;

                    // 点击选中/取消选中
                    backgroundItem.addEventListener('click', () => {
                        backgroundItem.toggleClass('selected', !backgroundItem.hasClass('selected'));
                    });
                });
        };

        // 初始渲染
        renderBackgroundLists();

        // 添加按钮事件
        addButton.addEventListener('click', async () => {
            const selectedItems = Array.from(allBackgroundsList.querySelectorAll('.background-list-item.selected'));
            if (selectedItems.length === 0) return;

            for (const item of selectedItems) {
                const backgroundId = (item as HTMLElement).dataset.backgroundId;
                if (!backgroundId) continue;

                const background = allBackgrounds.find(b => b.id === backgroundId);
                if (background) {
                    background.isVisible = true;
                    await this.plugin.settingsManager.updateBackground(backgroundId, background);
                }
            }

            renderBackgroundLists();
            new Notice('背景显示设置已更新');
        });

        // 移除按钮事件
        removeButton.addEventListener('click', async () => {
            const selectedItems = Array.from(visibleBackgroundsList.querySelectorAll('.background-list-item.selected'));
            if (selectedItems.length === 0) return;

            for (const item of selectedItems) {
                const backgroundId = (item as HTMLElement).dataset.backgroundId;
                if (!backgroundId) continue;

                const background = allBackgrounds.find(b => b.id === backgroundId);
                if (background) {
                    background.isVisible = false;
                    await this.plugin.settingsManager.updateBackground(backgroundId, background);
                }
            }

            renderBackgroundLists();
            new Notice('背景显示已更新');
        });

        // 背景管理区域
        const backgroundList = containerEl.createDiv('background-management');

        // 渲染自定义背景
        backgroundList.createEl('h4', { text: '自定义背景', cls: 'background-custom-header' });
        this.plugin.settingsManager.getAllBackgrounds()
            .filter(background => !background.isPreset)
            .forEach(background => {
                const backgroundItem = backgroundList.createDiv('background-item');
                new Setting(backgroundItem)
                    .setName(background.name)
                    .addExtraButton(btn =>
                        btn.setIcon('pencil')
                            .setTooltip('编辑')
                            .onClick(() => {
                                // 使用背景编辑模态框
                                new CreateBackgroundModal(
                                    this.app,
                                    async (updatedBackground) => {
                                        await this.plugin.settingsManager.updateBackground(background.id, updatedBackground);
                                        this.display();
                                        new Notice('背景已更新');
                                    },
                                    background
                                ).open();
                            }))
                    .addExtraButton(btn =>
                        btn.setIcon('trash')
                            .setTooltip('删除')
                            .onClick(() => {
                                new ConfirmModal(
                                    this.app,
                                    '确认删除背景',
                                    `确定要删除「${background.name}」背景吗？此操作不可恢复。`,
                                    async () => {
                                        await this.plugin.settingsManager.removeBackground(background.id);
                                        this.display();
                                        new Notice('背景已删除');
                                    }
                                ).open();
                            }));

                // 添加背景预览
                const previewEl = backgroundItem.createDiv('background-preview');
                previewEl.setAttribute('style', background.style);
            });

        // 添加新背景按钮
        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('+ 新建背景')
                .setCta()
                .onClick(() => {
                    // 使用新的背景创建模态框
                    new CreateBackgroundModal(
                        this.app,
                        async (newBackground) => {
                            await this.plugin.settingsManager.addCustomBackground(newBackground);
                            this.display();
                            new Notice('背景已创建');
                        }
                    ).open();
                }));
    }

    // Add createSection helper if it was removed or not accessible, but it seems to be private in class
    // We need to render a new section for Advanced Settings

    private renderLayoutEnhancementSettings(containerEl: HTMLElement): void {
        const settings = this.plugin.settingsManager.getSettings();
        const layout = settings.layoutEnhancements;

        new Setting(containerEl)
            .setName('自动阅读导航')
            .setDesc('当文章 h2/h3 数量达到阈值时，自动在开头插入目录卡片')
            .addToggle(toggle => toggle
                .setValue(layout.enableAutoToc)
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        layoutEnhancements: {
                            ...this.plugin.settingsManager.getSettings().layoutEnhancements,
                            enableAutoToc: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName('目录触发阈值')
            .setDesc('h2/h3 数量达到该值才自动生成阅读导航')
            .addText(text => text
                .setPlaceholder('3')
                .setValue(String(layout.tocMinHeadings || 3))
                .onChange(async value => {
                    const parsed = Math.max(1, parseInt(value, 10) || 3);
                    await this.plugin.settingsManager.updateSettings({
                        layoutEnhancements: {
                            ...this.plugin.settingsManager.getSettings().layoutEnhancements,
                            tocMinHeadings: parsed
                        }
                    });
                }));

        new Setting(containerEl)
            .setName('任务列表增强')
            .setDesc('将 Markdown 任务列表转换为公众号检查清单卡片')
            .addToggle(toggle => toggle
                .setValue(layout.enableTaskListEnhancement)
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        layoutEnhancements: {
                            ...this.plugin.settingsManager.getSettings().layoutEnhancements,
                            enableTaskListEnhancement: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName('图片 Alt 图注')
            .setDesc('把图片 alt 文本显示为图注')
            .addToggle(toggle => toggle
                .setValue(layout.enableImageCaptions)
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        layoutEnhancements: {
                            ...this.plugin.settingsManager.getSettings().layoutEnhancements,
                            enableImageCaptions: value
                        }
                    });
                }));

        new Setting(containerEl)
            .setName('表格横向优化')
            .setDesc('为表格增加移动端横向滚动容器，避免窄屏溢出')
            .addToggle(toggle => toggle
                .setValue(layout.enableTableEnhancement)
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        layoutEnhancements: {
                            ...this.plugin.settingsManager.getSettings().layoutEnhancements,
                            enableTableEnhancement: value
                        }
                    });
                }));

        containerEl.createEl('h4', { text: '作者卡' });

        new Setting(containerEl)
            .setName('自动插入作者卡')
            .setDesc('在文章末尾自动插入作者信息卡')
            .addToggle(toggle => toggle
                .setValue(layout.enableAuthorCard)
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        layoutEnhancements: {
                            ...this.plugin.settingsManager.getSettings().layoutEnhancements,
                            enableAuthorCard: value
                        }
                    });
                }));

        this.addAuthorTextSetting(containerEl, '名称', 'name');
        this.addAuthorTextSetting(containerEl, '身份', 'role');
        this.addAuthorTextSetting(containerEl, '简介', 'bio', true);
        this.addAuthorTextSetting(containerEl, '标签', 'tags');
        this.addAuthorTextSetting(containerEl, '链接', 'link');
        this.addAuthorTextSetting(containerEl, '头像 URL', 'avatar');

        containerEl.createEl('h4', { text: '关注引导' });

        new Setting(containerEl)
            .setName('自动插入关注引导')
            .setDesc('在文章末尾自动插入关注/收藏引导卡')
            .addToggle(toggle => toggle
                .setValue(layout.enableSubscribeCard)
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        layoutEnhancements: {
                            ...this.plugin.settingsManager.getSettings().layoutEnhancements,
                            enableSubscribeCard: value
                        }
                    });
                }));

        this.addSubscribeTextSetting(containerEl, '标签', 'label');
        this.addSubscribeTextSetting(containerEl, '标题', 'title');
        this.addSubscribeTextSetting(containerEl, '副标题', 'subtitle', true);
        this.addSubscribeTextSetting(containerEl, '主行动', 'primary');
        this.addSubscribeTextSetting(containerEl, '次行动', 'secondary');
        this.addSubscribeTextSetting(containerEl, '说明', 'note');
        this.addSubscribeTextSetting(containerEl, '二维码 URL', 'qrcode');
    }

    private addAuthorTextSetting(containerEl: HTMLElement, name: string, key: keyof MPSettings['authorCard'], multiline = false): void {
        const authorCard = this.plugin.settingsManager.getSettings().authorCard;
        const setting = new Setting(containerEl)
            .setName(name);

        if (multiline) {
            setting.addTextArea(text => text
                .setValue(authorCard[key] || '')
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        authorCard: {
                            ...this.plugin.settingsManager.getSettings().authorCard,
                            [key]: value
                        }
                    });
                }));
            return;
        }

        setting.addText(text => text
            .setValue(authorCard[key] || '')
            .onChange(async value => {
                await this.plugin.settingsManager.updateSettings({
                    authorCard: {
                        ...this.plugin.settingsManager.getSettings().authorCard,
                        [key]: value
                    }
                });
            }));
    }

    private addSubscribeTextSetting(containerEl: HTMLElement, name: string, key: keyof MPSettings['subscribeCard'], multiline = false): void {
        const subscribeCard = this.plugin.settingsManager.getSettings().subscribeCard;
        const setting = new Setting(containerEl)
            .setName(name);

        if (multiline) {
            setting.addTextArea(text => text
                .setValue(subscribeCard[key] || '')
                .onChange(async value => {
                    await this.plugin.settingsManager.updateSettings({
                        subscribeCard: {
                            ...this.plugin.settingsManager.getSettings().subscribeCard,
                            [key]: value
                        }
                    });
                }));
            return;
        }

        setting.addText(text => text
            .setValue(subscribeCard[key] || '')
            .onChange(async value => {
                await this.plugin.settingsManager.updateSettings({
                    subscribeCard: {
                        ...this.plugin.settingsManager.getSettings().subscribeCard,
                        [key]: value
                    }
                });
            }));
    }

    private renderAdvancedSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('自定义头部 (HTML)')
            .setDesc('在文章顶部插入的 HTML 代码（如关注引导）')
            .addTextArea(text => text
                .setPlaceholder('<div>...</div>')
                .setValue(this.plugin.settingsManager.getSettings().customHeader || '')
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({ customHeader: value });
                }));

        new Setting(containerEl)
            .setName('自定义尾部 (HTML)')
            .setDesc('在文章底部插入的 HTML 代码（如二维码）')
            .addTextArea(text => text
                .setPlaceholder('<div>...</div>')
                .setValue(this.plugin.settingsManager.getSettings().customFooter || '')
                .onChange(async (value) => {
                    await this.plugin.settingsManager.updateSettings({ customFooter: value });
                }));
    }
}
