import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('UI polish is loaded after existing styles and stays out of article rendering', () => {
  const imports = read('src/styles/index.css');
  const polish = read('src/styles/ui-polish.css');
  assert.match(imports, /@import url\('\.\/ui-polish\.css'\);/);
  assert.ok(imports.lastIndexOf('ui-polish.css') > imports.lastIndexOf('theme-gallery.css'));
  assert.doesNotMatch(polish, /\.mp-content-section|\.yh-mp-note-layout|\.mp-export-snapshot/);
  assert.match(polish, /\.mp-view-content \{[^}]*container-type: inline-size/);
  assert.match(polish, /@container \(max-width: 380px\)/);
  assert.match(polish, /\.mp-settings \{[\s\S]*?container-type: inline-size/);
  assert.match(polish, /\.mp-theme-gallery-modal \{[\s\S]*?height: auto !important/);
  assert.match(polish, /@media \(max-width: 640px\)/);
  assert.match(polish, /@media \(prefers-reduced-motion: reduce\)/);
});

test('editor-only tokens no longer leak into the Obsidian root', () => {
  const editorCss = read('src/styles/settings/template-modal.css');
  const importModal = read('src/settings/ThemeManifestImportModal.ts');
  assert.doesNotMatch(editorCss, /:root\s*\{/);
  assert.match(editorCss, /\.mp-template-modal\s*\{[\s\S]*?--modal-padding/);
  assert.match(importModal, /modalEl\.addClass\('mp-theme-import-modal'\)/);
});
