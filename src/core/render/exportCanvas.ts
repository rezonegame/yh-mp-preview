/** html2canvas clones the document: exclude unrelated UI/images and bound clone waits. */
const queues = new WeakMap<Document, Promise<unknown>>();
export function queueCanvasRender<T>(document: Document, job: () => Promise<T>): Promise<T> {
    const next = (queues.get(document) || Promise.resolve()).then(job);
    queues.set(document, next.catch(() => undefined));
    return next;
}

export function shouldIgnoreExportElement(candidate: Element, article: HTMLElement): boolean {
    if (candidate.contains(article) || article.contains(candidate)) return false;
    if (['HEAD', 'STYLE', 'META', 'TITLE'].includes(candidate.tagName)) return false;
    if (candidate.tagName === 'LINK' && candidate.getAttribute('rel') === 'stylesheet') return false;
    return true;
}

export async function boundedCanvasRender<T>(host: Window, signal: AbortSignal, render: () => Promise<T>, timeoutMs = 30_000): Promise<T> {
    signal.throwIfAborted();
    return new Promise<T>((resolve, reject) => {
        let settled = false;
        const finish = (error: unknown, value?: T) => {
            if (settled) return;
            settled = true; host.clearTimeout(timer); signal.removeEventListener('abort', onAbort);
            if (error) reject(error instanceof Error ? error : new Error(typeof error === 'string' ? error : '画布生成失败')); else resolve(value as T);
        };
        const onAbort = () => finish(new Error('导出已取消'));
        const timer = host.setTimeout(() => finish(new Error('画布生成超时，请重试或改用分段图')), timeoutMs);
        signal.addEventListener('abort', onAbort, { once: true });
        void Promise.resolve().then(render).then(value => finish(null, value), error => finish(error));
    });
}
