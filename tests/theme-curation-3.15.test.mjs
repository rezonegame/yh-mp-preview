import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildSync, transformSync } from 'esbuild';

const root = new URL('../', import.meta.url);
const catalogSource = readFileSync(new URL('src/core/theme/themeCatalog.ts', root), 'utf8');
const catalogJs = transformSync(catalogSource, { loader: 'ts', format: 'esm' }).code;
const { curatedThemeEntries } = await import(`data:text/javascript;base64,${Buffer.from(catalogJs).toString('base64')}`);
const paletteJs = buildSync({
  entryPoints: [fileURLToPath(new URL('src/core/theme/wechatPalette.ts', root))],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2020',
}).outputFiles[0].text;
const { resolveWechatPalette } = await import(`data:text/javascript;base64,${Buffer.from(paletteJs).toString('base64')}`);

const templates = new Map(curatedThemeEntries.map(entry => [entry.id,
  JSON.parse(readFileSync(new URL(`src/templates/${entry.id}.json`, root), 'utf8'))]));
const shape = style => style.toLowerCase().replace(/#[0-9a-f]{3,8}\b/g, '#color').replace(/\s+/g, '');
const signature = template => [
  template.styles.title.h1.base,
  template.styles.title.h2.base,
  template.styles.title.h3.base,
  template.styles.quote,
  template.styles.list.container,
  template.styles.table.header,
  template.styles.image,
].map(shape).join('|');

test('seven scenes each have two structurally distinct themes and five legacy IDs remain', () => {
  const featured = curatedThemeEntries.filter(entry => entry.status === 'featured');
  const legacy = curatedThemeEntries.filter(entry => entry.status === 'legacy');
  assert.equal(featured.length, 14);
  assert.deepEqual(legacy.map(entry => entry.id).sort(), [
    'academic-pro', 'academic-pro-forest', 'eastern-notes', 'minimal', 'modern-report',
  ]);
  assert.equal(new Set(featured.map(entry => signature(templates.get(entry.id)))).size, 14);
  assert.equal(new Set(featured.map(entry => entry.scene)).size, 7);
  for (const scene of new Set(featured.map(entry => entry.scene))) {
    const pair = featured.filter(entry => entry.scene === scene);
    assert.equal(pair.length, 2, scene);
    assert.notEqual(signature(templates.get(pair[0].id)), signature(templates.get(pair[1].id)), scene);
  }
  assert.equal(templates.size, 19);
});

test('history is a small gallery entry and typography has its own toolbar row', () => {
  const gallery = readFileSync(new URL('src/settings/ThemeGalleryModal.ts', root), 'utf8');
  const view = readFileSync(new URL('src/view.ts', root), 'utf8');
  assert.match(gallery, /mp-gallery-history-btn/);
  assert.match(gallery, /this\.activateScene\('历史主题'\)/);
  assert.doesNotMatch(gallery, /\.\.\.CURATED_SCENE_ORDER, '自定义主题', '历史主题'/);
  assert.match(view, /mp-controls-group mp-typography-row/);
  assert.match(view, /text: '文章配方'/);
});

function luminance(hex) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test('theme-derived accent text meets normal-text contrast on white and tinted cards', () => {
  for (const entry of curatedThemeEntries) {
    const palette = resolveWechatPalette(templates.get(entry.id));
    assert.ok((1.05 / (luminance(palette.accentText) + 0.05)) >= 4.5, entry.id);
    assert.ok(((luminance(palette.surface) + 0.05) / (luminance(palette.accentText) + 0.05)) >= 4.5, entry.id);
  }
});

test('mobile viewport is presentation-only and export uses adaptive pane width', () => {
  const view = readFileSync(new URL('src/view.ts', root), 'utf8');
  const css = readFileSync(new URL('src/styles/view/preview.css', root), 'utf8');
  const validator = readFileSync(new URL('src/core/validation/wechatHtmlValidator.ts', root), 'utf8');
  assert.match(css, /\.mp-preview-area\.mp-phone-preview > \.mp-content-section/);
  assert.match(css, /max-width: 375px/);
  assert.match(view, /this\.previewEl\.clientWidth[\s\S]*previewStyle\.paddingLeft/);
  assert.match(validator, /mobile-wide-table/);
  const settings = readFileSync(new URL('src/settings/settings.ts', root), 'utf8');
  assert.match(settings, /savedData\.fontFamily === '-apple-system'/);
  assert.match(settings, /savedData\.themeCatalogVersion = CURATED_THEME_CATALOG_VERSION/);
  assert.doesNotMatch(settings, /savedData\.templates = savedData\.templates\.map\(\(template: Template\) => \(\{[\s\S]*isVisible: true/);
});
