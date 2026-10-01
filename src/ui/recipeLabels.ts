import type { ArticleRecipeId } from '../core/recipe/articleRecipeFormatter';

/** Display names only: persisted recipe IDs and formatting behavior stay unchanged. */
export const recipeOptions: { value: ArticleRecipeId; label: string }[] = [
    { value: 'legacy-compatible', label: '不额外增强' },
    { value: 'tutorial', label: '步骤列表' },
    { value: 'checklist', label: '勾选清单' },
    { value: 'product-intro', label: '导语强调' },
    { value: 'commentary', label: '引用与结语强调' },
    { value: 'review', label: '小标题强调' },
];

export function recipeSummaryLabel(recipeId: string): string {
    const option = recipeOptions.find(item => item.value === recipeId);
    return option && option.value !== 'legacy-compatible' ? `更多工具 · ${option.label}` : '更多工具';
}
