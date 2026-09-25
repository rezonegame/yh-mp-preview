/**
 * The curated default catalogue intentionally contains different reading
 * structures, not colour-only copies of the same structure.
 */
export const CURATED_THEME_CATALOG_VERSION = 3;

export type WechatReadingProfile = 'compact' | 'standard' | 'airy';
export type ThemeCatalogStatus = 'featured' | 'legacy';

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
    status: ThemeCatalogStatus;
    readingProfile: WechatReadingProfile;
    surfaces: readonly ThemeSurface[];
    noteThemeId?: NoteThemeId;
}

export const curatedThemeEntries: readonly CuratedThemeEntry[] = [
    { id: 'default', scene: '通用长文', recommendation: '中性、稳定，适合通知、文章初稿与常规长文。', frameworkId: 'neutral-reading', status: 'featured', readingProfile: 'standard', surfaces: ['wechat', 'note'], noteThemeId: 'default' },
    { id: 'deep-reading', scene: '通用长文', recommendation: '少装饰、大段落呼吸感，适合访谈与深度长文。', frameworkId: 'deep-reading', status: 'featured', readingProfile: 'airy', surfaces: ['wechat', 'note'], noteThemeId: 'deep-reading' },
    { id: 'academic-pro', scene: '教程与知识', recommendation: '旧版知识主题；新稿建议使用清晰指南。', frameworkId: 'structured-guide', status: 'legacy', readingProfile: 'compact', surfaces: ['wechat'] },
    { id: 'clear-guide', scene: '教程与知识', recommendation: '步骤边界明确，适合流程、上手与工具指南。', frameworkId: 'structured-guide', status: 'featured', readingProfile: 'compact', surfaces: ['wechat'] },
    { id: 'apple-product', scene: '产品与工具', recommendation: '轻量产品叙事，适合功能介绍与品牌内容。', frameworkId: 'product-editorial', status: 'featured', readingProfile: 'standard', surfaces: ['wechat'] },
    { id: 'product-review', scene: '产品与工具', recommendation: '快速定位要点与对比，适合测评和工具盘点。', frameworkId: 'product-editorial', status: 'featured', readingProfile: 'compact', surfaces: ['wechat'] },
    { id: 'minimal', scene: '观点与评论', recommendation: '旧版石墨主题；新稿可尝试深度阅读。', frameworkId: 'opinion-editorial', status: 'legacy', readingProfile: 'standard', surfaces: ['wechat', 'note'], noteThemeId: 'minimal' },
    { id: 'red-white-editorial', scene: '观点与评论', recommendation: '克制红色章节锚点，适合评论与分析议题。', frameworkId: 'opinion-editorial', status: 'featured', readingProfile: 'standard', surfaces: ['wechat'] },
    { id: 'modern-report', scene: '报告与复盘', recommendation: '旧版报告主题；新稿建议使用数据蓝图。', frameworkId: 'reporting', status: 'legacy', readingProfile: 'compact', surfaces: ['wechat'] },
    { id: 'data-blueprint', scene: '报告与复盘', recommendation: '明确数据层级，适合经营分析和数据复盘。', frameworkId: 'reporting', status: 'featured', readingProfile: 'compact', surfaces: ['wechat'] },
    { id: 'zen-essence', scene: '随笔与生活', recommendation: '低饱和与留白，适合随笔、读书与沉静阅读。', frameworkId: 'lifestyle-editorial', status: 'featured', readingProfile: 'airy', surfaces: ['wechat'] },
    { id: 'eastern-notes', scene: '随笔与生活', recommendation: '旧版纸笺主题；新稿可尝试留白随笔。', frameworkId: 'lifestyle-editorial', status: 'legacy', readingProfile: 'airy', surfaces: ['wechat'] },
    { id: 'academic-pro-forest', scene: '案例与内刊', recommendation: '旧版案例主题；新稿建议使用橄榄手记。', frameworkId: 'case-study', status: 'legacy', readingProfile: 'standard', surfaces: ['wechat'] },
    { id: 'olive-journal', scene: '案例与内刊', recommendation: '编辑部内刊质感，适合系统复盘与组织沉淀。', frameworkId: 'case-study', status: 'featured', readingProfile: 'standard', surfaces: ['wechat'] },
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
