import { setSafeInlineStyle } from '../core/security/safeDom';
import { App, Modal, Setting, Notice, type SliderComponent } from 'obsidian';
import { Background } from '../backgroundManager';
import { nanoid } from '../utils/nanoid';
import { cloneSettings } from '../core/settings/settingsRepository';
import { submitDraft } from '../ui/submitDraft';

interface CssTemplate {
    name: string;
    style: string;
    settings: string[];
}

export class CreateBackgroundModal extends Modal {
    private onSubmit: (background: Background) => void | Promise<void>;
    private background: Background;
    private isEditing: boolean;

    // 背景属性
    private backgroundType: 'color' | 'css' = 'color';
    private backgroundColor: string = '#f5f5f5';
    private backgroundCssStyle: string = '';
    private cssTemplateType: string = 'custom';
    private patternColor: string = 'rgba(50, 0, 0, 0.03)';
    private patternSize: number = 20;
    private opacityControl?: SliderComponent;
    private sizeControl?: SliderComponent;

    // 预设的CSS模板
    private cssTemplates: Record<string, CssTemplate> = {
        custom: {
            name: '自定义',
            style: '',
            settings: ['custom']
        },
        grid: {
            name: '网格',
            style: 'background-image: linear-gradient(90deg, rgba(50, 0, 0, 0.03) 2%, transparent 2%), linear-gradient(360deg, rgba(50, 0, 0, 0.03) 2%, transparent 2%); background-size: 20px 20px;',
            settings: ['color', 'size']
        },
        diagonalStripes: {
            name: '对角条纹',
            style: 'background-image: linear-gradient(135deg, rgba(50, 0, 0, 0.05) 25%, transparent 25%, transparent 50%, rgba(50, 0, 0, 0.05) 50%, rgba(50, 0, 0, 0.05) 75%, transparent 75%, transparent); background-size: 20px 20px;',
            settings: ['color', 'size']
        },
        polkaDots: {
            name: '波尔卡圆点',
            style: 'background-image: radial-gradient(circle, rgba(50, 0, 0, 0.05) 10%, transparent 10%); background-size: 20px 20px;',
            settings: ['color', 'size']
        },
        zigzag: {
            name: '锯齿形',
            style: 'background-image: linear-gradient(135deg, rgba(50, 0, 0, 0.05) 25%, transparent 25%, transparent 50%, rgba(50, 0, 0, 0.05) 50%, rgba(50, 0, 0, 0.05) 75%, transparent 75%, transparent); background-size: 20px 20px; background-position: 0 0, 10px 10px;',
            settings: ['color', 'size']
        },
        honeycomb: {
            name: '蜂窝',
            style: 'background-image: linear-gradient(30deg, rgba(50, 0, 0, 0.05) 12%, transparent 12%, transparent 50%, rgba(50, 0, 0, 0.05) 50%, rgba(50, 0, 0, 0.05) 62%, transparent 62%, transparent); background-size: 20px 35px;',
            settings: ['color', 'size']
        },
        wave: {
            name: '波浪',
            style: 'background-image: linear-gradient(45deg, rgba(50, 0, 0, 0.04) 12%, transparent 12%, transparent 88%, rgba(50, 0, 0, 0.04) 88%), linear-gradient(135deg, rgba(50, 0, 0, 0.04) 12%, transparent 12%, transparent 88%, rgba(50, 0, 0, 0.04) 88%); background-size: 30px 30px; background-position: 0 0, 0 0, 15px 15px, 15px 15px;',
            settings: ['color', 'size']
        },
        checkerboard: {
            name: '棋盘',
            style: 'background-image: linear-gradient(45deg, rgba(50, 0, 0, 0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(50, 0, 0, 0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(50, 0, 0, 0.04) 75%), linear-gradient(-45deg, transparent 75%, rgba(50, 0, 0, 0.04) 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px;',
            settings: ['color', 'size']
        }
    };

    constructor(
        app: App,
        onSubmit: (background: Background) => void | Promise<void>,
        background?: Background
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.isEditing = !!background;

        if (background) {
            this.background = cloneSettings(background);
            // 从 style 中解析出类型和相关属性
            this.parseStyleToProperties(background.style);
        } else {
            this.background = {
                id: nanoid(),
                name: '',
                style: 'background-color: #f5f5f5;'
            };
            this.backgroundType = 'color';
            this.backgroundColor = '#f5f5f5';
        }
    }

