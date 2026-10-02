import { Notice, type App } from 'obsidian';
import type { SettingsManager } from './settings/settings';
import { hasUnsafeCss } from './core/security/safeDom';
import { DEFAULT_WECHAT_FONT_STACK } from './core/theme/wechatReadingBaseline';
import { getCuratedThemeEntry } from './core/theme/themeCatalog';
import { applyStylePlan } from './core/theme/templateStylePlan';
import { resolveWechatPalette } from './core/theme/wechatPalette';
import { applyWechatComponentPalette } from './core/theme/applyWechatComponentPalette';
import type { Template } from './core/theme/templateTypes';
import { applyReadingComponentRoles, ownStyle } from './core/theme/wechatThemeTokens';
export type { Template } from './core/theme/templateTypes';

function unsafeStyleTree(value: unknown): boolean {
    if (typeof value === 'string') return hasUnsafeCss(value);
    return Boolean(value && typeof value === 'object' && Object.values(value).some(unsafeStyleTree));
}

export class TemplateManager {
    private currentTemplate: Template | undefined;
    private typography = { family: DEFAULT_WECHAT_FONT_STACK, size: 16 };
    private readonly warned = new Set<string>();
    constructor(_app: App, private readonly settingsManager: SettingsManager) {}
    setCurrentTemplate(id: string): boolean {
        const selected = this.settingsManager.getTemplate(id);
        if (!selected) return false;
        this.currentTemplate = selected;
        return true;
    }
    setFont(family: string): void { this.typography.family = family; }
    setFontSize(size: number): void { this.typography.size = size; }
    applyTemplate(root: HTMLElement, override?: Template): void {
        const theme = override ?? this.currentTemplate ?? this.settingsManager.getTemplate('default');
        if (!theme) throw new Error('没有可用的排版主题');
        if (!this.warned.has(theme.id) && unsafeStyleTree(theme.styles)) {
            this.warned.add(theme.id);
            new Notice('此主题含不安全 CSS，预览会过滤；保存的主题保持不变。');
        }
        applyStylePlan(root, theme.styles, this.typography, getCuratedThemeEntry(theme.id)?.readingProfile ?? 'standard', !!theme.reading);
        if(theme.reading) {
            root.querySelectorAll('.mp-image-caption,figcaption').forEach(node=>ownStyle(node,theme.reading!.captionCss));
            applyReadingComponentRoles(root,resolveWechatPalette(theme),theme.reading);
        } else applyWechatComponentPalette(root, resolveWechatPalette(theme));
    }
}
export const templateManager = (app: App, settings: SettingsManager) => new TemplateManager(app, settings);
