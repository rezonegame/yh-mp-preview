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
