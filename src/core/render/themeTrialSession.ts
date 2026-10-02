export type ThemeTrialState = 'previewing' | 'saving' | 'saving-unknown' | 'applied' | 'cancelled' | 'closed';

/** Pane-local transaction. A started persistence operation is never pretended to be cancelled. */
export class ThemeTrialSession {
    state: ThemeTrialState = 'previewing';
    private generation = 0;
    private pending: Promise<void> = Promise.resolve();
    private timer: number | null = null;
    private previewError: unknown = null;
    private disposed = false;
    get busy(): boolean { return this.state === 'saving' || this.state === 'saving-unknown'; }
    constructor(private changed: () => void, private readonly unknownAfterMs = 10_000, private readonly clock: Window = window) {}
    preview(work: (isCurrent: () => boolean) => void | Promise<void>): Promise<void> {
        if (this.state !== 'previewing' || this.disposed) return this.pending;
        const generation = ++this.generation;
        this.previewError = null;
        const isCurrent = () => !this.disposed && generation === this.generation;
        try { this.pending = Promise.resolve(work(isCurrent)).catch(error => { if (isCurrent()) this.previewError = error; }); }
        catch (error) { this.previewError = error; this.pending = Promise.resolve(); }
        return this.pending;
    }
    async apply(persist: () => void | Promise<void>): Promise<void> {
        if (this.state !== 'previewing' || this.disposed) return;
        this.state = 'saving'; this.changed();
        this.timer = this.clock.setTimeout(() => { if (this.state === 'saving') { this.state = 'saving-unknown'; this.changed(); } }, this.unknownAfterMs);
        try {
            await this.pending;
            if (this.previewError) throw this.previewError instanceof Error ? this.previewError : new Error('主题预览失败');
            if (this.disposed) throw new Error('文章上下文已变化，未开始保存。');
            await persist();
            this.state = 'applied';
        } catch (error) { this.state = this.disposed ? 'closed' : 'previewing'; throw error; }
        finally { if (this.timer) this.clock.clearTimeout(this.timer); this.timer = null; this.changed(); }
    }
    /** ordinary close is blocked during saving; unknown close releases UI without misreporting rollback. */
    close(force = false): boolean {
        if (this.state === 'saving' && !force) return false;
        this.disposed = true; ++this.generation;
        if (!this.busy && this.state !== 'applied') this.state = 'cancelled';
        return true;
    }
}
