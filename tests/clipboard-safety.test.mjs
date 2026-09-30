import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

const dom = createDom();
const { CopyManager } = await loadModule('src/copyManager.ts');
const { replaceWithSafeHtml } = await loadModule('src/core/security/safeDom.ts');
let written;
globalThis.ClipboardItem = class { constructor(types) { this.types = types; } };
Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { write: async items => { written = items; } } });

test('rich-text copy keeps article formatting and removes transient attributes', async () => {
  const root = document.createElement('div');
  const section = root.createEl('section', { cls: 'mp-content-section' });
  const p = section.createEl('p', { text: '微信公众号正文。' });
  p.setCssStyles({ fontSize: '18px', lineHeight: '1.78', color: '#334155' });
  const report = await CopyManager.copyToClipboard(root);
  assert.equal(report.errors, 0);
  const html = await written[0].types['text/html'].text();
  const parsed = document.createElement('div'); replaceWithSafeHtml(parsed, html);
  assert.equal(parsed.querySelector('p').style.fontSize, '18px');
  assert.equal(parsed.querySelector('p').style.lineHeight, '1.78');
  assert.equal(parsed.querySelector('[class],[id]'), null);
  assert.equal(await written[0].types['text/plain'].text(), '微信公众号正文。');
  assert.equal(root.querySelector('.mp-content-section'), section);
});

test('copy text formatting uses a real synchronous API and leaves code unchanged', async () => {
  const root = document.createElement('div');
  const section = root.createEl('section', { cls: 'mp-content-section' });
  section.createEl('p', { text: '中文English「引用」' });
  section.createEl('pre').createEl('code', { text: '中文English「code」' });
  await CopyManager.copyToClipboard(root);
  const parsed = document.createElement('div');
  replaceWithSafeHtml(parsed, await written[0].types['text/html'].text());
  assert.equal(parsed.querySelector('p').textContent, '中文 English“引用”');
  assert.equal(parsed.querySelector('code').textContent, '中文English「code」');
  assert.equal(await written[0].types['text/plain'].text(), parsed.textContent);
  assert.equal(section.querySelector('p').textContent, '中文English「引用」');
});
test.after(() => dom.window.close());
