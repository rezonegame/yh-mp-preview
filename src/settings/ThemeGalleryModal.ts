/**
 * 主题画廊弹窗
 * 左侧分类列表，中间排版结构，右侧颜色变体
 */

import { Modal, setIcon } from 'obsidian';
import type { SettingsManager } from './settings';
import type { Template } from '../templateManager';

export const STYLE_CATEGORIES = {
    '极简': { description: '简洁干净，注重内容', color: '#636e72' },
    '渐变': { description: '渐变色标题，现代感', color: '#0984e3' },
    '醒目': { description: '大胆配色，视觉冲击', color: '#d63031' },
    '深色': { description: '深色/暗夜风格', color: '#2d3436' },
    '古典': { description: '传统文化，中式美学', color: '#b7410e' },
    '科技': { description: '科技感，开发者风格', color: '#27c3b4' },
    '文艺': { description: '柔和配色，文艺清新', color: '#a29bfe' },
    '教育': { description: '适合学习与教学内容', color: '#fdcb6e' },
    '其他': { description: '其他风格主题', color: '#95a5a6' }
};

export type StyleCategory = keyof typeof STYLE_CATEGORIES;

type CategoryRule = {
    category: StyleCategory;
    idPrefixes?: string[];
    idContains?: string[];
    nameContains?: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
    { category: '深色', idPrefixes: ['dark', 'xiaohu-ink', 'xiaohu-midnight'], nameContains: ['暗夜'] },
    { category: '教育', idPrefixes: ['parent-child', 'teacher', 'kindergarten', 'blackboard'], nameContains: ['教育系列', '黑板'] },
    { category: '渐变', idPrefixes: ['focus-', 'focus', 'elegant', 'xiaohu-focus', 'xiaohu-elegant', 'xiaohu-bytedance', 'apple-product', 'ocean-calm'], nameContains: ['聚焦系列', '精致系列', '字节跳动', '苹果产品', '深海静谧'] },
    { category: '醒目', idPrefixes: ['bold-', 'bold', 'xiaohu-bold', 'xiaohu-bauhaus', 'xiaohu-sports', 'modern-report', 'playful', 'adventure', 'cyber-neon'], nameContains: ['醒目系列', '包豪斯', '运动风', '现代报告', '活泼', '探险', '赛博霓虹'] },
    { category: '古典', idPrefixes: ['xiaohu-chinese', 'xiaohu-terracotta', 'xiaohu-newspaper'], nameContains: ['中式美学', '经典报纸'] },
    { category: '科技', idPrefixes: ['xiaohu-github', 'xiaohu-sspai', 'gameui'], nameContains: ['GitHub', '少数派', '游戏UI'] },
    { category: '文艺', idPrefixes: ['xiaohu-lavender', 'xiaohu-mint', 'xiaohu-sunset', 'xiaohu-coffee', 'xiaohu-magazine', 'warmth', 'autumn-warm', 'spring-fresh'], nameContains: ['文艺系列', '薰衣草', '薄荷', '日落', '咖啡', '时尚杂志', '温暖', '秋日暖光', '春日清新'] },
    { category: '极简', idPrefixes: ['minimal', 'xiaohu-minimal', 'default', 'scarlet', 'academic', 'zen-essence', 'orange', 'yeban', 'brown', 'xiaohu-wechat'], nameContains: ['极简系列', '默认模板', '学术专业', '禅意极简', '叶伴系列'] },
];

export function getThemeCategory(template: Template): StyleCategory {
    const id = (template.id || '').toLowerCase();
    const name = template.name || '';

    for (const rule of CATEGORY_RULES) {
        if (rule.idPrefixes) {
            for (const prefix of rule.idPrefixes) {
                const normalizedPrefix = prefix.toLowerCase();
                if (id === normalizedPrefix || id.startsWith(normalizedPrefix)) {
                    return rule.category;
                }
            }
        }

        if (rule.idContains) {
            for (const keyword of rule.idContains) {
                if (id.includes(keyword.toLowerCase())) {
                    return rule.category;
                }
            }
        }

        if (rule.nameContains) {
            for (const keyword of rule.nameContains) {
                if (name.includes(keyword)) {
                    return rule.category;
                }
            }
        }
    }

    return '其他';
}

