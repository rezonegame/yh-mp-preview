export type ArticleNodeKind = 'heading' | 'paragraph' | 'listItem' | 'quote' | 'codeBlock' | 'table' | 'image' | 'link' | 'component';

export interface ArticleNode {
    id: string;
    kind: ArticleNodeKind;
    text: string;
    level?: number;
    href?: string;
    src?: string;
}

export interface ArticleStats {
    headings: number;
    paragraphs: number;
    listItems: number;
    quotes: number;
    codeBlocks: number;
    tables: number;
    images: number;
    links: number;
    components: number;
}

export interface ArticleModel {
    schemaVersion: 1;
    nodes: ArticleNode[];
    stats: ArticleStats;
}

const emptyStats = (): ArticleStats => ({
    headings: 0,
    paragraphs: 0,
    listItems: 0,
    quotes: 0,
    codeBlocks: 0,
    tables: 0,
    images: 0,
    links: 0,
    components: 0,
});

function normalizedText(element: Element): string {
    return (element.textContent || '').replace(/\s+/g, ' ').trim();
}

function addNode(nodes: ArticleNode[], stats: ArticleStats, kind: ArticleNodeKind, element: Element, extra: Partial<ArticleNode> = {}): void {
    stats[`${kind === 'listItem' ? 'listItems' : `${kind}s`}` as keyof ArticleStats]++;
    nodes.push({
        id: `node-${nodes.length + 1}`,
        kind,
        text: normalizedText(element),
        ...extra,
    });
}

/**
 * Creates a stable, UI-independent article description from the rendered note.
 * The renderer remains the source of visual markup; this model is used for
 * content accounting, recipes, history and future migration tooling.
 */
export function createArticleModel(root: HTMLElement): ArticleModel {
    const nodes: ArticleNode[] = [];
    const stats = emptyStats();

    root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((element) => {
        const level = Number(element.tagName.slice(1));
        addNode(nodes, stats, 'heading', element, { level });
    });
    root.querySelectorAll('p').forEach((element) => addNode(nodes, stats, 'paragraph', element));
    root.querySelectorAll('li').forEach((element) => addNode(nodes, stats, 'listItem', element));
    root.querySelectorAll('blockquote').forEach((element) => addNode(nodes, stats, 'quote', element));
    root.querySelectorAll('pre').forEach((element) => addNode(nodes, stats, 'codeBlock', element));
    root.querySelectorAll('table').forEach((element) => addNode(nodes, stats, 'table', element));
    root.querySelectorAll('img').forEach((element) => addNode(nodes, stats, 'image', element, { src: (element as HTMLImageElement).src }));
    root.querySelectorAll('a[href]').forEach((element) => addNode(nodes, stats, 'link', element, { href: (element as HTMLAnchorElement).href }));
    root.querySelectorAll('[data-mp-layout], [data-container]').forEach((element) => addNode(nodes, stats, 'component', element));

    return { schemaVersion: 1, nodes, stats };
}
