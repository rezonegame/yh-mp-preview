import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

test('personal contact embeds the exact supplied image and nothing promotional', async () => {
  createDom();
  const { PersonalContact } = await loadModule('src/personalContact.ts');
  const parent = document.body.createDiv();
  PersonalContact.show(parent);
  const dialog = parent.querySelector('[role="dialog"]');
  assert.equal(dialog.getAttribute('aria-label'), '个人联系');
  assert.equal(dialog.querySelectorAll('img').length, 1);
  assert.equal(dialog.querySelectorAll('a').length, 0);
  assert.doesNotMatch(dialog.textContent, /打赏|公众号|占位|待补充/);
  const image = dialog.querySelector('img');
  const bytes = Buffer.from(image.src.split(',')[1], 'base64');
  assert.deepEqual(bytes, readFileSync(new URL('../src/assets/personal-wechat.png', import.meta.url)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '187a47d31a962ca7c89b922f3d12a7e8c0ddf682b1ba11dddd06f62ebfaf38bf');
  assert.equal(bytes.readUInt32BE(16), 940);
  assert.equal(bytes.readUInt32BE(20), 1395);
  assert.equal(image.getAttribute('width'), '940');
  assert.equal(image.getAttribute('height'), '1395');
  PersonalContact.close(parent);
  assert.equal(parent.children.length, 0);
});

test('contact reopening, outside dismissal and stacked keyboard handling are isolated', async () => {
  createDom();
  const { PersonalContact } = await loadModule('src/personalContact.ts');
  const first = document.body.createDiv();
  const second = document.body.createDiv();
  PersonalContact.show(first); PersonalContact.show(first);
  assert.equal(first.querySelectorAll('[role="dialog"]').length, 1);
  first.querySelector('img').click();
  assert.ok(first.querySelector('[role="dialog"]'));
  PersonalContact.show(second);
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(second.children.length, 0);
  assert.equal(first.querySelectorAll('[role="dialog"]').length, 1);
  first.querySelector('.mp-donate-overlay').click();
  assert.equal(first.children.length, 0);
});
