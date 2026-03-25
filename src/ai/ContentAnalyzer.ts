/**
 * 内容分析器
 * 用于自动识别 Markdown 内容中的对话和金句结构
 */

export interface AnalysisResult {
    type: 'dialogue' | 'quote' | 'keypoint';
    startLine: number;
    endLine: number;
    content: string;
    confidence: number;
    suggestedAction?: string;
    // 新增：转换后的内容
    convertedContent?: string;
}

export interface DialogueDetection {
    speakers: string[];
    lines: { speaker: string; content: string; lineNumber: number }[];
    confidence: number;
}

export interface QuoteDetection {
    content: string;
    lineNumber: number;
    isKeyPoint: boolean;
}

/**
 * 历史记录管理器
 */
export class ContentHistory {
    private static instance: ContentHistory;
    private history: Map<string, { original: string; timestamp: number }> = new Map();
    private maxHistory = 10;

    static getInstance(): ContentHistory {
        if (!ContentHistory.instance) {
            ContentHistory.instance = new ContentHistory();
        }
        return ContentHistory.instance;
    }

    /**
     * 保存原始内容
     */
    saveOriginal(filePath: string, content: string): void {
        this.history.set(filePath, {
            original: content,
            timestamp: Date.now()
        });

        // 清理旧历史
        if (this.history.size > this.maxHistory) {
            const oldest = [...this.history.entries()]
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) {
                this.history.delete(oldest[0]);
            }
        }
    }

    /**
     * 获取原始内容
     */
    getOriginal(filePath: string): string | null {
        return this.history.get(filePath)?.original || null;
    }

    /**
     * 检查是否有历史
     */
    hasHistory(filePath: string): boolean {
        return this.history.has(filePath);
    }

    /**
     * 清除历史
     */
    clearHistory(filePath: string): void {
        this.history.delete(filePath);
    }
}

/**
 * 检测对话模式
 * 支持格式：说话人：内容 或 说话人: 内容
 */
export function detectDialogue(lines: string[]): DialogueDetection | null {
    const dialoguePattern = /^(.+?)\s*[：:]\s*(.+)$/;
    const detectedLines: { speaker: string; content: string; lineNumber: number }[] = [];
    const speakers = new Set<string>();

    let consecutiveMatches = 0;
    let maxConsecutive = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            consecutiveMatches = 0;
            continue;
        }

        const match = line.match(dialoguePattern);
        if (match) {
            const speaker = match[1].trim();
            const content = match[2].trim();

            // 过滤掉一些误判情况
            if (isValidDialogueSpeaker(speaker, content)) {
                detectedLines.push({ speaker, content, lineNumber: i + 1 });
                speakers.add(speaker);
                consecutiveMatches++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
            }
        } else {
            consecutiveMatches = 0;
        }
    }

    // 至少要有 3 行连续对话，且至少 2 个说话人
    if (detectedLines.length >= 3 && speakers.size >= 2 && maxConsecutive >= 2) {
        return {
            speakers: Array.from(speakers),
            lines: detectedLines,
            confidence: calculateDialogueConfidence(detectedLines.length, speakers.size, maxConsecutive)
        };
    }

    return null;
}

/**
 * 判断是否是有效的对话说话人
 */
function isValidDialogueSpeaker(speaker: string, content: string): boolean {
    // 说话人长度合理（1-10个字符）
    if (speaker.length > 10) return false;

    // 排除常见的非对话格式
    const invalidPatterns = [
        /^https?/i,           // URL
        /^\d+$/,              // 纯数字
        /^第[一二三四五六七八九十\d]+/, // 章节
        /^[（(]/,             // 括号开头
    ];

    for (const pattern of invalidPatterns) {
        if (pattern.test(speaker)) return false;
    }

    // 内容长度合理
    if (content.length < 2 || content.length > 500) return false;

    return true;
}

/**
 * 计算对话检测的置信度
 */
function calculateDialogueConfidence(lineCount: number, speakerCount: number, maxConsecutive: number): number {
    let confidence = 0.5;

    // 行数加分
    if (lineCount >= 5) confidence += 0.2;
    else if (lineCount >= 3) confidence += 0.1;

    // 说话人数加分
    if (speakerCount === 2) confidence += 0.15;
    else if (speakerCount >= 3) confidence += 0.1;

    // 连续性加分
    if (maxConsecutive >= 4) confidence += 0.15;
    else if (maxConsecutive >= 2) confidence += 0.1;

    return Math.min(confidence, 0.95);
}

/**
 * 检测金句/核心观点
 * 包括：引用块、加粗段落、Callout
 */
export function detectQuotes(lines: string[]): QuoteDetection[] {
    const quotes: QuoteDetection[] = [];

    // 引用块检测（> 开头）
    const quotePattern = /^>\s*(.+)$/;
    // 加粗检测（**text**）
    const boldPattern = /\*\*([^*]+)\*\*/g;
    // Callout 检测
    const calloutPattern = /^>\s*\[!(important|tip|note|warning)\]\s*(.*)$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 检测 Callout
        const calloutMatch = line.match(calloutPattern);
        if (calloutMatch) {
            quotes.push({
                content: calloutMatch[2] || line,
                lineNumber: i + 1,
                isKeyPoint: calloutMatch[1].toLowerCase() === 'important'
            });
            continue;
        }

        // 检测普通引用块
        const quoteMatch = line.match(quotePattern);
        if (quoteMatch && !line.startsWith('>[!')) {
            quotes.push({
                content: quoteMatch[1],
                lineNumber: i + 1,
                isKeyPoint: false
            });
        }

        // 检测独立加粗行（可能是金句）
        const boldMatches = line.match(boldPattern);
        if (boldMatches && boldMatches.length === 1 && line.length < 100) {
            const boldContent = boldMatches[0].replace(/\*\*/g, '');
            // 如果加粗内容占比超过 70%，可能是金句
            if (boldContent.length / line.replace(/\*\*/g, '').length > 0.7) {
                quotes.push({
                    content: boldContent,
                    lineNumber: i + 1,
                    isKeyPoint: true
                });
            }
        }
    }

    return quotes;
}

