/**
 * 主题画廊弹窗
 * 左侧分类列表，右侧主题网格预览
 */

import { Modal, setIcon, Notice } from 'obsidian';
import type { SettingsManager } from './settings';
import type { Template } from '../templateManager';

/**
 * 风格分组定义
 */
export const STYLE_CATEGORIES = {
    '极简': {
        description: '简洁干净，注重内容',
        keywords: ['minimal', '简约', 'zen', 'essence', 'academic', '极简', '禅意', '学术'],
        color: '#636e72'
    },
    '渐变': {
        description: '渐变色标题，现代感',
        keywords: ['focus', 'elegant', 'bytedance', '聚焦', '精致'],
        color: '#0984e3'
    },
    '醒目': {
        description: '大胆配色，视觉冲击',
        keywords: ['bold', 'sports', 'bauhaus', 'modern-report', '醒目', '运动', '包豪斯', '报告', '黑白'],
        color: '#d63031'
    },
    '深色': {
        description: '深色/暗夜风格',
        keywords: ['dark', 'ink', 'midnight', '墨韵', '暗夜'],
        color: '#2d3436'
    },
    '古典': {
        description: '传统文化，中式美学',
        keywords: ['chinese', 'terracotta', 'newspaper', '中国', '赤陶', '报纸'],
        color: '#b7410e'
    },
    '科技': {
        description: '科技感，开发者风格',
        keywords: ['github', 'sspai', 'GitHub', '少数派'],
        color: '#27c3b4'
    },
    '文艺': {
        description: '柔和配色，文艺清新',
        keywords: ['lavender', 'mint', 'sunset', 'coffee', 'magazine', '薰衣草', '薄荷', '日落', '咖啡', '画刊', '杂志'],
        color: '#a29bfe'
    },
    '其他': {
        description: '其他风格主题',
        keywords: [],
        color: '#95a5a6'
    }
};

export type StyleCategory = keyof typeof STYLE_CATEGORIES;

/**
 * 根据主题 ID 判断其风格分类
 */
export function getThemeCategory(template: Template): StyleCategory {
    const id = template.id.toLowerCase();
    const name = template.name.toLowerCase();
    const source = template.source?.toLowerCase() || '';

    for (const [category, config] of Object.entries(STYLE_CATEGORIES)) {
        if (category === '其他') continue;

        for (const keyword of config.keywords) {
            if (id.includes(keyword.toLowerCase()) || name.includes(keyword.toLowerCase())) {
                return category as StyleCategory;
            }
        }
    }

    return '其他';
}

/**
 * 主题画廊弹窗
 */
export class ThemeGalleryModal extends Modal {
    private settingsManager: SettingsManager;
    private templates: Template[];
    private currentTemplateId: string;
    private onSelect: (templateId: string) => void;
    private previewCallback: (templateId: string) => void;

    private selectedCategory: StyleCategory = '极简';
    private selectedLayoutFamily: string = '';
    private searchQuery: string = '';

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

        // 初始化默认选中的分类和布局
        this.initializeDefaults();
    }

    private initializeDefaults() {
        const currentTemplate = this.templates.find(t => t.id === this.currentTemplateId);
        if (currentTemplate) {
            this.selectedCategory = getThemeCategory(currentTemplate);
            this.selectedLayoutFamily = this.parseTemplateFamily(currentTemplate).family;
        } else {
            this.selectedCategory = '极简';
            const catTemplates = this.templates.filter(t => getThemeCategory(t) === '极简');
            if (catTemplates.length > 0) {
                this.selectedLayoutFamily = this.parseTemplateFamily(catTemplates[0]).family;
            }
        }
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.addClass('mp-theme-gallery-modal');
        contentEl.empty();

        // 头部
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

        // 主内容区
        const mainContent = contentEl.createEl('div', { cls: 'mp-gallery-main' });

        // 1. 分类栏 (左)
        const sidebar = mainContent.createEl('div', { cls: 'mp-gallery-sidebar' });
        this.renderSidebar(sidebar);

        // 2. 布局栏 (中)
        this.layoutContainer = mainContent.createEl('div', { cls: 'mp-gallery-layouts' });
        this.renderLayoutList();

        // 3. 变体网格 (右)
        this.gridContainer = mainContent.createEl('div', { cls: 'mp-gallery-grid' });
        this.renderGrid();

        // 底部
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
                
                // 重置布局：选择该分类下的第一个排版结构
                const families = this.getLayoutFamilies();
                if (families.length > 0) {
                    this.selectedLayoutFamily = families[0].name;
                } else {
                    this.selectedLayoutFamily = '';
                }
                
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

        if (!families.some(f => f.name === this.selectedLayoutFamily)) {
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
        const categoryTemplates = this.templates.filter(t => {
            if (this.searchQuery) {
                const searchable = `${t.id} ${t.name} ${t.description}`.toLowerCase();
                return searchable.includes(this.searchQuery);
            }
            return getThemeCategory(t) === this.selectedCategory;
        });

        const familyMap = new Map<string, { description: string, templates: Template[] }>();
        for (const t of categoryTemplates) {
            const { family } = this.parseTemplateFamily(t);
            if (!familyMap.has(family)) {
                familyMap.set(family, { description: t.description.split('，')[0], templates: [] });
            }
            familyMap.get(family)!.templates.push(t);
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

        const familyTemplates = this.templates.filter(t => {
            const { family } = this.parseTemplateFamily(t);
            if (this.searchQuery) {
                const searchable = `${t.id} ${t.name} ${t.description}`.toLowerCase();
                if (!searchable.includes(this.searchQuery)) return false;
            } else {
                if (getThemeCategory(t) !== this.selectedCategory) return false;
            }
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

    private parseTemplateFamily(template: Template): { family: string, variant: string } {
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
        const keywords = ['聚焦', '精致', '字节', '赤陶', '中国', '报纸', '墨韵', '暗夜',
                         '运动', '包豪斯', '薄荷', '日落', '薰衣草', '咖啡', '杂志',
                         '优雅', '醒目', '极简'];

        for (const kw of keywords) {
            if (name.includes(kw)) return kw;
        }

        if (name.length <= 3) return name;
        const cnMatch = name.match(/[\u4e00-\u9fa5]/g);
        if (cnMatch) {
            const chars = cnMatch.filter(c => c !== '系' && c !== '列').slice(0, 2);
            if (chars.length >= 2) return chars.join('');
        }
        return name.slice(0, 3);
    }

    private getContrastColor(hexColor: string): string {
        if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
        const hex = hexColor.replace('#', '');
        if (hex.length < 6) return '#ffffff';
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness > 128 ? '#1a1a2e' : '#ffffff';
    }

    private lightenColor(hex: string, percent: number): string {
        if (!hex || !hex.startsWith('#')) return hex;
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    private getCategoryCounts(): Record<string, number> {
        const counts: Record<string, number> = {};
        
        // 分组统计：大类 -> 排版结构数量
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