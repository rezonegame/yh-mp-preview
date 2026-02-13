import { Template } from '../templateManager';
import { Background } from '../backgroundManager';

interface MPSettings {
    backgroundId: string;
    templateId: string;
    fontFamily: string;
    fontSize: number;
    templates: Template[];
    customTemplates: Template[];
    backgrounds: Background[];
    customBackgrounds: Background[];
    customFonts: { value: string; label: string; isPreset?: boolean }[];
    customHeader: string;
    customFooter: string;
}

const DEFAULT_SETTINGS: MPSettings = {
    backgroundId: 'default',
    templateId: 'default',
    fontFamily: '-apple-system',
    fontSize: 16,
    templates: [],
    customTemplates: [],
    backgrounds: [],
    customBackgrounds: [],
    customHeader: '',
    customFooter: '',
    customFonts: [
        {
            value: 'Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, "PingFang SC", Cambria, Cochin, Georgia, Times, "Times New Roman", serif',
            label: '默认字体',
            isPreset: true
        },
        { value: 'SimSun, "宋体", serif', label: '宋体', isPreset: true },
        { value: 'SimHei, "黑体", sans-serif', label: '黑体', isPreset: true },
        { value: 'KaiTi, "楷体", serif', label: '楷体', isPreset: true },
        { value: '"Microsoft YaHei", "微软雅黑", sans-serif', label: '雅黑', isPreset: true }
    ],
};

export class SettingsManager {
    private plugin: any;
    private settings: MPSettings;

    constructor(plugin: any) {
        this.plugin = plugin;
        this.settings = DEFAULT_SETTINGS;
    }

    async loadSettings() {
        let savedData = await this.plugin.loadData();
        if (!savedData) {
            savedData = {};
        }

        // 总是从代码中加载最新的预设模板
        const { templates } = await import('../templates');
        const codeTemplates = Object.values(templates).map(template => ({
            ...template,
            isPreset: true,
            isVisible: true
        }));

        // 如果没有保存的模板数据，直接使用代码中的模板
        if (!savedData.templates || !Array.isArray(savedData.templates) || savedData.templates.length === 0) {
            savedData.templates = codeTemplates;
        } else {
            // 如果有保存的数据，合并新模板
            const savedTemplatesMap = new Map<string, any>();
            savedData.templates.forEach((t: any) => {
                if (t && t.id) savedTemplatesMap.set(t.id, t);
            });

            savedData.templates = codeTemplates.map(codeTemplate => {
                const savedTemplate = savedTemplatesMap.get(codeTemplate.id);
                if (savedTemplate) {
                    // 保留用户对预设模板的修改（目前只有 isVisible）
                    // 确保 isVisible 存在，如果不存在默认为 true
                    const isVisible = savedTemplate.isVisible !== undefined ? savedTemplate.isVisible : true;
                    return {
                        ...codeTemplate,
                        isVisible: isVisible
                    };
                }
                // 新增的模板
                return codeTemplate;
            });
        }

        if (!savedData.customTemplates) {
            savedData.customTemplates = [];
        }
        if (!savedData.customFonts) {
            savedData.customFonts = DEFAULT_SETTINGS.customFonts;
        }

        // 加载背景设置 -同样的逻辑
        const { backgrounds } = await import('../backgrounds');
        const codeBackgrounds = backgrounds.backgrounds.map(background => ({
            ...background,
            isPreset: true,
            isVisible: true
        }));

        if (!savedData.backgrounds || !Array.isArray(savedData.backgrounds) || savedData.backgrounds.length === 0) {
            savedData.backgrounds = codeBackgrounds;
        } else {
            const savedBackgroundsMap = new Map<string, any>();
            savedData.backgrounds.forEach((b: any) => {
                if (b && b.id) savedBackgroundsMap.set(b.id, b);
            });

            savedData.backgrounds = codeBackgrounds.map(codeBackground => {
                const savedBackground = savedBackgroundsMap.get(codeBackground.id);
                if (savedBackground) {
                    const isVisible = savedBackground.isVisible !== undefined ? savedBackground.isVisible : true;
                    return {
                        ...codeBackground,
                        isVisible: isVisible
                    };
                }
                return codeBackground;
            });
        }

        if (!savedData.customBackgrounds) {
            savedData.customBackgrounds = [];
        }
        if (!savedData.customFonts) {
            savedData.customFonts = DEFAULT_SETTINGS.customFonts;
        }
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
    }

    getAllTemplates(): Template[] {
        return [...this.settings.templates, ...this.settings.customTemplates];
    }

    getVisibleTemplates(): Template[] {
        return this.getAllTemplates().filter(template => template.isVisible !== false);
    }

