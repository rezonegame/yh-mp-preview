import type { AppearancePreferences } from './themeRevisionRegistry';
export interface ReadingPaletteChoice { id: string; name: string; color: string; }
type PaletteSpec = readonly [id: string, name: string, color: string];
const choices = (...items: PaletteSpec[]): readonly ReadingPaletteChoice[] => items.map(([id,name,color]) => ({id,name,color}));
/** Curated colour roles, not additional themes or CSS search/replace rules. */
const paletteDefinitions: Record<string, readonly ReadingPaletteChoice[]> = {
    default: choices(['original','石墨','#475569'],['spruce','松绿','#355f59'],['marine','海蓝','#173f7a']),
    'deep-reading': choices(['original','墨黑','#202124'],['slate','石墨','#475569'],['cocoa','可可','#684b3f']),
    'clear-guide': choices(['original','青绿','#087f75'],['blue','知识蓝','#285b92'],['slate','石墨','#475569']),
    'knowledge-notes': choices(['original','松绿','#355f59'],['ink-blue','墨蓝','#355a72'],['umber','棕褐','#805c46']),
    'apple-product': choices(['original','产品蓝','#0a84ff'],['ink','墨黑','#353535'],['forest','森绿','#216a52']),
    'product-review': choices(['original','测评绿','#059669'],['navy','深蓝','#173f7a'],['burgundy','酒红','#8f3b46']),
    'red-white-editorial': choices(['original','编辑红','#c2413b'],['ink','墨黑','#353535'],['ink-blue','墨蓝','#355a72']),
    'ink-opinion': choices(['original','墨黑','#353535'],['burgundy','酒红','#8f3b46'],['spruce','松绿','#355f59']),
    'data-blueprint': choices(['original','数据蓝','#173f7a'],['teal','青绿','#087f75'],['slate','石墨','#475569']),
    'briefing-grid': choices(['original','墨蓝','#355a72'],['olive','橄榄','#4a6041'],['plum','灰紫','#67536f']),
    'zen-essence': choices(['original','灰绿','#79836f'],['stone','石灰','#57534e'],['cocoa','可可','#805c46']),
    'warm-paper': choices(['original','棕褐','#805c46'],['spruce','松绿','#355f59'],['stone','石灰','#57534e']),
    'olive-journal': choices(['original','橄榄','#4a6041'],['clay','陶土','#b15b2e'],['ink-blue','墨蓝','#355a72']),
    'case-file': choices(['original','档案灰','#40505c'],['spruce','松绿','#355f59'],['burgundy','酒红','#8f3b46']),
};
// Custom IDs such as "constructor" must never resolve inherited Object properties.
export const readingPalettes: Readonly<Record<string, readonly ReadingPaletteChoice[]>> = Object.freeze(
    Object.assign(Object.create(null) as Record<string, readonly ReadingPaletteChoice[]>, paletteDefinitions),
);
export const densityChoices = [{id:'theme',name:'跟随主题'}, {id:'compact',name:'更紧凑'}, {id:'airy',name:'更舒展'}] as const;
/** Pure read fallback: persisted opaque values stay untouched. */
export function normalizeReadingPreferences(id: string, value: unknown): AppearancePreferences {
    const candidate = value && typeof value === 'object' ? value as Partial<AppearancePreferences> : {};
    return { paletteId: readingPalettes[id]?.some(choice => choice.id === candidate.paletteId) ? candidate.paletteId! : 'original',
        density: densityChoices.some(choice => choice.id === candidate.density) ? candidate.density! : 'theme' };
}
export function densityScale(density: AppearancePreferences['density']): { spacing: number; line: number } {
    return density === 'compact' ? {spacing:.9,line:.96} : density === 'airy' ? {spacing:1.12,line:1.04} : {spacing:1,line:1};
}
