import type { MPSettings } from './settings/settings';
import { STANDARD_COMPONENT_IDS } from './core/components/standardComponents';

type LayoutSettings = MPSettings['layoutEnhancements'];

const DEFAULT_ACCENT = '#4285f4';

type KeyValueMap = Record<string, string>;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function parseKeyValues(content: string): KeyValueMap {
    const values: KeyValueMap = {};
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^:：]+)\s*[:：]\s*(.*)$/);
        if (!match) return;
        values[match[1].trim()] = match[2].trim();
    });
    return values;
}

function parseRows(content: string): string[][] {
    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.match(/^[^:：]+[:：]/))
        .map(line => line.split('|').map(cell => cell.trim()).filter(Boolean))
        .filter(row => row.length > 0);
}

function htmlToElement(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild as HTMLElement;
}

function cardStyle(accent = DEFAULT_ACCENT): string {
    return [
        'margin: 1.2em 0',
        'padding: 18px 20px',
        'border-radius: 10px',
        `border: 1px solid ${accent}22`,
        `background: linear-gradient(135deg, ${accent}0f 0%, #ffffff 100%)`,
        'box-shadow: 0 6px 18px rgba(0,0,0,0.04)',
        'box-sizing: border-box'
    ].join('; ');
}

function titleStyle(accent = DEFAULT_ACCENT): string {
    return `margin: 0 0 12px; font-size: 1.05em; font-weight: 700; color: ${accent}; line-height: 1.5;`;
}

function bodyStyle(): string {
    return 'margin: 0; color: #3f4652; line-height: 1.8; font-size: 1em;';
}

function renderToc(content: string, headings?: HTMLElement[]): HTMLElement {
    const rows = headings
        ? headings.map((heading, index) => [
            String(index + 1).padStart(2, '0'),
            heading.textContent?.trim() || '',
            ''
        ])
        : parseRows(content);

    const title = parseKeyValues(content).title || '阅读导航';
    const items = rows.map((row, index) => {
        const number = row[0] || String(index + 1).padStart(2, '0');
        const heading = row[1] || row[0] || '';
        const desc = row[2] || '';
        return `<div style="display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #e8edf5;">
            <span style="min-width: 32px; color: ${DEFAULT_ACCENT}; font-weight: 700;">${escapeHtml(number)}</span>
            <span style="flex: 1;"><span style="display: block; color: #2f3a4a; font-weight: 600;">${escapeHtml(heading)}</span>${desc ? `<span style="display: block; margin-top: 2px; color: #7a8494; font-size: 0.92em;">${escapeHtml(desc)}</span>` : ''}</span>
        </div>`;
    }).join('');

    return htmlToElement(`<section class="mp-layout-card mp-layout-toc" data-mp-layout="toc" style="${cardStyle()}">
        <div style="${titleStyle()}">${escapeHtml(title)}</div>
        <div>${items}</div>
    </section>`);
}

function renderSteps(content: string): HTMLElement {
    const values = parseKeyValues(content);
    const rows = parseRows(content);
    const items = rows.map((row, index) => {
        const number = row[0] || String(index + 1).padStart(2, '0');
        const title = row[1] || row[0] || '';
        const desc = row[2] || '';
        return `<div style="display: flex; gap: 12px; margin: 12px 0;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: ${DEFAULT_ACCENT}; color: #fff; font-weight: 700; flex: 0 0 34px;">${escapeHtml(number)}</span>
            <span style="flex: 1;"><span style="display: block; color: #2f3a4a; font-weight: 700; line-height: 1.5;">${escapeHtml(title)}</span>${desc ? `<span style="display: block; margin-top: 4px; color: #677182; line-height: 1.7;">${escapeHtml(desc)}</span>` : ''}</span>
        </div>`;
    }).join('');

    return htmlToElement(`<section class="mp-layout-card mp-layout-steps" data-mp-layout="steps" style="${cardStyle()}">
        <div style="${titleStyle()}">${escapeHtml(values.title || '步骤')}</div>
        ${items}
    </section>`);
}

function renderChecklist(content: string): HTMLElement {
    const values = parseKeyValues(content);
    const rows = parseRows(content);
    return renderChecklistRows(rows, values.title || '检查清单');
}

