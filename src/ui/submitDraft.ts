import { Notice, type ButtonComponent } from 'obsidian';

export async function submitDraft(button: ButtonComponent, submit: () => Promise<void>, close: () => void): Promise<void> {
    if (button.buttonEl.disabled) return;
    button.setDisabled(true);
    const label = button.buttonEl.textContent || '保存';
    button.setButtonText('保存中…');
    try { await submit(); close(); }
    catch (error) { new Notice(`保存失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { button.setDisabled(false); button.setButtonText(label); }
}
