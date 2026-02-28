import { App } from 'obsidian';
import type { SettingsManager } from './settings/settings';

export class MPConverter {
    private static app: App;

    static initialize(app: App) {
        this.app = app;
    }

    static formatContent(element: HTMLElement, markdownContent?: string, settingsManager?: SettingsManager): void {
        // 创建 section 容器
        const section = document.createElement('section');
        section.className = 'mp-content-section';
        // 移动原有内容到 section 中
        while (element.firstChild) {
            section.appendChild(element.firstChild);
        }
        element.appendChild(section);

        // FrontMatter 标题卡片
        if (markdownContent && settingsManager) {
            const settings = settingsManager.getSettings();
            if (settings.enableFrontMatterCard) {
                this.insertFrontMatterCard(section, markdownContent);
            }
        }

        // 处理元素
        this.processElements(section);
    }

    private static insertFrontMatterCard(container: HTMLElement, markdown: string): void {
        // 提取 YAML FrontMatter
        const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) return;

        const yamlBlock = fmMatch[1];
        const parseField = (field: string): string => {
            const match = yamlBlock.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
            return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
        };

        const title = parseField('title');
        const author = parseField('author');
        const date = parseField('date');

        // 至少要有标题才显示卡片
        if (!title) return;

        const card = document.createElement('div');
        card.className = 'mp-frontmatter-card';
        card.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 24px 28px; margin: 0 0 24px 0; border-radius: 12px; text-align: center;';

        const titleEl = document.createElement('h1');
        titleEl.className = 'mp-fm-title';
        titleEl.textContent = title;
        titleEl.style.cssText = 'margin: 0 0 8px 0; font-size: 1.6em; font-weight: 700; color: #fff; line-height: 1.3;';
        card.appendChild(titleEl);

        if (author || date) {
            const metaEl = document.createElement('div');
            metaEl.className = 'mp-fm-meta';
            metaEl.style.cssText = 'font-size: 0.9em; opacity: 0.85; color: #f0f0f0;';
            const parts: string[] = [];
            if (author) parts.push(author);
            if (date) parts.push(date);
            metaEl.textContent = parts.join(' · ');
            card.appendChild(metaEl);
        }

