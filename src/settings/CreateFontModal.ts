import { Modal, Setting, type App } from 'obsidian';
import { cloneSettings } from '../core/settings/settingsRepository';
import { submitDraft } from '../ui/submitDraft';

type FontChoice = { value: string; label: string; isPreset?: boolean };
export class CreateFontModal extends Modal {
    private readonly font: FontChoice;
    constructor(app: App, private readonly onSubmit: (font: FontChoice) => void | Promise<void>, private readonly existing?: FontChoice) {
        super(app);
        this.font = cloneSettings(existing ?? { label: '', value: '' });
    }
    onOpen(): void {
        const root = this.contentEl;
        root.empty(); root.addClass('mp-font-modal');
        this.titleEl.setText(this.existing ? '编辑字体' : '添加字体');
        const fields: Array<[keyof Pick<FontChoice, 'label' | 'value'>, string, string]> = [
            ['label', '字体名称', '显示在选择器中的名称'],
            ['value', '字体值', '字体族按优先顺序排列；这里只配置名称，不下载字体'],
        ];
        for (const [key, label, description] of fields) {
            new Setting(root).setName(label).setDesc(description).addText(input => {
                input.setValue(this.font[key]).onChange(value => { this.font[key] = value; });
            });
        }
        const help = root.createEl('details', { cls: 'mp-font-guidance' });
        help.createEl('summary', { text: '如何填写字体族' });
        help.createEl('p', { text: '用逗号分隔候选字体，最后提供 serif 或 sans-serif 回退。有空格的字体名称使用引号，例如："Microsoft YaHei", "微软雅黑", sans-serif。字体需要已安装在本机。' });
        new Setting(root).addButton(cancel => { cancel.setButtonText('取消').onClick(() => this.close()); })
            .addButton(save => {
                save.setButtonText('确定').setCta().onClick(() => {
                    void submitDraft(save, async () => {
                        if (!this.font.label.trim() || !this.font.value.trim()) throw new Error('字体名称和字体值不能为空');
                        if (/[;{}]/.test(this.font.value)) throw new Error('请输入字体族名称，不要输入 CSS 声明');
                        await this.onSubmit(cloneSettings(this.font));
                    }, () => this.close());
                });
            });
    }
    onClose(): void { this.contentEl.empty(); }
}
