import { SettingsManager } from "./settings/settings";

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
            // 检查背景是否可见
            if (background.isVisible === false) {
                console.warn(`尝试设置不可见的背景: ${id}`);
                return false;
            }
            
            this.currentBackground = background;
            return true;
        }
        
        console.warn(`未找到背景: ${id}`);
        return false;
    }

    private static readonly BASE_CONTENT_PADDING = 'padding: 16px 20px;';

    public applyBackground(element: HTMLElement) {
        const section = element.querySelector('.mp-content-section');
        if (section) {
            if (!this.currentBackground) {
                // 无背景时使用基础间距，CSS padding 会生效
                section.setAttribute('style', '');
                return;
            }
            // 移除背景样式中的 padding: 0，替换为舒适的阅读间距
            const bgStyle = this.currentBackground.style
                .replace(/padding:\s*0;?/g, '')
                .replace(/;\s*$/, ';');
            section.setAttribute('style', bgStyle + ' ' + BackgroundManager.BASE_CONTENT_PADDING);
        }
    }
}