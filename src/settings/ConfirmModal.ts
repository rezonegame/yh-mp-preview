import { Modal, type App } from 'obsidian';

/** Single-flight confirmation: cancellation cannot commit and failure stays visible. */
export class ConfirmModal extends Modal {
    private pending = false;
    constructor(app: App, private readonly heading: string, private readonly message: string, private readonly action: () => void | Promise<void>) { super(app); }
    onOpen(): void {
        const root = this.contentEl;
        root.empty(); root.addClass('mp-confirm-modal');
        this.titleEl.setText(this.heading);
        root.createEl('p', { text: this.message });
        const status = root.createEl('p', { cls: 'mp-form-error', attr: { role: 'alert' } });
        const actions = root.createDiv('mp-dialog-actions');
        const cancel = actions.createEl('button', { text: '取消', attr: { type: 'button' } });
        const confirm = actions.createEl('button', { text: '确认', cls: 'mod-cta', attr: { type: 'button' } });
        cancel.addEventListener('click', () => { if (!this.pending) this.close(); });
        confirm.addEventListener('click', () => { void this.confirm(confirm, cancel, status); });
    }
    private async confirm(confirm: HTMLButtonElement, cancel: HTMLButtonElement, status: HTMLElement): Promise<void> {
        if (this.pending) return;
        this.pending = true; confirm.disabled = cancel.disabled = true; status.setText('');
        try { await this.action(); this.close(); }
        catch (error) { status.setText(error instanceof Error ? error.message : '操作失败，请重试'); }
        finally { this.pending = false; confirm.disabled = cancel.disabled = false; }
    }
    onClose(): void { this.contentEl.empty(); }
}
