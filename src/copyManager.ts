import { Notice } from 'obsidian';
// @ts-ignore
import pangu from 'pangu/browser';

export class CopyManager {
    private static cleanupHtml(element: HTMLElement): string {
        // 创建克隆以避免修改原始元素
        const clone = element.cloneNode(true) as HTMLElement;

        // 移除所有的 data-* 属性
        clone.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 移除所有的 class 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('class');
        });

        // 移除所有的 id 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('id');
        });

        // 使用 XMLSerializer 安全地转换为字符串
        const serializer = new XMLSerializer();
        return serializer.serializeToString(clone);
    }

    public static async processImagesForExport(container: HTMLElement): Promise<void> {
        return this.processImages(container);
    }

    private static async processImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        const imageArray = Array.from(images);

        for (const img of imageArray) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        img.src = reader.result as string;
                        resolve(null);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('图片转换失败:', error);
            }
        }
    }

    public static async copyToClipboard(element: HTMLElement): Promise<void> {
        try {
            const clone = element.cloneNode(true) as HTMLElement;
            await this.processImages(clone);

            const contentSection = clone.querySelector('.mp-content-section');
            if (!contentSection) {
                throw new Error('找不到内容区域');
            }
            // 使用新的 cleanupHtml 方法
            let cleanHtml = this.cleanupHtml(contentSection as HTMLElement);

            // 文本清洗：pangu 自动加空格 + 智能引号转换
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cleanHtml;

                // 1. 使用 pangu 在 DOM 级别安全地为中英文之间添加空格
                // @ts-ignore
                pangu.spacingElement(tempDiv);

                // 2. 使用 TreeWalker 遍历纯文本节点进行引号转换
                //    只操作文本节点，绝不会破坏 HTML 标签
                const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
                let node;
                while (node = walker.nextNode()) {
                    if (node.nodeValue) {
                        // 直角引号 → 弯引号（微信公众号常见排版规范）
                        node.nodeValue = node.nodeValue
                            .replace(/「/g, '\u201c').replace(/」/g, '\u201d')   // 「」→ ""
                            .replace(/『/g, '\u2018').replace(/』/g, '\u2019');  // 『』→ ''
                    }
                }

                cleanHtml = tempDiv.innerHTML;
            } catch (e) {
                console.warn('Text cleaning failed:', e);
            }

            const clipData = new ClipboardItem({
                'text/html': new Blob([cleanHtml], { type: 'text/html' }),
                'text/plain': new Blob([clone.textContent || ''], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipData]);
            new Notice('已复制到剪贴板');
        } catch (error) {
            new Notice('复制失败');
        }
    }
}