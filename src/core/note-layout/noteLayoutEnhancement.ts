import type { App } from 'obsidian';
import type { NoteLayoutStore } from './noteLayoutStore';

/**
 * Lifecycle boundary for the Obsidian note-layout feature.
 * 3.9.0 intentionally stores the state but does not change document styling.
 */
export class NoteLayoutEnhancement {
    private loaded = false;
    private enabled = false;

    constructor(private readonly app: App, private readonly store: NoteLayoutStore) {}

    load(): void {
        this.loaded = true;
        this.enabled = this.store.getSettings().enabled;
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
    }

    unload(): void {
        this.enabled = false;
        this.loaded = false;
    }
}
