import createDOMPurify from 'dompurify';

const cssProperties = new Set([
    'color', 'background', 'background-color', 'background-image', 'background-size', 'background-position',
    'background-repeat', 'background-clip', 'opacity', 'display', 'visibility', 'position', 'top', 'right',
    'bottom', 'left', 'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'box-sizing',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-inline', 'margin-block',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline', 'padding-block',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-color', 'border-width',
    'border-style', 'border-radius', 'border-collapse', 'border-spacing', 'box-shadow', 'outline',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
    'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'line-height',
    'letter-spacing', 'word-spacing', 'text-align', 'text-indent', 'text-decoration', 'text-decoration-line',
    'text-decoration-color', 'text-decoration-style', 'text-transform', 'text-shadow', 'vertical-align',
    'white-space', 'overflow', 'overflow-x', 'overflow-y', 'overflow-wrap', 'word-break', 'word-wrap',
    'list-style', 'list-style-type', 'list-style-position', 'object-fit', 'object-position', 'float', 'clear',
    'flex', 'flex-direction', 'flex-wrap', 'flex-shrink', 'flex-grow', 'flex-basis', 'align-items',
    'align-self', 'justify-content', 'gap', 'row-gap', 'column-gap', 'grid-template-columns',
    'grid-template-rows', 'scroll-snap-type', 'scroll-snap-align', '-webkit-overflow-scrolling',
    '-webkit-text-size-adjust', 'table-layout', 'content', 'counter-reset', 'counter-increment',
    'transform', 'transform-origin', 'transition', 'text-overflow', 'hyphens', 'writing-mode',
    'break-inside', 'page-break-inside', 'isolation', 'z-index',
]);

/** Keep article typography, but never permit CSS to load remote resources or execute legacy expressions. */
export function hasUnsafeCss(value: string): boolean {
    return /[\\@]|\/\*|url\s*\(|expression\s*\(|(?:behavior|-moz-binding)\s*:/i.test(value);
}

export function safeInlineCss(value: string): string {
    if (hasUnsafeCss(value)) return '';
    const probe = document.createElement('span');
    probe.style.cssText = value;
    const declarations: string[] = [];
    for (let index = 0; index < probe.style.length; index++) {
        const property = probe.style.item(index);
        if (!cssProperties.has(property)) continue;
        declarations.push(`${property}: ${probe.style.getPropertyValue(property)}${probe.style.getPropertyPriority(property) ? ' !important' : ''};`);
    }
    return declarations.join(' ');
}

export function setSafeInlineStyle(element: Element | null, css: string): void {
    if (!element) return;
    const safe = safeInlineCss(css);
    if (safe) element.setAttribute('style', safe);
    else element.removeAttribute('style');
}

export function safeUrl(value: string, kind: 'image' | 'link' = 'link'): string | null {
    const url = value.trim();
    if (!url || Array.from(url).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) || /[<>"'\\]/.test(url)) return null;
    if (/^data:/i.test(url)) {
        return kind === 'image' && /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon);base64,[a-z0-9+/=]+$/i.test(url) ? url : null;
    }
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1].toLowerCase();
    if (scheme) {
        const allowed = kind === 'image' ? ['http', 'https', 'app', 'blob'] : ['http', 'https', 'mailto', 'tel', 'obsidian'];
        return allowed.includes(scheme) ? url : null;
    }
    return url;
}

export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface SanitizedFragment {
    fragment: DocumentFragment;
    removedCount: number;
}

/** Sanitize before attaching to the live preview; inline article styles have a separate, explicit policy. */
export function sanitizeHtmlFragment(html: string): SanitizedFragment {
    const ownerWindow = document.defaultView;
    if (!ownerWindow) throw new Error('HTML sanitizer requires a document window');
    const purifier = createDOMPurify(ownerWindow);
    let policyRemovals = 0;
    purifier.addHook('uponSanitizeAttribute', (_node, attribute) => {
        const name = attribute.attrName.toLowerCase();
        if (name === 'style') {
            const safe = safeInlineCss(attribute.attrValue);
            if (safe !== attribute.attrValue && !safe) policyRemovals++;
            attribute.attrValue = safe;
            if (!safe) attribute.keepAttr = false;
        } else if (name === 'src' || name === 'href') {
            const safe = safeUrl(attribute.attrValue, name === 'src' ? 'image' : 'link');
            if (safe === null) { attribute.keepAttr = false; policyRemovals++; }
            else attribute.attrValue = safe;
        }
    });
    const fragment = purifier.sanitize(html, {
        USE_PROFILES: { html: true },
        RETURN_DOM_FRAGMENT: true,
        ALLOW_DATA_ATTR: true,
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'video', 'audio', 'link', 'meta', 'base'],
        FORBID_ATTR: ['srcset', 'ping', 'formaction'],
        ADD_ATTR: ['data-container', 'data-side'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|obsidian|app|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    });
    return { fragment, removedCount: purifier.removed.length + policyRemovals };
}

export function safeHtmlToElement(html: string): HTMLElement {
    const element = sanitizeHtmlFragment(html).fragment.firstElementChild;
    if (!(element instanceof document.defaultView!.HTMLElement)) throw new Error('HTML fragment has no usable root element');
    return element;
}

export function replaceWithSafeHtml(element: Element, html: string): number {
    const result = sanitizeHtmlFragment(html);
    element.replaceChildren(result.fragment);
    return result.removedCount;
}
