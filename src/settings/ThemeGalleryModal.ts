/**
 * Theme gallery: a lightweight scene-first picker. Theme style and article
 * recipe remain separate choices, so users can try a visual direction without
 * changing the article structure.
 */
import { Modal, setIcon } from 'obsidian';
import type { SettingsManager } from './settings';
import type { Template } from '../templateManager';
import { curatedThemeEntries, getCuratedThemeEntry, type CuratedThemeScene } from '../core/theme/themeCatalog';

type ThemeScene = '全部' | CuratedThemeScene | '自定义主题';

const SCENE_ORDER: ThemeScene[] = [
    '全部', ...curatedThemeEntries.map(entry => entry.scene), '自定义主题'
];

export function getThemeScene(template: Template): ThemeScene {
    if (!template.isPreset) return '自定义主题';
    return getCuratedThemeEntry(template.id)?.scene || '通用长文';
}

export class ThemeGalleryModal extends Modal {
    private readonly templates: Template[];
    private readonly originalTemplateId: string;
    private currentTemplateId: string;
    private readonly onSelect: (templateId: string) => void | Promise<void>;
    private readonly previewCallback: (templateId: string) => void;
    private selectedScene: ThemeScene = '全部';
    private searchQuery = '';
    private hasApplied = false;
    private gridContainer: HTMLElement | null = null;
    private applyButton: HTMLButtonElement | null = null;
    private tryHintEl: HTMLElement | null = null;

    constructor(
        app: any,
        settingsManager: SettingsManager,
        currentTemplateId: string,
        onSelect: (templateId: string) => void | Promise<void>,
        previewCallback: (templateId: string) => void,
    ) {
        super(app);
        this.templates = settingsManager.getVisibleTemplates();
        this.originalTemplateId = currentTemplateId;
        this.currentTemplateId = currentTemplateId;
        this.onSelect = onSelect;
        this.previewCallback = previewCallback;
        const currentTemplate = this.templates.find(template => template.id === currentTemplateId);
        if (currentTemplate) this.selectedScene = getThemeScene(currentTemplate);
    }

    onOpen(): void {
        const { contentEl, modalEl } = this;
        modalEl.addClass('mp-theme-gallery-modal');
        contentEl.empty();

        const header = contentEl.createDiv('mp-gallery-header');
        const heading = header.createDiv('mp-gallery-heading');
        heading.createEl('h2', { text: '主题画廊' });
        heading.createEl('p', { text: '按文章场景挑选视觉风格；点击卡片先试用，确认后再应用。' });
        const search = header.createEl('input', {
            cls: 'mp-gallery-search',
            attr: { type: 'search', placeholder: '搜索主题或文章场景' },
        });
        search.addEventListener('input', () => {
            this.searchQuery = search.value.trim().toLowerCase();
            this.renderGallery();
        });

        const sceneBar = contentEl.createDiv('mp-gallery-scenes');
        SCENE_ORDER.forEach(scene => {
            const count = this.getTemplatesForScene(scene).length;
            if (count === 0 && scene !== '全部') return;
            const button = sceneBar.createEl('button', {
                text: scene === '全部' ? `全部主题 · ${this.templates.length}` : `${scene} · ${count}`,
                cls: `mp-gallery-scene ${scene === this.selectedScene ? 'is-active' : ''}`,
            });
            button.addEventListener('click', () => {
                this.selectedScene = scene;
                sceneBar.querySelectorAll('.mp-gallery-scene').forEach(el => el.removeClass('is-active'));
                button.addClass('is-active');
                this.renderGallery();
            });
        });

        this.gridContainer = contentEl.createDiv('mp-gallery-grid');
        this.renderGallery();

        const footer = contentEl.createDiv('mp-gallery-footer');
        const trialInfo = footer.createDiv('mp-gallery-trial-info');
        this.tryHintEl = trialInfo.createDiv('mp-gallery-try-hint');
        trialInfo.createEl('div', { cls: 'mp-gallery-trial-note', text: '试用不会保存到笔记设置。' });
        this.updateTryHint();
        const actions = footer.createDiv('mp-gallery-actions');
        const cancel = actions.createEl('button', { text: '取消试用', cls: 'mp-gallery-btn-cancel' });
        cancel.addEventListener('click', () => this.close());
        this.applyButton = actions.createEl('button', { cls: 'mp-gallery-btn-apply' });
        this.updateApplyButton();
        this.applyButton.addEventListener('click', () => {
            this.hasApplied = true;
            void Promise.resolve(this.onSelect(this.currentTemplateId)).then(() => this.close());
        });
    }

