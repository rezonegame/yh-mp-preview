/**
 * 图片画廊渲染器
 * 将多张图片渲染为横向滚动的画廊布局
 */

import type { ParsedGallery } from './ContainerParser';

export interface GalleryStyle {
    container: string;
    title: string;
    scroll: string;
    item: string;
    image: string;
}

// 默认样式（可被模板覆盖）
const DEFAULT_STYLE: GalleryStyle = {
    container: 'margin: 20px 0;',
    title: 'text-align: center; font-size: 14px; color: #999; margin: 0 0 12px 0;',
    scroll: 'display: flex; overflow-x: auto; gap: 12px; padding: 4px 0; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;',
    item: 'flex: 0 0 auto; width: 200px; height: 200px; scroll-snap-align: start; overflow: hidden; border-radius: 8px; background: #f0f0f0;',
    image: 'width: 100%; height: 100%; object-fit: cover; display: block;'
};

/**
 * 渲染图片画廊 HTML
 */
export function renderGallery(gallery: ParsedGallery, style: Partial<GalleryStyle> = {}): string {
    const finalStyle = { ...DEFAULT_STYLE, ...style };

    // 构建图片项 HTML
    const itemsHtml = gallery.images.map(imagePath => `
        <figure data-container="gallery-item" style="${finalStyle.item}">
            <img data-container="gallery-image" src="${imagePath}" alt="" style="${finalStyle.image}" />
        </figure>
    `).join('');

    // 标题（如果有）
    const titleHtml = gallery.title
        ? `<p data-container="gallery-title" style="${finalStyle.title}">${gallery.title}</p>`
        : '';

    return `
        <section data-container="gallery" style="${finalStyle.container}">
            ${titleHtml}
            <section data-container="gallery-scroll" style="${finalStyle.scroll}">
                ${itemsHtml}
            </section>
        </section>
    `;
}

/**
 * 创建画廊 DOM 元素
 */
export function createGalleryElement(gallery: ParsedGallery, style: Partial<GalleryStyle> = {}): HTMLElement {
    const html = renderGallery(gallery, style);
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
}

/**
 * 应用画廊样式到已有元素
 */
export function applyGalleryStyle(container: HTMLElement, style: Partial<GalleryStyle> = {}): void {
    const finalStyle = { ...DEFAULT_STYLE, ...style };

    // 容器样式
    container.setAttribute('style', finalStyle.container);

    // 标题
    const title = container.querySelector('[data-container="gallery-title"]');
    if (title) {
        title.setAttribute('style', finalStyle.title);
    }

    // 滚动容器
    const scroll = container.querySelector('[data-container="gallery-scroll"]');
    if (scroll) {
        scroll.setAttribute('style', finalStyle.scroll);
    }

    // 图片项
    container.querySelectorAll('[data-container="gallery-item"]').forEach(item => {
        item.setAttribute('style', finalStyle.item);
    });

    // 图片
    container.querySelectorAll('[data-container="gallery-image"]').forEach(img => {
        img.setAttribute('style', finalStyle.image);
    });
}

/**
 * 解析 Obsidian wikilink 图片路径
 * 返回可用的图片 URL
 */
export function resolveImagePath(linktext: string, app: any): string | null {
    try {
        const file = app.metadataCache.getFirstLinkpathDest(linktext.split('|')[0], '');
        if (file) {
            return app.vault.adapter.getResourcePath(file.path);
        }
    } catch (error) {
        console.error('图片解析失败:', error);
    }
    return null;
}