export class ThemeGalleryModal extends Modal {
    private settingsManager: SettingsManager;
    private templates: Template[];
    private currentTemplateId: string;
    private onSelect: (templateId: string) => void;
    private previewCallback: (templateId: string) => void;

    private selectedCategory: StyleCategory = '极简';
    private selectedLayoutFamily = '';
    private searchQuery = '';

    private layoutContainer: HTMLElement | null = null;
    private gridContainer: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private categoryButtons: Map<StyleCategory, HTMLElement> = new Map();
    private layoutButtons: Map<string, HTMLElement> = new Map();

    constructor(
        app: any,
        settingsManager: SettingsManager,
        currentTemplateId: string,
        onSelect: (templateId: string) => void,
        previewCallback: (templateId: string) => void
    ) {
        super(app);
        this.settingsManager = settingsManager;
        this.templates = settingsManager.getVisibleTemplates();
        this.currentTemplateId = currentTemplateId;
        this.onSelect = onSelect;
        this.previewCallback = previewCallback;

        this.initializeDefaults();
    }

    private initializeDefaults() {
        const currentTemplate = this.templates.find(template => template.id === this.currentTemplateId);
        if (currentTemplate) {
            this.selectedCategory = getThemeCategory(currentTemplate);
            this.selectedLayoutFamily = this.parseTemplateFamily(currentTemplate).family;
            return;
        }

        this.selectedCategory = this.getFirstAvailableCategory();
        const categoryTemplates = this.getTemplatesForCategory(this.selectedCategory);
        this.selectedLayoutFamily = categoryTemplates.length > 0
            ? this.parseTemplateFamily(categoryTemplates[0]).family
            : '';
    }

    private getFirstAvailableCategory(): StyleCategory {
        const categories = Object.keys(STYLE_CATEGORIES) as StyleCategory[];
        return categories.find(category => this.getTemplatesForCategory(category).length > 0) || '其他';
    }

    private getTemplatesForCategory(category: StyleCategory): Template[] {
        return this.templates.filter(template => getThemeCategory(template) === category);
    }

    private matchesSearch(template: Template): boolean {
        if (!this.searchQuery) return true;

        const searchable = [
            template.id,
            template.name,
            template.description || '',
            this.parseTemplateFamily(template).family,
        ].join(' ').toLowerCase();

        return searchable.includes(this.searchQuery);
    }

    private getTemplateDescription(template: Template): string {
        const description = template.description?.trim();
        if (description) {
            return description.split('（')[0].trim();
        }

        const { family, variant } = this.parseTemplateFamily(template);
        if (variant !== '默认') {
            return `${variant}配色`;
        }

        return `${family}主题`;
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.addClass('mp-theme-gallery-modal');
        contentEl.empty();

        const header = contentEl.createEl('div', { cls: 'mp-gallery-header' });
        header.createEl('h2', { text: '🎨 主题画廊' });

        this.searchInput = header.createEl('input', {
            cls: 'mp-gallery-search',
            attr: { type: 'text', placeholder: '搜索主题...' }
        });
        this.searchInput.addEventListener('input', () => {
            this.searchQuery = this.searchInput!.value.toLowerCase();
            this.renderLayoutList();
            this.renderGrid();
        });

        const mainContent = contentEl.createEl('div', { cls: 'mp-gallery-main' });

        const sidebar = mainContent.createEl('div', { cls: 'mp-gallery-sidebar' });
        this.renderSidebar(sidebar);

        this.layoutContainer = mainContent.createEl('div', { cls: 'mp-gallery-layouts' });
        this.renderLayoutList();

        this.gridContainer = mainContent.createEl('div', { cls: 'mp-gallery-grid' });
        this.renderGrid();

        const footer = contentEl.createEl('div', { cls: 'mp-gallery-footer' });
        const cancelBtn = footer.createEl('button', { text: '取消', cls: 'mp-gallery-btn-cancel' });
        cancelBtn.addEventListener('click', () => this.close());

        const applyBtn = footer.createEl('button', { text: '应用主题', cls: 'mp-gallery-btn-apply' });
        applyBtn.addEventListener('click', () => {
            if (this.currentTemplateId) {
                this.onSelect(this.currentTemplateId);
                this.close();
            }
        });
    }

