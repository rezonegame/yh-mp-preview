import type { ArticleModel, ArticleNode } from '../article/articleModel';

export interface PlannedSection {
    id: string;
    headingNodeId?: string;
    title: string;
    componentIds: string[];
}

export interface LayoutPlan {
    schemaVersion: 1;
    articleType: string;
    themeId: string;
    recipeId: string;
    sections: PlannedSection[];
    options: {
        includeToc: boolean;
        includeEnding: boolean;
    };
}

export interface LocalLayoutOptions {
    themeId: string;
    recipeId?: string;
    articleType?: string;
    includeToc?: boolean;
    includeEnding?: boolean;
}

function sectionFromHeading(heading: ArticleNode, index: number): PlannedSection {
    return {
        id: `section-${index + 1}`,
        headingNodeId: heading.id,
        title: heading.text || `Section ${index + 1}`,
        componentIds: [],
    };
}

/** Local-only planner used by v3 alpha. It never rewrites article content. */
export function createLocalLayoutPlan(article: ArticleModel, options: LocalLayoutOptions): LayoutPlan {
    const headings = article.nodes.filter((node) => node.kind === 'heading');
    const sections = headings.map(sectionFromHeading);

    if (sections.length === 0) {
        sections.push({ id: 'section-1', title: '正文', componentIds: [] });
    }

    return {
        schemaVersion: 1,
        articleType: options.articleType || 'general-article',
        themeId: options.themeId,
        recipeId: options.recipeId || 'legacy-compatible',
        sections,
        options: {
            includeToc: options.includeToc === true,
            includeEnding: options.includeEnding === true,
        },
    };
}
