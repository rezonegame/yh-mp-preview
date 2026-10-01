import type { TemplateStyles } from './templateTypes';
import { appendWechatReadingBaseline as baseline, paragraphRhythm, wechatReadingBaseline as reading } from './wechatReadingBaseline';
import type { WechatReadingProfile } from './themeCatalog';
import { setSafeInlineStyle } from '../security/safeDom';

interface StyleRule { selector: string; css: string; include?: (element: Element) => boolean }
export interface Typography { family: string; size: number }

/** Compile selectors once per pass; each category has a deterministic owner. */
export function applyStylePlan(root: HTMLElement, styles: TemplateStyles, typography: Typography, profile: WechatReadingProfile): void {
    const font = 'font-family: ' + typography.family + ';';
    const text = font + ' font-size: ' + typography.size + 'px;';
    const rules: StyleRule[] = [
        { selector: 'p', css: baseline(styles.paragraph + ';' + text, reading.paragraph + ' ' + paragraphRhythm(profile)), include: node => !node.parentElement?.closest('p,blockquote') },
        { selector: 'ul,ol', css: baseline(styles.list.container, reading.list) },
        { selector: 'li', css: baseline(styles.list.item + ';' + text, reading.listItem) },
        { selector: '.task-list-item', css: baseline(styles.list.taskList + ';' + text, reading.listItem) },
        { selector: 'blockquote', css: baseline(styles.quote + ';' + text, reading.quote) },
        { selector: 'pre', css: baseline(styles.code.block, reading.codeBlock) },
        { selector: 'code:not(pre code)', css: baseline(styles.code.inline, reading.inlineCode) },
        { selector: 'a', css: baseline(styles.link, reading.link) },
        { selector: 'strong', css: baseline(styles.emphasis.strong, reading.emphasis) },
        { selector: 'em', css: styles.emphasis.em }, { selector: 'del', css: styles.emphasis.del },
        { selector: 'table', css: baseline(styles.table.container, reading.table) },
        { selector: 'th', css: baseline(styles.table.header + ';' + text, reading.tableCell) },
        { selector: 'td', css: baseline(styles.table.cell + ';' + text, reading.tableCell) },
        { selector: 'hr', css: styles.hr }, { selector: '.footnote-ref', css: styles.footnote.ref },
        { selector: '.footnote-backref', css: styles.footnote.backref },
        { selector: 'img', css: baseline(styles.image, reading.image) },
    ];
    for (const rule of rules) {
        for (const element of Array.from(root.querySelectorAll(rule.selector))) {
            if (!rule.include || rule.include(element)) setSafeInlineStyle(element, rule.css);
        }
    }
    for (const heading of Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'))) {
        let content = Array.from(heading.children).find(node => node.classList.contains('content'));
        if (!content) {
            content = heading.createSpan({ cls: 'content' });
            const nodes = Array.from(heading.childNodes).filter(node => node !== content);
            content.append(...nodes);
        }
        let after = Array.from(heading.children).find(node => node.classList.contains('after'));
        if (!after) after = heading.createSpan({ cls: 'after', attr: { 'aria-hidden': 'true' } });
        const level = heading.tagName.toLowerCase();
        const title = styles.title[level === 'h1' || level === 'h2' || level === 'h3' ? level : 'base'];
        setSafeInlineStyle(heading, baseline(title.base + ';' + font, level === 'h1' ? reading.title : reading.sectionTitle));
        setSafeInlineStyle(content, title.content); setSafeInlineStyle(after, title.after);
    }
    for (const block of Array.from(root.querySelectorAll('pre'))) {
        // The host's code palette must not decide exported article contrast.
        block.querySelectorAll('code').forEach(code => setSafeInlineStyle(code, 'color: inherit; background: transparent; font-family: inherit; font-size: inherit; line-height: inherit; white-space: inherit; text-shadow: none;'));
        const header = block.querySelector('.mp-code-header');
        setSafeInlineStyle(header, styles.code.header.container);
        header?.querySelectorAll('.mp-code-dot').forEach((dot, index) => {
            const color = styles.code.header.colors[index];
            setSafeInlineStyle(dot, styles.code.header.dot + (color ? ';background-color:' + color + ';' : ''));
        });
        for (const token of Array.from(block.querySelectorAll('code span[class*="token"]'))) {
            const additions = Array.from(token.classList).filter(cls => cls !== 'token').map(cls => styles.code.syntax?.[cls]).filter(Boolean);
            const css = ['color: inherit; background: transparent; text-shadow: none', ...additions]
                .map(part => part?.replace(/;+\s*$/, '')).filter(Boolean).join('; ');
            setSafeInlineStyle(token, css);
        }
    }
    const dialogue = styles.containers?.dialogue;
    if (dialogue) {
        for (const block of Array.from(root.querySelectorAll('[data-container="dialogue"]'))) {
            if (dialogue.container) setSafeInlineStyle(block, dialogue.container);
            for (const [kind, css] of [['dialogue-title', dialogue.title], ['dialogue-speaker', dialogue.speaker], ['dialogue-text', dialogue.text]]) {
                if (css) block.querySelectorAll('[data-container="' + kind + '"]').forEach(node => setSafeInlineStyle(node, css));
            }
            for (const bubble of Array.from(block.querySelectorAll('[data-container="dialogue-bubble"]'))) {
                const css = bubble.getAttribute('data-side') === 'left' ? dialogue.bubbleLeft : dialogue.bubbleRight;
                if (css) setSafeInlineStyle(bubble, css);
            }
        }
    }
    const gallery = styles.containers?.gallery;
    if (gallery) {
        const mappings = { gallery: gallery.container, 'gallery-title': gallery.title, 'gallery-scroll': gallery.scroll, 'gallery-item': gallery.item, 'gallery-image': gallery.image };
        for (const [kind, css] of Object.entries(mappings)) {
            if (css) root.querySelectorAll('[data-container="' + kind + '"]').forEach(node => setSafeInlineStyle(node, css));
        }
    }
}
