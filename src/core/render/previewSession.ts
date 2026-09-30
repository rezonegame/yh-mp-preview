/** Per-pane lifecycle. A slow render is never allowed to replace a newer article. */
export class PreviewSession {
    trialTemplateId: string | null = null;
    headerEnabled = false;
    footerEnabled = false;
    private revision = 0;
    private controller: AbortController | null = null;
    private closed = false;
    begin(): { signal: AbortSignal; isCurrent: () => boolean } {
        this.controller?.abort();
        const controller = new AbortController();
        this.controller = controller;
        const revision = ++this.revision;
        return { signal: controller.signal, isCurrent: () => !this.closed && revision === this.revision && !controller.signal.aborted };
    }
    invalidate(): void { this.revision++; this.controller?.abort(); }
    close(): void { this.closed = true; this.invalidate(); }
}
