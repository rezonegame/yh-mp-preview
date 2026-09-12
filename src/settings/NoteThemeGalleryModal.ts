import { App, Modal, Notice, setIcon } from 'obsidian';
import type { NoteLayoutEnhancement } from '../core/note-layout/noteLayoutEnhancement';
import type { NoteLayoutProfile, NoteLayoutStore } from '../core/note-layout/noteLayoutStore';

interface NoteThemeGalleryEntry {
    id: NoteLayoutProfile['themeId'];
    name: string;
    recommendation: string;
}

const NOTE_THEME_ENTRIES: NoteThemeGalleryEntry[] = [
    { id: 'default', name: '默认阅读', recommendation: '适合日常笔记和综合内容' },
    { id: 'deep-reading', name: '深度阅读', recommendation: '适合长文、研究和知识沉淀' },
    { id: 'minimal', name: '极简阅读', recommendation: '适合速记和信息密度较高的内容' },
];

export class NoteThemeGalleryModal extends Modal {
    private currentThemeId: NoteLayoutProfile['themeId'];
    private applied = false;
    private readonly activePath: string | null;
    private readonly profileBase: NoteLayoutProfile;
    private gridContainer: HTMLElement | null = null;
    private tryHintEl: HTMLElement | null = null;

    constructor(
        app: App,
        private readonly store: NoteLayoutStore,
        private readonly enhancement: NoteLayoutEnhancement,
    ) {
        super(app);
        this.activePath = app.workspace.getActiveFile()?.path || null;
        const settings = store.getSettings();
        this.profileBase = store.getProfileForPath(this.activePath || '') || settings.defaults;
        this.currentThemeId = this.profileBase.themeId;
    }

    onOpen(): void {
        const { contentEl, modalEl } = this;
        modalEl.addClass('mp-theme-gallery-modal');
        contentEl.empty();

        const header = contentEl.createDiv('mp-gallery-header');
        const heading = header.createDiv('mp-gallery-heading');
        heading.createEl('h2', { text: '笔记阅读主题' });
        heading.createEl('p', { text: '只改变 Obsidian 的显示方式，不修改 Markdown 内容。' });

        const sceneBar = contentEl.createDiv('mp-gallery-scenes');
        sceneBar.createEl('button', {
            text: '笔记阅读 · 3',
            cls: 'mp-gallery-scene is-active',
            attr: { type: 'button', 'aria-pressed': 'true' },
        });

        this.gridContainer = contentEl.createDiv('mp-gallery-grid');
        this.renderGallery();

        const footer = contentEl.createDiv('mp-gallery-footer');
        const trialInfo = footer.createDiv('mp-gallery-trial-info');
        this.tryHintEl = trialInfo.createDiv('mp-gallery-try-hint');
        trialInfo.createEl('div', {
            cls: 'mp-gallery-trial-note',
            text: this.activePath ? '点击卡片试用；关闭窗口会取消未应用的试用。' : '没有打开的笔记，只能设置全库默认主题。',
        });
        this.updateTryHint();

        const actions = footer.createDiv('mp-gallery-actions mp-note-gallery-actions');
        const cancel = actions.createEl('button', { text: '取消', cls: 'mp-gallery-btn-cancel', attr: { type: 'button' } });
        cancel.addEventListener('click', () => this.close());

        const native = actions.createEl('button', {
            text: '当前笔记用原生',
            cls: 'mp-gallery-btn-cancel',
            attr: { type: 'button' },
        });
        native.disabled = !this.activePath;
        native.addEventListener('click', () => void this.applyNative());

        const applyDefault = actions.createEl('button', {
            text: '设为全库默认',
            cls: 'mp-gallery-btn-cancel',
            attr: { type: 'button' },
        });
        applyDefault.addEventListener('click', () => void this.applyDefault());

        const applyCurrent = actions.createEl('button', {
            text: '应用到当前笔记',
            cls: 'mp-gallery-btn-apply',
            attr: { type: 'button' },
        });
        applyCurrent.disabled = !this.activePath;
        applyCurrent.addEventListener('click', () => void this.applyCurrent());
    }

    onClose(): void {
        if (this.activePath) this.enhancement.clearPreviewProfile(this.activePath);
        this.contentEl.empty();
    }

    private renderGallery(): void {
        if (!this.gridContainer) return;
        this.gridContainer.empty();
        this.gridContainer.createEl('h3', { cls: 'mp-gallery-section-title', text: '笔记阅读主题 · 3 个主题' });
        const cardGrid = this.gridContainer.createDiv('mp-gallery-card-grid');
        NOTE_THEME_ENTRIES.forEach(entry => {
            const selected = entry.id === this.currentThemeId;
            const card = cardGrid.createEl('button', {
                cls: `mp-theme-card ${selected ? 'is-selected' : ''}`,
                attr: {
                    type: 'button',
                    'aria-pressed': selected ? 'true' : 'false',
                    title: `试用主题：${entry.name}`,
                },
            });
            const info = card.createDiv('mp-theme-info');
            info.createEl('strong', { text: entry.name, cls: 'mp-theme-name' });
            if (selected) {
                const check = info.createDiv('mp-theme-checkmark');
                setIcon(check, 'check');
            }
            card.addEventListener('click', () => {
                this.currentThemeId = entry.id;
                if (this.activePath && this.enhancement.isEnabled()) {
                    this.enhancement.setPreviewProfile(this.activePath, this.getSelectedProfile());
                }
                this.renderGallery();
                this.updateTryHint();
            });
        });
    }

    private getSelectedProfile(): NoteLayoutProfile {
        return { ...this.profileBase, themeId: this.currentThemeId };
    }

    private updateTryHint(): void {
        if (!this.tryHintEl) return;
        const entry = NOTE_THEME_ENTRIES.find(item => item.id === this.currentThemeId) || NOTE_THEME_ENTRIES[0];
        this.tryHintEl.setText(`推荐作用：${entry.recommendation}`);
    }

    private async applyCurrent(): Promise<void> {
        if (!this.activePath) return;
        await this.store.setFileOverride(this.activePath, { mode: 'custom', profile: this.getSelectedProfile() });
        this.applied = true;
        this.enhancement.clearPreviewProfile(this.activePath);
        new Notice('已应用到当前笔记');
        this.close();
    }

    private async applyDefault(): Promise<void> {
        await this.store.setDefaultProfile(this.getSelectedProfile());
        this.applied = true;
        if (this.activePath) this.enhancement.clearPreviewProfile(this.activePath);
        new Notice('已设为全库默认主题');
        this.close();
    }

    private async applyNative(): Promise<void> {
        if (!this.activePath) return;
        await this.store.setFileOverride(this.activePath, { mode: 'native' });
        this.applied = true;
        this.enhancement.clearPreviewProfile(this.activePath);
        new Notice('当前笔记已恢复原生排版');
        this.close();
    }
}
