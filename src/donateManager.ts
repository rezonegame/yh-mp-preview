import type { App, Plugin } from 'obsidian';

/** Compatibility facade; each panel owns its overlay and cleanup independently. */
export class DonateManager {
    private static overlays = new WeakMap<HTMLElement, () => void>();
    public static initialize(_app: App, _plugin: Plugin): void { /* no shared UI state */ }
    public static closeModal(container: HTMLElement): void { this.overlays.get(container)?.(); }
    public static showDonateModal(container: HTMLElement): void {
        this.overlays.get(container)?.();
        const doc = container.ownerDocument;
        const previousFocus = doc?.activeElement as HTMLElement | null;
        const overlay = container.createDiv({ cls:'mp-donate-overlay' });
        const modal = overlay.createDiv({ cls:'mp-about-modal', attr:{ role:'dialog', 'aria-modal':'true', 'aria-label':'关于与帮助', tabindex:'-1' } });
        const close = () => { overlay.remove(); doc?.removeEventListener('keydown', onKey, true); previousFocus?.focus?.(); this.overlays.delete(container); };
        const onKey = (event: KeyboardEvent) => {
            const visibleOverlays = doc?.querySelectorAll('.mp-donate-overlay');
            if(!overlay.isConnected || (visibleOverlays?.length && visibleOverlays[visibleOverlays.length - 1] !== overlay)) return;
            if(event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
            else if(event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); button.focus?.(); }
        };
        const button = modal.createEl('button', { cls:'mp-donate-close', text:'×', attr:{'aria-label':'关闭关于与帮助'} });
        button.addEventListener('click',close);
        overlay.addEventListener('click',event => { if(event.target === overlay) close(); });
        modal.createEl('h2', { text:'关于与帮助', cls:'mp-about-title' });
        const intro = modal.createDiv({ cls:'mp-about-section' });
        intro.createEl('p', { text:'yh-mp-preview · Markdown 排版工作台。公众号排版与笔记增强独立设置，不改写正文，不自动发布。' });
        const steps = intro.createEl('ol');
        ['选择场景和主题，在预览中检查阅读效果。','高级排版中的文章配方只在需要时开启。','复制富文本到公众号后台完成最终核对；也可导出 HTML、完整长图或分段图。','遇到问题可回退 BRAT 版本，保留 data.json 和 note-layout.json。'].forEach(text => steps.createEl('li',{text}));
        intro.createEl('p',{text:'独立维护：yhwang。早期保留实现来自 Yeban8090/mp-preview（MIT）；现行发行 AGPL-3.0-or-later，完整来源与依赖许可见 NOTICE 和 THIRD_PARTY_NOTICES。'});
        for(const text of ['支持二维码待补充','公众号二维码待补充']) modal.createDiv({cls:'mp-about-qr'}).createEl('p',{cls:'mp-about-desc',text});
        doc?.addEventListener('keydown',onKey,true);
        this.overlays.set(container,close);
        modal.focus?.();
    }
}
