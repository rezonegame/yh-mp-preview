import { Template } from '../templateManager';
import { Background } from '../backgroundManager';
import { migrateSettingsForV3, type V3SettingsMetadata, V3_SETTINGS_SCHEMA_VERSION } from '../core/migration/settingsMigration';
import { CURATED_THEME_CATALOG_VERSION } from '../core/theme/themeCatalog';

export interface MPSettings {
    schemaVersion: number;
    v3: V3SettingsMetadata;
    backgroundId: string;
    templateId: string;
    fontFamily: string;
    fontSize: number;
    themeCatalogVersion?: number;
    templates: Template[];
    customTemplates: Template[];
    backgrounds: Background[];
    customBackgrounds: Background[];
    customFonts: { value: string; label: string; isPreset?: boolean }[];
    customHeader: string;
    customFooter: string;
    enableFrontMatterCard: boolean;
    layoutEnhancements: {
        enableAutoToc: boolean;
        tocMinHeadings: number;
        enableTaskListEnhancement: boolean;
        enableImageCaptions: boolean;
        enableTableEnhancement: boolean;
        enableAuthorCard: boolean;
        enableSubscribeCard: boolean;
    };
    authorCard: {
        name: string;
        role: string;
        bio: string;
        tags: string;
        link: string;
        avatar: string;
    };
    subscribeCard: {
        label: string;
        title: string;
        subtitle: string;
        primary: string;
        secondary: string;
        note: string;
        qrcode: string;
    };
    layoutSnapshots: LayoutSnapshot[];
}

export interface LayoutSnapshot {
    id: string;
    createdAt: string;
    filePath: string;
    contentHash: string;
    templateId: string;
    backgroundId: string;
    fontFamily: string;
    fontSize: number;
    recipeId: string;
    validation: { errors: number; warnings: number };
}

const DEFAULT_SETTINGS: MPSettings = {
    schemaVersion: V3_SETTINGS_SCHEMA_VERSION,
    v3: {
        enabled: false,
        selectedRecipeId: 'legacy-compatible',
        migrationSource: 'v2',
    },
    backgroundId: 'default',
    templateId: 'default',
    fontFamily: '-apple-system',
    fontSize: 16,
    themeCatalogVersion: CURATED_THEME_CATALOG_VERSION,
    templates: [],
    customTemplates: [],
    backgrounds: [],
    customBackgrounds: [],
    customHeader: '',
    customFooter: '',
    enableFrontMatterCard: false,
    layoutEnhancements: {
        enableAutoToc: false,
        tocMinHeadings: 3,
        enableTaskListEnhancement: true,
        enableImageCaptions: true,
        enableTableEnhancement: true,
        enableAuthorCard: false,
        enableSubscribeCard: false,
    },
    authorCard: {
        name: '',
        role: '',
        bio: '',
        tags: '',
        link: '',
        avatar: '',
    },
    subscribeCard: {
        label: '持续更新',
        title: '',
        subtitle: '',
        primary: '关注公众号',
        secondary: '收藏这篇',
        note: '',
        qrcode: '',
    },
    layoutSnapshots: [],
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
        savedData = migrateSettingsForV3(savedData);

        // 总是从代码中加载最新的预设模板
        const { templates } = await import('../templates');
        const codeTemplates = Object.values(templates).map(template => ({
            ...template,
            isPreset: true,
            isVisible: true
        }));
        const shouldCuratePresetVisibility = (savedData.themeCatalogVersion || 0) < CURATED_THEME_CATALOG_VERSION;

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

        // Version 2 removes legacy palettes from the distribution. All
        // retained frameworks are immediately available in the gallery.
        if (shouldCuratePresetVisibility) {
            savedData.templates = savedData.templates.map((template: Template) => ({
                ...template,
                isVisible: true,
            }));
            savedData.themeCatalogVersion = CURATED_THEME_CATALOG_VERSION;
        }

        if (!savedData.customTemplates) {
            savedData.customTemplates = [];
        }
        const availableTemplateIds = new Set([
            ...savedData.templates,
            ...savedData.customTemplates,
        ].map((template: Template) => template.id));
        if (!availableTemplateIds.has(savedData.templateId)) {
            // Removed legacy themes (such as quarantined xiaohu themes) must
            // not leave the view without an active template after upgrade.
            savedData.v3 = {
                ...savedData.v3,
                legacyTemplateId: savedData.templateId,
            };
            savedData.templateId = DEFAULT_SETTINGS.templateId;
        }
        if (!savedData.customFonts) {
            savedData.customFonts = DEFAULT_SETTINGS.customFonts;
        }
        if (!Array.isArray(savedData.layoutSnapshots)) {
            savedData.layoutSnapshots = [];
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
        this.settings.layoutEnhancements = {
            ...DEFAULT_SETTINGS.layoutEnhancements,
            ...(savedData.layoutEnhancements || {})
        };
        this.settings.authorCard = {
            ...DEFAULT_SETTINGS.authorCard,
            ...(savedData.authorCard || {})
        };
        this.settings.subscribeCard = {
            ...DEFAULT_SETTINGS.subscribeCard,
            ...(savedData.subscribeCard || {})
        };
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

    async saveLayoutSnapshot(snapshot: LayoutSnapshot): Promise<void> {
        this.settings.layoutSnapshots = [snapshot, ...this.settings.layoutSnapshots]
            .slice(0, 20);
        await this.saveSettings();
    }

    async restoreLayoutSnapshot(snapshot: LayoutSnapshot): Promise<void> {
        this.settings = {
            ...this.settings,
            templateId: this.getTemplate(snapshot.templateId) ? snapshot.templateId : 'default',
            backgroundId: snapshot.backgroundId,
            fontFamily: snapshot.fontFamily,
            fontSize: snapshot.fontSize,
            v3: {
                ...this.settings.v3,
                selectedRecipeId: snapshot.recipeId,
            },
        };
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
