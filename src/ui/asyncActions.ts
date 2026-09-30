import { Notice } from 'obsidian';
export function runAction(action: () => Promise<unknown>): void {
    void Promise.resolve().then(action).catch((error: unknown) => { new Notice(`操作失败：${error instanceof Error ? error.message : '未知错误'}`); });
}
export function bindAsyncEvent<K extends keyof HTMLElementEventMap>(element: HTMLElement, type: K, action: (event: HTMLElementEventMap[K]) => Promise<unknown>): void {
    element.addEventListener(type,event => { runAction(() => action(event)); });
}