    // 从 style 字符串中解析出背景类型和相关属性
    private parseStyleToProperties(style: string) {
        if (style.includes('background-color:')) {
            this.backgroundType = 'color';
            const colorMatch = style.match(/background-color: (#[a-fA-F0-9]+)/);
            if (colorMatch && colorMatch[1]) {
                this.backgroundColor = colorMatch[1];
            }
        } else {
            this.backgroundType = 'css';
            // 移除基本样式，保留自定义 CSS
            this.backgroundCssStyle = style.replace(/box-sizing: border-box; margin: 0; padding: 0;/, '').trim();

            // 尝试匹配预设模板
            let matched = false;
            for (const [key, template] of Object.entries(this.cssTemplates)) {
                if (key === 'custom') continue;

                if (this.backgroundCssStyle === template.style) {
                    this.cssTemplateType = key;
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                this.cssTemplateType = 'custom';
            }
        }
    }

    // 解析CSS样式到各个组件
    private parseCssToComponents() {
        // 提取颜色
        const colorMatch = this.backgroundCssStyle.match(/rgba?\([^)]+\)/);
        if (colorMatch) {
            this.patternColor = colorMatch[0];
        }

        // 提取大小
        const sizeMatch = this.backgroundCssStyle.match(/background-size:\s*(\d+)px/);
        if (sizeMatch && sizeMatch[1]) {
            this.patternSize = parseInt(sizeMatch[1]);
        }
    }

    // 更新图案颜色（保持透明度不变）
    private updatePatternColor(hexColor: string) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // 提取当前透明度
        let alpha = 0.03;
        const alphaMatch = this.patternColor.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
        if (alphaMatch && alphaMatch[1]) {
            alpha = parseFloat(alphaMatch[1]);
        }

        this.patternColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // 更新图案透明度（保持颜色不变）
    private updatePatternOpacity(opacity: number) {
        const colorMatch = this.patternColor.match(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/);
        if (colorMatch) {
            const [_, r, g, b] = colorMatch;
            this.patternColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else {
            // 如果之前不是rgba格式，转换为rgba
            const r = parseInt(this.patternColor.slice(1, 3), 16);
            const g = parseInt(this.patternColor.slice(3, 5), 16);
            const b = parseInt(this.patternColor.slice(5, 7), 16);
            this.patternColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
    }

    // 根据当前组件设置更新CSS样式
    private updateCssStyle() {
        if (this.cssTemplateType === 'custom') {
            return; // 自定义模式下不自动更新CSS
        }

        const template = this.cssTemplates[this.cssTemplateType];
        if (!template) return;

        // 替换模板中的颜色和大小
        let style = template.style;

        // 替换所有颜色
        style = style.replace(/rgba\([^)]+\)/g, this.patternColor);

        // 替换所有大小
        style = style.replace(/(\d+)px/g, `${this.patternSize}px`);

        this.backgroundCssStyle = style;
    }

    // 根据模板类型更新设置项的可见性
    private updateSettingsVisibility(cssSection: HTMLElement, templateType: string) {
        const template = this.cssTemplates[templateType];
        if (!template) return;

        // 获取所有可能的设置项容器
        const colorSettingContainer = cssSection.querySelector('.pattern-color-setting');
        const sizeSettingContainer = cssSection.querySelector('.pattern-size-setting');
        const customCssContainer = cssSection.querySelector('.custom-css-container');

        // 根据模板需要的设置项显示或隐藏
        if (colorSettingContainer) {
            colorSettingContainer.toggleClass('is-hidden', !template.settings.includes('color'));
        }

        if (sizeSettingContainer) {
            sizeSettingContainer.toggleClass('is-hidden', !template.settings.includes('size'));
        }

        if (customCssContainer) {
            customCssContainer.toggleClass('is-hidden', !template.settings.includes('custom'));

            // 如果显示自定义CSS，同时显示文本区域
            const customCssTextArea = cssSection.querySelector('.custom-css-textarea');
            if (customCssTextArea && template.settings.includes('custom')) {
                customCssTextArea.toggleClass('is-hidden', false);
            }
        }
    }

    // 更新类型特定设置的可见性
    private updateTypeSpecificSettings() {
        const colorSection = this.contentEl.querySelector('.background-color-section');
        const cssSection = this.contentEl.querySelector('.background-css-section');

        if (colorSection && cssSection) {
            colorSection.toggleClass('is-hidden', this.backgroundType !== 'color');
            cssSection.toggleClass('is-hidden', this.backgroundType !== 'css');

            // 如果切换到CSS背景类型，根据当前模板更新设置项可见性
            if (this.backgroundType === 'css') {
                this.updateSettingsVisibility(cssSection as HTMLElement, this.cssTemplateType);
            }
        }

        const previewEl = this.contentEl.querySelector('.background-preview');
        if (previewEl) {
            this.updatePreview(previewEl as HTMLElement);
        }
    }

    // 更新预览区域
    private updatePreview(previewEl?: HTMLElement) {
        const el = previewEl || this.contentEl.querySelector('.background-preview');
        if (!el) return;

        let style = '';
        switch (this.backgroundType) {
            case 'color':
                style = `background-color: ${this.backgroundColor};`;
                break;
            case 'css':
                style = this.backgroundCssStyle;
                break;
        }

        setSafeInlineStyle(el, style);
    }

    // 生成最终样式
    private generateStyle() {
        let style = 'box-sizing: border-box; margin: 0; padding: 0; ';

        switch (this.backgroundType) {
            case 'color':
                style += `background-color: ${this.backgroundColor};`;
                break;
            case 'css':
                style += this.backgroundCssStyle;
                break;
        }

        this.background.style = style;
    }

    // 表单验证
    private validateForm(): boolean {
        if (!this.background.name) {
            new Notice('请输入背景名称');
            return false;
        }

        switch (this.backgroundType) {
            case 'color':
                if (!this.backgroundColor) {
                    new Notice('请选择背景颜色');
                    return false;
                }
                break;
            case 'css':
                if (!this.backgroundCssStyle) {
                    new Notice('请输入CSS样式');
                    return false;
                }
                break;
        }

        return true;
    }

    // 打开模态框时的处理
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('mp-background-modal');

        // 标题
        contentEl.createEl('h2', { text: this.isEditing ? '编辑背景' : '创建新背景' });

        // 基本信息
        const basicSection = contentEl.createDiv('background-basic-section');

        // 背景名称
        new Setting(basicSection)
            .setName('背景名称')
            .setDesc('输入背景的名称')
            .addText(text => {
                text.setValue(this.background.name || '')
                    .onChange(value => {
                        this.background.name = value;
                    });
            });

        // 背景类型
        new Setting(basicSection)
            .setName('背景类型')
            .setDesc('选择背景的类型')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('color', '纯色背景')
                    .addOption('css', 'CSS背景图案')
                    .setValue(this.backgroundType)
                    .onChange(value => {
                        this.backgroundType = value as 'color' | 'css';
                        this.updateTypeSpecificSettings();
                    });
            });

        // 类型特定设置容器
        const typeSpecificSection = contentEl.createDiv('background-type-specific-section');

        // 纯色背景设置
        const colorSection = typeSpecificSection.createDiv('background-color-section');
        new Setting(colorSection)
            .setName('背景颜色')
            .setDesc('选择背景的颜色')
            .addColorPicker(color => {
                color.setValue(this.backgroundColor)
                    .onChange(value => {
                        this.backgroundColor = value;
                        this.updatePreview();
                    });
            });

        // CSS背景图案设置
        const cssSection = typeSpecificSection.createDiv('background-css-section');

        // 添加模板选择下拉框
        new Setting(cssSection)
            .setName('背景模板')
            .setDesc('选择预设的背景模板')
            .addDropdown(dropdown => {
                for (const [key, template] of Object.entries(this.cssTemplates)) {
                    dropdown.addOption(key, template.name);
                }
                dropdown.setValue(this.cssTemplateType)
                    .onChange(value => {
                        this.cssTemplateType = value;
                        if (value !== 'custom') {
                            this.backgroundCssStyle = this.cssTemplates[value].style;

                            // 解析CSS样式到各个组件
                            this.parseCssToComponents();

                            // 更新UI控件以反映当前模板的设置
                            const colorPicker = cssSection.querySelector('input[type="color"]');
                            const opacitySlider = cssSection.querySelector('.slider');
                            const sizeSlider = cssSection.querySelectorAll('.slider')[1];

                            if (colorPicker) {
                                // 从rgba提取十六进制颜色
                                const rgbaMatch = this.patternColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                                if (rgbaMatch) {
                                    const [_, r, g, b] = rgbaMatch;
                                    const hexColor = '#' +
                                        parseInt(r).toString(16).padStart(2, '0') +
                                        parseInt(g).toString(16).padStart(2, '0') +
                                        parseInt(b).toString(16).padStart(2, '0');
                                    (colorPicker as HTMLInputElement).value = hexColor;
                                }
                            }

                            if (opacitySlider) {
                                const opacityMatch = this.patternColor.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
                                if (opacityMatch && opacityMatch[1]) {
                                    const opacity = parseFloat(opacityMatch[1]) * 100;
                                    // 使用类型断言来访问__component__属性
                                    this.opacityControl?.setValue(opacity);
                                }
                            }

                            if (sizeSlider) {
                                // 使用类型断言来访问__component__属性
                                this.sizeControl?.setValue(this.patternSize);
                            }
                        }

                        // 更新自定义CSS区域的可见性
                        const customCssContainer = cssSection.querySelector('.custom-css-container');
                        const customCssTextArea = cssSection.querySelector('.custom-css-textarea');
                        if (customCssContainer && customCssTextArea) {
                            const isCustom = value === 'custom';
                            customCssTextArea.toggleClass('is-hidden', !isCustom);
                        }

                        // 更新CSS设置项的可见性
                        this.updateSettingsVisibility(cssSection, value);

                        this.updatePreview();
                    });
            });

        // 背景颜色设置
        const colorSettingContainer = cssSection.createDiv('pattern-color-setting');
        new Setting(colorSettingContainer)
            .setName('图案颜色')
            .setDesc('设置背景图案的颜色')
            .addColorPicker(color => {
                // 从rgba提取十六进制颜色
                const rgbaMatch = this.patternColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                let hexColor = '#320000'; // 默认颜色

                if (rgbaMatch) {
                    const [_, r, g, b] = rgbaMatch;
                    hexColor = '#' +
                        parseInt(r).toString(16).padStart(2, '0') +
                        parseInt(g).toString(16).padStart(2, '0') +
                        parseInt(b).toString(16).padStart(2, '0');
                }

                color.setValue(hexColor)
                    .onChange(value => {
                        // 更新颜色但保持透明度
                        this.updatePatternColor(value);
                        this.updateCssStyle();
                        this.updatePreview();
                    });
            })
            .addSlider(slider => {
                this.opacityControl = slider;
                // 提取当前透明度
                let opacity = 3; // 默认透明度3%
                const alphaMatch = this.patternColor.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
                if (alphaMatch && alphaMatch[1]) {
                    opacity = parseFloat(alphaMatch[1]) * 100;
                }

                slider.setLimits(0, 100, 1)
                    .setValue(opacity)
                    .setDynamicTooltip()
                    .onChange(value => {
                        // 更新透明度但保持颜色
                        this.updatePatternOpacity(value / 100);
                        this.updateCssStyle();
                        this.updatePreview();
                    });
            });

        // 图案大小设置
        const sizeSettingContainer = cssSection.createDiv('pattern-size-setting');
        new Setting(sizeSettingContainer)
            .setName('图案大小')
            .setDesc('设置背景图案的大小')
            .addSlider(slider => {
                this.sizeControl = slider;
                slider.setLimits(5, 50, 1)
                    .setValue(this.patternSize) // 使用当前模板的大小
                    .setDynamicTooltip()
                    .onChange(value => {
                        this.patternSize = value;
                        this.updateCssStyle();
                        this.updatePreview();
                    });
            });

        // 自定义CSS容器
        const customCssContainer = cssSection.createDiv('custom-css-container');
        const customCssTextArea = customCssContainer.createDiv('custom-css-textarea');
        customCssTextArea.toggleClass('is-hidden', this.cssTemplateType !== 'custom');

        new Setting(customCssTextArea)
            .setName('CSS代码')
            .setDesc('直接输入CSS样式代码')
            .addTextArea(text => {
                text.setValue(this.backgroundCssStyle)
                    .onChange(value => {
                        this.backgroundCssStyle = value;
                        this.updatePreview();
                    });
                text.inputEl.rows = 10;
                text.inputEl.cols = 50;
            });

        // 背景预览
        const previewSection = contentEl.createDiv('background-preview-section');
        previewSection.createEl('h3', { text: '预览' });
        const previewEl = previewSection.createDiv('background-preview');
        previewEl.createSpan({ text: '预览效果' });
        this.updatePreview(previewEl);

        // 按钮区域
        const buttonSection = contentEl.createDiv('background-button-section');
        new Setting(buttonSection)
            .addButton(btn => {
                btn.setButtonText('取消')
                    .onClick(() => {
                        this.close();
                    });
            })
            .addButton(btn => {
                btn.setButtonText(this.isEditing ? '保存' : '创建')
                    .setCta()
                    .onClick(() => {
                        if (!this.validateForm()) {
                            return;
                        }
                        this.generateStyle();
                        void submitDraft(btn, async () => { await this.onSubmit(cloneSettings(this.background)); }, () => this.close());
                    });
            });

        // 初始化类型特定设置
        this.updateTypeSpecificSettings();
    }

    // 关闭模态框时的处理
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
