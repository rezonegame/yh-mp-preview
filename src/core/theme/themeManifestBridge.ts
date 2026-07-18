import type { Template } from '../../templateManager';
import type { ThemeManifest } from './themeManifest';
import { adaptLegacyTemplate } from './legacyThemeAdapter';

const componentStyleKeys: Record<string, string> = {
    'heading-1': 'title.h1.base',
    'heading-2': 'title.h2.base',
    paragraph: 'paragraph',
    quote: 'quote',
    'code-block': 'code.block',
    table: 'table.container',
};

function appendStyle(current: string, extra: string): string {
    return [current.replace(/;?\s*$/, ';'), extra].filter(Boolean).join(' ');
}

function setStyle(template: Template, key: string, style: string): void {
    switch (key) {
        case 'title.h1.base': template.styles.title.h1.base = style; break;
        case 'title.h2.base': template.styles.title.h2.base = style; break;
        case 'paragraph': template.styles.paragraph = style; break;
        case 'quote': template.styles.quote = style; break;
        case 'code.block': template.styles.code.block = style; break;
        case 'table.container': template.styles.table.container = style; break;
    }
}

/** A portable JSON representation of an existing V2/V3 editor template. */
export function exportTemplateManifest(template: Template): string {
    return JSON.stringify(adaptLegacyTemplate(template), null, 2);
}

/**
 * Bridges a validated manifest into the existing editor model. Keeping one
 * renderer avoids a second styling path and makes imported themes reversible.
 */
export function createTemplateFromThemeManifest(manifest: ThemeManifest, baseTemplate: Template): Template {
    const template = JSON.parse(JSON.stringify(baseTemplate)) as Template;
    const componentStyles = new Map(manifest.components.map(component => [component.id, component.legacyStyle]));
    Object.entries(componentStyleKeys).forEach(([componentId, styleKey]) => {
        const style = componentStyles.get(componentId);
        if (typeof style === 'string' && style.trim()) setStyle(template, styleKey, style);
    });

    template.id = manifest.id;
    template.name = manifest.name;
    template.description = `ThemeManifest v${manifest.version} · ${manifest.license}`;
    template.source = manifest.source || 'ThemeManifest import';
    template.isPreset = false;
    template.isVisible = true;
    template.styles.accentColor = manifest.tokens.accent;
    template.styles.container = appendStyle(template.styles.container, `background: ${manifest.tokens.background}; color: ${manifest.tokens.text};`);
    template.styles.paragraph = appendStyle(template.styles.paragraph, `color: ${manifest.tokens.text}; font-size: ${manifest.tokens.fontSize}; line-height: ${manifest.tokens.lineHeight};`);
    template.styles.title.h1.content = appendStyle(template.styles.title.h1.content, `color: ${manifest.tokens.accent};`);
    template.styles.title.h2.content = appendStyle(template.styles.title.h2.content, `color: ${manifest.tokens.accent};`);
    return template;
}
