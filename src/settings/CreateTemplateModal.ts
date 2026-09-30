import { App, Modal, Setting, type TextComponent, type TextAreaComponent } from 'obsidian';
import type MPPlugin from '../main';
import type { Template } from '../templateManager';
import defaultTemplate from '../templates/default.json';
import { TemplatePreviewModal } from './templatePreviewModal';
import { cloneSettings } from '../core/settings/settingsRepository';
import { styleFields } from '../core/settings/styleFields';
import { hasUnsafeCss } from '../core/security/safeDom';
import { submitDraft } from '../ui/submitDraft';
import { nanoid } from '../utils/nanoid';

const groups: Record<string, string> = { container:'全局样式', title:'标题样式', paragraph:'段落样式', list:'列表样式', code:'代码样式', quote:'引用样式', image:'图片样式', link:'链接样式', emphasis:'强调样式', table:'表格样式', hr:'分隔线样式', footnote:'脚注样式', containers:'信息组件', accentColor:'强调色' };
const properties: Record<string,string> = { color:'文字颜色', 'background-color':'底色', 'font-size':'字号', 'font-weight':'字重', 'line-height':'行高', margin:'外边距', padding:'内边距', border:'边框', 'border-radius':'圆角', 'text-align':'对齐' };

export class CreateTemplateModal extends Modal {
    private template: Template;
    constructor(app: App, private plugin: MPPlugin, private onSubmit: (template: Template) => void | Promise<void>, private existingTemplate?: Template) {
        super(app);
        this.template = existingTemplate ? cloneSettings(existingTemplate) : { ...cloneSettings(defaultTemplate) as Template, id: `template-${nanoid()}`, name:'', description:'', isPreset:false, isVisible:true };
    }
    onOpen(): void { this.render(); }
    private render(): void {
        const root = this.contentEl;
        root.empty(); root.addClass('mp-template-modal');
        this.titleEl.setText(this.existingTemplate ? '编辑模板' : '新建模板');
        const header = root.createDiv('modal-header');
        new Setting(header).setName('模板名称').addText(text => { text.setValue(this.template.name).onChange(value => { this.template.name = value; }); });
        new Setting(header).setName('模板描述').addText(text => { text.setValue(this.template.description).onChange(value => { this.template.description = value; }); });
        if (!this.existingTemplate) new Setting(header).setName('选择参考模板').setDesc('复制为独立草稿，不会修改原主题。').addDropdown(dropdown => {
            dropdown.addOption('', '不更换参考');
            this.plugin.settingsManager.getAllTemplates().forEach(theme => { dropdown.addOption(theme.id, theme.name); });
            dropdown.onChange(id => {
                const theme = this.plugin.settingsManager.getTemplate(id);
                if (!theme) return;
                this.template = { ...cloneSettings(theme), id:this.template.id, name:this.template.name, description:this.template.description, isPreset:false, isVisible:true };
                this.render();
            });
        });
        const scroll = root.createDiv('modal-scroll-container');
        const fields = styleFields(this.template.styles);
        for (const key of new Set(fields.map(field => field.path.split('.')[0]))) {
            const details = scroll.createEl('details', { cls:'mp-style-fields' });
            details.createEl('summary', { text:groups[key] || key });
            const content = details.createDiv('mp-style-fields-body');
            let initialized = false;
            details.addEventListener('toggle', () => {
            if (!details.open || initialized) return;
            initialized = true;
            const defaults = new Map(styleFields(cloneSettings(defaultTemplate.styles)).map(field => [field.path,field.value]));
            new Setting(content).setDesc('修改仅保存在草稿；取消不会影响当前主题。').addButton(button => button.setButtonText('恢复本组默认').onClick(() => { fields.filter(field => field.path.split('.')[0] === key).forEach(field => { const value=defaults.get(field.path); if (value !== undefined) field.set(value); }); this.render(); }));
            for (const field of fields.filter(field => field.path.split('.')[0] === key)) {
                const isCss = field.value.includes(':') || field.value === '';
                if (isCss) {
                    const editor = content.createEl('details', { cls:'mp-style-declaration' });
                    editor.createEl('summary', { text:field.path });
                    const controls = editor.createDiv();
                    let editorInitialized = false;
                    editor.addEventListener('toggle', () => {
                    if (!editor.open || editorInitialized) return;
                    editorInitialized = true;
                    const inputs = new Map<string, TextComponent>();
                    let rawInput: TextAreaComponent | undefined;
                    const synchronize = () => {
                        const css = root.ownerDocument.createElement('span').style;
                        const value = styleFields(this.template.styles).find(item => item.path === field.path)?.value || '';
                        css.cssText = value;
                        inputs.forEach((input, property) => input.setValue(css.getPropertyValue(property)));
                        rawInput?.setValue(value);
                    };
                    for (const [property,label] of Object.entries(properties)) {
                        const css = root.ownerDocument.createElement('span').style;
                        css.cssText = styleFields(this.template.styles).find(item => item.path === field.path)?.value || '';
                        new Setting(controls).setName(label).addText(text => { inputs.set(property, text); text.setValue(css.getPropertyValue(property)).onChange(value => {
                            const current = styleFields(this.template.styles).find(item => item.path === field.path)?.value || '';
                            css.cssText=current; if(value.trim()) css.setProperty(property,value.trim()); else css.removeProperty(property);
                            field.set(css.cssText);
                            synchronize();
                        }); });
                    }
                    new Setting(controls).setName('完整内联 CSS').setDesc('所有历史属性均可在此编辑，包括未列出的高级样式。').addTextArea(text => { rawInput=text; text.setValue(styleFields(this.template.styles).find(item => item.path === field.path)?.value || '').onChange(value => { field.set(value); synchronize(); }); text.inputEl.rows=4; text.inputEl.setAttribute('aria-label', field.path); });
                    });
                } else new Setting(content).setName(field.path).addText(text => { text.setValue(field.value).onChange(value => field.set(value)); });
            }
            });
        }
        const footer=root.createDiv('modal-button-container');
        new Setting(footer).addButton(button => button.setButtonText('预览').onClick(() => new TemplatePreviewModal(this.app,cloneSettings(this.template),this.plugin.templateManager).open()))
            .addButton(button => button.setButtonText('取消').onClick(() => this.close()))
            .addButton(button => button.setButtonText('保存').setCta().onClick(() => { void submitDraft(button,async () => {
                if (!this.template.name.trim()) throw new Error('模板名称不能为空');
                if (styleFields(this.template.styles).some(field => hasUnsafeCss(field.value))) throw new Error('样式包含不安全的资源地址或 CSS');
                await this.onSubmit(cloneSettings(this.template));
            }, () => this.close()); }));
    }
    onClose(): void { this.contentEl.empty(); }
}
