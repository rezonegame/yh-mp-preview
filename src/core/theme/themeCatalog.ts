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

export type ThemeSurface = 'wechat' | 'note';

export type ThemeFrameworkId =
    | 'neutral-reading'
    | 'deep-reading'
    | 'structured-guide'
    | 'product-editorial'
    | 'opinion-editorial'
    | 'reporting'
    | 'lifestyle-editorial'
    | 'case-study';

export type NoteThemeId = 'default' | 'deep-reading' | 'minimal';

export interface NoteThemeEntry {
    id: NoteThemeId;
    name: string;
    recommendation: string;
    frameworkId: ThemeFrameworkId;
}

export interface CuratedThemeEntry {
    id: string;
    scene: CuratedThemeScene;
    recommendation: string;
    frameworkId: ThemeFrameworkId;
    surfaces: readonly ThemeSurface[];
    noteThemeId?: NoteThemeId;
}

export const curatedThemeEntries: readonly CuratedThemeEntry[] = [
    { id: 'default', scene: '通用长文', recommendation: '中性、稳定，适合通知、文章初稿与常规长文。', frameworkId: 'neutral-reading', surfaces: ['wechat', 'note'], noteThemeId: 'default' },
    { id: 'deep-reading', scene: '通用长文', recommendation: '低装饰文字层级，适合叙事、访谈与深度长文。', frameworkId: 'deep-reading', surfaces: ['wechat', 'note'], noteThemeId: 'deep-reading' },
    { id: 'academic-pro', scene: '教程与知识', recommendation: '章节边界清晰，适合教程、方法论与技术说明。', frameworkId: 'structured-guide', surfaces: ['wechat'] },
    { id: 'clear-guide', scene: '教程与知识', recommendation: '更强的操作步骤感，适合流程、上手与工具指南。', frameworkId: 'structured-guide', surfaces: ['wechat'] },
    { id: 'apple-product', scene: '产品与工具', recommendation: '清透的产品说明层级，适合产品介绍与品牌内容。', frameworkId: 'product-editorial', surfaces: ['wechat'] },
    { id: 'product-review', scene: '产品与工具', recommendation: '强调要点与对比阅读，适合测评和工具盘点。', frameworkId: 'product-editorial', surfaces: ['wechat'] },
    { id: 'minimal', scene: '观点与评论', recommendation: '石墨灰层级，适合专业观点与克制表达。', frameworkId: 'opinion-editorial', surfaces: ['wechat', 'note'], noteThemeId: 'minimal' },
    { id: 'red-white-editorial', scene: '观点与评论', recommendation: '克制红色章节锚点，适合评论与分析议题。', frameworkId: 'opinion-editorial', surfaces: ['wechat'] },
    { id: 'modern-report', scene: '报告与复盘', recommendation: '高对比但不过度装饰，适合周报与阶段总结。', frameworkId: 'reporting', surfaces: ['wechat'] },
    { id: 'data-blueprint', scene: '报告与复盘', recommendation: '数据层级与暖色标记，适合经营分析和数据复盘。', frameworkId: 'reporting', surfaces: ['wechat'] },
    { id: 'zen-essence', scene: '随笔与生活', recommendation: '低饱和留白，适合随笔、生活方式与沉静阅读。', frameworkId: 'lifestyle-editorial', surfaces: ['wechat'] },
    { id: 'eastern-notes', scene: '随笔与生活', recommendation: '温润纸笺感，适合文化随笔、读书与生活记录。', frameworkId: 'lifestyle-editorial', surfaces: ['wechat'] },
    { id: 'academic-pro-forest', scene: '案例与内刊', recommendation: '专业案例结构，适合案例拆解与经验总结。', frameworkId: 'case-study', surfaces: ['wechat'] },
    { id: 'olive-journal', scene: '案例与内刊', recommendation: '编辑部内刊质感，适合系统复盘与组织沉淀。', frameworkId: 'case-study', surfaces: ['wechat'] },
] as const;

export const noteThemeEntries: readonly NoteThemeEntry[] = [
    { id: 'default', name: '默认阅读', recommendation: '适合日常笔记和综合内容', frameworkId: 'neutral-reading' },
    { id: 'deep-reading', name: '深度阅读', recommendation: '适合长文、研究和知识沉淀', frameworkId: 'deep-reading' },
    { id: 'minimal', name: '极简阅读', recommendation: '适合速记和信息密度较高的内容', frameworkId: 'opinion-editorial' },
];

const curatedThemesById = new Map(curatedThemeEntries.map(entry => [entry.id, entry]));

export function getCuratedThemeEntry(themeId: string): CuratedThemeEntry | undefined {
    return curatedThemesById.get(themeId);
}

export function isCuratedTheme(themeId: string): boolean {
    return curatedThemesById.has(themeId);
}

export function getNoteThemeEntries(): readonly NoteThemeEntry[] {
    return noteThemeEntries;
}

export function getThemeFrameworkId(themeId: string): ThemeFrameworkId | undefined {
    return getCuratedThemeEntry(themeId)?.frameworkId;
}

export function getThemeSurfaces(themeId: string): readonly ThemeSurface[] {
    return getCuratedThemeEntry(themeId)?.surfaces || ['wechat'];
}
