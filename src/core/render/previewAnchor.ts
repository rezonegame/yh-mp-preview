export interface PreviewAnchor { index: number; text: string; offset: number; ratio: number; }
/** Document order from real DOM, never ArticleModel's type-grouped node IDs. */
export function capturePreviewAnchor(scroller: HTMLElement, article: HTMLElement): PreviewAnchor {
    const top = scroller.getBoundingClientRect().top;
    const blocks = Array.from(article.children) as HTMLElement[];
    let index = blocks.findIndex(block => block.getBoundingClientRect().bottom > top);
    if (index < 0) index = 0;
    const block = blocks[index];
    return { index, text: block?.textContent?.slice(0, 100) ?? '', offset: block ? top - block.getBoundingClientRect().top : 0,
        ratio: scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight) };
}
export function restorePreviewAnchor(scroller: HTMLElement, article: HTMLElement, anchor: PreviewAnchor): void {
    const block = article.children[anchor.index] as HTMLElement | undefined;
    if (block && (block.textContent ?? '').slice(0, 100) === anchor.text) {
        scroller.scrollTop += block.getBoundingClientRect().top - scroller.getBoundingClientRect().top + anchor.offset;
    } else scroller.scrollTop = anchor.ratio * Math.max(0, scroller.scrollHeight - scroller.clientHeight);
}