    getTemplate(templateId: string): Template | undefined {
        return this.settings.templates.find(template => template.id === templateId)
            || this.settings.customTemplates.find(template => template.id === templateId);
    }

    async addCustomTemplate(template: Template) {
        template.isPreset = false;
        template.isVisible = true;  // 默认可见
        this.settings.customTemplates.push(template);
        await this.saveSettings();
    }

    async updateTemplate(templateId: string, updatedTemplate: Partial<Template>) {
        const presetTemplateIndex = this.settings.templates.findIndex(t => t.id === templateId);
        if (presetTemplateIndex !== -1) {
            this.settings.templates[presetTemplateIndex] = {
                ...this.settings.templates[presetTemplateIndex],
                ...updatedTemplate
            };
            await this.saveSettings();
            return true;
        }

        const customTemplateIndex = this.settings.customTemplates.findIndex(t => t.id === templateId);
        if (customTemplateIndex !== -1) {
            this.settings.customTemplates[customTemplateIndex] = {
                ...this.settings.customTemplates[customTemplateIndex],
                ...updatedTemplate
            };
            await this.saveSettings();
            return true;
        }

        return false;
    }

    async removeTemplate(templateId: string): Promise<boolean> {
        const template = this.getTemplate(templateId);
        if (template && !template.isPreset) {
            this.settings.customTemplates = this.settings.customTemplates.filter(t => t.id !== templateId);
            if (this.settings.templateId === templateId) {
                this.settings.templateId = 'default';
            }
            await this.saveSettings();
            return true;
        }
        return false;
    }

    async saveSettings() {
        await this.plugin.saveData(this.settings);
    }

    getSettings(): MPSettings {
        return this.settings;
    }

    async updateSettings(settings: Partial<MPSettings>) {
        this.settings = { ...this.settings, ...settings };
        await this.saveSettings();
    }

    getFontOptions() {
        return this.settings.customFonts;
    }

    async addCustomFont(font: { value: string; label: string }) {
        this.settings.customFonts.push({ ...font, isPreset: false });
        await this.saveSettings();
    }

    async removeFont(value: string) {
        const font = this.settings.customFonts.find(f => f.value === value);
        if (font && !font.isPreset) {
            this.settings.customFonts = this.settings.customFonts.filter(f => f.value !== value);
            await this.saveSettings();
        }
    }

    async updateFont(oldValue: string, newFont: { value: string; label: string }) {
        const index = this.settings.customFonts.findIndex(f => f.value === oldValue);
        if (index !== -1 && !this.settings.customFonts[index].isPreset) {
            this.settings.customFonts[index] = { ...newFont, isPreset: false };
            await this.saveSettings();
        }
    }

    // 背景相关方法
    getAllBackgrounds(): Background[] {
        return [...this.settings.backgrounds, ...this.settings.customBackgrounds];
    }

    getVisibleBackgrounds(): Background[] {
        return this.getAllBackgrounds().filter(background => background.isVisible !== false);
    }

    getBackground(backgroundId: string): Background | undefined {
        return this.settings.backgrounds.find(background => background.id === backgroundId)
            || this.settings.customBackgrounds.find(background => background.id === backgroundId);
    }

    async addCustomBackground(background: Background) {
        background.isPreset = false;
        background.isVisible = true;  // 默认可见
        this.settings.customBackgrounds.push(background);
        await this.saveSettings();
    }

    async updateBackground(backgroundId: string, updatedBackground: Partial<Background>) {
        const presetBackgroundIndex = this.settings.backgrounds.findIndex(b => b.id === backgroundId);
        if (presetBackgroundIndex !== -1) {
            this.settings.backgrounds[presetBackgroundIndex] = {
                ...this.settings.backgrounds[presetBackgroundIndex],
                ...updatedBackground
            };
            await this.saveSettings();
            return true;
        }

        const customBackgroundIndex = this.settings.customBackgrounds.findIndex(b => b.id === backgroundId);
        if (customBackgroundIndex !== -1) {
            this.settings.customBackgrounds[customBackgroundIndex] = {
                ...this.settings.customBackgrounds[customBackgroundIndex],
                ...updatedBackground
            };
            await this.saveSettings();
            return true;
        }

        return false;
    }

    async removeBackground(backgroundId: string): Promise<boolean> {
        const background = this.getBackground(backgroundId);
        if (background && !background.isPreset) {
            this.settings.customBackgrounds = this.settings.customBackgrounds.filter(b => b.id !== backgroundId);
            if (this.settings.backgroundId === backgroundId) {
                this.settings.backgroundId = 'default';
            }
            await this.saveSettings();
            return true;
        }
        return false;
    }
}