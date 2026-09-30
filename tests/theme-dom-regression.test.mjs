import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

const dom = createDom();
const { TemplateManager } = await loadModule('src/templateManager.ts');
const { prepareLegacyWechatFragment } = await loadModule('src/core/render/legacyWechatPipeline.ts');
const { replaceWithSafeHtml } = await loadModule('src/core/security/safeDom.ts');

for (const file of readdirSync('src/templates').filter(file => file.endsWith('.json'))) {
  const template = JSON.parse(readFileSync(`src/templates/${file}`, 'utf8'));
  test(`theme ${template.id} keeps inline typography, content and hierarchy through safe preparation`, () => {
    const root = document.createElement('div');
    const section = root.createEl('section', { cls: 'mp-content-section' });
    section.createEl('h1', { text: '完整文章标题' });
    for (let level = 2; level <= 6; level++) section.createEl(`h${level}`, { text: `第 ${level} 级标题` });
    section.createEl('p', { text: '长段落 中文 English 文字保留，排版不改写内容。' });
    const quote = section.createEl('blockquote'); quote.createEl('p', { text: '引用内容' });
    const list = section.createEl('ol'); list.createEl('li', { text: '步骤一' });
    const pre = section.createEl('pre'); pre.createEl('code', { text: 'const value = 1;' });
    const table = section.createEl('table'); const row = table.createEl('tr'); row.createEl('td', { text: '数据' });
    const manager = new TemplateManager({}, { getTemplate: () => template });
    manager.setCurrentTemplate(template.id);
    manager.setFontSize(18);
    manager.applyTemplate(root);
    const before = section.textContent;
    assert.equal(section.querySelector('p').style.fontSize, '18px');
    assert.ok(Number(section.querySelector('p').style.lineHeight) >= 1.72);
    assert.equal(section.querySelectorAll('h1,h2,h3,h4,h5,h6').length, 6);
    assert.equal(section.querySelector('pre').style.whiteSpace, 'pre-wrap');
    const result = prepareLegacyWechatFragment(section, { themeId: template.id, recipeId: 'legacy-compatible' });
    assert.equal(result.validation.errors, 0);
    const parsed = document.createElement('div');
    replaceWithSafeHtml(parsed, result.html);
    assert.equal(parsed.textContent, before);
    assert.equal(parsed.querySelector('p').style.fontSize, '18px');
    assert.equal(parsed.querySelectorAll('[class],[id]')[0], undefined);
  });
}

test.after(() => dom.window.close());
