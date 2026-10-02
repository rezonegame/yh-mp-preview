import type { MPSettings } from '../../settings/settings';
import type { Template } from './templateTypes';
import { isAppearanceV1, legacyTheme, originalPreferences, themeReference, type ThemeReference, type AppearancePreferences } from './themeRevisionRegistry';
import { resolveWechatPalette, type WechatPalette } from './wechatPalette';

export interface AppearanceSnapshot {
    reference: ThemeReference; preferences: AppearancePreferences; fingerprint: string; renderRevision: string; customDefinition?: Template;
}
export interface ResolvedWechatAppearance extends AppearanceSnapshot { template: Template; palette: WechatPalette; }
function fingerprint(value: unknown): string {
    const source = JSON.stringify(value); let hash = 2166136261;
    for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
    return `legacy-${(hash >>> 0).toString(16)}`;
}
export function resolveWechatAppearance(settings: MPSettings, id = settings.templateId): ResolvedWechatAppearance {
    const catalog = settings.templates.concat(settings.customTemplates);
    const selected = catalog.find(template => template.id === id) ?? catalog.find(template => template.id === 'default') ?? legacyTheme('default')!;
    const reference = themeReference(selected);
    // P1 exposes only the frozen legacy revision. Unknown saved revisions are preserved, not executed.
    const template = reference.kind === 'builtin' ? legacyTheme(reference.id) ?? selected : structuredClone(selected);
    const preferences = originalPreferences();
    const palette = resolveWechatPalette(template);
    const renderRevision = 'legacy-presentation-3.19.1';
    return { reference, preferences, template, palette, renderRevision,
        fingerprint: fingerprint({ reference, template, fontFamily: settings.fontFamily, fontSize: settings.fontSize, background: settings.backgrounds.concat(settings.customBackgrounds).find(item => item.id === settings.backgroundId), recipe: settings.v3.selectedRecipeId }),
        ...(reference.kind === 'custom' ? { customDefinition: structuredClone(template) } : {}) };
}
export function snapshotAppearance(settings: MPSettings): AppearanceSnapshot {
    const { template: _template, palette: _palette, ...snapshot } = resolveWechatAppearance(settings);
    return snapshot;
}
/** Appearance conflict key deliberately excludes unrelated settings (contact, visibility, etc.). */
export function appearanceConflictKey(settings: MPSettings): string {
    return JSON.stringify([settings.templateId, settings.fontFamily, settings.fontSize, settings.backgroundId,
        settings.v3.selectedRecipeId, settings.customTemplates, settings.customBackgrounds,
        settings.customHeader, settings.customFooter, settings.layoutEnhancements, settings.wechatAppearance]);
}
export function recordAppearance(settings: MPSettings, reference: ThemeReference, preferences: AppearancePreferences): void {
    if (!isAppearanceV1(settings.wechatAppearance)) throw new Error('外观设置来自较新版本，本版只能预览；请先升级插件。');
    settings.templateId = reference.id;
    settings.wechatAppearance.referencesById[reference.id] = structuredClone(reference);
    settings.wechatAppearance.preferencesByReference[`${reference.id}@${reference.revision}`] = structuredClone(preferences);
}
