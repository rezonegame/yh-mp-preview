/**
 * AI Provider 接口
 * 支持可选的 AI API 集成，用于更智能的内容分析
 */

export interface AIProviderConfig {
    enabled: boolean;
    provider: 'openai' | 'anthropic' | 'custom';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

export interface AIAnalysisRequest {
    content: string;
    task: 'analyze' | 'extract_dialogue' | 'extract_quotes';
}

export interface AIAnalysisResponse {
    dialogues: {
        speakers: string[];
        lines: { speaker: string; content: string }[];
        confidence: number;
    }[];
    quotes: {
        content: string;
        author?: string;
        isKeyPoint: boolean;
    }[];
    suggestions: string[];
}

const DEFAULT_CONFIG: AIProviderConfig = {
    enabled: false,
    provider: 'openai',
    model: 'gpt-3.5-turbo'
};

let config: AIProviderConfig = { ...DEFAULT_CONFIG };

/**
 * 配置 AI Provider
 */
export function configureAI(newConfig: Partial<AIProviderConfig>): void {
    config = { ...config, ...newConfig };
}

/**
 * 获取当前配置
 */
export function getAIConfig(): AIProviderConfig {
    return { ...config };
}

/**
 * 构建 AI 分析提示词
 */
function buildPrompt(request: AIAnalysisRequest): string {
    const taskPrompts = {
        analyze: `分析以下 Markdown 内容，识别：
1. 对话段落（标记说话人和内容）
2. 核心观点/金句
3. 建议的排版优化

请以 JSON 格式返回结果。`,
        extract_dialogue: `从以下内容中提取对话，识别说话人和对话内容。
返回 JSON 格式：{ "dialogues": [{ "speakers": [], "lines": [] }] }`,
        extract_quotes: `从以下内容中提取金句和核心观点。
返回 JSON 格式：{ "quotes": [{ "content": "", "isKeyPoint": true }] }`
    };

    return `${taskPrompts[request.task]}

内容：
---
${request.content}
---

请直接返回 JSON，不要包含其他文字。`;
}

/**
 * 调用 AI API（如果启用）
 */
export async function analyzeWithAI(request: AIAnalysisRequest): Promise<AIAnalysisResponse | null> {
    if (!config.enabled || !config.apiKey) {
        return null;
    }

    try {
        const prompt = buildPrompt(request);

        let response: Response;

        if (config.provider === 'openai') {
            response = await fetch(config.baseUrl || 'https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: '你是一个专业的内容分析助手，擅长识别文章结构。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3
                })
            });
        } else if (config.provider === 'anthropic') {
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model || 'claude-3-haiku-20240307',
                    max_tokens: 2048,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                })
            });
        } else {
            // 自定义 API
            response = await fetch(config.baseUrl!, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({ prompt })
            });
        }

        if (!response.ok) {
            console.error('AI API 请求失败:', response.status);
            return null;
        }

        const data = await response.json();

        // 解析响应
        let content: string;
        if (config.provider === 'openai') {
            content = data.choices?.[0]?.message?.content || '';
        } else if (config.provider === 'anthropic') {
            content = data.content?.[0]?.text || '';
        } else {
            content = data.content || data.result || '';
        }

        // 尝试解析 JSON
        try {
            // 提取 JSON 块
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error('解析 AI 响应失败:', e);
        }

        return null;
    } catch (error) {
        console.error('AI 分析失败:', error);
        return null;
    }
}

/**
 * 导出模块
 */
export const AIProvider = {
    configure: configureAI,
    getConfig: getAIConfig,
    analyze: analyzeWithAI
};