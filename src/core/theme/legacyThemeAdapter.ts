import type { Template } from '../../templateManager';
import type { ThemeManifest } from './themeManifest';

function cssValue(style: string | undefined, property: string, fallback: string): string {
    if (!style) return fallback;
    const match = style.match(new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i'));
    return match ? match[1].trim() : fallback;
}

/** Converts an existing v2 Template without mutating its user-managed data. */
export function adaptLegacyTemplate(template: Template): ThemeManifest {
    const styles = template.styles;
    const accent = styles.accentColor || cssValue(styles.title.h2.content, 'color', '#4285f4');
    return {
        schemaVersion: 3,
        id: template.id,
        name: template.name,
        version: 'legacy-v2',
        license: 'legacy-pending-provenance-review',
        source: template.source || 'yh-mp-preview bundled',
        tokens: {
            accent,
            text: cssValue(styles.paragraph, 'color', '#333333'),
            mutedText: '#667085',
            background: cssValue(styles.container, 'background(?:-color)?', 'transparent'),
            fontSize: cssValue(styles.paragraph, 'font-size', '16px'),
            lineHeight: cssValue(styles.paragraph, 'line-height', '1.8'),
        },
        components: [
            { id: 'heading-1', legacyStyle: styles.title.h1.base },
            { id: 'heading-2', legacyStyle: styles.title.h2.base },
            { id: 'paragraph', legacyStyle: styles.paragraph },
            { id: 'quote', legacyStyle: styles.quote },
            { id: 'code-block', legacyStyle: styles.code.block },
            { id: 'table', legacyStyle: styles.table.container },
        ],
        recipes: [{ id: 'legacy-compatible', name: '兼容旧版文章', componentIds: [] }],
        compatibility: {
            mode: 'legacy',
            notes: ['由 v2 模板适配而来；v3 验证器目前只报告兼容性风险，不阻断复制。'],
        },
    };
}
