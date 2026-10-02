import articleBaseCss from '../styles/view/article-base.css';
import { capturePreviewAnchor, restorePreviewAnchor } from '../core/render/previewAnchor';
import { replaceWithSafeHtml, safeUrl } from '../core/security/safeDom';

/** Own local Markdown fixture: no remote images, fonts, scripts or upstream assets. */
export const galleryExampleMarkdown = `# 把想法写成一篇清晰的文章

这是一篇用于比较公众号主题的本地示例。正文保持自然的阅读节奏，强调 **关键信息**，而不是让装饰抢走注意力。

## 先建立阅读路线

长文需要清楚的章节和舒适的留白。同一段文章在不同版式下，标题、引用和步骤会形成不同的节奏。

> 好的排版让读者更容易理解内容。
>
> 引用第二段仍然属于同一个观点。

### 三个可执行步骤

1. 确定文章的目标。
   - 保留重要信息。
   - 不给原文增加虚构内容。
2. 选择适合的阅读版式。
3. 复制并核对公众号预览。

#### 补充说明

代码与表格需要保持完整，不能为了美观丢失结构。

\`\`\`js
const readable = true;
console.log(readable);
\`\`\`

| 项目 | 说明 |
| --- | --- |
| 内容 | 原文不变 |
| 主题 | 只改变呈现 |

---

## 最后一次检查

确认字号、段落和末尾完整，再点击复制。**本地示例不会被复制或导出。**
`;

export class ThemeGalleryPreview {
    private readonly shadow: ShadowRoot;
    private readonly scroller: HTMLElement;
    private readonly paper: HTMLElement;
    private generation = 0;
    private disposed = false;
    private scrollEpoch = 0;
    private imageCleanups: (() => void)[] = [];
    private readonly imageCache = new Map<string, HTMLImageElement[]>();
    constructor(host: HTMLElement, fontFamily: string, fontSize: number, darkHost: boolean) {
        this.shadow = host.attachShadow({ mode: 'open' });
        const doc = host.ownerDocument;
        const sheet = new doc.defaultView!.CSSStyleSheet();
        sheet.replaceSync(articleBaseCss + `
            :host { display:block; min-width:0; min-height:0; height:100%; color:#333; color-scheme:light; --text-accent:${darkHost ? '#576b95' : 'inherit'}; --background-modifier-border:#d9dde2; }
            .viewport {height:100%; overflow:auto; background:#eef1f3; padding:12px; box-sizing:border-box;}
            .paper {width:min(100%,375px); margin-inline:auto; color:#333; background:#fcfcfc;}
            .mp-content-section {box-sizing:border-box; width:100%;}
            .mp-content-section * {box-sizing:border-box;}
            .mp-content-section pre code {white-space:pre-wrap; overflow-wrap:anywhere;}
        `);
        this.shadow.adoptedStyleSheets = [sheet];
        this.scroller = doc.defaultView!.createDiv(); this.scroller.className = 'viewport';
        this.paper = doc.defaultView!.createDiv(); this.paper.className = 'paper';
        this.paper.style.fontFamily = fontFamily; this.paper.style.fontSize = `${fontSize}px`;
        this.scroller.appendChild(this.paper); this.shadow.append(this.scroller);
        this.scroller.addEventListener('scroll', this.onScroll, { passive: true });
    }
    private readonly onScroll = () => { ++this.scrollEpoch; };
    show(article: HTMLElement | null): void {
        if (this.disposed) return;
        const previous = this.paper.firstElementChild as HTMLElement | null;
        const anchor = previous ? capturePreviewAnchor(this.scroller, previous) : null;
        const generation = ++this.generation;
        this.imageCleanups.forEach(clean => clean()); this.imageCleanups = [];
        this.paper.replaceChildren();
        if (!article) { this.paper.textContent = '尚无当前文章，可以切换至统一示例。'; return; }
        // Generated copies only; no external HTML or event handlers are admitted.
        const copy = this.paper.ownerDocument.defaultView!.createEl('section');
        // Strip image sources before parsing: a theme change must not create another downloading img.
        // The source is our DOM serializer (quoted/escaped attributes), not arbitrary external HTML.
        const sources = Array.from(article.querySelectorAll('img'));
        let imageIndex = 0;
        const serialized = new XMLSerializer().serializeToString(article).replace(/<img\b[^>]*>/gi, tag =>
            tag.replace(/^<img\b/i, `<img data-mp-preview-resource="${imageIndex++}"`).replace(/\ssrc="[^"]*"/gi, ''));
        replaceWithSafeHtml(copy, serialized);
        const root = copy.firstElementChild as HTMLElement | null;
        if (!root) return;
        root.className = 'mp-content-section'; root.removeAttribute('contenteditable');
        const occurrences = new Map<string, number>();
        root.querySelectorAll<HTMLImageElement>('img[data-mp-preview-resource]').forEach(placeholder => {
            const source = sources[Number(placeholder.getAttribute('data-mp-preview-resource'))];
            const url = source ? safeUrl(source.getAttribute('src') ?? '', 'image') : null;
            placeholder.removeAttribute('data-mp-preview-resource');
            if (!url) return;
            const ordinal = occurrences.get(url) ?? 0; occurrences.set(url, ordinal + 1);
            const cached = this.imageCache.get(url) ?? [];
            let image = cached[ordinal];
            if (!image) {
                image = this.paper.ownerDocument.defaultView!.createEl('img'); image.src = url;
                cached[ordinal] = image; this.imageCache.set(url, cached);
            }
            // Preserve the already-loaded resource, while updating only sanitized presentation attributes.
            Array.from(image.attributes).filter(attribute => attribute.name !== 'src').forEach(attribute => image.removeAttribute(attribute.name));
            Array.from(placeholder.attributes).forEach(attribute => image.setAttribute(attribute.name, attribute.value));
            placeholder.replaceWith(image);
        });
        this.paper.appendChild(root);
        if (anchor) restorePreviewAnchor(this.scroller, root, anchor);
        const epoch = this.scrollEpoch;
        root.querySelectorAll('img').forEach(img => {
            const loaded = () => { if (!this.disposed && generation === this.generation && epoch === this.scrollEpoch && anchor) restorePreviewAnchor(this.scroller, root, anchor); };
            img.addEventListener('load', loaded, { once: true });
            this.imageCleanups.push(() => img.removeEventListener('load', loaded));
        });
    }
    destroy(): void {
        this.disposed = true; ++this.generation;
        this.imageCleanups.forEach(clean => clean()); this.imageCleanups = [];
        this.scroller.removeEventListener('scroll', this.onScroll); this.shadow.replaceChildren();
        this.shadow.adoptedStyleSheets = [];
        this.imageCache.clear();
    }
}
