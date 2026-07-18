import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modal = readFileSync(new URL('../src/settings/ThemeGalleryModal.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/settings/theme-gallery.css', import.meta.url), 'utf8');

test('theme gallery is scene-first and preserves a safe try-before-apply flow', () => {
  assert.match(modal, /type ThemeScene/);
  assert.match(modal, /点击卡片先试用，确认后再应用/);
  assert.match(modal, /getThemeScene/);
  assert.doesNotMatch(modal, /selectedLayoutFamily/);
  assert.match(modal, /!this\.hasApplied && this\.currentTemplateId !== this\.originalTemplateId/);
  assert.match(modal, /this\.previewCallback\(this\.originalTemplateId\)/);
  assert.match(modal, /应用「\$\{template\?\.name/);
  assert.match(styles, /\.mp-gallery-scenes/);
  assert.match(styles, /\.mp-gallery-card-grid/);
  assert.doesNotMatch(styles, /\.mp-gallery-layouts/);
});
