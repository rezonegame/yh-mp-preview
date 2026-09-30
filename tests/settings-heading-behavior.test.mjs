import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

const dom = createDom();
const { MPSettingTab } = await loadModule('src/settings/MPSettingTab.ts', `
  export class Notice {}
  export class App {}
  export class Modal {}
  export class ColorComponent {}
  export class PluginSettingTab {}
  export class TFile {}
  export const normalizePath = value => value;
  export function setIcon(element, icon) { element.dataset.icon = icon; }
  export class Setting {
    constructor(container) { this.settingEl = container.createDiv({cls:'setting-item'}); this.name = this.settingEl.createDiv({cls:'setting-item-name'}); }
    setName(name) { this.name.textContent = name; return this; }
    setHeading() { this.settingEl.classList.add('setting-item-heading'); return this; }
  }
`);

test('native headings retain accordion toggling and expanded state on rerender', () => {
  const tab = Object.create(MPSettingTab.prototype);
  tab.expandedSections = new Set();
  const root = document.createElement('div');
  const render = element => element.createEl('p', { text: '设置内容' });
  const section = tab.createSection(root, '模板选项', render);
  assert.equal(section.querySelector('.setting-item-heading .setting-item-name').textContent, '模板选项');
  assert.equal(section.querySelector('h1,h2,h3,h4'), null);
  section.querySelector('.settings-section-header').click();
  assert.equal(section.hasClass('is-expanded'), true);
  assert.equal(tab.expandedSections.has('模板选项'), true);
  root.empty();
  const recreated = tab.createSection(root, '模板选项', render);
  assert.equal(recreated.hasClass('is-expanded'), true);
  recreated.querySelector('.settings-section-header').click();
  assert.equal(recreated.hasClass('is-expanded'), false);
  assert.equal(tab.expandedSections.has('模板选项'), false);
});
test.after(() => dom.window.close());
