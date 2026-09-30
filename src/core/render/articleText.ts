import pangu from 'pangu/browser';

/** Shared projection/output text policy; code stays byte-for-byte unchanged. */
export function normalizeArticleText(root: HTMLElement): void {
    const walker=root.ownerDocument.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while((node=walker.nextNode())) {
        if(!node.nodeValue || node.parentElement?.closest('pre,code')) continue;
        node.nodeValue=pangu.spacingText(node.nodeValue).replace(/「/g,'\u201c').replace(/」/g,'\u201d').replace(/『/g,'\u2018').replace(/』/g,'\u2019');
    }
}