    onClose() {
        this.contentEl.empty();
    }

    private renderSidebar(container: HTMLElement) {
        container.empty();
        this.categoryButtons.clear();

        const categoryCounts = this.getCategoryCounts();

        for (const [category, config] of Object.entries(STYLE_CATEGORIES)) {
            const count = categoryCounts[category] || 0;
            if (count === 0 && category !== '其他') continue;

            const btn = container.createEl('button', {
                cls: `mp-gallery-category-btn ${this.selectedCategory === category ? 'active' : ''}`,
                attr: { title: config.description }
            });

            const colorDot = btn.createEl('span', { cls: 'mp-category-color' });
            colorDot.style.backgroundColor = config.color;

            btn.createEl('span', { text: category, cls: 'mp-category-name' });
            if (count > 0) {
                btn.createEl('span', { text: `${count}`, cls: 'mp-category-count' });
            }

            btn.addEventListener('click', () => {
                this.selectedCategory = category as StyleCategory;
                this.updateCategoryButtons();

                const families = this.getLayoutFamilies();
                this.selectedLayoutFamily = families.length > 0 ? families[0].name : '';

                this.renderLayoutList();
                this.renderGrid();
            });

            this.categoryButtons.set(category as StyleCategory, btn);
        }
    }

    private updateCategoryButtons() {
        for (const [category, btn] of this.categoryButtons) {
            if (category === this.selectedCategory) btn.addClass('active');
            else btn.removeClass('active');
        }
    }

    private renderLayoutList() {
        if (!this.layoutContainer) return;

        this.layoutContainer.empty();
        this.layoutButtons.clear();

        this.layoutContainer.createEl('div', { text: '排版结构', cls: 'mp-gallery-layout-header' });

        const families = this.getLayoutFamilies();
        if (families.length === 0) {
            this.layoutContainer.createEl('div', { text: '暂无结构', cls: 'mp-gallery-empty-small' });
            return;
        }

        if (!families.some(family => family.name === this.selectedLayoutFamily)) {
            this.selectedLayoutFamily = families[0].name;
        }

        for (const family of families) {
            const btn = this.layoutContainer.createEl('button', {
                cls: `mp-gallery-layout-btn ${this.selectedLayoutFamily === family.name ? 'active' : ''}`
            });

            btn.createEl('div', { text: family.name, cls: 'mp-layout-name' });
            btn.createEl('div', { text: family.description, cls: 'mp-layout-desc' });

            btn.addEventListener('click', () => {
                this.selectedLayoutFamily = family.name;
                this.updateLayoutButtons();
                this.renderGrid();
            });

            this.layoutButtons.set(family.name, btn);
        }
    }

    private updateLayoutButtons() {
        for (const [name, btn] of this.layoutButtons) {
            if (name === this.selectedLayoutFamily) btn.addClass('active');
            else btn.removeClass('active');
        }
    }

    private getLayoutFamilies() {
        const categoryTemplates = this.getTemplatesForCategory(this.selectedCategory)
            .filter(template => this.matchesSearch(template));

        const familyMap = new Map<string, { description: string; templates: Template[] }>();
        for (const template of categoryTemplates) {
            const { family } = this.parseTemplateFamily(template);
            if (!familyMap.has(family)) {
                familyMap.set(family, {
                    description: this.getTemplateDescription(template),
                    templates: []
                });
            }
            familyMap.get(family)!.templates.push(template);
        }

        return Array.from(familyMap.entries()).map(([name, data]) => ({
            name,
            description: data.description,
            templates: data.templates
        }));
    }

    private renderGrid() {
        if (!this.gridContainer) return;

        this.gridContainer.empty();

        const familyTemplates = this.getTemplatesForCategory(this.selectedCategory).filter(template => {
            if (!this.matchesSearch(template)) return false;
            const { family } = this.parseTemplateFamily(template);
            return family === this.selectedLayoutFamily;
        });

        if (familyTemplates.length === 0) {
            this.gridContainer.createEl('div', { cls: 'mp-gallery-empty', text: '该结构下无颜色变体' });
            return;
        }

        for (const template of familyTemplates) {
            this.renderThemeCard(template);
        }
    }

