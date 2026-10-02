import legacyDefinitions from './legacy-3.19.1.json';
import type { Template } from './templateTypes';

/** Never replace this revision's definitions when adding a later theme release. */
export const LEGACY_THEME_REVISION = 'legacy-3.19.1';
export interface ThemeReference { id: string; kind: 'builtin' | 'custom'; revision: string; }
export interface AppearancePreferences { paletteId: string; density: 'theme' | 'compact' | 'airy'; }
export interface WechatAppearanceSettings {
    schemaVersion: 1;
    referencesById: Record<string, ThemeReference>;
    preferencesByReference: Record<string, AppearancePreferences>;
}
export const originalPreferences = (): AppearancePreferences => ({ paletteId: 'original', density: 'theme' });
export function themeReference(template: Template): ThemeReference {
    return { id: template.id, kind: template.isPreset ? 'builtin' : 'custom', revision: template.isPreset ? LEGACY_THEME_REVISION : 'custom' };
}
export function legacyTheme(id: string): Template | undefined {
    const definition = (legacyDefinitions as unknown as Record<string, Template>)[id];
    return definition ? { ...structuredClone(definition), isPreset: true } : undefined;
}
export function isAppearanceV1(value: unknown): value is WechatAppearanceSettings {
    if (!value || typeof value !== 'object') return false;
    const object = value as Partial<WechatAppearanceSettings>;
    return object.schemaVersion === 1 && !!object.referencesById && typeof object.referencesById === 'object'
        && !Array.isArray(object.referencesById) && !!object.preferencesByReference && typeof object.preferencesByReference === 'object'
        && !Array.isArray(object.preferencesByReference);
}
/** Read migration only. Unknown future schemas/values remain untouched. */
export function migrateWechatAppearance(value: unknown, templates: Template[]): unknown {
    if (value !== undefined) return structuredClone(value);
    return { schemaVersion: 1, referencesById: Object.fromEntries(templates.map(template => [template.id, themeReference(template)])),
        preferencesByReference: Object.fromEntries(templates.map(template => { const ref = themeReference(template); return [`${ref.id}@${ref.revision}`, originalPreferences()]; })) } satisfies WechatAppearanceSettings;
}