    onClose(): void {
        if (!this.hasApplied && this.currentTemplateId !== this.originalTemplateId) {
            this.previewCallback(this.originalTemplateId);
        }
        this.contentEl.empty();
    }

    private getTemplatesForScene(scene: ThemeScene): Template[] {
        return this.templates.filter(template => scene === '全部' || getThemeScene(template) === scene);
    }

    private matchesSearch(template: Template): boolean {
        if (!this.searchQuery) return true;
        return [template.id, template.name, template.description || '', getThemeScene(template)]
            .join(' ').toLowerCase().includes(this.searchQuery);
    }

    private getVisibleTemplates(): Template[] {
        return this.getTemplatesForScene(this.selectedScene).filter(template => this.matchesSearch(template));
    }

    private renderGallery(): void {
        if (!this.gridContainer) return;
        this.gridContainer.empty();
        const templates = this.getVisibleTemplates();
        if (templates.length === 0) {
            this.gridContainer.createEl('div', { cls: 'mp-gallery-empty', text: '没有匹配的主题，换个场景或关键词试试。' });
            return;
        }

        const grouped = this.selectedScene === '全部';
        const scenes = grouped ? SCENE_ORDER.filter(scene => scene !== '全部') : [this.selectedScene];
        scenes.forEach(scene => {
            const sceneTemplates = grouped ? templates.filter(template => getThemeScene(template) === scene) : templates;
            if (sceneTemplates.length === 0) return;
            this.gridContainer!.createEl('h3', {
                cls: 'mp-gallery-section-title',
                text: grouped ? scene : `${scene} · ${sceneTemplates.length} 个主题`,
            });
            const cardGrid = this.gridContainer!.createDiv('mp-gallery-card-grid');
            sceneTemplates.forEach(template => this.renderThemeCard(cardGrid, template));
        });
    }

    private renderThemeCard(container: HTMLElement, template: Template): void {
        const selected = template.id === this.currentTemplateId;
        const card = container.createEl('button', {
            cls: `mp-theme-card ${selected ? 'is-selected' : ''}`,
            attr: {
                type: 'button',
                'aria-pressed': selected ? 'true' : 'false',
                title: `试用主题：${template.name}`,
            },
        });
        const info = card.createDiv('mp-theme-info');
        info.createEl('strong', { text: template.name, cls: 'mp-theme-name' });
        if (selected) {
            const check = info.createDiv('mp-theme-checkmark');
            setIcon(check, 'check');
        }

        card.addEventListener('click', () => {
            this.currentTemplateId = template.id;
            this.previewCallback(template.id);
            this.updateApplyButton();
            this.updateTryHint();
            this.renderGallery();
        });
    }

    private updateApplyButton(): void {
        if (!this.applyButton) return;
        const template = this.templates.find(item => item.id === this.currentTemplateId);
        this.applyButton.setText(`应用「${template?.name || '主题'}」`);
    }

    private updateTryHint(): void {
        if (!this.tryHintEl) return;
        const template = this.templates.find(item => item.id === this.currentTemplateId);
        const description = template ? this.getTemplateDescription(template) : '适合当前文章的视觉排版';
        this.tryHintEl.setText(`推荐作用：${description}`);
    }

    private getTemplateDescription(template: Template): string {
        const curatedRecommendation = getCuratedThemeEntry(template.id)?.recommendation;
        if (curatedRecommendation) return curatedRecommendation;
        const description = template.description?.trim();
        return description ? description.split('（')[0].trim() : '适合当前文章的视觉排版';
    }

}