/**
 * 分析 Markdown 内容
 */
export function analyzeContent(markdown: string): AnalysisResult[] {
    const results: AnalysisResult[] = [];
    const lines = markdown.split('\n');

    // 检测对话
    const dialogue = detectDialogue(lines);
    if (dialogue && dialogue.confidence >= 0.6) {
        const startLine = dialogue.lines[0].lineNumber;
        const endLine = dialogue.lines[dialogue.lines.length - 1].lineNumber;

        // 生成转换后的内容
        const dialogueContent = dialogue.lines.map(l => `${l.speaker}：${l.content}`).join('\n');
        const convertedContent = `\`\`\`dialogue\n${dialogueContent}\n\`\`\``;

        results.push({
            type: 'dialogue',
            startLine,
            endLine,
            content: dialogue.lines.map(l => `${l.speaker}：${l.content}`).join('\n'),
            confidence: dialogue.confidence,
            suggestedAction: `检测到 ${dialogue.speakers.length} 人对话，点击应用可转换为 dialogue 容器`,
            convertedContent
        });
    }

    // 检测金句
    const quotes = detectQuotes(lines);
    const keyPoints = quotes.filter(q => q.isKeyPoint);
    if (keyPoints.length > 0) {
        // 生成转换后的内容（转为引用块或Callout）
        const convertedQuotes = keyPoints.map(q => {
            // 如果是短句（<50字符），转为Callout；否则转为引用块
            if (q.content.length < 50) {
                return `> [!important] 核心观点\n> ${q.content}`;
            } else {
                return `> ${q.content}`;
            }
        }).join('\n\n');

        results.push({
            type: 'keypoint',
            startLine: keyPoints[0].lineNumber,
            endLine: keyPoints[keyPoints.length - 1].lineNumber,
            content: keyPoints.map(q => q.content).join('\n'),
            confidence: 0.8,
            suggestedAction: `检测到 ${keyPoints.length} 处核心观点，点击应用可转换为引用格式`,
            convertedContent: convertedQuotes
        });
    }

    return results;
}

/**
 * 生成对话容器语法
 */
export function generateDialogueContainer(title: string, lines: { speaker: string; content: string }[]): string {
    const content = lines.map(l => `${l.speaker}：${l.content}`).join('\n');
    return `\`\`\`dialogue {title="${title}"}\n${content}\n\`\`\``;
}

/**
 * 自动将对话内容转换为容器格式
 */
export function convertToDialogueContainer(markdown: string): string {
    const lines = markdown.split('\n');
    const dialogue = detectDialogue(lines);

    if (!dialogue || dialogue.confidence < 0.6) {
        return markdown;
    }

    // 找到对话的起止行
    const startIdx = dialogue.lines[0].lineNumber - 1;
    const endIdx = dialogue.lines[dialogue.lines.length - 1].lineNumber - 1;

    // 生成对话容器
    const dialogueContent = dialogue.lines.map(l => `${l.speaker}：${l.content}`).join('\n');
    const container = `\`\`\`dialogue\n${dialogueContent}\n\`\`\``;

    // 替换原内容
    const newLines = [
        ...lines.slice(0, startIdx),
        container,
        ...lines.slice(endIdx + 1)
    ];

    return newLines.join('\n');
}