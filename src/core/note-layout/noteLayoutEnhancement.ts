import type { App, MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { editorInfoField } from 'obsidian';
import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { MarkdownView } from 'obsidian';
import type { NoteLayoutProfile, NoteLayoutStore } from './noteLayoutStore';

const NOTE_LAYOUT_CLASS = 'yh-mp-note-layout';
const NOTE_SOURCE_MODE_CLASS = 'yh-mp-note-source-mode';
const NOTE_THEME_CLASSES = ['yh-mp-note-theme-default', 'yh-mp-note-theme-deep-reading', 'yh-mp-note-theme-minimal'];

function clearLayoutClasses(element: HTMLElement): void {
    element.classList.remove(NOTE_LAYOUT_CLASS, NOTE_SOURCE_MODE_CLASS, ...NOTE_THEME_CLASSES);
    element.style.removeProperty('--yh-mp-note-font-size');
    element.style.removeProperty('--yh-mp-note-line-height');
    element.style.removeProperty('--yh-mp-note-max-width');
}

function applyLayoutProfile(element: HTMLElement, profile: NoteLayoutProfile | null, sourceMode = false): void {
    clearLayoutClasses(element);
    if (!profile) return;
    const theme = profile.themeId === 'deep-reading' || profile.themeId === 'minimal' ? profile.themeId : 'default';
    element.classList.add(NOTE_LAYOUT_CLASS, `yh-mp-note-theme-${theme}`);
    if (sourceMode) element.classList.add(NOTE_SOURCE_MODE_CLASS);
    element.style.setProperty('--yh-mp-note-font-size', `${profile.fontSize}px`);
    element.style.setProperty('--yh-mp-note-line-height', String(profile.lineHeight));
    element.style.setProperty('--yh-mp-note-max-width', `${profile.maxWidth}px`);
}

export class NoteLayoutEnhancement {
    private loaded = false;
    private enabled = false;
    private readonly editorExtensions: Extension[] = [];
    private readonly previewProfiles = new Map<string, NoteLayoutProfile | null>();

    constructor(
        private readonly plugin: Plugin,
        private readonly app: App,
        private readonly store: NoteLayoutStore,
    ) {}

    load(): void {
        if (this.loaded) return;
        this.loaded = true;
        this.enabled = this.store.getSettings().enabled;
        this.plugin.registerMarkdownPostProcessor((element, context) => this.processReadingElement(element, context), 1000);
        this.plugin.registerEditorExtension(this.editorExtensions);
        this.syncEditorExtension();
    }

    isLoaded(): boolean {
        return this.loaded;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    async setEnabled(enabled: boolean): Promise<void> {
        if (!this.loaded || !this.store.isAvailable()) throw new Error('笔记排版模块当前不可用');
        await this.store.updateSettings({ enabled });
        this.enabled = enabled;
        this.syncEditorExtension();
        this.refreshMarkdownPreviews();
    }

    refresh(): void {
        if (!this.loaded) return;
        this.syncEditorExtension();
        this.refreshMarkdownPreviews();
    }

    setPreviewProfile(path: string, profile: NoteLayoutProfile | null): void {
        if (!this.loaded) return;
        this.previewProfiles.set(path, profile);
        this.refresh();
    }

    clearPreviewProfile(path: string): void {
        if (!this.previewProfiles.delete(path)) return;
        this.refresh();
    }

    unload(): void {
        this.enabled = false;
        this.previewProfiles.clear();
        this.editorExtensions.splice(0);
        this.loaded = false;
    }

    private processReadingElement(element: HTMLElement, context: MarkdownPostProcessorContext): void {
        const profile = this.getProfileForPath(context.sourcePath);
        applyLayoutProfile(element, profile);
    }

    private createEditorExtension(): Extension {
        const store = this.store;
        const getProfile = (path: string): NoteLayoutProfile | null => this.getProfileForPath(path);
        return ViewPlugin.fromClass(class {
            constructor(private readonly view: EditorView) {
                this.apply();
            }

            update(update: ViewUpdate): void {
                if (update.docChanged || update.viewportChanged || update.selectionSet) this.apply();
            }

            destroy(): void {
                clearLayoutClasses(this.view.dom);
            }

            private apply(): void {
                const info = this.view.state.field(editorInfoField, false);
                const profile = info?.file ? getProfile(info.file.path) : null;
                const sourceMode = info?.file ? store.isSourceModeEnabledForPath(info.file.path) : false;
                applyLayoutProfile(this.view.dom, profile, sourceMode);
            }
        });
    }

    private getProfileForPath(path: string): NoteLayoutProfile | null {
        if (!this.enabled) return null;
        if (this.previewProfiles.has(path)) return this.previewProfiles.get(path) || null;
        return this.store.getProfileForPath(path);
    }

    private syncEditorExtension(): void {
        if (this.enabled && this.editorExtensions.length === 0) {
            this.editorExtensions.push(this.createEditorExtension());
        } else if (!this.enabled) {
            this.editorExtensions.splice(0);
        }
        this.app.workspace.updateOptions();
    }

    private refreshMarkdownPreviews(): void {
        this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
            const view = leaf.view as MarkdownView;
            view.previewMode?.rerender(true);
        });
    }
}
