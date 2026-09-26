/**
 * Theme gallery: a lightweight scene-first picker. Theme style and article
 * recipe remain separate choices, so users can try a visual direction without
 * changing the article structure.
 */
import { Modal, setIcon } from 'obsidian';
import type { SettingsManager } from './settings';
import type { Template } from '../templateManager';
import { curatedThemeEntries, getCuratedThemeEntry, type CuratedThemeScene } from '../core/theme/themeCatalog';

type ThemeScene = '全部' | CuratedThemeScene | '自定义主题' | '历史主题';

const CURATED_SCENE_ORDER = [...new Set(curatedThemeEntries.map(entry => entry.scene))];
const SCENE_ORDER: ThemeScene[] = [
    '全部', ...CURATED_SCENE_ORDER, '自定义主题'
];

export function getThemeScene(template: Template): ThemeScene {
    if (!template.isPreset) return '自定义主题';
    const entry = getCuratedThemeEntry(template.id);
    return entry?.status === 'legacy' ? '历史主题' : entry?.scene || '通用长文';
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
    private historyButton: HTMLButtonElement | null = null;
    private sceneBar: HTMLElement | null = null;

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
        heading.createEl('h2', { text: '公众号主题画廊' });
        heading.createEl('p', { text: '每个场景两套不同的阅读版式；点击主题先试用，再确认应用。' });
        const headerActions = header.createDiv('mp-gallery-header-actions');
        const search = headerActions.createEl('input', {
            cls: 'mp-gallery-search',
            attr: { type: 'search', placeholder: '搜索主题或文章场景' },
        });
        search.addEventListener('input', () => {
            this.searchQuery = search.value.trim().toLowerCase();
            this.renderGallery();
        });
        this.historyButton = headerActions.createEl('button', {
            cls: `mp-gallery-history-btn ${this.selectedScene === '历史主题' ? 'is-active' : ''}`,
            attr: { type: 'button', 'aria-label': '查看历史主题', 'aria-pressed': String(this.selectedScene === '历史主题') },
        });
        setIcon(this.historyButton, 'archive');
        this.historyButton.createSpan({ text: '历史主题' });
        this.historyButton.addEventListener('click', () => this.activateScene('历史主题'));

        const sceneBar = contentEl.createDiv('mp-gallery-scenes');
        this.sceneBar = sceneBar;
        sceneBar.setAttribute('aria-label', '公众号主题场景');
        SCENE_ORDER.forEach(scene => {
            const count = this.getTemplatesForScene(scene).length;
            if (count === 0 && scene !== '全部') return;
            const button = sceneBar.createEl('button', {
                text: `${scene === '全部' ? '全部主题' : scene} · ${count}`,
                cls: `mp-gallery-scene ${scene === this.selectedScene ? 'is-active' : ''}`,
                attr: { type: 'button', 'aria-pressed': String(scene === this.selectedScene) },
            });
            button.dataset.scene = scene;
            button.addEventListener('click', () => this.activateScene(scene));
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

    private activateScene(scene: ThemeScene): void {
        this.selectedScene = scene;
        this.sceneBar?.querySelectorAll('.mp-gallery-scene').forEach(element => {
            const button = element as HTMLButtonElement;
            const active = button.dataset.scene === scene;
            button.toggleClass('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        this.historyButton?.toggleClass('is-active', scene === '历史主题');
        this.historyButton?.setAttribute('aria-pressed', String(scene === '历史主题'));
        this.renderGallery();
    }

    private getTemplatesForScene(scene: ThemeScene): Template[] {
        return this.templates.filter(template => {
            const themeScene = getThemeScene(template);
            return scene === '全部' ? themeScene !== '历史主题' : themeScene === scene;
        });
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
        const scenes = grouped ? SCENE_ORDER.filter(scene => scene !== '全部' && scene !== '历史主题') : [this.selectedScene];
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
        const curatedRecommendation = getCuratedThemeEntry(template.id)?.recommendation || template.themeMeta?.recommendation;
        if (curatedRecommendation) return curatedRecommendation;
        const description = template.description?.trim();
        return description ? description.split('（')[0].trim() : '适合当前文章的视觉排版';
    }

}
