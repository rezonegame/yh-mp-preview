import type { WechatPalette } from './wechatPalette';

const semanticCallouts = new Set([
    'warning', 'caution', 'danger', 'success', 'check', 'failure', 'bug',
]);

const componentAccentColors = /#(?:4285f4|0f766e|ef4444|6366f1|d97706|0ea5e9|16a34a|dc2626|8b5cf6|f59f00|b76e00|b45309|7c6aa8|2f9e44)\b/i;

/** Inline-only visual harmonization; transient classes are stripped at export. */
export function applyWechatComponentPalette(root: HTMLElement, palette: WechatPalette): void {
    root.querySelectorAll('.mp-layout-card').forEach(element => {
        const card = element as HTMLElement;
        card.style.background = palette.surface;
        card.style.border = `1px solid ${palette.border}`;
        card.style.borderLeft = `3px solid ${palette.accent}`;
        card.style.boxShadow = 'none';
        card.style.borderRadius = '4px';
        card.style.padding = '14px 16px';
        card.style.textAlign = 'left';

        card.querySelectorAll('*').forEach(child => {
            const item = child as HTMLElement;
            const original = item.getAttribute('data-mp-palette-origin') || item.getAttribute('style') || '';
            if (!item.hasAttribute('data-mp-palette-origin')) {
                item.setAttribute('data-mp-palette-origin', original);
            }
            const semanticStatus = card.getAttribute('data-mp-layout') === 'checklist'
                && /#(?:2f9e44|d97706)\b/i.test(original);
            if (item.style.display === 'flex') item.style.display = 'block';
            if (item.style.display === 'inline-flex') item.style.display = 'inline-block';
            if (item.style.backgroundColor && !semanticStatus) item.style.backgroundColor = palette.surface;
            if (item.style.color && !semanticStatus) {
                item.style.color = componentAccentColors.test(original) ? palette.accentText : palette.foreground;
            }
            if (item.style.boxShadow) item.style.boxShadow = 'none';
        });
        const title = card.firstElementChild as HTMLElement | null;
        if (title) title.style.color = palette.accentText;
        if (card.getAttribute('data-mp-layout') === 'comparison-table') {
            card.querySelectorAll(':scope > div > div').forEach(side => {
                const panel = side as HTMLElement;
                panel.style.display = 'block';
                panel.style.marginBottom = '10px';
                panel.style.background = '#ffffff';
                panel.style.border = `1px solid ${palette.border}`;
                panel.style.borderRadius = '4px';
            });
        }
    });

    root.querySelectorAll('.mp-frontmatter-card').forEach(element => {
        const card = element as HTMLElement;
        card.style.background = palette.surface;
        card.style.borderLeft = `3px solid ${palette.accent}`;
        card.style.borderRadius = '4px';
        card.style.padding = '16px';
        card.style.textAlign = 'left';
        const title = card.querySelector('.mp-fm-title') as HTMLElement | null;
        if (title) {
            title.style.color = palette.foreground;
            title.style.border = '0';
            title.style.padding = '0';
            title.style.margin = '0 0 8px';
        }
        const meta = card.querySelector('.mp-fm-meta') as HTMLElement | null;
        if (meta) meta.style.color = palette.foreground;
    });

    root.querySelectorAll('.mp-callout').forEach(element => {
        const callout = element as HTMLElement;
        if (semanticCallouts.has(callout.getAttribute('data-callout-type') || '')) return;
        callout.style.borderLeft = `3px solid ${palette.accent}`;
        callout.style.background = palette.surface;
        callout.style.borderRadius = '4px';
        const title = callout.querySelector('.mp-callout-title') as HTMLElement | null;
        if (title) {
            title.style.color = palette.accentText;
            title.style.display = 'block';
        }
    });
}
