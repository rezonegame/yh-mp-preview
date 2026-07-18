import type { ThemeManifest } from './themeManifest';

export interface ThemeManifestValidationIssue {
    path: string;
    message: string;
}

export interface ThemeManifestValidationResult {
    valid: boolean;
    issues: ThemeManifestValidationIssue[];
    manifest?: ThemeManifest;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function addRequiredStringIssues(
    value: UnknownRecord,
    fields: string[],
    prefix: string,
    issues: ThemeManifestValidationIssue[],
): void {
    fields.forEach(field => {
        if (!isNonEmptyString(value[field])) {
            issues.push({ path: `${prefix}${field}`, message: '必须是非空字符串。' });
        }
    });
}

/**
 * Validates the portable V3 theme package before it can enter user settings.
 * This deliberately accepts only the documented schema; unknown keys remain
 * harmless, but a malformed package cannot make the renderer fail on startup.
 */
export function validateThemeManifest(value: unknown): ThemeManifestValidationResult {
    const issues: ThemeManifestValidationIssue[] = [];
    if (!isRecord(value)) {
        return { valid: false, issues: [{ path: '$', message: '主题清单必须是 JSON 对象。' }] };
    }

    if (value.schemaVersion !== 3) {
        issues.push({ path: 'schemaVersion', message: '仅支持 schemaVersion: 3。' });
    }
    addRequiredStringIssues(value, ['id', 'name', 'version', 'license'], '', issues);
    if (isNonEmptyString(value.id) && !/^[a-z0-9][a-z0-9-]*$/.test(value.id)) {
        issues.push({ path: 'id', message: '只能使用小写字母、数字和连字符，且必须以字母或数字开头。' });
    }
    if (value.source !== undefined && !isNonEmptyString(value.source)) {
        issues.push({ path: 'source', message: '如提供来源，必须是非空字符串。' });
    }

    if (!isRecord(value.tokens)) {
        issues.push({ path: 'tokens', message: '必须是设计令牌对象。' });
    } else {
        addRequiredStringIssues(value.tokens, ['accent', 'text', 'mutedText', 'background', 'fontSize', 'lineHeight'], 'tokens.', issues);
    }

    if (!Array.isArray(value.components)) {
        issues.push({ path: 'components', message: '必须是组件数组。' });
    } else {
        value.components.forEach((component, index) => {
            if (!isRecord(component) || !isNonEmptyString(component.id)) {
                issues.push({ path: `components[${index}].id`, message: '组件必须有非空 id。' });
            }
            if (isRecord(component) && component.legacyStyle !== undefined && typeof component.legacyStyle !== 'string') {
                issues.push({ path: `components[${index}].legacyStyle`, message: '必须是字符串。' });
            }
        });
    }

    if (!Array.isArray(value.recipes)) {
        issues.push({ path: 'recipes', message: '必须是文章配方数组。' });
    } else {
        value.recipes.forEach((recipe, index) => {
            if (!isRecord(recipe) || !isNonEmptyString(recipe.id) || !isNonEmptyString(recipe.name) || !Array.isArray(recipe.componentIds)
                || recipe.componentIds.some(id => !isNonEmptyString(id))) {
                issues.push({ path: `recipes[${index}]`, message: '配方需要非空 id、名称和字符串组件 id 数组。' });
            }
        });
    }

    if (!isRecord(value.compatibility)
        || (value.compatibility.mode !== 'native' && value.compatibility.mode !== 'legacy')
        || !Array.isArray(value.compatibility.notes)
        || value.compatibility.notes.some(note => !isNonEmptyString(note))) {
        issues.push({ path: 'compatibility', message: '需要 mode（native 或 legacy）和字符串说明数组。' });
    }

    return issues.length > 0
        ? { valid: false, issues }
        : { valid: true, issues: [], manifest: value as unknown as ThemeManifest };
}

export function formatThemeManifestIssues(issues: ThemeManifestValidationIssue[]): string {
    return issues.slice(0, 3).map(issue => `${issue.path}：${issue.message}`).join('\n');
}
