import type { Template } from '../../templateManager';
import type { ThemeManifest } from './themeManifest';

function cssValue(style: string | undefined, property: string, fallback: string): string {
    if (!style) return fallback;
    const match = style.match(new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i'));
    return match ? match[1].trim() : fallback;
}

function stringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

/** Converts an existing v2 Template without mutating its user-managed data. */
export function adaptLegacyTemplate(template: Template): ThemeManifest {
    // v2 allowed incomplete user-managed templates.  V3 must never let one
    // incomplete legacy theme prevent the entire plugin from loading.
    const styles = (template?.styles || {}) as Partial<Template['styles']>;
    const title = (styles.title || {}) as Partial<Template['styles']['title']>;
    const h1 = (title.h1 || {}) as Partial<Template['styles']['title']['h1']>;
    const h2 = (title.h2 || {}) as Partial<Template['styles']['title']['h2']>;
    const code = (styles.code || {}) as Partial<Template['styles']['code']>;
    const table = (styles.table || {}) as Partial<Template['styles']['table']>;
    const accent = stringValue(styles.accentColor)
        || cssValue(stringValue(h2.content), 'color', '#4285f4');
    return {
        schemaVersion: 3,
        id: stringValue(template?.id, 'legacy-unnamed-theme'),
        name: stringValue(template?.name, '未命名旧版主题'),
        version: 'legacy-v2',
        license: 'legacy-pending-provenance-review',
        source: template.source || 'yh-mp-preview bundled',
        tokens: {
            accent,
            text: cssValue(stringValue(styles.paragraph), 'color', '#333333'),
            mutedText: '#667085',
            background: cssValue(stringValue(styles.container), 'background(?:-color)?', 'transparent'),
            fontSize: cssValue(stringValue(styles.paragraph), 'font-size', '16px'),
            lineHeight: cssValue(stringValue(styles.paragraph), 'line-height', '1.8'),
        },
        components: [
            { id: 'heading-1', legacyStyle: stringValue(h1.base) },
            { id: 'heading-2', legacyStyle: stringValue(h2.base) },
            { id: 'paragraph', legacyStyle: stringValue(styles.paragraph) },
            { id: 'quote', legacyStyle: stringValue(styles.quote) },
            { id: 'code-block', legacyStyle: stringValue(code.block) },
            { id: 'table', legacyStyle: stringValue(table.container) },
        ],
        recipes: [{ id: 'legacy-compatible', name: '兼容旧版文章', componentIds: [] }],
        compatibility: {
            mode: 'legacy',
            notes: ['由 v2 模板适配而来；v3 验证器目前只报告兼容性风险，不阻断复制。'],
        },
    };
}
