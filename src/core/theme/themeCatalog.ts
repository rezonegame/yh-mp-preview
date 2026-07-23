/**
 * The curated default catalogue intentionally contains different reading
 * structures, not colour-only copies of the same structure.
 */
export const CURATED_THEME_CATALOG_VERSION = 2;

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
    { id: 'default', scene: '通用长文', recommendation: '中性、稳定，适合通知、文章初稿与常规长文。' },
    { id: 'deep-reading', scene: '通用长文', recommendation: '低装饰文字层级，适合叙事、访谈与深度长文。' },
    { id: 'academic-pro', scene: '教程与知识', recommendation: '章节边界清晰，适合教程、方法论与技术说明。' },
    { id: 'clear-guide', scene: '教程与知识', recommendation: '更强的操作步骤感，适合流程、上手与工具指南。' },
    { id: 'apple-product', scene: '产品与工具', recommendation: '清透的产品说明层级，适合产品介绍与品牌内容。' },
    { id: 'product-review', scene: '产品与工具', recommendation: '强调要点与对比阅读，适合测评和工具盘点。' },
    { id: 'minimal', scene: '观点与评论', recommendation: '石墨灰层级，适合专业观点与克制表达。' },
    { id: 'red-white-editorial', scene: '观点与评论', recommendation: '克制红色章节锚点，适合评论与分析议题。' },
    { id: 'modern-report', scene: '报告与复盘', recommendation: '高对比但不过度装饰，适合周报与阶段总结。' },
    { id: 'data-blueprint', scene: '报告与复盘', recommendation: '数据层级与暖色标记，适合经营分析和数据复盘。' },
    { id: 'zen-essence', scene: '随笔与生活', recommendation: '低饱和留白，适合随笔、生活方式与沉静阅读。' },
    { id: 'eastern-notes', scene: '随笔与生活', recommendation: '温润纸笺感，适合文化随笔、读书与生活记录。' },
    { id: 'academic-pro-forest', scene: '案例与内刊', recommendation: '专业案例结构，适合案例拆解与经验总结。' },
    { id: 'olive-journal', scene: '案例与内刊', recommendation: '编辑部内刊质感，适合系统复盘与组织沉淀。' },
] as const;

const curatedThemesById = new Map(curatedThemeEntries.map(entry => [entry.id, entry]));

export function getCuratedThemeEntry(themeId: string): CuratedThemeEntry | undefined {
    return curatedThemesById.get(themeId);
}

export function isCuratedTheme(themeId: string): boolean {
    return curatedThemesById.has(themeId);
}
