/**
 * The curated default catalogue intentionally contains different reading
 * structures, not colour-only copies of the same structure.  Other bundled
 * themes remain available from settings as classic themes.
 */
export const CURATED_THEME_CATALOG_VERSION = 1;

export type CuratedThemeScene =
    | '通用长文'
    | '教程与知识'
    | '产品与工具'
    | '观点与评论'
    | '报告与复盘'
    | '随笔与生活'
    | '案例与内刊';

export interface CuratedThemeEntry {
    id: string;
    scene: CuratedThemeScene;
    recommendation: string;
}

export const curatedThemeEntries: readonly CuratedThemeEntry[] = [
    { id: 'default', scene: '通用长文', recommendation: '适合通知、文章初稿与需要稳定阅读节奏的长文。' },
    { id: 'academic-pro', scene: '教程与知识', recommendation: '适合教程、方法论、知识整理与技术说明。' },
    { id: 'apple-product', scene: '产品与工具', recommendation: '适合产品介绍、工具评测与品牌内容。' },
    { id: 'minimal', scene: '观点与评论', recommendation: '适合观点、评论与需要克制表达的专业文章。' },
    { id: 'modern-report', scene: '报告与复盘', recommendation: '适合周报、复盘、数据说明与阶段总结。' },
    { id: 'zen-essence', scene: '随笔与生活', recommendation: '适合随笔、生活方式与低干扰阅读内容。' },
    { id: 'academic-pro-forest', scene: '案例与内刊', recommendation: '适合案例拆解、组织内刊与深度经验总结。' },
] as const;

const curatedThemesById = new Map(curatedThemeEntries.map(entry => [entry.id, entry]));

export function getCuratedThemeEntry(themeId: string): CuratedThemeEntry | undefined {
    return curatedThemesById.get(themeId);
}

export function isCuratedTheme(themeId: string): boolean {
    return curatedThemesById.has(themeId);
}

