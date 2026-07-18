import { App, Modal, Notice, Setting } from 'obsidian';
import type { ThemeManifest } from '../core/theme/themeManifest';
import { formatThemeManifestIssues, validateThemeManifest } from '../core/theme/themeManifestValidator';

export class ThemeManifestImportModal extends Modal {
    private readonly onImport: (manifest: ThemeManifest) => Promise<void>;
    private input = '';

    constructor(app: App, onImport: (manifest: ThemeManifest) => Promise<void>) {
        super(app);
        this.onImport = onImport;
    }

    onOpen(): void {
        this.contentEl.createEl('h2', { text: '导入 ThemeManifest' });
        this.contentEl.createEl('p', { text: '粘贴由 yh-mp-preview V3 导出的主题 JSON。导入前会校验版本、令牌和组件结构。' });
        new Setting(this.contentEl)
            .setName('主题 JSON')
            .addTextArea(text => text
                .setPlaceholder('{ "schemaVersion": 3, ... }')
                .onChange(value => { this.input = value; }));
        new Setting(this.contentEl)
            .addButton(button => button
                .setButtonText('导入为自定义主题')
                .setCta()
                .onClick(async () => {
                    let value: unknown;
                    try {
                        value = JSON.parse(this.input);
                    } catch (_) {
                        new Notice('主题 JSON 无法解析。');
                        return;
                    }
                    const result = validateThemeManifest(value);
                    if (!result.valid || !result.manifest) {
                        new Notice(`主题清单校验失败：\n${formatThemeManifestIssues(result.issues)}`);
                        return;
                    }
                    await this.onImport(result.manifest);
                    this.close();
                }));
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
