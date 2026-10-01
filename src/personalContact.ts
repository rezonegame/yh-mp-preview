import personalQr from './assets/personal-wechat.png';

/** Local, owner-document dialog; it never makes requests or modifies article DOM. */
export class PersonalContact {
    private static readonly opened = new WeakMap<HTMLElement, () => void>();
    static close(parent: HTMLElement): void { this.opened.get(parent)?.(); }
    static show(parent: HTMLElement): void {
        this.close(parent);
        const owner = parent.ownerDocument;
        const focus = owner.activeElement as HTMLElement | null;
        const overlay = parent.createDiv({ cls: 'mp-donate-overlay' });
        const dialog = overlay.createDiv({ cls: 'mp-about-modal', attr: { role: 'dialog', 'aria-modal': 'true', 'aria-label': '个人联系', tabindex: '-1' } });
        const dismiss = dialog.createEl('button', { cls: 'mp-donate-close', text: '×', attr: { type: 'button', 'aria-label': '关闭个人联系' } });
        dialog.createEl('h2', { cls: 'mp-about-title', text: '个人联系' });
        dialog.createEl('img', { cls: 'mp-personal-qr', attr: { src: personalQr, alt: '维护者 Akira 的个人微信二维码', width: '940', height: '1395' } });
        const cleanup = () => {
            owner.removeEventListener('keydown', keyboard, true);
            overlay.remove(); this.opened.delete(parent);
            if (focus?.isConnected) focus.focus();
        };
        const keyboard = (event: KeyboardEvent) => {
            const stack = owner.querySelectorAll('.mp-donate-overlay');
            if (stack[stack.length - 1] !== overlay) return;
            if (event.key !== 'Escape' && event.key !== 'Tab') return;
            event.preventDefault(); event.stopPropagation();
            if (event.key === 'Escape') cleanup(); else dismiss.focus();
        };
        dismiss.addEventListener('click', cleanup);
        overlay.addEventListener('click', event => { if (event.target === overlay) cleanup(); });
        owner.addEventListener('keydown', keyboard, true);
        this.opened.set(parent, cleanup);
        dialog.focus();
    }
}
