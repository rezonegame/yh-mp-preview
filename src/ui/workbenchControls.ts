export function createWorkbenchControls(container: HTMLElement): {
    toolbar: HTMLElement; controlsGroup: HTMLElement; secondaryRow: HTMLElement; disclosure: HTMLDetailsElement; header: HTMLElement;
} {
    const header = container.createDiv('mp-workspace-header');
    const disclosure = header.createEl('details', { cls: 'mp-settings-disclosure' });
    disclosure.open = true;
    disclosure.createEl('summary', { text: '排版设置', cls: 'mp-settings-summary' });
    const toolbar = disclosure.createDiv('mp-toolbar');
    toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', '文章外观与排版');
    const controlsGroup = toolbar.createDiv('mp-controls-group mp-compact-controls');
    const secondaryRow = toolbar.createDiv('mp-controls-group mp-secondary-row');
    secondaryRow.setAttribute('role', 'group'); secondaryRow.setAttribute('aria-label', '文章操作');
    return { toolbar, controlsGroup, secondaryRow, disclosure, header };
}
