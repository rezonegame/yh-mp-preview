import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settings = readFileSync(new URL('../src/settings/settings.ts', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/view.ts', import.meta.url), 'utf8');
const noteLayoutStore = readFileSync(new URL('../src/core/note-layout/noteLayoutStore.ts', import.meta.url), 'utf8');
const noteLayoutEnhancement = readFileSync(new URL('../src/core/note-layout/noteLayoutEnhancement.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const settingsTab = readFileSync(new URL('../src/settings/MPSettingTab.ts', import.meta.url), 'utf8');
const noteLayoutCss = readFileSync(new URL('../src/styles/view/note-layout.css', import.meta.url), 'utf8');
const noteThemeGallery = readFileSync(new URL('../src/settings/NoteThemeGalleryModal.ts', import.meta.url), 'utf8');

test('layout snapshots preserve the user-selected local typesetting settings', () => {
  assert.match(settings, /layoutSnapshots: LayoutSnapshot\[\]/);
  assert.match(settings, /saveLayoutSnapshot/);
  assert.match(settings, /restoreLayoutSnapshot/);
  assert.match(view, /contentHash: this\.hashText\(content\)/);
});

test('note layout phase 3.9.0 has an isolated, disabled-by-default storage boundary', () => {
  assert.match(noteLayoutStore, /NOTE_LAYOUT_SCHEMA_VERSION = 1/);
  assert.match(noteLayoutStore, /enabled: false/);
  assert.match(noteLayoutStore, /note-layout\.json/);
  assert.match(noteLayoutStore, /createBackupFromRaw/);
  assert.match(noteLayoutStore, /writeAtomically/);
  assert.match(noteLayoutStore, /临时文件读回校验失败/);
  assert.match(noteLayoutStore, /pruneBackups/);
  assert.match(noteLayoutEnhancement, /class NoteLayoutEnhancement/);
  assert.match(main, /NoteLayoutStore/);
  assert.match(main, /toggle-note-layout-enhancement/);
  assert.match(main, /restore-note-layout-backup/);
  assert.match(settingsTab, /备份当前笔记排版设置/);
});

test('note layout phase 3.10.0 applies only through reading and editor boundaries', () => {
  assert.match(noteLayoutEnhancement, /registerMarkdownPostProcessor/);
  assert.match(noteLayoutEnhancement, /registerEditorExtension/);
  assert.match(noteLayoutEnhancement, /editorInfoField/);
  assert.match(noteLayoutEnhancement, /refreshMarkdownPreviews/);
  assert.match(settingsTab, /笔记阅读主题/);
  assert.match(settingsTab, /深度阅读/);
  assert.match(settingsTab, /笔记最大宽度/);
  assert.match(noteLayoutCss, /\.yh-mp-note-layout/);
  assert.match(noteLayoutCss, /\.cm-editor\.yh-mp-note-layout/);
  assert.match(noteLayoutCss, /\.cm-editor\.yh-mp-note-layout\s*\{[\s\S]*max-width:\s*none/);
  assert.match(noteLayoutCss, /\.cm-editor\.yh-mp-note-layout \.cm-content\s*\{[\s\S]*max-width:\s*none/);
  assert.doesNotMatch(noteLayoutCss, /\.mp-preview-area/);
  assert.doesNotMatch(noteLayoutCss, /body\s*\{/);
});

test('note layout phase 3.11.0 keeps complex Markdown and source mode scoped', () => {
  assert.match(noteLayoutStore, /isSourceModeEnabledForPath/);
  assert.match(noteLayoutEnhancement, /NOTE_SOURCE_MODE_CLASS/);
  assert.match(noteLayoutEnhancement, /isSourceModeEnabledForPath/);
  assert.match(settingsTab, /源码模式显示增强/);
  assert.doesNotMatch(settingsTab, /当前版本暂不可用/);
  for (const selector of ['task-list-item', 'callout', 'markdown-embed']) {
    assert.match(noteLayoutCss, new RegExp(`\\.${selector}`));
  }
  for (const selector of ['pre', 'table', 'img', 'blockquote']) {
    assert.match(noteLayoutCss, new RegExp(`\\.yh-mp-note-layout[^\\n]*${selector}`));
  }
  assert.match(noteLayoutCss, /cm-editor\.yh-mp-note-source-mode/);
  assert.doesNotMatch(noteLayoutCss, /body\s*\{/);
});

test('note layout phase 3.12.0 separates note and WeChat theme galleries', () => {
  assert.match(noteThemeGallery, /笔记阅读主题/);
  assert.match(noteThemeGallery, /应用到当前笔记/);
  assert.match(noteThemeGallery, /设为全库默认/);
  assert.match(noteThemeGallery, /当前笔记用原生/);
  assert.match(noteThemeGallery, /setPreviewProfile/);
  assert.match(noteThemeGallery, /setFileOverride/);
  assert.match(noteLayoutStore, /setDefaultProfile/);
  assert.match(noteLayoutStore, /setFileOverride/);
  assert.match(noteLayoutEnhancement, /previewProfiles/);
  assert.match(noteLayoutEnhancement, /clearPreviewProfile/);
  assert.match(settingsTab, /打开笔记主题画廊/);
  assert.match(noteThemeGallery, /试用不会保存|关闭窗口会取消未应用的试用/);
});

test('local export renders full article content and fixed-ratio image segments', () => {
  assert.match(view, /exportHtmlFragment/);
  assert.match(view, /text\/html;charset=utf-8/);
  assert.match(view, /exportSegmentedImages/);
  assert.match(view, /createExportSnapshot/);
  assert.match(view, /querySelector\('\.mp-content-section'\)/);
  assert.match(view, /snapshot\.scrollHeight/);
  assert.match(view, /snapshot\.width \* 4 \/ 3/);
  assert.match(view, /snapshot\.element,[\s\S]*sourceY/);
  assert.match(view, /EXPORT_IMAGE_TIMEOUT_MS/);
  assert.match(view, /waitForExportImage/);
  assert.match(view, /cleanup\(\);[\s\S]*throw error/);
  assert.match(view, /生成中 \$\{index \+ 1\}\/\$\{total\}/);
  assert.match(view, /已完成 \$\{completed\} 张/);
  assert.match(view, /请改用“导出分段图”/);
  assert.doesNotMatch(view, /html2canvas\(this\.previewEl/);
});
