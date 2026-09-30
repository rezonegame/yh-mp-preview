import type { ValidationReport } from '../validation/wechatHtmlValidator';

/** Complete ordered DOM, not the type-grouped ArticleModel statistics. */
export interface CanonicalArticle {
    root: HTMLElement;
    blocks: { id: string; tag: string }[];
    html: string;
    text: string;
    validation: ValidationReport;
}
