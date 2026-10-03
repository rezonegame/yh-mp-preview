import { createArticleModel, type ArticleModel } from '../article/articleModel';
import { createLocalLayoutPlan, type LayoutPlan } from '../layout/localLayoutPlanner';
import { validateWechatHtml, type ValidationReport } from '../validation/wechatHtmlValidator';
import { applyArticleRecipe } from '../recipe/articleRecipeFormatter';
import type { WechatPalette } from '../theme/wechatPalette';
import { safeHtmlToElement } from '../security/safeDom';
import { normalizeArticleText } from './articleText';
import type { CanonicalArticle } from '../article/canonicalArticle';

export interface LegacyWechatPreparation extends CanonicalArticle {
    article: ArticleModel;
    plan: LayoutPlan;
}

export interface LegacyWechatOptions {
    themeId?: string;
    recipeId?: string;
    palette?: WechatPalette;
}

const removableTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);

/** WeChat's native quote importer can replace inline styles with its own frame.
 * Only upgraded output is adapted. The source DOM and ArticleModel keep real
 * blockquotes; styled sections retain the exact nested children in output.
 */
function adaptReadingQuotes(root: HTMLElement): void {
    if (!root.hasAttribute('data-mp-reading-background')) return;
    root.querySelectorAll('blockquote').forEach(quote => {
        const section = root.createEl('section');
        for (const attribute of Array.from(quote.attributes)) section.setAttribute(attribute.name, attribute.value);
        section.setAttribute('role', 'note');
        section.setAttribute('aria-label', '引用');
        section.append(...Array.from(quote.childNodes));
        quote.replaceWith(section);
    });
}

function removeTransientAttributes(root: HTMLElement): void {
    [root, ...Array.from(root.querySelectorAll('*'))].forEach((element) => {
        Array.from(element.attributes).forEach((attribute) => {
            if (attribute.name === 'class' || attribute.name === 'id' || attribute.name.startsWith('data-') || attribute.name.startsWith('on')) {
                element.removeAttribute(attribute.name);
            }
        });
        if (removableTags.has(element.tagName)) {
            element.remove();
        }
    });
}

/**
 * Alpha bridge: keeps legacy markup working while routing copy preparation
 * through the v3 article, plan and validation contracts.
 */
export function prepareLegacyWechatFragment(element: HTMLElement, options: LegacyWechatOptions = {}): LegacyWechatPreparation {
    let clone = element.cloneNode(true) as HTMLElement;
    const article = createArticleModel(clone);
    const sourceValidation = validateWechatHtml(clone);
    const plan = createLocalLayoutPlan(article, {
        themeId: options.themeId || 'legacy-active',
        recipeId: options.recipeId || 'legacy-compatible',
    });
    if (clone.getAttribute('data-mp-recipe') !== plan.recipeId) applyArticleRecipe(clone, plan.recipeId, options.palette);
    adaptReadingQuotes(clone);
    const blocks = Array.from(clone.children).map((block,index) => ({id:block.getAttribute('data-mp-block-id') || `block-${index}`,tag:block.tagName.toLowerCase()}));
    removeTransientAttributes(clone);
    clone = element.ownerDocument.importNode(safeHtmlToElement(new XMLSerializer().serializeToString(clone)),true);
    normalizeArticleText(clone);
    const outputValidation = validateWechatHtml(clone);
    const blockingIssues = sourceValidation.issues.filter((issue) => issue.severity === 'error');
    const backgroundWarnings = sourceValidation.issues.filter(issue=>issue.code.startsWith('reading-background-'));
    const validation: ValidationReport = {
        issues: [...blockingIssues, ...backgroundWarnings, ...outputValidation.issues],
        errors: blockingIssues.length + outputValidation.errors,
        warnings: outputValidation.warnings + backgroundWarnings.length,
    };
    return {
        article,
        plan,
        html: new XMLSerializer().serializeToString(clone),
        validation,
        root: clone,
        text: clone.textContent || '',
        blocks,
    };
}
