import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';
const dom = createDom();
const { MPConverter } = await loadModule('src/converter.ts');

test('callout title remains literal text and body structure survives conversion', () => {
  const root = document.createElement('div');
  const callout = root.createDiv({ cls: 'callout', attr: { 'data-callout': 'tip' } });
  callout.createDiv({ cls: 'callout-title-inner', text: '<img src=x onerror="void 0">' });
  const body = callout.createDiv({ cls: 'callout-content' });
  body.createEl('p').createEl('strong', { text: '重点内容' });
  MPConverter.formatContent(root);
  assert.equal(root.querySelector('img,[onerror]'), null);
  assert.equal(root.querySelector('.mp-callout-title').lastElementChild.textContent, '<img src=x onerror="void 0">');
  assert.equal(root.querySelector('.mp-callout-content p strong').textContent, '重点内容');
  assert.equal(root.querySelectorAll('.mp-content-section').length, 1);
});
test.after(() => dom.window.close());