function renderChecklistRows(rows: string[][], title = '检查清单'): HTMLElement {
    const items = rows.map(row => {
        const status = (row[0] || 'pending').toLowerCase();
        const item = row.length > 1 ? row[1] : row[0];
        const note = row.length > 2 ? row[2] : '';
        const color = status === 'done' ? '#2f9e44' : status === 'warn' ? '#d97706' : '#64748b';
        const mark = status === 'done' ? '✓' : status === 'warn' ? '!' : '•';
        return `<div style="display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid #edf1f7;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: ${color}18; color: ${color}; font-weight: 700; flex: 0 0 22px;">${mark}</span>
            <span style="flex: 1;"><span style="display: block; color: #2f3a4a; line-height: 1.6;">${escapeHtml(item || '')}</span>${note ? `<span style="display: block; color: #7a8494; font-size: 0.9em;">${escapeHtml(note)}</span>` : ''}</span>
        </div>`;
    }).join('');

    return htmlToElement(`<section class="mp-layout-card mp-layout-checklist" data-mp-layout="checklist" style="${cardStyle('#2f9e44')}">
        <div style="${titleStyle('#2f9e44')}">${escapeHtml(title)}</div>
        ${items}
    </section>`);
}

function renderQuoteCard(content: string): HTMLElement {
    let values = parseKeyValues(content);
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
        try {
            values = JSON.parse(trimmed);
        } catch {
            values = {};
        }
    }
    const text = values.text || values.quote || trimmed;
    const source = values.source || values.author || '';
    return htmlToElement(`<section class="mp-layout-card mp-layout-quote-card" data-mp-layout="quote-card" style="${cardStyle('#8b5cf6')}; text-align: center;">
        <div style="font-size: 1.28em; line-height: 1.7; color: #33255f; font-weight: 700;">${escapeHtml(text)}</div>
        ${source ? `<div style="margin-top: 10px; color: #7c6aa8; font-size: 0.92em;">${escapeHtml(source)}</div>` : ''}
    </section>`);
}

function renderSummary(content: string): HTMLElement {
    const values = parseKeyValues(content);
    const highlight = values.highlight || values.title || content.trim();
    const body = values.body || values.content || '';
    const eyebrow = values.eyebrow || '一句话总结';
    return htmlToElement(`<section class="mp-layout-card mp-layout-summary" data-mp-layout="summary" style="${cardStyle('#f59f00')}">
        <div style="margin-bottom: 8px; color: #b76e00; font-size: 0.85em; font-weight: 700; letter-spacing: 0.08em;">${escapeHtml(eyebrow)}</div>
        <div style="color: #3b2f18; font-size: 1.12em; font-weight: 700; line-height: 1.7;">${escapeHtml(highlight)}</div>
        ${body ? `<p style="${bodyStyle()}; margin-top: 8px;">${escapeHtml(body)}</p>` : ''}
    </section>`);
}

