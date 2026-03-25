/**
 * 容器语法解析器
 * 支持 ```dialogue 和 ```gallery 代码块语法
 */

export interface DialogueLine {
    speaker: string;
    content: string;
}

export interface ParsedDialogue {
    type: 'dialogue';
    title: string;
    lines: DialogueLine[];
}

export interface ParsedGallery {
    type: 'gallery';
    title: string;
    images: string[];  // 图片路径或链接
}

export type ParsedContainer = ParsedDialogue | ParsedGallery;

/**
 * 解析代码块元数据
 * 格式: ```dialogue {title="对话标题"}
 */
function parseMetadata(line: string): { type: string; title: string } {
    // 匹配 ```type {title="xxx"} 或 ```type
    const match = line.match(/^```(\w+)(?:\s*\{[^}]*title=["']([^"']+)["'][^}]*\})?\s*$/);
    if (match) {
        return {
            type: match[1],
            title: match[2] || ''
        };
    }
    return { type: '', title: '' };
}

/**
 * 解析对话内容
 * 格式: 说话人: 内容 或 说话人：内容
 */
function parseDialogueContent(lines: string[]): DialogueLine[] {
    const result: DialogueLine[] = [];
    const dialoguePattern = /^(.+?)\s*[：:]\s*(.+)$/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const match = trimmed.match(dialoguePattern);
        if (match) {
            result.push({
                speaker: match[1].trim(),
                content: match[2].trim()
            });
        }
    }

    return result;
}

/**
 * 解析画廊内容
 * 支持 ![[image.jpg]] 和 ![](image.jpg) 格式
 */
function parseGalleryContent(lines: string[]): string[] {
    const images: string[] = [];

    for (const line of lines) {
        // 匹配 Obsidian wikilink 格式 ![[image.jpg]]
        const wikiLinkPattern = /!\[\[([^\]]+)\]\]/g;
        // 匹配标准 Markdown 格式 ![](image.jpg)
        const mdLinkPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

        let match;
        // 先匹配 wikilink
        while ((match = wikiLinkPattern.exec(line)) !== null) {
            images.push(match[1]);
        }
        // 再匹配标准链接
        while ((match = mdLinkPattern.exec(line)) !== null) {
            images.push(match[2]);
        }
    }

    return images;
}

/**
 * 从 Markdown 内容中解析容器代码块
 */
export function parseContainers(markdown: string): ParsedContainer[] {
    const containers: ParsedContainer[] = [];
    const lines = markdown.split('\n');

    let inCodeBlock = false;
    let currentType = '';
    let currentTitle = '';
    let contentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 检测代码块开始
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                // 开始新的代码块
                const meta = parseMetadata(line);
                if (meta.type === 'dialogue' || meta.type === 'gallery') {
                    inCodeBlock = true;
                    currentType = meta.type;
                    currentTitle = meta.title;
                    contentLines = [];
                }
            } else {
                // 代码块结束
                if (currentType === 'dialogue') {
                    const dialogueLines = parseDialogueContent(contentLines);
                    if (dialogueLines.length > 0) {
                        containers.push({
                            type: 'dialogue',
                            title: currentTitle,
                            lines: dialogueLines
                        });
                    }
                } else if (currentType === 'gallery') {
                    const images = parseGalleryContent(contentLines);
                    if (images.length > 0) {
                        containers.push({
                            type: 'gallery',
                            title: currentTitle,
                            images: images
                        });
                    }
                }
                inCodeBlock = false;
                currentType = '';
                currentTitle = '';
                contentLines = [];
            }
        } else if (inCodeBlock) {
            contentLines.push(line);
        }
    }

    return containers;
}

/**
 * 生成容器代码块的占位标记
 * 用于在 Markdown 中标记容器位置
 */
export function generateContainerMarker(container: ParsedContainer, index: number): string {
    return `<!-- MP-CONTAINER-${container.type.toUpperCase()}-${index} -->`;
}

/**
 * 检测字符串是否为容器标记
 */
export function isContainerMarker(text: string): { type: string; index: number } | null {
    const match = text.match(/<!-- MP-CONTAINER-(DIALOGUE|GALLERY)-(\d+) -->/);
    if (match) {
        return {
            type: match[1].toLowerCase(),
            index: parseInt(match[2], 10)
        };
    }
    return null;
}