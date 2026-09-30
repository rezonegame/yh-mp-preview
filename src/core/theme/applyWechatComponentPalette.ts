import type { WechatPalette } from './wechatPalette';

const semanticCallouts = new Set([
    'warning', 'caution', 'danger', 'success', 'check', 'failure', 'bug',
]);

const componentAccentColors = /#(?:4285f4|0f766e|ef4444|6366f1|d97706|0ea5e9|16a34a|dc2626|8b5cf6|f59f00|b76e00|b45309|7c6aa8|2f9e44)\b/i;

/** Inline-only visual harmonization; transient classes are stripped at export. */
export function applyWechatComponentPalette(root: HTMLElement, palette: WechatPalette): void {
    root.querySelectorAll('.mp-layout-card').forEach(element => {
        const card = element as HTMLElement;
        card.setCssStyles({ background: palette.surface });
        card.setCssStyles({ border: `1px solid ${palette.border}` });
        card.setCssStyles({ borderLeft: `3px solid ${palette.accent}` });
        card.setCssStyles({ boxShadow: 'none' });
        card.setCssStyles({ borderRadius: '4px' });
        card.setCssStyles({ padding: '14px 16px' });
        card.setCssStyles({ textAlign: 'left' });

        card.querySelectorAll('*').forEach(child => {
            const item = child as HTMLElement;
            const original = item.getAttribute('data-mp-palette-origin') || item.getAttribute('style') || '';
            if (!item.hasAttribute('data-mp-palette-origin')) {
                item.setAttribute('data-mp-palette-origin', original);
            }
            const semanticStatus = card.getAttribute('data-mp-layout') === 'checklist'
                && /#(?:2f9e44|d97706)\b/i.test(original);
            if (item.style.display === 'flex') item.setCssStyles({ display: 'block' });
            if (item.style.display === 'inline-flex') item.setCssStyles({ display: 'inline-block' });
            if (item.style.backgroundColor && !semanticStatus) item.setCssStyles({ backgroundColor: palette.surface });
            if (item.style.color && !semanticStatus) {
                item.setCssStyles({ color: componentAccentColors.test(original) ? palette.accentText : palette.foreground });
            }
            if (item.style.boxShadow) item.setCssStyles({ boxShadow: 'none' });
        });
        const title = card.firstElementChild as HTMLElement | null;
        if (title) title.setCssStyles({ color: palette.accentText });
        if (card.getAttribute('data-mp-layout') === 'comparison-table') {
            card.querySelectorAll(':scope > div > div').forEach(side => {
                const panel = side as HTMLElement;
                panel.setCssStyles({ display: 'block' });
                panel.setCssStyles({ marginBottom: '10px' });
                panel.setCssStyles({ background: '#ffffff' });
                panel.setCssStyles({ border: `1px solid ${palette.border}` });
                panel.setCssStyles({ borderRadius: '4px' });
            });
        }
    });

    root.querySelectorAll('.mp-frontmatter-card').forEach(element => {
        const card = element as HTMLElement;
        card.setCssStyles({ background: palette.surface });
        card.setCssStyles({ borderLeft: `3px solid ${palette.accent}` });
        card.setCssStyles({ borderRadius: '4px' });
        card.setCssStyles({ padding: '16px' });
        card.setCssStyles({ textAlign: 'left' });
        const title = card.querySelector<HTMLElement>('.mp-fm-title');
        if (title) {
            title.setCssStyles({ color: palette.foreground });
            title.setCssStyles({ border: '0' });
            title.setCssStyles({ padding: '0' });
            title.setCssStyles({ margin: '0 0 8px' });
        }
        const meta = card.querySelector<HTMLElement>('.mp-fm-meta');
        if (meta) meta.setCssStyles({ color: palette.foreground });
    });

    root.querySelectorAll('.mp-callout').forEach(element => {
        const callout = element as HTMLElement;
        if (semanticCallouts.has(callout.getAttribute('data-callout-type') || '')) return;
        callout.setCssStyles({ borderLeft: `3px solid ${palette.accent}` });
        callout.setCssStyles({ background: palette.surface });
        callout.setCssStyles({ borderRadius: '4px' });
        const title = callout.querySelector<HTMLElement>('.mp-callout-title');
        if (title) {
            title.setCssStyles({ color: palette.accentText });
            title.setCssStyles({ display: 'block' });
        }
    });
}
