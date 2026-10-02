import type { ValidationReport, ValidationIssue } from '../core/validation/wechatHtmlValidator';

export function needsCompactWorkspace(width: number, height: number): boolean {
    return width < 520 || height < 560;
}

/** Session-only chrome: never touches settings, article DOM or export dimensions. */
export function observePreviewWorkspace(root: HTMLElement, settings: HTMLDetailsElement): () => void {
    const win = root.ownerDocument.defaultView;
    if (!win) return () => {};
    let previous: boolean | undefined;
    const refresh = () => {
        if (!root.clientWidth || !root.clientHeight) return;
        const compact = needsCompactWorkspace(root.clientWidth, root.clientHeight);
        root.classList.toggle('mp-compact-workspace', compact);
        root.style.setProperty('--mp-workspace-height', `${root.clientHeight}px`);
        if (compact !== previous) {
            // A resize must not hide the control currently used by keyboard users.
            if (!settings.contains(root.ownerDocument.activeElement)) settings.open = !compact;
            previous = compact;
        }
    };
    const observer = new win.ResizeObserver(refresh);
    observer.observe(root);
    win.addEventListener('resize', refresh);
    const dismiss = (event: MouseEvent | KeyboardEvent) => {
        if (!root.classList.contains('mp-compact-workspace') || !settings.open) return;
        if (event instanceof win.KeyboardEvent) {
            if (event.key !== 'Escape') return;
            if (settings.contains(root.ownerDocument.activeElement)) settings.querySelector('summary')?.focus();
        } else if (event.target instanceof win.Node && settings.contains(event.target)) return;
        settings.open = false;
    };
    win.addEventListener('click', dismiss);
    win.addEventListener('keydown', dismiss);
    refresh();
    return () => {
        observer.disconnect();
        win.removeEventListener('resize', refresh);
        win.removeEventListener('click', dismiss);
        win.removeEventListener('keydown', dismiss);
    };
}

export function togglePreviewFocus(root: HTMLElement, button: HTMLButtonElement): boolean {
    const focused = !root.classList.contains('mp-preview-focused');
    root.classList.toggle('mp-preview-focused', focused);
    button.setAttribute('aria-pressed', String(focused));
    button.setAttribute('aria-label', focused ? '退出专注预览' : '专注预览');
    button.title = focused ? '退出专注预览，恢复排版设置' : '专注预览，收起辅助区域';
    return focused;
}

export function groupValidationIssues(issues: ValidationIssue[]): ValidationIssue[][] {
    const groups = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
        const key = JSON.stringify([issue.severity, issue.code, issue.message]);
        const group = groups.get(key) || [];
        group.push(issue);
        groups.set(key, group);
    }
    // Blocking issues must stay ahead of warnings, including after grouping.
    return [...groups.values()].sort((a, b) => Number(b[0].severity === 'error') - Number(a[0].severity === 'error'));
}

export function renderPreviewValidation(panel: HTMLElement, report: ValidationReport | null): void {
    const previous = panel.querySelector<HTMLDetailsElement>('.mp-validation-details');
    const wasOpen = previous?.open ?? false;
    const hadErrors = panel.classList.contains('mp-has-errors');
    panel.empty();
    panel.hidden = !report;
    panel.classList.toggle('mp-has-errors', Boolean(report?.errors));
    if (!report) return;
    const details = panel.createEl('details', { cls: 'mp-validation-details' });
    details.open = wasOpen || (report.errors > 0 && !hadErrors);
    const status = details.createEl('summary', {
        cls: `mp-validation-summary ${report.errors ? 'is-error' : report.warnings ? 'is-warning' : 'is-ok'}`,
        text: report.errors
            ? `检查：${report.errors} 项阻断问题，已禁止复制`
            : report.warnings ? `可复制 · ${report.warnings} 项兼容性提示` : '可复制 · 检查通过',
    });
    status.title = '展开或收起完整检查详情';
    if (!report.issues.length) {
        details.createDiv({ cls: 'mp-validation-body', text: '未发现兼容性问题。' });
        return;
    }
    const body = details.createDiv('mp-validation-body');
    const list = body.createEl('ul', { cls: 'mp-validation-issues' });
    for (const group of groupValidationIssues(report.issues)) {
        const issue = group[0];
        const item = list.createEl('li', { cls: `is-${issue.severity}` });
        const locations = item.createEl('details');
        locations.createEl('summary', { text: `${issue.severity === 'error' ? '阻断' : '提示'} · ${issue.message}${group.length > 1 ? ` × ${group.length}` : ''}` });
        const paths = locations.createEl('ul');
        for (const entry of group) paths.createEl('li', { text: entry.path });
    }
}