    private renderThemeCard(template: Template) {
        if (!this.gridContainer) return;

        const isSelected = template.id === this.currentTemplateId;
        const card = this.gridContainer.createEl('div', {
            cls: `mp-theme-card ${isSelected ? 'selected' : ''}`
        });

        const accentColor = template.styles.accentColor || this.extractAccentColor(template);
        const { variant } = this.parseTemplateFamily(template);

        const colorBarWrapper = card.createEl('div', { cls: 'mp-theme-color-bar-wrapper' });
        const colorBar = colorBarWrapper.createEl('div', { cls: 'mp-theme-color-bar' });
        colorBar.style.background = this.createColorGradient(accentColor);

        const previewText = colorBarWrapper.createEl('div', {
            cls: 'mp-theme-color-text',
            text: variant === '默认' ? this.getPreviewText(template) : variant
        });
        previewText.style.color = this.getContrastColor(accentColor);

        const info = card.createEl('div', { cls: 'mp-theme-info' });
        info.createEl('div', { text: variant === '默认' ? template.name : variant, cls: 'mp-theme-name' });

        if (template.source === 'xiaohu') {
            info.createEl('span', { text: 'xiaohu', cls: 'mp-theme-source' });
        }

        if (isSelected) {
            const checkmark = card.createEl('div', { cls: 'mp-theme-checkmark' });
            setIcon(checkmark, 'check');
        }

        card.addEventListener('click', () => {
            this.currentTemplateId = template.id;
            this.previewCallback(template.id);
            this.renderGrid();
        });

        card.addEventListener('dblclick', () => {
            this.onSelect(template.id);
            this.close();
        });
    }

    private parseTemplateFamily(template: Template): { family: string; variant: string } {
        const name = template.name.replace(/\s*\(xiaohu\)\s*/i, '');
        const parts = name.split(' - ');
        if (parts.length > 1) {
            return { family: parts[0], variant: parts[1] };
        }

        return { family: name, variant: '默认' };
    }

    private extractAccentColor(template: Template): string {
        const h2Style = template.styles.title?.h2?.base || '';
        const match = h2Style.match(/(?:color|background):\s*([#\w]+)/);
        if (match) return match[1];
        return '#4285f4';
    }

    private createColorGradient(accentColor: string): string {
        return `linear-gradient(135deg, ${accentColor} 0%, ${this.lightenColor(accentColor, 20)} 100%)`;
    }

    private getPreviewText(template: Template): string {
        const name = template.name.replace(/\s*\(xiaohu\)\s*/i, '');
        const keywords = ['聚焦', '精致', '字节', '兵马俑', '中国', '报纸', '墨韵', '暗夜', '运动', '包豪斯', '薄荷', '日落', '薰衣草', '咖啡', '杂志', '优雅', '醒目', '极简'];

        for (const keyword of keywords) {
            if (name.includes(keyword)) return keyword;
        }

        if (name.length <= 3) return name;

        const cnMatch = name.match(/[\u4e00-\u9fa5]/g);
        if (cnMatch) {
            const chars = cnMatch.filter(char => char !== '系' && char !== '列').slice(0, 2);
            if (chars.length >= 2) return chars.join('');
        }

        return name.slice(0, 3);
    }

    private getContrastColor(hexColor: string): string {
        if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';

        const hex = hexColor.replace('#', '');
        if (hex.length < 6) return '#ffffff';

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        return brightness > 128 ? '#1a1a2e' : '#ffffff';
    }

    private lightenColor(hex: string, percent: number): string {
        if (!hex || !hex.startsWith('#')) return hex;

        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const r = Math.min(255, (num >> 16) + amt);
        const g = Math.min(255, ((num >> 8) & 0x00ff) + amt);
        const b = Math.min(255, (num & 0x0000ff) + amt);

        return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
    }

    private getCategoryCounts(): Record<string, number> {
        const counts: Record<string, number> = {};
        const categoryFamilies = new Map<string, Set<string>>();

        for (const template of this.templates) {
            const category = getThemeCategory(template);
            const { family } = this.parseTemplateFamily(template);

            if (!categoryFamilies.has(category)) {
                categoryFamilies.set(category, new Set());
            }
            categoryFamilies.get(category)!.add(family);
        }

        for (const [category, families] of categoryFamilies.entries()) {
            counts[category] = families.size;
        }

        return counts;
    }
}
