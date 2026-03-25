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
        keywords: ['minimal', '简约'],
        color: '#636e72'
    },
    '渐变': {
        description: '渐变色标题，现代感',
        keywords: ['focus', 'elegant', 'bytedance', '聚焦', '精致'],
        color: '#0984e3'
    },
    '醒目': {
        description: '大胆配色，视觉冲击',
        keywords: ['bold', 'sports', 'bauhaus', '醒目', '运动', '包豪斯'],
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
        keywords: ['lavender', 'mint', 'sunset', 'coffee', '薰衣草', '薄荷', '日落', '咖啡'],
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
    private searchQuery: string = '';
    private filteredTemplates: Template[] = [];

    private gridContainer: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;
    private categoryButtons: Map<StyleCategory, HTMLElement> = new Map();

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
    }

    onOpen() {
        const { contentEl, modalEl } = this;

        // 设置弹窗大小
        modalEl.addClass('mp-theme-gallery-modal');
        contentEl.empty();

        // 头部
        const header = contentEl.createEl('div', { cls: 'mp-gallery-header' });
        header.createEl('h2', { text: '🎨 主题画廊' });

        // 搜索框
        this.searchInput = header.createEl('input', {
            cls: 'mp-gallery-search',
            attr: {
                type: 'text',
                placeholder: '搜索主题...',
            }
        });
        this.searchInput.addEventListener('input', () => {
            this.searchQuery = this.searchInput!.value.toLowerCase();
            this.renderGrid();
        });

        // 主内容区
        const mainContent = contentEl.createEl('div', { cls: 'mp-gallery-main' });

        // 左侧分类列表
        const sidebar = mainContent.createEl('div', { cls: 'mp-gallery-sidebar' });
        this.renderSidebar(sidebar);

        // 右侧主题网格
        this.gridContainer = mainContent.createEl('div', { cls: 'mp-gallery-grid' });
        this.renderGrid();

        // 底部操作栏
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
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * 渲染左侧分类列表
     */
    private renderSidebar(container: HTMLElement) {
        // 分类统计
        const categoryCounts = this.getCategoryCounts();

        for (const [category, config] of Object.entries(STYLE_CATEGORIES)) {
            const count = categoryCounts[category] || 0;
            if (count === 0) continue;

            const btn = container.createEl('button', {
                cls: `mp-gallery-category-btn ${this.selectedCategory === category ? 'active' : ''}`,
                attr: { title: config.description }
            });

            // 颜色指示器
            const colorDot = btn.createEl('span', { cls: 'mp-category-color' });
            colorDot.style.backgroundColor = config.color;

            // 分类名和数量
            btn.createEl('span', { text: category, cls: 'mp-category-name' });
            btn.createEl('span', { text: `${count}`, cls: 'mp-category-count' });

            btn.addEventListener('click', () => {
                this.selectedCategory = category as StyleCategory;
                this.updateCategoryButtons();
                this.renderGrid();
            });

            this.categoryButtons.set(category as StyleCategory, btn);
        }
    }

    /**
     * 更新分类按钮状态
     */
    private updateCategoryButtons() {
        for (const [category, btn] of this.categoryButtons) {
            if (category === this.selectedCategory) {
                btn.addClass('active');
            } else {
                btn.removeClass('active');
            }
        }
    }

    /**
     * 渲染主题网格
     */
    private renderGrid() {
        if (!this.gridContainer) return;
        this.gridContainer.empty();

        // 过滤主题
        this.filteredTemplates = this.templates.filter(t => {
            // 搜索过滤
            if (this.searchQuery) {
                const searchable = `${t.id} ${t.name} ${t.description}`.toLowerCase();
                if (!searchable.includes(this.searchQuery)) return false;
            }

            // 分类过滤
            if (this.selectedCategory !== '其他' || this.searchQuery) {
                const category = getThemeCategory(t);
                if (category !== this.selectedCategory) return false;
            }

            return true;
        });

        // 如果没有搜索且选择"其他"，显示所有未分类的主题
        if (!this.searchQuery && this.selectedCategory === '其他') {
            this.filteredTemplates = this.templates.filter(t => {
                const category = getThemeCategory(t);
                return category === '其他';
            });
        }

        // 无结果提示
        if (this.filteredTemplates.length === 0) {
            this.gridContainer.createEl('div', {
                cls: 'mp-gallery-empty',
                text: '没有找到匹配的主题'
            });
            return;
        }

        // 渲染主题卡片
        for (const template of this.filteredTemplates) {
            this.renderThemeCard(template);
        }
    }

    /**
     * 渲染单个主题卡片
     */
    private renderThemeCard(template: Template) {
        if (!this.gridContainer) return;

        const isSelected = template.id === this.currentTemplateId;
        const card = this.gridContainer.createEl('div', {
            cls: `mp-theme-card ${isSelected ? 'selected' : ''}`
        });

        // 获取主题颜色
        const accentColor = template.styles.accentColor || this.extractAccentColor(template);
        const isGradient = this.isGradientTemplate(template);

        // 颜色预览条容器
        const colorBarWrapper = card.createEl('div', { cls: 'mp-theme-color-bar-wrapper' });

        // 颜色预览条
        const colorBar = colorBarWrapper.createEl('div', { cls: 'mp-theme-color-bar' });
        colorBar.style.background = this.createColorGradient(accentColor);

        // 渐变主题显示预览文字
        if (isGradient) {
            const previewText = colorBarWrapper.createEl('div', {
                cls: 'mp-theme-color-text',
                text: this.getPreviewText(template)
            });
            // 根据背景亮度调整文字颜色
            previewText.style.color = this.getContrastColor(accentColor);
        }

        // 主题信息
        const info = card.createEl('div', { cls: 'mp-theme-info' });
        info.createEl('div', { text: template.name, cls: 'mp-theme-name' });

        // 来源标签
        if (template.source === 'xiaohu') {
            info.createEl('span', { text: 'xiaohu', cls: 'mp-theme-source' });
        }

        // 选中指示
        if (isSelected) {
            const checkmark = card.createEl('div', { cls: 'mp-theme-checkmark' });
            setIcon(checkmark, 'check');
        }

        // 点击事件
        card.addEventListener('click', () => {
            this.currentTemplateId = template.id;
            this.previewCallback(template.id);
            this.renderGrid();
        });

        // 双击应用
        card.addEventListener('dblclick', () => {
            this.onSelect(template.id);
            this.close();
        });
    }

    /**
     * 从模板样式中提取强调色
     */
    private extractAccentColor(template: Template): string {
        const h2Style = template.styles.title?.h2?.base || '';
        const match = h2Style.match(/(?:color|background):\s*([#\w]+)/);
        if (match) return match[1];
        return '#4285f4'; // 默认蓝色
    }

    /**
     * 创建颜色渐变
     */
    private createColorGradient(accentColor: string): string {
        return `linear-gradient(135deg, ${accentColor} 0%, ${this.lightenColor(accentColor, 20)} 100%)`;
    }

    /**
     * 判断是否为渐变主题（Focus/Elegant系列）
     */
    private isGradientTemplate(template: Template): boolean {
        const id = template.id.toLowerCase();
        const name = template.name.toLowerCase();
        return id.includes('focus') || id.includes('elegant') ||
               name.includes('聚焦') || name.includes('精致') ||
               id.includes('bytedance') || name.includes('字节');
    }

    /**
     * 获取预览文字
     */
    private getPreviewText(template: Template): string {
        // 提取主题名称的关键字
        const name = template.name.replace(/\s*\(xiaohu\)\s*/i, '');
        // 取前2-3个字符或第一个词
        if (name.length <= 3) return name;
        // 如果有英文，优先取中文
        const cnMatch = name.match(/[\u4e00-\u9fa5]{2,3}/);
        if (cnMatch) return cnMatch[0];
        // 否则取前两个大写字母或前3个字符
        const enMatch = name.match(/[A-Z][a-z]?/g);
        if (enMatch && enMatch.length >= 2) {
            return enMatch.slice(0, 2).join('');
        }
        return name.slice(0, 3);
    }

    /**
     * 根据背景色获取对比文字颜色
     */
    private getContrastColor(hexColor: string): string {
        // 简单的亮度判断
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        // 计算亮度 (YIQ公式)
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness > 128 ? '#1a1a2e' : '#ffffff';
    }

    /**
     * 颜色变亮
     */
    private lightenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    /**
     * 获取各分类的主题数量
     */
    private getCategoryCounts(): Record<string, number> {
        const counts: Record<string, number> = {};

        for (const template of this.templates) {
            const category = getThemeCategory(template);
            counts[category] = (counts[category] || 0) + 1;
        }

        return counts;
    }
}