function renderAuthorCard(values: KeyValueMap): HTMLElement {
    const tags = (values.tags || '').split('|').map(tag => tag.trim()).filter(Boolean).slice(0, 4);
    return htmlToElement(`<section class="mp-layout-card mp-layout-author-card" data-mp-layout="author-card" style="${cardStyle('#0f766e')}">
        <div style="display: flex; gap: 14px; align-items: center;">
            ${values.avatar ? `<img src="${escapeHtml(values.avatar)}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; flex: 0 0 54px;" />` : `<span style="width: 54px; height: 54px; border-radius: 50%; background: #0f766e18; color: #0f766e; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; flex: 0 0 54px;">${escapeHtml((values.name || '作').slice(0, 1))}</span>`}
            <span style="flex: 1;">
                <span style="display: block; color: #183b38; font-size: 1.08em; font-weight: 700;">${escapeHtml(values.name || '作者')}</span>
                ${values.role ? `<span style="display: block; margin-top: 2px; color: #55706d; font-size: 0.92em;">${escapeHtml(values.role)}</span>` : ''}
            </span>
        </div>
        ${values.bio ? `<p style="${bodyStyle()}; margin-top: 12px;">${escapeHtml(values.bio)}</p>` : ''}
        ${tags.length ? `<div style="margin-top: 12px;">${tags.map(tag => `<span style="display: inline-block; margin: 0 6px 6px 0; padding: 3px 8px; border-radius: 999px; background: #0f766e12; color: #0f766e; font-size: 0.86em;">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        ${values.link ? `<div style="margin-top: 8px; color: #55706d; font-size: 0.9em;">${escapeHtml(values.link)}</div>` : ''}
    </section>`);
}

function renderSubscribe(values: KeyValueMap): HTMLElement {
    return htmlToElement(`<section class="mp-layout-card mp-layout-subscribe" data-mp-layout="subscribe" style="${cardStyle('#ef4444')}; text-align: center;">
        ${values.label ? `<div style="margin-bottom: 8px; color: #ef4444; font-size: 0.85em; font-weight: 700;">${escapeHtml(values.label)}</div>` : ''}
        <div style="color: #3f1f1f; font-size: 1.14em; line-height: 1.6; font-weight: 700;">${escapeHtml(values.title || values.cta || '如果这篇对你有帮助，可以收藏起来')}</div>
        ${values.subtitle ? `<p style="${bodyStyle()}; margin-top: 8px;">${escapeHtml(values.subtitle)}</p>` : ''}
        <div style="margin-top: 14px;">
            <span style="display: inline-block; margin: 4px; padding: 6px 12px; border-radius: 999px; background: #ef4444; color: #fff; font-size: 0.92em;">${escapeHtml(values.primary || '继续关注')}</span>
            <span style="display: inline-block; margin: 4px; padding: 6px 12px; border-radius: 999px; background: #ef444414; color: #ef4444; font-size: 0.92em;">${escapeHtml(values.secondary || '收藏这篇')}</span>
        </div>
        ${values.qrcode ? `<img src="${escapeHtml(values.qrcode)}" style="display: block; width: 120px; height: 120px; object-fit: cover; margin: 14px auto 0;" />` : ''}
        ${values.note ? `<div style="margin-top: 10px; color: #8a5a5a; font-size: 0.9em;">${escapeHtml(values.note)}</div>` : ''}
    </section>`);
}

function renderFaq(content: string): HTMLElement {
    const values = parseKeyValues(content);
    const rows = parseRows(content);
    const items = rows.map(row => `<div style="padding: 12px 0; border-bottom: 1px solid #edf1f7;">
        <div style="color: #2f3a4a; font-weight: 700; line-height: 1.6;">Q: ${escapeHtml(row[0] || '')}</div>
        <div style="margin-top: 4px; color: #667085; line-height: 1.7;">A: ${escapeHtml(row[1] || '')}</div>
    </div>`).join('');
    return htmlToElement(`<section class="mp-layout-card mp-layout-faq" data-mp-layout="faq" style="${cardStyle('#6366f1')}">
        <div style="${titleStyle('#6366f1')}">${escapeHtml(values.title || '常见问题')}</div>
        ${items}
    </section>`);
}

function renderTimeline(content: string): HTMLElement {
    const values = parseKeyValues(content);
    const rows = parseRows(content);
    const items = rows.map(row => `<div style="display: flex; gap: 12px; margin: 14px 0;">
        <span style="min-width: 70px; color: #b45309; font-weight: 700;">${escapeHtml(row[0] || '')}</span>
        <span style="flex: 1; border-left: 2px solid #f6d6a7; padding-left: 12px;">
            <span style="display: block; color: #3c2b17; font-weight: 700;">${escapeHtml(row[1] || '')}</span>
            ${row[2] ? `<span style="display: block; margin-top: 4px; color: #76634c; line-height: 1.7;">${escapeHtml(row[2])}</span>` : ''}
        </span>
    </div>`).join('');
    return htmlToElement(`<section class="mp-layout-card mp-layout-timeline" data-mp-layout="timeline" style="${cardStyle('#d97706')}">
        <div style="${titleStyle('#d97706')}">${escapeHtml(values.title || '时间线')}</div>
        ${items}
    </section>`);
}

function renderComparisonTable(content: string): HTMLElement {
    let data: any = null;
    try {
        data = JSON.parse(content.trim());
    } catch {
        data = null;
    }

    if (!data || !data.left || !data.right) {
        const rows = parseRows(content);
        data = {
            left: { title: rows[0]?.[0] || '方案 A', items: rows.slice(1).map(row => row[0]).filter(Boolean) },
            right: { title: rows[0]?.[1] || '方案 B', items: rows.slice(1).map(row => row[1]).filter(Boolean) }
        };
    }

    const renderSide = (side: any, accent: string) => `<div style="flex: 1; min-width: 0; padding: 14px; border-radius: 10px; background: ${accent}10;">
        <div style="color: ${accent}; font-weight: 700; margin-bottom: 8px;">${escapeHtml(side.title || '')}</div>
        ${(side.items || []).map((item: string) => `<div style="padding: 6px 0; color: #394150; line-height: 1.6;">${escapeHtml(item)}</div>`).join('')}
    </div>`;

    return htmlToElement(`<section class="mp-layout-card mp-layout-comparison-table" data-mp-layout="comparison-table" style="${cardStyle('#0ea5e9')}">
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            ${renderSide(data.left, '#16a34a')}
            ${renderSide(data.right, '#dc2626')}
        </div>
    </section>`);
}

function renderExplicitComponent(type: string, content: string, settings: MPSettings): HTMLElement | null {
    switch (type) {
        case 'toc':
            return renderToc(content);
        case 'steps':
            return renderSteps(content);
        case 'checklist':
            return renderChecklist(content);
        case 'quote-card':
            return renderQuoteCard(content);
        case 'summary':
            return renderSummary(content);
        case 'author-card':
            return renderAuthorCard({ ...settings.authorCard, ...parseKeyValues(content) });
        case 'subscribe':
            return renderSubscribe({ ...settings.subscribeCard, ...parseKeyValues(content) });
        case 'faq':
            return renderFaq(content);
        case 'timeline':
            return renderTimeline(content);
        case 'comparison-table':
            return renderComparisonTable(content);
        default:
            return null;
    }
}

function codeBlockLanguage(codeEl: Element): string {
    const classes = Array.from(codeEl.classList);
    const languageClass = classes.find(cls => cls.startsWith('language-'));
    return languageClass ? languageClass.replace('language-', '') : '';
}

function processExplicitComponents(container: HTMLElement, settings: MPSettings): Set<string> {
    const rendered = new Set<string>();
    const supported = STANDARD_COMPONENT_IDS;

    container.querySelectorAll('pre > code').forEach(codeEl => {
        const type = codeBlockLanguage(codeEl);
        if (!supported.has(type)) return;

        const pre = codeEl.parentElement;
        if (!pre) return;

        const component = renderExplicitComponent(type, codeEl.textContent || '', settings);
        if (!component) return;

        rendered.add(type);
        pre.parentNode?.replaceChild(component, pre);
    });

    return rendered;
}

function processAutoToc(container: HTMLElement, settings: LayoutSettings, rendered: Set<string>): void {
    if (!settings.enableAutoToc || rendered.has('toc')) return;

    const headings = Array.from(container.querySelectorAll('h2, h3')) as HTMLElement[];
    if (headings.length < Math.max(1, settings.tocMinHeadings || 3)) return;

    const toc = renderToc('', headings);
    const firstHeading = container.querySelector('h1, h2, h3');
    if (firstHeading && firstHeading.parentElement === container) {
        firstHeading.insertAdjacentElement('afterend', toc);
        return;
    }
    container.prepend(toc);
}

function processTaskLists(container: HTMLElement, settings: LayoutSettings): void {
    if (!settings.enableTaskListEnhancement) return;

    container.querySelectorAll('ul').forEach(list => {
        const items = Array.from(list.querySelectorAll(':scope > li'));
        const taskItems = items.filter(item => item.classList.contains('task-list-item') || item.querySelector('input[type="checkbox"]'));
        if (taskItems.length === 0 || taskItems.length !== items.length) return;

        const rows = taskItems.map(item => {
            const input = item.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            const status = input?.checked ? 'done' : 'pending';
            const clone = item.cloneNode(true) as HTMLElement;
            clone.querySelector('input[type="checkbox"]')?.remove();
            return [status, clone.textContent?.trim() || ''];
        });
        list.parentNode?.replaceChild(renderChecklistRows(rows), list);
    });
}

function processImageCaptions(container: HTMLElement, settings: LayoutSettings): void {
    if (!settings.enableImageCaptions) return;

    container.querySelectorAll('img[alt]').forEach(img => {
        const image = img as HTMLImageElement;
        const alt = image.alt.trim();
        if (!alt || image.closest('figure')) return;

        const figure = document.createElement('figure');
        figure.className = 'mp-image-container';
        figure.style.cssText = 'margin: 1em auto; text-align: center; display: block;';

        const clone = image.cloneNode(true) as HTMLImageElement;
        figure.appendChild(clone);

        const caption = document.createElement('figcaption');
        caption.className = 'mp-image-caption';
        caption.textContent = alt;
        caption.style.cssText = 'text-align: center; color: #888; font-size: 0.9em; margin-top: 6px; display: block;';
        figure.appendChild(caption);

        image.parentNode?.replaceChild(figure, image);
    });
}

function processTables(container: HTMLElement, settings: LayoutSettings): void {
    if (!settings.enableTableEnhancement) return;

    container.querySelectorAll('table').forEach(table => {
        if (table.closest('.mp-table-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'mp-table-wrapper';
        wrapper.style.cssText = 'width: 100%; overflow-x: auto; margin: 1em 0; -webkit-overflow-scrolling: touch;';
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
}

function processClosingCards(container: HTMLElement, settings: MPSettings, rendered: Set<string>): void {
    if (settings.layoutEnhancements.enableAuthorCard && !rendered.has('author-card') && settings.authorCard.name) {
        container.appendChild(renderAuthorCard(settings.authorCard));
    }

    if (settings.layoutEnhancements.enableSubscribeCard && !rendered.has('subscribe') && settings.subscribeCard.title) {
        container.appendChild(renderSubscribe(settings.subscribeCard));
    }
}

export function applyLayoutEnhancements(container: HTMLElement, settings: MPSettings): void {
    const rendered = processExplicitComponents(container, settings);
    processAutoToc(container, settings.layoutEnhancements, rendered);
    processTaskLists(container, settings.layoutEnhancements);
    processImageCaptions(container, settings.layoutEnhancements);
    processTables(container, settings.layoutEnhancements);
    processClosingCards(container, settings, rendered);
}