        container.prepend(card);
    }

    private static processElements(container: HTMLElement | null): void {
        if (!container) return;

        // 1. 处理列表项内部元素，用section包裹
        container.querySelectorAll('li').forEach(li => {
            const section = document.createElement('section');
            while (li.firstChild) {
                section.appendChild(li.firstChild);
            }
            li.appendChild(section);
        });

        // 1.5 处理 Obsidian Callout（> [!tip] 等）
        container.querySelectorAll('.callout').forEach(callout => {
            const calloutEl = callout as HTMLElement;
            const calloutType = calloutEl.getAttribute('data-callout')?.toLowerCase() || 'note';

            // Callout 类型 → 颜色与图标映射
            const calloutConfig: { [key: string]: { color: string; icon: string } } = {
                'tip': { color: '#4caf50', icon: '💡' },
                'hint': { color: '#4caf50', icon: '💡' },
                'note': { color: '#448aff', icon: '📝' },
                'info': { color: '#448aff', icon: 'ℹ️' },
                'warning': { color: '#ff9800', icon: '⚠️' },
                'caution': { color: '#f44336', icon: '🔴' },
                'danger': { color: '#f44336', icon: '❗' },
                'important': { color: '#e040fb', icon: '❗' },
                'example': { color: '#7c4dff', icon: '📋' },
                'quote': { color: '#9e9e9e', icon: '💬' },
                'abstract': { color: '#00bcd4', icon: '📑' },
                'summary': { color: '#00bcd4', icon: '📑' },
                'success': { color: '#4caf50', icon: '✅' },
                'check': { color: '#4caf50', icon: '✅' },
                'question': { color: '#ff9800', icon: '❓' },
                'faq': { color: '#ff9800', icon: '❓' },
                'failure': { color: '#f44336', icon: '❌' },
                'bug': { color: '#f44336', icon: '🐛' },
            };

            const config = calloutConfig[calloutType] || { color: '#448aff', icon: '📝' };

            // 提取标题
            const titleEl = calloutEl.querySelector('.callout-title-inner');
            const titleText = titleEl?.textContent || calloutType.charAt(0).toUpperCase() + calloutType.slice(1);

            // 提取内容
            const contentEl = calloutEl.querySelector('.callout-content');
            const contentHtml = contentEl?.innerHTML || '';

            // 构建美化的 Callout 容器
            const calloutDiv = document.createElement('div');
            calloutDiv.className = 'mp-callout';
            calloutDiv.setAttribute('data-callout-type', calloutType);
            calloutDiv.style.cssText = `border-left: 4px solid ${config.color}; background: ${config.color}11; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;`;

            // 标题行
            const titleDiv = document.createElement('div');
            titleDiv.className = 'mp-callout-title';
            titleDiv.style.cssText = `font-weight: bold; color: ${config.color}; margin-bottom: 8px; font-size: 1em; display: flex; align-items: center; gap: 6px;`;
            titleDiv.innerHTML = `<span>${config.icon}</span><span>${titleText}</span>`;
            calloutDiv.appendChild(titleDiv);

            // 内容区
            if (contentHtml) {
                const contentDiv = document.createElement('div');
                contentDiv.className = 'mp-callout-content';
                contentDiv.style.cssText = 'color: #333; line-height: 1.7;';
                contentDiv.innerHTML = contentHtml;
                calloutDiv.appendChild(contentDiv);
            }

            // 替换原始 callout
            calloutEl.parentNode?.replaceChild(calloutDiv, calloutEl);
        });

        // 2. 处理代码块
        container.querySelectorAll('pre').forEach(pre => {
            if (pre.classList.contains('frontmatter')) {
                pre.remove();
                return;
            }

            const codeEl = pre.querySelector('code');
            if (codeEl) {
                const header = document.createElement('div');
                header.className = 'mp-code-header';
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('span');
                    dot.className = 'mp-code-dot';
                    header.appendChild(dot);
                }
                pre.insertBefore(header, pre.firstChild);

                const copyButton = pre.querySelector('.copy-code-button');
                if (copyButton) copyButton.remove();
            }
        });

        // 3. 处理图片 (增强版：支持 Alt 文本作为注脚)
        container.querySelectorAll('span.internal-embed[src]').forEach(async el => {
            const originalSpan = el as HTMLElement;
            const src = originalSpan.getAttribute('src');
            const alt = originalSpan.getAttribute('alt');

            if (!src) return;

            try {
                const linktext = src.split('|')[0];
                const file = this.app.metadataCache.getFirstLinkpathDest(linktext, '');
                if (file) {
                    const absolutePath = this.app.vault.adapter.getResourcePath(file.path);

                    // 创建 figure 容器
                    const figure = document.createElement('figure');
                    figure.className = 'mp-image-container';
                    figure.style.margin = '0 auto';  // 居中
                    figure.style.textAlign = 'center'; // 内容居中
                    figure.style.display = 'block';

                    const newImg = document.createElement('img');
                    newImg.src = absolutePath;
                    newImg.dataset.linktext = linktext; // Store original linktext for editing
                    newImg.style.maxWidth = '100%';
                    newImg.style.display = 'inline-block'; // 配合 textAlign center
                    newImg.style.margin = '0';

                    if (alt) {
                        newImg.alt = alt;
                        figure.appendChild(newImg);

                        // 添加 figcaption
                        const figcaption = document.createElement('figcaption');
                        figcaption.textContent = alt;
                        figcaption.className = 'mp-image-caption';
                        figcaption.style.textAlign = 'center';
                        figcaption.style.color = '#888';
                        figcaption.style.fontSize = '0.9em';
                        figcaption.style.marginTop = '6px';
                        figcaption.style.display = 'block';
                        figure.appendChild(figcaption);
                    } else {
                        figure.appendChild(newImg);
                    }

                    originalSpan.parentNode?.replaceChild(figure, originalSpan);
                }
            } catch (error) {
                console.error('图片处理失败:', error);
            }
        });

        // 4. 处理注脚 (转换为尾注)
        // 查找所有注脚引用
        const footnoteRefs = container.querySelectorAll('a.footnote-link');
        const footnotesMap = new Map<string, HTMLElement>();

        // 查找所有注脚内容
        const footnoteItems = container.querySelectorAll('.footnotes li');
        footnoteItems.forEach(item => {
            const id = item.id;
            if (id) {
                // remove backref arrow
                const backRef = item.querySelector('.footnote-backref');
                if (backRef) backRef.remove();
                footnotesMap.set(id, item as HTMLElement);
            }
        });

        // 如果存在注脚
        if (footnoteRefs.length > 0 && footnotesMap.size > 0) {
            // 处理正文引用: [^1] -> [1]
            footnoteRefs.forEach((ref, index) => {
                ref.textContent = `[${index + 1}]`;
                (ref as HTMLElement).style.textDecoration = 'none';
                (ref as HTMLElement).style.color = 'var(--text-accent)';
                // 移除 href 防止跳转（或者保留跳转但通过样式弱化）
                ref.removeAttribute('href');
            });

            // 创建新的参考资料区域
            let refSection = container.querySelector('.mp-reference-section');
            if (!refSection) {
                const hr = document.createElement('hr');
                hr.className = 'mp-footnote-separator';
                hr.style.margin = '30px 0 20px';
                hr.style.border = 'none';
                hr.style.borderTop = '1px dashed #ccc';
                container.appendChild(hr);

                refSection = document.createElement('section');
                refSection.className = 'mp-reference-section';

                const title = document.createElement('h3');
                title.textContent = '参考资料';
                title.className = 'mp-reference-title';
                title.style.fontSize = '1.1em';
                title.style.fontWeight = 'bold';
                title.style.marginBottom = '10px';
                refSection.appendChild(title);

                container.appendChild(refSection);
            }

            // 清空旧内容（如果多次渲染）并添加新列表
            // 这里我们简单追加
            const list = document.createElement('ol');
            list.style.paddingLeft = '20px';
            list.style.margin = '0';
            list.style.fontSize = '0.9em';
            list.style.color = '#666';

            // 按照引用顺序重新生成列表
            footnoteRefs.forEach((ref) => {
                const href = ref.getAttribute('data-href'); // Obsidian uses data-href too
                // Check original href like '#fn:1'
                // This part is tricky because we removed href. Let's assume we process correctly.
                // Simplified: Just iterate existing footnotesMap in order (Obsidian usually keeps order)
            });

            // 直接遍历原有注脚列表比较稳妥
            footnoteItems.forEach((item) => {
                const li = document.createElement('li');
                li.innerHTML = item.innerHTML;
                li.style.marginBottom = '4px';
                list.appendChild(li);
            });

            refSection.appendChild(list);

            // 移除原始 footnotes 容器
            const originalFootnotes = container.querySelector('.footnotes');
            if (originalFootnotes) originalFootnotes.remove();
        }
    }
}