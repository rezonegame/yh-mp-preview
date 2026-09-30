import { Notice } from 'obsidian';
import pangu from 'pangu/browser';
import { prepareLegacyWechatFragment } from './core/render/legacyWechatPipeline';
import type { ValidationReport } from './core/validation/wechatHtmlValidator';
import type { WechatPalette } from './core/theme/wechatPalette';
import { replaceWithSafeHtml } from './core/security/safeDom';

export class CopyManager {
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

    public static async copyToClipboard(
        element: HTMLElement,
        options: { themeId?: string; recipeId?: string; palette?: WechatPalette } = {},
    ): Promise<ValidationReport> {
        try {
            const clone = element.cloneNode(true) as HTMLElement;
            await this.processImages(clone);

            const contentSection = clone.querySelector('.mp-content-section');
            if (!contentSection) {
                throw new Error('找不到内容区域');
            }
            const preparation = prepareLegacyWechatFragment(contentSection as HTMLElement, options);
            if (preparation.validation.errors > 0) {
                throw new Error(`发现 ${preparation.validation.errors} 项阻断问题，已取消复制`);
            }
            let cleanHtml = preparation.html;
            let cleanText = contentSection.textContent || '';

            if (preparation.validation.errors > 0 || preparation.validation.warnings > 0) {
                console.warn('WeChat compatibility report', preparation.validation);
            }

            // 文本清洗：pangu 自动加空格 + 智能引号转换
            try {
                const tempDiv = document.createElement('div');
                replaceWithSafeHtml(tempDiv, cleanHtml);

                // Use the installed synchronous text API, not the removed
                // spacingElement API or the asynchronous page scheduler.
                // 使用 TreeWalker 遍历纯文本节点进行加空格和引号转换
                //    只操作文本节点，绝不会破坏 HTML 标签
                const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
                let node;
                while ((node = walker.nextNode()) !== null) {
                    if (node.nodeValue) {
                        if (node.parentElement?.closest('pre,code')) continue;
                        // 直角引号 → 弯引号（微信公众号常见排版规范）
                        node.nodeValue = pangu.spacingText(node.nodeValue)
                            .replace(/「/g, '\u201c').replace(/」/g, '\u201d')   // 「」→ ""
                            .replace(/『/g, '\u2018').replace(/』/g, '\u2019');  // 『』→ ''
                    }
                }

                cleanHtml = tempDiv.innerHTML;
                cleanText = tempDiv.textContent || '';
            } catch (e) {
                console.warn('Text cleaning failed:', e);
            }

            const clipData = new ClipboardItem({
                'text/html': new Blob([cleanHtml], { type: 'text/html' }),
                'text/plain': new Blob([cleanText], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipData]);
            new Notice('已复制到剪贴板');
            return preparation.validation;
        } catch (error) {
            new Notice('复制失败');
            throw error;
        }
    }
}
