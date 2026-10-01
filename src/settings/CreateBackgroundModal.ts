import { Modal, Setting, type App } from 'obsidian';
import { nanoid } from 'nanoid';
import type { Background } from '../backgroundManager';
import { BackgroundDraft, patternLabels, type BackgroundControls, type PatternId } from '../core/settings/backgroundDraft';
import { setSafeInlineStyle } from '../core/security/safeDom';
import { submitDraft } from '../ui/submitDraft';

export class CreateBackgroundModal extends Modal {
    private readonly draft: BackgroundDraft;
    private readonly background: Background;
    constructor(app: App, private readonly onSubmit: (value: Background) => void | Promise<void>, private readonly existing?: Background) {
        super(app);
        this.draft = new BackgroundDraft(existing ?? { id: nanoid(), name: '', style: 'background-color: #f5f5f5;' });
        this.background = this.draft.background;
    }
    onOpen(): void {
        const root = this.contentEl;
        root.empty(); root.addClass('mp-background-modal');
        this.titleEl.setText(this.existing ? '编辑背景' : '创建新背景');
        const state = this.draft.controls;
        const form = root.createDiv('mp-background-form');
        const basic = form.createDiv('background-basic-section');
        new Setting(basic).setName('背景名称').addText(control => {
            control.setValue(this.background.name).onChange(value => { this.background.name = value; });
        });
        const fields = form.createDiv('background-type-specific-section');
        const solid = fields.createDiv('background-color-section');
        const patterned = fields.createDiv('background-css-section');
        const tuners = patterned.createDiv('pattern-controls');
        const custom = patterned.createDiv('custom-css-container');
        const preview = form.createDiv('background-preview-section');
        new Setting(preview).setName('预览').setHeading();
        const sample = preview.createDiv('background-preview');
        sample.createSpan({ text: '正文与背景的阅读效果' });
        const refresh = () => {
            solid.toggleClass('is-hidden', state.mode !== 'color');
            patterned.toggleClass('is-hidden', state.mode !== 'css');
            tuners.toggleClass('is-hidden', state.pattern === 'custom');
            custom.toggleClass('is-hidden', state.pattern !== 'custom');
            setSafeInlineStyle(sample, this.draft.style());
        };
        const change = (patch: Partial<BackgroundControls>) => { this.draft.update(patch); refresh(); };
        new Setting(basic).setName('背景类型').addDropdown(control => {
            control.addOptions({ color: '纯色背景', css: 'CSS背景图案' }).setValue(state.mode)
                .onChange(mode => change({ mode: mode === 'color' ? 'color' : 'css' }));
        });
        new Setting(solid).setName('背景颜色').addColorPicker(control => {
            control.setValue(state.color).onChange(color => change({ color }));
        });
        const patternSetting = new Setting(patterned).setName('背景模板').addDropdown(control => {
            control.addOptions(patternLabels).setValue(state.pattern).onChange(pattern => change({ pattern: pattern as PatternId }));
        });
        patterned.prepend(patternSetting.settingEl);
        new Setting(tuners).setName('图案颜色').addColorPicker(control => {
            control.setValue(state.ink).onChange(ink => change({ ink }));
        });
        new Setting(tuners).setName('图案透明度').addSlider(control => {
            control.setLimits(0, 100, 1).setValue(state.opacity * 100).setDynamicTooltip().onChange(value => change({ opacity: value / 100 }));
        });
        new Setting(tuners).setName('图案大小').addSlider(control => {
            control.setLimits(5, 50, 1).setValue(state.scale).setDynamicTooltip().onChange(scale => change({ scale }));
        });
        new Setting(custom).setName('CSS代码').setDesc('现有样式原样保留；预览过滤不安全的资源加载，不修改原设置。').addTextArea(control => {
            control.inputEl.rows = 6;
            control.setValue(state.css).onChange(css => change({ css }));
        });
        new Setting(root.createDiv('background-button-section'))
            .addButton(control => { control.setButtonText('取消').onClick(() => this.close()); })
            .addButton(control => {
                control.setButtonText(this.existing ? '保存' : '创建').setCta().onClick(() => {
                    void submitDraft(control, async () => { await this.onSubmit(this.draft.commit()); }, () => this.close());
                });
            });
        refresh();
    }
    onClose(): void { this.contentEl.empty(); }
}
