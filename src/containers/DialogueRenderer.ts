/**
 * 对话气泡渲染器
 * 将对话内容渲染为左右交替的聊天气泡布局
 */

import type { ParsedDialogue, DialogueLine } from './ContainerParser';

export interface DialogueStyle {
    container: string;
    title: string;
    bubbleLeft: string;
    bubbleRight: string;
    speaker: string;
    text: string;
    accentColor: string;  // 主题强调色
}

// 默认样式（可被模板覆盖）
const DEFAULT_STYLE: DialogueStyle = {
    container: 'margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 12px;',
    title: 'text-align: center; font-size: 14px; color: #999; margin: 0 0 12px 0;',
    bubbleLeft: 'max-width: 80%; background: #fff; border-radius: 0 12px 12px 12px; padding: 10px 14px; margin: 8px auto 8px 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05);',
    bubbleRight: 'max-width: 80%; background: rgba(66, 133, 244, 0.08); border-radius: 12px 0 12px 12px; padding: 10px 14px; margin: 8px 0 8px auto; box-shadow: 0 1px 2px rgba(0,0,0,0.05);',
    speaker: 'font-size: 12px; color: #999; margin: 0 0 4px 0;',
    text: 'font-size: 15px; color: #333; line-height: 1.6; margin: 0;',
    accentColor: '#4285f4'
};

/**
 * 计算每个对话行的左右位置
 * 按说话人首次出现顺序分配：奇数左、偶数右
 */
function assignSides(lines: DialogueLine[]): Map<string, 'left' | 'right'> {
    const speakerOrder: string[] = [];
    const sides = new Map<string, 'left' | 'right'>();

    for (const line of lines) {
        if (!speakerOrder.includes(line.speaker)) {
            speakerOrder.push(line.speaker);
        }
        const index = speakerOrder.indexOf(line.speaker);
        sides.set(line.speaker, index % 2 === 0 ? 'left' : 'right');
    }

    return sides;
}

/**
 * 将颜色转换为 rgba 格式（用于透明背景）
 */
function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
}

/**
 * 渲染对话气泡 HTML
 */
export function renderDialogue(dialogue: ParsedDialogue, style: Partial<DialogueStyle> = {}): string {
    const finalStyle = { ...DEFAULT_STYLE, ...style };
    const sides = assignSides(dialogue.lines);

    // 构建气泡 HTML
    const bubblesHtml = dialogue.lines.map(line => {
        const side = sides.get(line.speaker) || 'left';
        const bubbleStyle = side === 'left' ? finalStyle.bubbleLeft : finalStyle.bubbleRight;

        // 右侧气泡使用主题色背景
        const finalBubbleStyle = side === 'right'
            ? bubbleStyle.replace('rgba(66, 133, 244, 0.08)', hexToRgba(finalStyle.accentColor, 0.08))
            : bubbleStyle;

        return `
            <section data-container="dialogue-bubble" data-side="${side}" style="${finalBubbleStyle}">
                <p data-container="dialogue-speaker" style="${finalStyle.speaker}">${line.speaker}</p>
                <p data-container="dialogue-text" style="${finalStyle.text}">${line.content}</p>
            </section>
        `;
    }).join('');

    // 标题（如果有）
    const titleHtml = dialogue.title
        ? `<p data-container="dialogue-title" style="${finalStyle.title}">${dialogue.title}</p>`
        : '';

    return `
        <section data-container="dialogue" style="${finalStyle.container}">
            ${titleHtml}
            ${bubblesHtml}
        </section>
    `;
}

/**
 * 创建对话气泡 DOM 元素
 */
export function createDialogueElement(dialogue: ParsedDialogue, style: Partial<DialogueStyle> = {}): HTMLElement {
    const html = renderDialogue(dialogue, style);
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild as HTMLElement;
}

/**
 * 应用对话样式到已有元素
 */
export function applyDialogueStyle(container: HTMLElement, style: Partial<DialogueStyle> = {}): void {
    const finalStyle = { ...DEFAULT_STYLE, ...style };

    // 容器样式
    container.setAttribute('style', finalStyle.container);

    // 标题
    const title = container.querySelector('[data-container="dialogue-title"]');
    if (title) {
        title.setAttribute('style', finalStyle.title);
    }

    // 气泡
    container.querySelectorAll('[data-container="dialogue-bubble"]').forEach(bubble => {
        const side = bubble.getAttribute('data-side');
        const bubbleStyle = side === 'left' ? finalStyle.bubbleLeft : finalStyle.bubbleRight;
        bubble.setAttribute('style', bubbleStyle);

        // 右侧气泡主题色
        if (side === 'right') {
            const currentStyle = bubble.getAttribute('style') || '';
            bubble.setAttribute('style', currentStyle.replace(
                'rgba(66, 133, 244, 0.08)',
                hexToRgba(finalStyle.accentColor, 0.08)
            ));
        }

        // 说话人
        const speaker = bubble.querySelector('[data-container="dialogue-speaker"]');
        if (speaker) {
            speaker.setAttribute('style', finalStyle.speaker);
        }

        // 文本
        const text = bubble.querySelector('[data-container="dialogue-text"]');
        if (text) {
            text.setAttribute('style', finalStyle.text);
        }
    });
}