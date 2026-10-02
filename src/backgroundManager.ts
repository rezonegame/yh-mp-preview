import { hasUnsafeCss, setSafeInlineStyle } from './core/security/safeDom';
import { Notice } from 'obsidian';
import { SettingsManager } from "./settings/settings";
import { readingRootCss, type ReadingThemeTokens } from './core/theme/wechatThemeTokens';
import { DEFAULT_WECHAT_FONT_STACK } from './core/theme/wechatReadingBaseline';
import type { Typography } from './core/theme/templateStylePlan';

export interface Background {
    id: string;
    name: string;
    style: string;
    isPreset?: boolean;
    isVisible?: boolean;
}

export class BackgroundManager {
    private currentBackground: Background | null = null;
    private settingsManager: SettingsManager;
    private warnedUnsafeBackgrounds = new Set<string>();

    constructor(settingsManager: SettingsManager) {
        this.settingsManager = settingsManager;
    }

    public setBackground(id: string | null): boolean {
        if (!id) {
            this.currentBackground = null;
            return true;
        }
        
        const background = this.settingsManager.getBackground(id);
        if (background) {
            // Visibility controls the picker, not an already selected snapshot.
            
            this.currentBackground = background;
            if (!this.warnedUnsafeBackgrounds.has(id) && hasUnsafeCss(background.style)) {
                this.warnedUnsafeBackgrounds.add(id);
                new Notice('此背景含资源加载或不安全 CSS，预览将过滤相关样式；原设置未改写。');
            }
            return true;
        }
        
        console.warn(`未找到背景: ${id}`);
        return false;
    }

    private static readonly BASE_CONTENT_PADDING = 'padding: 16px 20px;';

    public applyBackground(element: HTMLElement, reading?: ReadingThemeTokens, typography: Typography = {family:DEFAULT_WECHAT_FONT_STACK,size:16}) {
        const section = element.querySelector('.mp-content-section');
        if (section) {
            if(reading){
                setSafeInlineStyle(section,readingRootCss(reading,typography,this.currentBackground));
                section.setAttribute('data-mp-reading-background',this.currentBackground?.id === 'default' ? 'theme' : 'custom');
                return;
            }
            section.removeAttribute('data-mp-reading-background');
            if (!this.currentBackground) {
                // 无背景时使用基础间距，CSS padding 会生效
                section.removeAttribute('style');
                return;
            }
            // 移除背景样式中的 padding: 0，替换为舒适的阅读间距
            const bgStyle = this.currentBackground.style
                .replace(/padding:\s*0;?/g, '')
                .replace(/;\s*$/, ';');
            setSafeInlineStyle(section, bgStyle + ' ' + BackgroundManager.BASE_CONTENT_PADDING);
        }
    }
}
