import { Template } from '../templateManager';
import { Background } from '../backgroundManager';
import { migrateSettingsForV3, type V3SettingsMetadata, V3_SETTINGS_SCHEMA_VERSION } from '../core/migration/settingsMigration';
import { CURATED_THEME_CATALOG_VERSION } from '../core/theme/themeCatalog';
import { DEFAULT_WECHAT_FONT_STACK } from '../core/theme/wechatReadingBaseline';
import { cloneSettings, SettingsRepository } from '../core/settings/settingsRepository';
import { mergePresetCatalog } from '../core/settings/catalogMerge';

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
        ['系统默认', DEFAULT_WECHAT_FONT_STACK], ['宋体', 'SimSun, "宋体", serif'],
        ['黑体', 'SimHei, "黑体", sans-serif'], ['楷体', 'KaiTi, "楷体", serif'],
        ['雅黑', '"Microsoft YaHei", "微软雅黑", sans-serif'],
    ].map(([label, value]) => ({ label, value, isPreset: true })),
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

    async loadSettings(): Promise<void> {
        const input = await this.plugin.loadData();
        const object = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
        const savedData = migrateSettingsForV3(object) as Partial<MPSettings>;
        const [themeModule, backgroundModule] = await Promise.all([import('../templates'), import('../backgrounds')]);
        const loaded = Object.assign(cloneSettings(DEFAULT_SETTINGS), savedData);
        loaded.templates = mergePresetCatalog(Object.values(themeModule.templates) as Template[], savedData.templates);
        loaded.backgrounds = mergePresetCatalog(backgroundModule.backgrounds.backgrounds, savedData.backgrounds);
        for (const key of ['customTemplates', 'customBackgrounds', 'layoutSnapshots'] as const) {
            if (!Array.isArray(loaded[key])) Object.assign(loaded, { [key]: [] });
        }
        if (!Array.isArray(loaded.customFonts)) loaded.customFonts = cloneSettings(DEFAULT_SETTINGS.customFonts);
        for (const key of ['layoutEnhancements', 'authorCard', 'subscribeCard', 'v3'] as const) {
            Object.assign(loaded, { [key]: { ...cloneSettings(DEFAULT_SETTINGS[key]), ...(savedData[key] || {}) } });
        }
        savedData.themeCatalogVersion = CURATED_THEME_CATALOG_VERSION;
        loaded.themeCatalogVersion = savedData.themeCatalogVersion;
        if (savedData.fontFamily === '-apple-system') loaded.fontFamily = DEFAULT_WECHAT_FONT_STACK;
        const available = new Set(loaded.templates.concat(loaded.customTemplates).map(theme => theme.id));
        if (!available.has(loaded.templateId)) {
            loaded.v3.legacyTemplateId = loaded.templateId;
            loaded.templateId = DEFAULT_SETTINGS.templateId;
        }
        this.repository.initialize(loaded);
    }

    private templateCatalog(): Template[] {
        const state = this.repository.read();
        return state.templates.concat(state.customTemplates);
    }
    getAllTemplates(): Template[] { return this.templateCatalog(); }
    getVisibleTemplates(): Template[] { return this.templateCatalog().filter(({ isVisible }) => isVisible !== false); }
    getTemplate(templateId: string): Template | undefined { return this.templateCatalog().find(({ id }) => id === templateId); }

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
        const fonts = this.settings.customFonts;
        return fonts.some(font => font.value === DEFAULT_WECHAT_FONT_STACK)
            ? fonts : [{ value: DEFAULT_WECHAT_FONT_STACK, label: '系统默认', isPreset: true }, ...fonts];
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

    private backgroundCatalog(): Background[] {
        const state = this.repository.read();
        return state.backgrounds.concat(state.customBackgrounds);
    }
    getAllBackgrounds(): Background[] { return this.backgroundCatalog(); }
    getVisibleBackgrounds(): Background[] { return this.backgroundCatalog().filter(({ isVisible }) => isVisible !== false); }
    getBackground(backgroundId: string): Background | undefined { return this.backgroundCatalog().find(({ id }) => id === backgroundId); }

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
