import { Setting, setIcon } from 'obsidian';

let sequence = 0;
export function settingsDisclosure(parent: HTMLElement, title: string, expanded: Set<string>, render: (body: HTMLElement) => void): HTMLElement {
    const panel = parent.createDiv({ cls: 'settings-section' });
    const trigger = panel.createDiv({ cls: 'settings-section-header', attr: { role: 'button', tabindex: '0', 'aria-label': title } });
    const chevron = trigger.createSpan({ cls: 'settings-section-toggle', attr: { 'aria-hidden': 'true' } });
    const body = panel.createDiv({ cls: 'settings-section-content', attr: { id: 'mp-settings-body-' + ++sequence } });
    trigger.setAttribute('aria-controls', body.id);
    new Setting(trigger).setName(title).setHeading();
    const update = (open: boolean) => {
        if (open) expanded.add(title); else expanded.delete(title);
        panel.toggleClass('is-expanded', open);
        trigger.setAttribute('aria-expanded', String(open));
        setIcon(chevron, open ? 'chevron-down' : 'chevron-right');
    };
    trigger.addEventListener('click', () => update(!expanded.has(title)));
    trigger.addEventListener('keydown', event => {
        if (!['Enter', ' '].includes(event.key)) return;
        event.preventDefault(); update(!expanded.has(title));
    });
    render(body);
    update(expanded.has(title));
    return panel;
}
