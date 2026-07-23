export type ArticleRecipeId =
    | 'legacy-compatible'
    | 'tutorial'
    | 'checklist'
    | 'product-intro'
    | 'commentary'
    | 'review';

const recipeIds = new Set<ArticleRecipeId>([
    'legacy-compatible',
    'tutorial',
    'checklist',
    'product-intro',
    'commentary',
    'review',
]);

export function normalizeArticleRecipeId(value: string | undefined): ArticleRecipeId {
    return recipeIds.has(value as ArticleRecipeId) ? value as ArticleRecipeId : 'legacy-compatible';
}

function applyTutorial(section: HTMLElement): void {
    section.querySelectorAll('ol, ul').forEach((list) => {
        (list as HTMLElement).style.cssText += 'margin: 18px 0; padding: 0; list-style: none;';
    });
    section.querySelectorAll('ol > li, ul > li').forEach((item, index) => {
        (item as HTMLElement).style.cssText += `display: block; margin: 10px 0; padding: 12px 14px; border-left: 4px solid #4285f4; border-radius: 0 8px 8px 0; background: #f5f8ff; line-height: 1.75;`;
        if (!(item as HTMLElement).querySelector(':scope > .mp-recipe-step-label')) {
            const label = document.createElement('span');
            label.className = 'mp-recipe-step-label';
            label.textContent = `步骤 ${index + 1}　`;
            label.style.cssText = 'font-weight: 700; color: #2563eb;';
            item.prepend(label);
        }
    });
}

function applyChecklist(section: HTMLElement): void {
    section.querySelectorAll('ul, ol').forEach((list) => {
        (list as HTMLElement).style.cssText += 'margin: 18px 0; padding: 0; list-style: none;';
    });
    section.querySelectorAll('ul > li, ol > li').forEach((item) => {
        const element = item as HTMLElement;
        element.style.cssText += 'display: block; margin: 8px 0; padding: 10px 14px; border: 1px solid #b7dfbf; border-radius: 8px; background: #f4fbf5; line-height: 1.75;';
        if (!element.querySelector(':scope > .mp-recipe-check')) {
            const marker = document.createElement('span');
            marker.className = 'mp-recipe-check';
            marker.textContent = '✓';
            marker.style.cssText = 'display: inline; color: #16803c; font-weight: 700;';
            element.prepend(marker);
        }
    });
}

function applyProductIntro(section: HTMLElement): void {
    const firstParagraph = section.querySelector('p');
    if (firstParagraph) {
        (firstParagraph as HTMLElement).style.cssText += 'margin: 0 0 20px; padding: 16px 18px; border: 1px solid #c9d8ff; border-radius: 10px; background: #f5f8ff; color: #234; font-size: 1.05em; line-height: 1.85;';
    }
    section.querySelectorAll('h2').forEach((heading) => {
        (heading as HTMLElement).style.cssText += 'margin-top: 28px; padding: 8px 12px; border-left: 5px solid #4f46e5; border-radius: 0 6px 6px 0; background: #f5f3ff;';
    });
}

function applyCommentary(section: HTMLElement): void {
    section.querySelectorAll('blockquote').forEach((quote) => {
        (quote as HTMLElement).style.cssText += 'margin: 20px 0; padding: 14px 18px; border-left: 5px solid #f59e0b; border-radius: 0 8px 8px 0; background: #fffbeb; color: #78350f; font-size: 1.05em; line-height: 1.8;';
    });
    const paragraphs = Array.from(section.querySelectorAll('p')) as HTMLElement[];
    const conclusion = paragraphs[paragraphs.length - 1];
    if (conclusion && paragraphs.length > 1) {
        conclusion.style.cssText += 'margin-top: 24px; padding: 14px 16px; border-top: 2px solid #f59e0b; background: #fffdf7; font-weight: 600;';
    }
}

function applyReview(section: HTMLElement): void {
    section.querySelectorAll('h2, h3').forEach((heading) => {
        const element = heading as HTMLElement;
        const accent = '#2563eb';
        element.style.cssText += `margin-top: 26px; padding: 8px 12px; border-left: 5px solid ${accent}; border-radius: 0 6px 6px 0; background: #f5f8ff;`;
    });
}

/** Applies conservative, local-only article structure styling for the selected recipe. */
export function applyArticleRecipe(section: HTMLElement, recipeId: string | undefined): ArticleRecipeId {
    const recipe = normalizeArticleRecipeId(recipeId);
    section.setAttribute('data-mp-recipe', recipe);

    switch (recipe) {
        case 'tutorial':
            applyTutorial(section);
            break;
        case 'checklist':
            applyChecklist(section);
            break;
        case 'product-intro':
            applyProductIntro(section);
            break;
        case 'commentary':
            applyCommentary(section);
            break;
        case 'review':
            applyReview(section);
            break;
        default:
            break;
    }

    return recipe;
}
