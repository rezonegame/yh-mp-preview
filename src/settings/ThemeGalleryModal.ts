/**
 * Theme gallery: a lightweight scene-first picker. Theme style and article
 * recipe remain separate choices, so users can try a visual direction without
 * changing the article structure.
 */
import { Modal, setIcon, Notice, type App } from 'obsidian';
import type { SettingsManager } from './settings';
import type { Template } from '../templateManager';
import { curatedThemeEntries, getCuratedThemeEntry, type CuratedThemeScene } from '../core/theme/themeCatalog';
import { ThemeTrialSession } from '../core/render/themeTrialSession';
import { ThemeGalleryPreview } from '../ui/themeGalleryPreview';
import { latestThemeReference, isAppearanceV1, isSupportedThemeRevision, LEGACY_THEME_REVISION, READING_THEME_REVISION, originalPreferences, type AppearancePreferences } from '../core/theme/themeRevisionRegistry';
import { recipeOptions } from '../ui/recipeLabels';
import { readingPalettes, densityChoices, normalizeReadingPreferences } from '../core/theme/readingPreferences';

export interface ThemeGalleryOptions {
    renderPreview: (id: string, saved: boolean, example: boolean, revision?: string, preferences?: AppearancePreferences) => Promise<HTMLElement | null>;
    fontFamily: string; fontSize: number;
    cancel: () => void;
    settled: (applied: boolean) => void;
    disposed: () => void;
    isValid: () => boolean;
}

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
    private readonly onSelect: (templateId: string, revision?: string, preferences?: AppearancePreferences) => void | Promise<void>;
    private readonly previewCallback: (templateId: string, revision?: string, preferences?: AppearancePreferences) => void;
    private currentPreferences: AppearancePreferences;
    private readonly originalPreferences: AppearancePreferences;
    private readonly savedPreferences: Record<string, AppearancePreferences>;
    private tuning: HTMLElement | null = null;
    private readonly tuningWritable: boolean;
    private currentRevision: string;
    private readonly originalRevision: string;
    private readonly enhancementLabel: string;
    private revisionButton: HTMLButtonElement | null = null;
    private revisionHint: HTMLElement | null = null;
    private selectedScene: ThemeScene = '全部';
    private searchQuery = '';
    private hasApplied = false;
    private gridContainer: HTMLElement | null = null;
    private applyButton: HTMLButtonElement | null = null;
    private tryHintEl: HTMLElement | null = null;
    private historyButton: HTMLButtonElement | null = null;
    private sceneBar: HTMLElement | null = null;
    private readonly transaction: ThemeTrialSession;
    private preview: ThemeGalleryPreview | null = null;
    private previewGeneration = 0;
    private example = false;
    private compareSaved = false;
    private observer: ResizeObserver | null = null;
    private selector: HTMLElement | null = null;
    private isClosed = false;
    private compactLayout: boolean | undefined;
    private returnFocus: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private cancelButton: HTMLButtonElement | null = null;

    constructor(
        app: App,
        settingsManager: SettingsManager,
        currentTemplateId: string,
        onSelect: (templateId: string, revision?: string, preferences?: AppearancePreferences) => void | Promise<void>,
        previewCallback: (templateId: string, revision?: string, preferences?: AppearancePreferences) => void,
        private readonly options?: ThemeGalleryOptions,
    ) {
        super(app);
        this.transaction = new ThemeTrialSession(() => this.updateSavingState(), 10_000, this.contentEl.ownerDocument.defaultView ?? window);
        this.templates = settingsManager.getVisibleTemplates();
        const hiddenCurrent = settingsManager.getTemplate?.(currentTemplateId);
        if (hiddenCurrent && !this.templates.some(template => template.id === currentTemplateId)) this.templates.push(hiddenCurrent);
        this.originalTemplateId = currentTemplateId;
        this.currentTemplateId = currentTemplateId;
        const settings = settingsManager.getSettings?.();
        const saved = settings && isAppearanceV1(settings.wechatAppearance) ? settings.wechatAppearance.referencesById[currentTemplateId] : undefined;
        this.originalRevision = saved?.id === currentTemplateId && isSupportedThemeRevision(currentTemplateId,saved.revision) ? saved.revision : LEGACY_THEME_REVISION;
        this.currentRevision = this.originalRevision;
        this.savedPreferences = settings && isAppearanceV1(settings.wechatAppearance) ? structuredClone(settings.wechatAppearance.preferencesByReference) : {};
        this.tuningWritable = !!settings && isAppearanceV1(settings.wechatAppearance);
        this.originalPreferences = this.savedPreference(currentTemplateId,this.originalRevision);
        this.currentPreferences = {...this.originalPreferences};
        this.enhancementLabel = recipeOptions.find(item => item.value === settings?.v3.selectedRecipeId)?.label ?? '不额外增强';
        this.onSelect = onSelect;
        this.previewCallback = previewCallback;
        const currentTemplate = this.templates.find(template => template.id === currentTemplateId);
        if (currentTemplate) this.selectedScene = getThemeScene(currentTemplate);
    }

    onOpen(): void {
        const { contentEl, modalEl } = this;
        modalEl.addClass('mp-theme-gallery-modal');
        this.returnFocus = contentEl.ownerDocument.activeElement as HTMLElement | null;
        contentEl.empty();

        const header = contentEl.createDiv('mp-gallery-header');
        const heading = header.createDiv('mp-gallery-heading');
        heading.createEl('h2', { text: '公众号主题画廊' });
        heading.createEl('p', { text: '每个场景两套不同的阅读版式；点击主题先试用，再确认应用。' });
        const headerActions = header.createDiv('mp-gallery-header-actions');
        const search = headerActions.createEl('input', {
            cls: 'mp-gallery-search',
            attr: { type: 'search', placeholder: '搜索主题或文章场景', 'aria-label':'搜索主题或文章场景' },
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

        const body = contentEl.createDiv('mp-gallery-body');
        const selector = body.createEl('details', { cls: 'mp-gallery-selector' });
        selector.open = false; this.selector = selector;
        const selectionSummary = selector.createEl('summary', { cls: 'mp-gallery-selection-summary', text: '选择主题' });
        selectionSummary.setAttribute('aria-label', '展开主题选择');
        const sceneBar = selector.createDiv('mp-gallery-scenes');
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

        this.gridContainer = selector.createDiv('mp-gallery-grid');
        this.renderGallery();

        if (this.options) {
            const previewColumn = body.createDiv('mp-gallery-preview-column');
            const toggles = previewColumn.createDiv('mp-gallery-preview-toggles');
            const addToggle = (labels: [string, string], label: string, change: (second: boolean) => void) => {
                const group = toggles.createDiv('mp-gallery-toggle-group'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', label);
                labels.forEach((text, index) => {
                    const button = group.createEl('button', { text, attr: { type: 'button', 'aria-pressed': String(index === 0) } });
                    button.addEventListener('click', () => {
                        group.querySelectorAll('button').forEach((item, position) => item.setAttribute('aria-pressed', String(position === index)));
                        change(index === 1); void this.refreshPreview().catch(error => new Notice(`预览失败：${error instanceof Error ? error.message : '未知错误'}`));
                    });
                });
            };
            addToggle(['当前文章', '统一示例'], '画廊预览来源', value => { this.example = value; });
            addToggle(['正在试用', '已保存'], '画廊外观对照', value => { this.compareSaved = value; });
            const previewHost = previewColumn.createDiv('mp-gallery-preview-host');
            const tuning = previewColumn.createEl('details', {cls:'mp-gallery-tuning'});
            tuning.createEl('summary',{text:'配色与阅读密度',attr:{'aria-label':'展开配色与阅读密度'}});
            this.tuning = tuning.createDiv('mp-gallery-tuning-body');
            this.preview = new ThemeGalleryPreview(previewHost, this.options.fontFamily, this.options.fontSize, contentEl.ownerDocument.body.classList.contains('theme-dark'));
            void this.refreshPreview().catch(error => new Notice(`预览失败：${error instanceof Error ? error.message : '未知错误'}`));
        } else selector.open = true;

        const footer = contentEl.createDiv('mp-gallery-footer');
        const trialInfo = footer.createDiv('mp-gallery-trial-info');
        this.tryHintEl = trialInfo.createDiv('mp-gallery-try-hint');
        const revisionRow = trialInfo.createDiv('mp-gallery-revision-row');
        this.revisionHint = revisionRow.createDiv('mp-gallery-trial-note');
        this.revisionButton = revisionRow.createEl('button', { cls: 'mp-gallery-revision-btn', attr: { type: 'button' } });
        this.revisionButton.addEventListener('click', () => {
            if (this.transaction.busy) return;
            this.currentRevision = this.currentRevision === READING_THEME_REVISION ? LEGACY_THEME_REVISION : READING_THEME_REVISION;
            this.currentPreferences = this.savedPreference(this.currentTemplateId,this.currentRevision);
            void this.transaction.preview(async isCurrent => {
                if (!isCurrent()) return;
                this.previewCallback(this.currentTemplateId, this.currentRevision, this.currentPreferences);
                await this.refreshPreview();
            });
            this.updateTryHint();
        });
        this.statusEl = trialInfo.createDiv({ cls: 'mp-gallery-trial-note', text: '试用不会保存到笔记设置。' });
        this.statusEl.setAttribute('role', 'status');
        this.updateTryHint();
        const actions = footer.createDiv('mp-gallery-actions');
        const cancel = actions.createEl('button', { text: '取消试用', cls: 'mp-gallery-btn-cancel' });
        this.cancelButton = cancel;
        cancel.addEventListener('click', () => this.close());
        this.applyButton = actions.createEl('button', { cls: 'mp-gallery-btn-apply' });
        this.updateApplyButton();
        this.applyButton.addEventListener('click', () => {
            const button=this.applyButton;
            if(!button || button.disabled) return;
            void this.transaction.apply(async () => {
                if (this.options && !this.options.isValid()) throw new Error('文章或外观已变化，请重新打开画廊。');
                await this.onSelect(this.currentTemplateId, this.currentRevision, this.currentPreferences);
            }).then(() => {
                if (this.transaction.state !== 'applied') return;
                this.options?.settled(true);
                this.hasApplied=true;this.close();
            }).catch((error: unknown) => {
                if (this.isClosed) this.options?.settled(false);
                new Notice(`主题保存失败：${error instanceof Error ? error.message : '未知错误'}`);
            });
        });
        contentEl.addEventListener('keydown', this.onKeyDown, true);
        const win = contentEl.ownerDocument.defaultView;
        if (this.options && win?.ResizeObserver) {
            this.observer = new win.ResizeObserver(() => this.updateLayout()); this.observer.observe(modalEl);
        }
        this.updateLayout();
    }

    get isSaving(): boolean { return this.transaction.busy; }
    invalidate(): void { this.close(true); }
    close(force = false): void {
        if (this.isClosed || !this.transaction.close(force)) return;
        super.close();
    }

    onClose(): void {
        this.isClosed = true; ++this.previewGeneration;
        this.observer?.disconnect(); this.observer = null;
        this.preview?.destroy(); this.preview = null;
        this.contentEl.removeEventListener('keydown', this.onKeyDown, true);
        if (!this.transaction.busy && this.options && !this.hasApplied) this.options.cancel();
        else if (!this.options && !this.hasApplied && (this.currentTemplateId !== this.originalTemplateId || this.currentRevision !== this.originalRevision || JSON.stringify(this.currentPreferences) !== JSON.stringify(this.originalPreferences))) {
            this.previewCallback(this.originalTemplateId, this.originalRevision, this.originalPreferences);
        }
        this.options?.disposed();
        this.contentEl.empty();
        if (this.returnFocus?.isConnected) this.returnFocus.focus();
    }

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.close(); return; }
        const target = event.target as HTMLElement;
        if (!target?.classList.contains('mp-theme-card') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const cards = Array.from(this.gridContainer?.querySelectorAll<HTMLButtonElement>('.mp-theme-card') ?? []);
        const index = cards.indexOf(target as HTMLButtonElement);
        cards[(index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + cards.length) % cards.length]?.focus();
    };

    private updateLayout(): void {
        if (!this.options || this.isClosed) return;
        const compact = this.modalEl.clientWidth < 820 || this.modalEl.clientHeight < 560;
        this.modalEl.toggleClass('is-compact', compact);
        this.modalEl.toggleClass('is-tiny', this.modalEl.clientWidth < 360 || this.modalEl.clientHeight < 430);
        if (this.selector && compact !== this.compactLayout) (this.selector as HTMLDetailsElement).open = !compact;
        this.compactLayout = compact;
    }

    private updateSavingState(): void {
        if (this.isClosed) return;
        const busy = this.transaction.busy;
        this.modalEl.toggleClass('is-saving', busy);
        this.contentEl.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button,input').forEach(control => { control.disabled = busy; });
        if (this.cancelButton) { this.cancelButton.disabled = this.transaction.state === 'saving'; this.cancelButton.setText(this.transaction.state === 'saving-unknown' ? '关闭窗口' : '取消试用'); }
        if (this.applyButton) { this.applyButton.disabled = busy; if (busy) this.applyButton.setText('保存中…'); else this.updateApplyButton(); }
        this.statusEl?.setText(this.transaction.state === 'saving-unknown' ? '保存仍在处理中，可关闭窗口但结果尚未确定。' : busy ? '正在保存，请稍候…' : '试用不会保存到笔记设置。');
    }

    private async refreshPreview(): Promise<void> {
        if (!this.options || this.isClosed) return;
        const generation = ++this.previewGeneration;
        try {
            const article = await this.options.renderPreview(this.currentTemplateId, this.compareSaved, this.example, this.currentRevision, this.currentPreferences);
            if (!this.isClosed && generation === this.previewGeneration) this.preview?.show(article);
        } catch (error) {
            if (!this.isClosed && generation === this.previewGeneration) { this.statusEl?.setText('预览失败，请重试或取消。'); throw error; }
        }
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
            this.gridContainer.createDiv({ cls: 'mp-gallery-empty', text: '没有匹配的主题，换个场景或关键词试试。' });
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
        card.dataset.themeId=template.id;
        const info = card.createDiv('mp-theme-info');
        info.createEl('strong', { text: template.name, cls: 'mp-theme-name' });
        if (selected) {
            const check = info.createDiv('mp-theme-checkmark');
            setIcon(check, 'check');
        }

        card.addEventListener('click', () => {
            if (this.transaction.busy) return;
            this.currentTemplateId = template.id;
            this.currentRevision = latestThemeReference(template).revision;
            this.currentPreferences = this.savedPreference(template.id,this.currentRevision);
            void this.transaction.preview(async isCurrent => {
                if (!isCurrent()) return;
                this.previewCallback(template.id, this.currentRevision, this.currentPreferences);
                await this.refreshPreview();
            });
            this.updateApplyButton();
            this.updateTryHint();
            this.gridContainer?.querySelectorAll<HTMLButtonElement>('.mp-theme-card').forEach(button => {
                const active=button.dataset.themeId===template.id;
                button.toggleClass('is-selected',active);button.setAttribute('aria-pressed',String(active));
                button.querySelector('.mp-theme-checkmark')?.remove();
                if(active) {const check=button.querySelector('.mp-theme-info')?.createDiv('mp-theme-checkmark');if(check)setIcon(check,'check');}
            });
        });
    }

    private savedPreference(id: string, revision: string): AppearancePreferences {
        return revision === READING_THEME_REVISION ? normalizeReadingPreferences(id,this.savedPreferences?.[`${id}@${revision}`]) : originalPreferences();
    }

    private tune(preferences: AppearancePreferences): void {
        if (this.transaction.busy || !this.tuningWritable) return;
        this.currentPreferences = {...preferences};
        void this.transaction.preview(async isCurrent => {
            // Coalesce gestures in the same event turn; only the last draft paints.
            await Promise.resolve();
            if (!isCurrent()) return;
            this.previewCallback(this.currentTemplateId,this.currentRevision,this.currentPreferences);
            await this.refreshPreview();
        });
        this.updateTryHint();
    }

    private renderTuning(): void {
        const host=this.tuning;if (!host) return;
        const focused=host.ownerDocument.activeElement;
        const focusKey=focused instanceof HTMLElement ? focused.getAttribute('data-tuning-key') : null;
        host.empty();
        const choices=this.currentRevision===READING_THEME_REVISION && this.templates.find(item=>item.id===this.currentTemplateId)?.isPreset ? readingPalettes[this.currentTemplateId] : undefined;
        if (!choices || !this.tuningWritable) {
            host.createDiv({cls:'mp-gallery-tuning-note',text:!this.tuningWritable?'外观数据来自其他版本；微调暂不可保存。':'旧版和自定义主题保留原样；精选主题切换升级版后可微调。'});
            return;
        }
        const group=(label:string) => {
            const row=host.createDiv('mp-gallery-tuning-row');row.createSpan({text:label,cls:'mp-gallery-tuning-label'});
            return row.createDiv({cls:'mp-gallery-tuning-options',attr:{role:'group','aria-label':label}});
        };
        const palette=group('配色');
        for(const choice of choices){
            const button=palette.createEl('button',{cls:'mp-gallery-swatch',attr:{type:'button','data-palette-id':choice.id,'data-tuning-key':`palette-${choice.id}`,'aria-pressed':String(choice.id===this.currentPreferences.paletteId)}});
            button.createSpan({cls:'mp-gallery-swatch-dot',attr:{'aria-hidden':'true'}}).setCssStyles({backgroundColor:choice.color});
            button.createSpan({text:choice.name});button.addEventListener('click',()=>this.tune({...this.currentPreferences,paletteId:choice.id}));
        }
        const density=group('阅读密度');
        for(const choice of densityChoices){
            const button=density.createEl('button',{text:choice.name,attr:{type:'button','data-density':choice.id,'data-tuning-key':`density-${choice.id}`,'aria-pressed':String(choice.id===this.currentPreferences.density)}});
            button.addEventListener('click',()=>this.tune({...this.currentPreferences,density:choice.id}));
        }
        const reset=host.createEl('button',{cls:'mp-gallery-tuning-reset',text:'重置本版式微调',attr:{type:'button','data-tuning-key':'reset'}});
        reset.addEventListener('click',()=>this.tune(originalPreferences()));
        host.createDiv({cls:'mp-gallery-tuning-note',text:'仅确认应用后保存。微调不改字号、纸底或原文；对照“已保存”不改变试用。'});
        this.updateSavingState();
        if(focusKey)host.querySelector<HTMLElement>(`[data-tuning-key="${focusKey}"]`)?.focus();
    }

    private updateApplyButton(): void {
        if (!this.applyButton) return;
        const template = this.templates.find(item => item.id === this.currentTemplateId);
        this.selector?.querySelector('summary')?.setText(`选择主题 · ${template?.name || '当前主题'}`);
        this.applyButton.setText(`应用「${template?.name || '主题'}」`);
    }

    private updateTryHint(): void {
        if (!this.tryHintEl) return;
        const template = this.templates.find(item => item.id === this.currentTemplateId);
        const description = template ? this.getTemplateDescription(template) : '适合当前文章的视觉排版';
        this.tryHintEl.setText(`推荐作用：${description}`);
        this.renderTuning();
        const saved = this.currentTemplateId === this.originalTemplateId && this.currentRevision === this.originalRevision && JSON.stringify(this.currentPreferences) === JSON.stringify(this.originalPreferences);
        const modern = this.currentRevision === READING_THEME_REVISION;
        const custom = template && !template.isPreset;
        this.revisionHint?.setText(`${saved ? '已保存' : '试用'}${custom ? '自定义' : modern ? '升级版' : '旧版'} · ${this.enhancementLabel}`);
        this.revisionHint?.setAttribute('title','当前文章保留局部增强；统一示例不额外增强。');
        if (this.revisionButton) {
            this.revisionButton.hidden = !template || latestThemeReference(template).revision !== READING_THEME_REVISION;
            this.revisionButton.setText(modern ? '使用旧版排版' : '试用升级版');
        }
    }

    private getTemplateDescription(template: Template): string {
        const curatedRecommendation = getCuratedThemeEntry(template.id)?.recommendation || template.themeMeta?.recommendation;
        if (curatedRecommendation) return curatedRecommendation;
        const description = template.description?.trim();
        return description ? description.split('（')[0].trim() : '适合当前文章的视觉排版';
    }

}
