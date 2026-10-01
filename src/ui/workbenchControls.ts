export function createWorkbenchControls(container: HTMLElement): {
    toolbar: HTMLElement; controlsGroup: HTMLElement; secondaryRow: HTMLElement;
} {
    const toolbar = container.createDiv('mp-toolbar');
    toolbar.setAttribute('role', 'group'); toolbar.setAttribute('aria-label', '文章外观与排版');
    const controlsGroup = toolbar.createDiv('mp-controls-group mp-compact-controls');
    const secondaryRow = toolbar.createDiv('mp-controls-group mp-secondary-row');
    secondaryRow.setAttribute('role', 'group'); secondaryRow.setAttribute('aria-label', '文章操作');
    return { toolbar, controlsGroup, secondaryRow };
}
