export interface StandardComponentDefinition {
    id: string;
    name: string;
    description: string;
}

/** Components with a stable, local renderer and a documented code-block entry point. */
export const STANDARD_COMPONENTS: StandardComponentDefinition[] = [
    { id: 'toc', name: '目录', description: '文章章节导航' },
    { id: 'steps', name: '步骤', description: '顺序操作说明' },
    { id: 'checklist', name: '检查清单', description: '待办和核对事项' },
    { id: 'quote-card', name: '引用卡片', description: '重点引语' },
    { id: 'summary', name: '摘要卡片', description: '关键结论' },
    { id: 'author-card', name: '作者卡片', description: '作者信息' },
    { id: 'subscribe', name: '关注引导', description: '文章结尾行动引导' },
    { id: 'faq', name: '常见问题', description: '问答内容' },
    { id: 'timeline', name: '时间线', description: '按时间组织的信息' },
    { id: 'comparison-table', name: '对比表', description: '两组方案比较' },
];

export const STANDARD_COMPONENT_IDS = new Set(STANDARD_COMPONENTS.map((component) => component.id));
