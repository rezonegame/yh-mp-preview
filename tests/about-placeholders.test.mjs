import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/donateManager.ts', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'esm', target: 'es2020' }).code;
const { DonateManager } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

// Minimal host DOM double: execute the actual manager without an Obsidian vault.
class ElementDouble {
  constructor(tag = 'div', options = {}) {
    this.tag = tag;
    this.options = options;
    this.children = [];
    this.listeners = new Map();
    this.removed = false;
  }

  createEl(tag, options = {}) {
    const child = new ElementDouble(tag, options);
    this.children.push(child);
    return child;
  }

  createSpan(options) { return this.createEl('span', options); }
  addEventListener(event, handler) { this.listeners.set(event, handler); }
  remove() { this.removed = true; }
}

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

test('about page reserves two non-interactive placeholders without legacy QR images', () => {
  const container = new ElementDouble();
  DonateManager.showDonateModal(container);
  const nodes = descendants(container);
  assert.equal(nodes.filter(node => node.options.cls === 'mp-about-qr').length, 2);
  assert.ok(nodes.some(node => node.options.text === '支持二维码待补充'));
  assert.ok(nodes.some(node => node.options.text === '公众号二维码待补充'));
  assert.equal(nodes.filter(node => node.tag === 'img' || node.tag === 'a').length, 0);
  assert.doesNotMatch(source, /from ['"]\.\/assets\/(?:donate|qrcode)['"]/);

  const close = nodes.find(node => node.options.cls === 'mp-donate-close');
  close.listeners.get('click')();
  assert.equal(container.children[0].removed, true);
});

test('about placeholder overlay retains click-outside closing behavior', () => {
  const container = new ElementDouble();
  DonateManager.showDonateModal(container);
  const overlay = container.children[0];
  overlay.listeners.get('click')({ target: overlay.children[0] });
  assert.equal(overlay.removed, false);
  overlay.listeners.get('click')({ target: overlay });
  assert.equal(overlay.removed, true);
});
