import { resolveWechatPalette, type WechatPalette } from '../theme/wechatPalette';

export type ArticleRecipeId =
    | 'legacy-compatible'
    | 'tutorial'
    | 'checklist'
    | 'product-intro'
    | 'commentary'
    | 'review';

const recipeIds = new Set<ArticleRecipeId>([
    'legacy-compatible', 'tutorial', 'checklist', 'product-intro', 'commentary', 'review',
]);

export function normalizeArticleRecipeId(value: string | undefined): ArticleRecipeId {
    return recipeIds.has(value as ArticleRecipeId) ? value as ArticleRecipeId : 'legacy-compatible';
}

function setStyles(element: Element, styles: Record<string, string>): void {
    const style = (element as HTMLElement).style;
    Object.entries(styles).forEach(([property, value]) => style.setProperty(property, value));
}

function styleLists(section: HTMLElement, palette: WechatPalette, prefix: string): void {
    section.querySelectorAll('ol, ul').forEach(list => setStyles(list, {
        margin: '18px 0', padding: '0', 'list-style': 'none',
    }));
    section.querySelectorAll('ol > li, ul > li').forEach((item, index) => {
        setStyles(item, {
            display: 'block', margin: '10px 0', padding: '12px 14px',
            'border-left': `3px solid ${palette.accent}`,
            background: palette.surface, 'line-height': '1.72',
        });
        const className = prefix === '步骤' ? 'mp-recipe-step-label' : 'mp-recipe-check';
        let label = item.querySelector(`:scope > .${className}`) as HTMLElement | null;
        if (!label) {
            label = document.createElement('span');
            label.className = className;
            item.prepend(label);
        }
        label.textContent = prefix === '步骤' ? `步骤 ${index + 1}　` : '✓　';
        setStyles(label, { 'font-weight': '700', color: palette.accentText });
    });
}

function applyProductIntro(section: HTMLElement, palette: WechatPalette): void {
    const firstParagraph = section.querySelector('p');
    if (firstParagraph) setStyles(firstParagraph, {
        margin: '0 0 20px', padding: '14px 16px',
        'border-left': `3px solid ${palette.accent}`,
        background: palette.surface, 'line-height': '1.78',
    });
    section.querySelectorAll('h2').forEach(heading => setStyles(heading, {
        'border-left': `3px solid ${palette.accent}`, 'padding-left': '12px',
    }));
}

function applyCommentary(section: HTMLElement, palette: WechatPalette): void {
    section.querySelectorAll('blockquote').forEach(quote => setStyles(quote, {
        'border-left': `3px solid ${palette.accent}`,
        background: palette.surface, color: palette.foreground,
    }));
    const paragraphs = Array.from(section.querySelectorAll('p'));
    const conclusion = paragraphs[paragraphs.length - 1];
    if (conclusion && paragraphs.length > 1) setStyles(conclusion, {
        'margin-top': '24px', padding: '12px 0',
        'border-top': `2px solid ${palette.accent}`, 'font-weight': '600',
    });
}

function applyReview(section: HTMLElement, palette: WechatPalette): void {
    section.querySelectorAll('h2, h3').forEach(heading => setStyles(heading, {
        'border-left': `3px solid ${palette.accent}`, 'padding-left': '12px',
    }));
}

/** Keep the recipe semantic and re-applicable; a theme trial can safely change its palette. */
export function applyArticleRecipe(
    section: HTMLElement,
    recipeId: string | undefined,
    palette: WechatPalette = resolveWechatPalette(),
): ArticleRecipeId {
    const recipe = normalizeArticleRecipeId(recipeId);
    section.setAttribute('data-mp-recipe', recipe);

    switch (recipe) {
        case 'tutorial':
            styleLists(section, palette, '步骤');
            break;
        case 'checklist':
            styleLists(section, palette, '清单');
            break;
        case 'product-intro':
            applyProductIntro(section, palette);
            break;
        case 'commentary':
            applyCommentary(section, palette);
            break;
        case 'review':
            applyReview(section, palette);
            break;
        default:
            break;
    }
    return recipe;
}
