import { createArticleModel, type ArticleModel } from '../article/articleModel';
import { createLocalLayoutPlan, type LayoutPlan } from '../layout/localLayoutPlanner';
import { validateWechatHtml, type ValidationReport } from '../validation/wechatHtmlValidator';
import { applyArticleRecipe } from '../recipe/articleRecipeFormatter';

export interface LegacyWechatPreparation {
    article: ArticleModel;
    plan: LayoutPlan;
    html: string;
    validation: ValidationReport;
}

export interface LegacyWechatOptions {
    themeId?: string;
    recipeId?: string;
}

const removableTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);

function removeTransientAttributes(root: HTMLElement): void {
    root.querySelectorAll('*').forEach((element) => {
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
    const clone = element.cloneNode(true) as HTMLElement;
    const article = createArticleModel(clone);
    const plan = createLocalLayoutPlan(article, {
        themeId: options.themeId || 'legacy-active',
        recipeId: options.recipeId || 'legacy-compatible',
    });
    applyArticleRecipe(clone, plan.recipeId);
    removeTransientAttributes(clone);
    const validation = validateWechatHtml(clone);
    return {
        article,
        plan,
        html: new XMLSerializer().serializeToString(clone),
        validation,
    };
}
