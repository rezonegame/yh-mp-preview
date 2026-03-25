/**
 * AI 模块入口
 * 提供内容分析和 AI API 集成功能
 */

// 内容分析器（本地规则）
export {
    analyzeContent,
    detectDialogue,
    detectQuotes,
    convertToDialogueContainer,
    generateDialogueContainer,
    ContentHistory,
    type AnalysisResult,
    type DialogueDetection,
    type QuoteDetection
} from './ContentAnalyzer';

// AI Provider（可选 API 集成）
export {
    configureAI,
    getAIConfig,
    analyzeWithAI,
    AIProvider,
    type AIProviderConfig,
    type AIAnalysisRequest,
    type AIAnalysisResponse
} from './AIProvider';