export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
    severity: ValidationSeverity;
    code: string;
    message: string;
    path: string;
}

export interface ValidationReport {
    issues: ValidationIssue[];
    errors: number;
    warnings: number;
}

const forbiddenTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);
const discouragedStyles: Array<[string, RegExp]> = [
    ['display-flex', /display\s*:\s*(?:inline-)?flex\b/i],
    ['display-grid', /display\s*:\s*grid\b/i],
    ['fixed-position', /position\s*:\s*(?:fixed|sticky)\b/i],
    ['absolute-position', /position\s*:\s*absolute\b/i],
    ['overflow', /overflow(?:-[xy])?\s*:/i],
    ['css-variable', /var\s*\(/i],
];

function pathFor(element: Element): string {
    const parts: string[] = [];
    let current: Element | null = element;
    while (current && parts.length < 4) {
        parts.unshift(current.tagName.toLowerCase());
        current = current.parentElement;
    }
    return parts.join(' > ');
}

export function validateWechatHtml(root: HTMLElement): ValidationReport {
    const issues: ValidationIssue[] = [];
    const add = (severity: ValidationSeverity, code: string, message: string, element: Element): void => {
        issues.push({ severity, code, message, path: pathFor(element) });
    };

    root.querySelectorAll('*').forEach((element) => {
        if (forbiddenTags.has(element.tagName)) {
            add('error', 'forbidden-tag', `不允许的标签：${element.tagName.toLowerCase()}`, element);
        }
        Array.from(element.attributes).forEach((attribute) => {
            if (attribute.name.startsWith('on')) {
                add('error', 'event-attribute', `不允许的事件属性：${attribute.name}`, element);
            }
            if (attribute.name === 'class' || attribute.name === 'id' || attribute.name.startsWith('data-')) {
                add('warning', 'transient-attribute', `复制时将移除属性：${attribute.name}`, element);
            }
        });

        const style = element.getAttribute('style') || '';
        discouragedStyles.forEach(([code, pattern]) => {
            if (pattern.test(style)) {
                add('warning', code, `微信公众号兼容性风险：${code}`, element);
            }
        });
    });

    return {
        issues,
        errors: issues.filter((issue) => issue.severity === 'error').length,
        warnings: issues.filter((issue) => issue.severity === 'warning').length,
    };
}
