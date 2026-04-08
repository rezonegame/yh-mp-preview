/**
 * 图片 Alt Text 编辑功能
 * 点击预览中的图片时触发，支持 WikiLink 和标准 Markdown 格式
 */

import { Notice } from 'obsidian';
import type { App, TFile } from 'obsidian';

export async function handleImageAltEdit(
    app: App,
    currentFile: TFile,
    img: HTMLImageElement
): Promise<void> {
    const currentAlt = img.getAttribute('alt') || '';
    const linktext = img.dataset.linktext;

    const newAlt = window.prompt('编辑图片注释 (Alt Text):', currentAlt);
    if (newAlt === null || newAlt === currentAlt) return;

    try {
        let fileContent = await app.vault.read(currentFile);
        let newFileContent = fileContent;
        let replaced = false;

        // 优先通过 WikiLink linktext 精确替换
        if (linktext) {
            const escapedLinktext = linktext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wikiRegex = new RegExp(`!\\[\\[\\s*${escapedLinktext}\\s*(?:\\|.*?)?\\]\\]`);

            if (wikiRegex.test(newFileContent)) {
                newFileContent = newFileContent.replace(wikiRegex, `![[${linktext}|${newAlt}]]`);
                replaced = true;
            }
        }

        // 回退：通过 Alt Text 匹配标准 Markdown 或 WikiLink
        if (!replaced) {
            const escapedAlt = currentAlt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const stdRegex = new RegExp(`!\\[\\s*${escapedAlt}\\s*\\]\\(`);

            if (stdRegex.test(newFileContent)) {
                newFileContent = newFileContent.replace(stdRegex, `![${newAlt}](`);
                replaced = true;
            } else if (currentAlt) {
                const wikiAltRegex = new RegExp(`\\|\\s*${escapedAlt}\\s*\\]\\]`);
                if (wikiAltRegex.test(newFileContent)) {
                    newFileContent = newFileContent.replace(wikiAltRegex, `|${newAlt}]]`);
                    replaced = true;
                }
            }
        }

        if (replaced) {
            await app.vault.modify(currentFile, newFileContent);
            new Notice('图片注释已更新');
        } else {
            new Notice('无法在文档中精确定位此图片，请检查是否为标准格式。');
        }
    } catch (err) {
        console.error('Failed to update image alt text', err);
        new Notice('更新失败');
    }
}
