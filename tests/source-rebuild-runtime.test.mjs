import assert from 'node:assert/strict';
import test from 'node:test';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';
import { readFileSync } from 'node:fs';

test('declarative theme application preserves heading markup and does not accumulate wrappers or syntax styles', async () => {
  createDom();
  const { TemplateManager } = await loadModule('src/templateManager.ts');
  const theme = JSON.parse(readFileSync(new URL('../src/templates/default.json', import.meta.url), 'utf8'));
  const root = document.body.createDiv();
  root.innerHTML = '<h2><a href="https://example.invalid/"><strong>Nested heading</strong></a></h2><pre><code><span class="token keyword">const</span> a=1</code></pre>';
  const link = root.querySelector('a');
  const manager = new TemplateManager({}, { getTemplate: () => theme });
  manager.setCurrentTemplate(theme.id);
  theme.styles.code.syntax = { keyword: 'color:#7c3aed;' };
  manager.applyTemplate(root); manager.applyTemplate(root);
  assert.equal(root.querySelectorAll('h2 > .content').length, 1);
  assert.equal(root.querySelectorAll('h2 > .after').length, 1);
  assert.equal(root.querySelector('a'), link);
  assert.equal(link.querySelector('strong').textContent, 'Nested heading');
  assert.equal(root.querySelector('.token').style.color, 'rgb(124, 58, 237)');
  delete theme.styles.code.syntax;
  manager.applyTemplate(root);
  assert.equal(root.querySelector('.token').style.color, 'inherit');
  assert.equal(root.querySelector('h2').textContent, 'Nested heading');
});

test('background rename preserves opaque CSS, identifiers and detached extension data', async () => {
  const { BackgroundDraft } = await loadModule('src/core/settings/backgroundDraft.ts');
  const original = { id: 'saved', name: 'Before', style: 'background-color:#fff; background-image:linear-gradient(red,blue); padding:13px;', extension: { value: 1 } };
  const draft = new BackgroundDraft(original);
  draft.background.name = 'After'; draft.background.extension.value = 2;
  assert.equal(draft.controls.mode, 'css');
  assert.equal(draft.commit().style, original.style);
  assert.equal(draft.commit().id, 'saved');
  assert.deepEqual(original.extension, { value: 1 });
  draft.update({ mode: 'color', color: '#112233' });
  assert.equal(draft.commit().style, 'background-color: #112233;');
  draft.update({ mode: 'css', pattern: 'custom', css: 'background: #fff;' });
  assert.equal(draft.commit().style, 'background: #fff;');
  draft.background.name = ' ';
  assert.throws(() => draft.commit(), /名称/);
});

test('all background patterns are parameterized with zero opacity and proportional geometry', async () => {
  const { renderPattern, patternLabels, BackgroundDraft } = await loadModule('src/core/settings/backgroundDraft.ts');
  const patterns = Object.keys(patternLabels).filter(id => id !== 'custom');
  const outputs = patterns.map(id => renderPattern(id, '#112233', 0, 20));
  assert.equal(new Set(outputs).size, patterns.length);
  for (const css of outputs) assert.match(css, /rgba\(17, 34, 51, 0\)/);
  assert.match(renderPattern('honeycomb', '#112233', 2, 10), /background-size: 10px 17\.32px/);
  assert.match(renderPattern('grid', '#112233', -1, 100), /background-size: 50px 50px/);
  assert.throws(() => renderPattern('grid', 'red;display:none', 1, 20), /颜色无效/);
  const draft = new BackgroundDraft({ id: 'opaque', name: 'Zero', style: 'background-image:linear-gradient(rgba(0, 0, 0, 0), transparent); background-size:12px 24px;' });
  assert.equal(draft.controls.opacity, 0);
  assert.equal(draft.controls.scale, 12);
  assert.match(draft.commit().style, /12px 24px/);
});

test('preset refresh preserves visibility and extension fields without mutating saved records', async () => {
  const { mergePresetCatalog } = await loadModule('src/core/settings/catalogMerge.ts');
  const previous = [{ id: 'a', name: 'old', isVisible: false, extra: { version: 1 } }];
  const merged = mergePresetCatalog([{ id: 'a', name: 'new' }, { id: 'b', name: 'new B' }], [...previous, null, 7]);
  assert.equal(merged[0].name, 'new'); assert.equal(merged[0].isVisible, false);
  assert.equal(merged[1].isVisible, true); assert.equal(merged[1].isPreset, true);
  merged[0].extra.version = 2;
  assert.equal(previous[0].extra.version, 1);
  assert.deepEqual(mergePresetCatalog([], null), []);
});

test('confirmation cancels without action and waits for one commit, then supports failure retry', async () => {
  createDom();
  const stub = `export class Modal { constructor(){this.contentEl=document.body.createDiv();this.titleEl=document.createElement('h2');} close(){this.closed=true;this.onClose();} }`;
  const { ConfirmModal } = await loadModule('src/settings/ConfirmModal.ts', stub);
  let calls = 0, resolve;
  const cancelled = new ConfirmModal({}, 'Delete', 'Confirm?', () => calls++);
  cancelled.onOpen(); cancelled.contentEl.querySelector('button').click();
  assert.equal(calls, 0); assert.equal(cancelled.closed, true);
  const pending = new ConfirmModal({}, 'Save', 'Confirm?', () => { calls++; return new Promise(done => { resolve = done; }); });
  pending.onOpen();
  const [cancel, confirm] = pending.contentEl.querySelectorAll('button');
  confirm.click(); confirm.click(); cancel.click();
  assert.equal(calls, 1); assert.equal(pending.closed, undefined);
  assert.equal(confirm.disabled, true);
  resolve(); await new Promise(done => setTimeout(done, 0));
  assert.equal(pending.closed, true);
  let attempts = 0;
  const retry = new ConfirmModal({}, 'Retry', 'Confirm?', async () => { if (++attempts === 1) throw new Error('disk full'); });
  retry.onOpen(); const submit = retry.contentEl.querySelector('.mod-cta');
  submit.click(); await new Promise(done => setTimeout(done, 0));
  assert.equal(retry.closed, undefined); assert.equal(submit.disabled, false);
  assert.equal(retry.contentEl.querySelector('[role="alert"]').textContent, 'disk full');
  submit.click(); await new Promise(done => setTimeout(done, 0));
  assert.equal(attempts, 2); assert.equal(retry.closed, true);
});
