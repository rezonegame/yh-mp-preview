import { cloneSettings } from './settingsRepository';

interface CatalogEntry { id: string; isVisible?: boolean; isPreset?: boolean }
/** Refresh shipped definitions while retaining extension fields and visibility. */
export function mergePresetCatalog<T extends CatalogEntry>(definitions: readonly T[], saved: unknown): T[] {
    const records = new Map<string, Partial<T>>();
    if (Array.isArray(saved)) {
        for (const candidate of saved as unknown[]) {
            if (!candidate || typeof candidate !== 'object') continue;
            const entry = candidate as Record<string, unknown>;
            if (typeof entry.id === 'string') records.set(entry.id, entry as Partial<T>);
        }
    }
    return definitions.map(definition => {
        const previous = records.get(definition.id);
        return Object.assign({}, cloneSettings(previous ?? {}), cloneSettings(definition), {
            isPreset: true, isVisible: previous?.isVisible !== false,
        });
    });
}
