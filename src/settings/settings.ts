import { Template } from '../templateManager';
import { Background } from '../backgroundManager';
import { migrateSettingsForV3, type V3SettingsMetadata, V3_SETTINGS_SCHEMA_VERSION } from '../core/migration/settingsMigration';
import { CURATED_THEME_CATALOG_VERSION } from '../core/theme/themeCatalog';
import { DEFAULT_WECHAT_FONT_STACK } from '../core/theme/wechatReadingBaseline';
import { cloneSettings, SettingsRepository } from '../core/settings/settingsRepository';

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
    fontFamily: DEFAULT_WECHAT_FONT_STACK,
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
    private plugin: { loadData(): Promise<unknown>; saveData(data: MPSettings): Promise<void> };
    private repository: SettingsRepository<MPSettings>;
    private get settings(): MPSettings { return this.repository.read(); }
    private set settings(value: MPSettings) { this.repository.initialize(value); }

    constructor(plugin: { loadData(): Promise<unknown>; saveData(data: MPSettings): Promise<void> }) {
        this.plugin = plugin;
        this.repository = new SettingsRepository(DEFAULT_SETTINGS, data => this.plugin.saveData(data));
    }

    async loadSettings() {
        const input: unknown = await this.plugin.loadData();
        const savedData = migrateSettingsForV3(input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}) as Partial<MPSettings>;

        // 总是从代码中加载最新的预设模板
        const { templates } = await import('../templates');
        const codeTemplates: Template[] = Object.values(templates).map(template => ({
            ...template as Template,
            isPreset: true,
            isVisible: true
        }));

        // 如果没有保存的模板数据，直接使用代码中的模板
        if (!savedData.templates || !Array.isArray(savedData.templates) || savedData.templates.length === 0) {
            savedData.templates = codeTemplates;
        } else {
            // 如果有保存的数据，合并新模板
            const savedTemplatesMap = new Map<string, Template>();
            savedData.templates.forEach((t) => {
                if (t && t.id) savedTemplatesMap.set(t.id, t);
            });

            savedData.templates = codeTemplates.map(codeTemplate => {
                const savedTemplate = savedTemplatesMap.get(codeTemplate.id);
                if (savedTemplate) {
                    // 保留用户对预设模板的修改（目前只有 isVisible）
                    // 确保 isVisible 存在，如果不存在默认为 true
                    const isVisible = savedTemplate.isVisible !== undefined ? savedTemplate.isVisible : true;
                    return {
                        ...savedTemplate,
                        ...codeTemplate,
                        isVisible: isVisible
                    };
                }
                // 新增的模板
                return codeTemplate;
            });
        }

        // Catalogue upgrades must never reset a user's preset visibility choices.
        // Featured/legacy placement is presentation metadata, not a saved preference.
        savedData.themeCatalogVersion = CURATED_THEME_CATALOG_VERSION;
        if (savedData.fontFamily === '-apple-system') {
            savedData.fontFamily = DEFAULT_WECHAT_FONT_STACK;
        }

        if (!Array.isArray(savedData.customTemplates)) {
            savedData.customTemplates = [];
        }
        const availableTemplateIds = new Set([
            ...(savedData.templates || []),
            ...savedData.customTemplates,
        ].map((template: Template) => template.id));
        if (!savedData.templateId || !availableTemplateIds.has(savedData.templateId)) {
            // Removed legacy themes (such as quarantined xiaohu themes) must
            // not leave the view without an active template after upgrade.
            savedData.v3 = {
                ...DEFAULT_SETTINGS.v3,
                ...savedData.v3,
                legacyTemplateId: savedData.templateId,
            };
            savedData.templateId = DEFAULT_SETTINGS.templateId;
        }
        if (!Array.isArray(savedData.customFonts)) {
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
            const savedBackgroundsMap = new Map<string, Background>();
            savedData.backgrounds.forEach((b) => {
                if (b && b.id) savedBackgroundsMap.set(b.id, b);
            });

            savedData.backgrounds = codeBackgrounds.map(codeBackground => {
                const savedBackground = savedBackgroundsMap.get(codeBackground.id);
                if (savedBackground) {
                    const isVisible = savedBackground.isVisible !== undefined ? savedBackground.isVisible : true;
                    return {
                        ...savedBackground,
                        ...codeBackground,
                        isVisible: isVisible
                    };
                }
                return codeBackground;
            });
        }

        if (!Array.isArray(savedData.customBackgrounds)) {
            savedData.customBackgrounds = [];
        }
        if (!savedData.customFonts) {
            savedData.customFonts = DEFAULT_SETTINGS.customFonts;
        }
        const loaded = Object.assign(cloneSettings(DEFAULT_SETTINGS), savedData);
        loaded.layoutEnhancements = {
            ...DEFAULT_SETTINGS.layoutEnhancements,
            ...(savedData.layoutEnhancements || {})
        };
        loaded.authorCard = {
            ...DEFAULT_SETTINGS.authorCard,
            ...(savedData.authorCard || {})
        };
        loaded.subscribeCard = {
            ...DEFAULT_SETTINGS.subscribeCard,
            ...(savedData.subscribeCard || {})
        };
        this.settings = loaded;
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
        await this.repository.update(draft => { if (draft.customTemplates.some(t => t.id === template.id)) throw new Error('模板 ID 已存在'); draft.customTemplates.push({ ...cloneSettings(template), isPreset: false, isVisible: true }); });
    }

    async updateTemplate(templateId: string, updatedTemplate: Partial<Template>) {
        return this.repository.update(draft => {
            const items = draft.templates.some(t => t.id === templateId) ? draft.templates : draft.customTemplates;
            const index = items.findIndex(t => t.id === templateId);
            if (index < 0) return false;
            items[index] = { ...items[index], ...cloneSettings(updatedTemplate), id: templateId };
            return true;
        });
    }

    async removeTemplate(templateId: string): Promise<boolean> {
        return this.repository.update(draft => { if (!draft.customTemplates.some(t => t.id === templateId && !t.isPreset)) return false; draft.customTemplates = draft.customTemplates.filter(t => t.id !== templateId); if (draft.templateId === templateId) draft.templateId = 'default'; return true; });
    }

    async saveSettings() {
        await this.repository.update(() => undefined);
    }

    getSettings(): MPSettings {
        return this.settings;
    }

    async updateSettings(settings: Partial<MPSettings>) {
        await this.repository.update(draft => { Object.assign(draft, cloneSettings(settings)); });
    }

    async saveLayoutSnapshot(snapshot: LayoutSnapshot): Promise<void> {
        await this.repository.update(draft => { draft.layoutSnapshots = [cloneSettings(snapshot), ...draft.layoutSnapshots].slice(0, 20); });
    }

    async restoreLayoutSnapshot(snapshot: LayoutSnapshot): Promise<void> {
        await this.repository.update(draft => { Object.assign(draft, {
            templateId: this.getTemplate(snapshot.templateId) ? snapshot.templateId : 'default',
            backgroundId: snapshot.backgroundId,
            fontFamily: snapshot.fontFamily,
            fontSize: snapshot.fontSize,
            v3: {
                ...draft.v3,
                selectedRecipeId: snapshot.recipeId,
            },
        }); });
    }

    getFontOptions() {
        return this.settings.customFonts;
    }

    async addCustomFont(font: { value: string; label: string }) {
        await this.repository.update(draft => { draft.customFonts.push({ ...cloneSettings(font), isPreset: false }); });
    }

    async removeFont(value: string) {
        await this.repository.update(draft => { draft.customFonts = draft.customFonts.filter(f => f.value !== value || f.isPreset); });
    }

    async updateFont(oldValue: string, newFont: { value: string; label: string }) {
        await this.repository.update(draft => { const index = draft.customFonts.findIndex(f => f.value === oldValue && !f.isPreset); if (index >= 0) draft.customFonts[index] = { ...draft.customFonts[index], ...cloneSettings(newFont), isPreset: false }; });
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
        await this.repository.update(draft => { if (draft.customBackgrounds.some(b => b.id === background.id)) throw new Error('背景 ID 已存在'); draft.customBackgrounds.push({ ...cloneSettings(background), isPreset: false, isVisible: true }); });
    }

    async updateBackground(backgroundId: string, updatedBackground: Partial<Background>) {
        return this.repository.update(draft => { const items = draft.backgrounds.some(b => b.id === backgroundId) ? draft.backgrounds : draft.customBackgrounds; const index = items.findIndex(b => b.id === backgroundId); if (index < 0) return false; items[index] = { ...items[index], ...cloneSettings(updatedBackground), id: backgroundId }; return true; });
    }

    async removeBackground(backgroundId: string): Promise<boolean> {
        return this.repository.update(draft => { if (!draft.customBackgrounds.some(b => b.id === backgroundId && !b.isPreset)) return false; draft.customBackgrounds = draft.customBackgrounds.filter(b => b.id !== backgroundId); if (draft.backgroundId === backgroundId) draft.backgroundId = 'default'; return true; });
    }
}
