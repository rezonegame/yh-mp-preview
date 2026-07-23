/**
 * Inline guardrails applied after every theme. They intentionally preserve a
 * theme's palette while enforcing the reading rhythm required by long-form
 * WeChat articles.
 */
export const WECHAT_READING_BASELINE_VERSION = '2026.07';

export const wechatReadingBaseline = {
    title: 'line-height: 1.45; letter-spacing: 0; word-break: break-word;',
    sectionTitle: 'text-align: left; font-weight: 700; line-height: 1.45; letter-spacing: 0; word-break: break-word;',
    paragraph: 'font-weight: 400; line-height: 1.85; letter-spacing: 0; text-align: left; margin-top: 0; margin-bottom: 1.1em; word-break: break-word;',
    list: 'margin-top: 0.9em; margin-bottom: 1.1em; padding-left: 1.45em; text-align: left;',
    listItem: 'font-weight: 400; line-height: 1.8; letter-spacing: 0; text-align: left; margin-bottom: 0.5em; word-break: break-word;',
    quote: 'font-weight: 400; line-height: 1.8; letter-spacing: 0; text-align: left; font-style: normal; word-break: break-word;',
    codeBlock: 'font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word;',
    inlineCode: 'font-size: 0.9em; line-height: 1.5; word-break: break-word;',
    emphasis: 'font-weight: 600;',
    table: 'width: 100%; max-width: 100%; table-layout: auto;',
    tableCell: 'line-height: 1.65; vertical-align: top; word-break: break-word;',
    image: 'max-width: 100%; height: auto; display: block; margin: 1.2em auto;',
    link: 'word-break: break-word;',
} as const;

export function appendWechatReadingBaseline(themeStyle: string | undefined, baseline: string): string {
    return `${themeStyle || ''}; ${baseline}`.replace(/;;+/g, ';');
}
