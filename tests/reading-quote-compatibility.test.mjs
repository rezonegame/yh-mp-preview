import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

test('modern quotes declare concrete edges and bounded widths after actual canonical serialization', async () => {
  createDom();
  const { curatedThemeEntries } = await loadModule('src/core/theme/themeCatalog.ts');
  const { readingTheme } = await loadModule('src/core/theme/themeRevisionRegistry.ts');
  const { TemplateManager } = await loadModule('src/templateManager.ts');
  const { prepareLegacyWechatFragment } = await loadModule('src/core/render/legacyWechatPipeline.ts');
  for (const entry of curatedThemeEntries.filter(entry => entry.status === 'featured')) {
    const theme = readingTheme(entry.id), host = document.body.createDiv();
    host.innerHTML = '<section class="mp-content-section"><h2>章节</h2><blockquote cite="https://example.com/source"><p>引用第一段 <strong>重点</strong></p><p>引用第二段</p><blockquote><p>嵌套引用</p></blockquote></blockquote><p>完整末尾</p></section>';
    const originalText = host.textContent;
    new TemplateManager({}, { getTemplate: () => theme }).applyTemplate(host, theme);
    const before = host.outerHTML, result = prepareLegacyWechatFragment(host.firstElementChild);
    assert.equal(host.outerHTML, before, entry.id + ' source mutation');
    assert.equal(result.root.textContent, originalText);
    assert.equal(result.root.querySelectorAll('blockquote').length, 2);
    assert.equal(result.root.querySelector('blockquote').getAttribute('cite'), 'https://example.com/source');
    assert.equal(result.root.querySelector('blockquote strong').textContent, '重点');
    for (const quote of result.root.querySelectorAll('blockquote')) {
      assert.equal(quote.style.width, 'auto', entry.id);
      assert.equal(quote.style.maxWidth, '100%', entry.id);
      assert.equal(quote.style.boxSizing, 'border-box', entry.id);
      assert.equal(quote.style.marginLeft, '0px', entry.id);
      assert.equal(quote.style.marginRight, '0px', entry.id);
      for (const edge of ['Top', 'Right', 'Bottom', 'Left']) {
        assert.equal(quote.style['border' + edge + 'Style'], 'solid', entry.id + ' ' + edge);
        assert.notEqual(quote.style['border' + edge + 'Color'], 'initial', entry.id + ' ' + edge);
        assert.notEqual(quote.style['border' + edge + 'Width'], '', entry.id + ' ' + edge);
      }
    }
    host.remove();
  }
});

test('upgraded output escapes native quote import without changing source, legacy output or semantic model', async () => {
  createDom();
  const { prepareLegacyWechatFragment } = await loadModule('src/core/render/legacyWechatPipeline.ts');
  const root = document.createElement('section');
  root.setAttribute('data-mp-reading-background', 'theme');
  root.innerHTML = '<blockquote cite="https://example.com/source" style="border-top:1px solid #ccc;border-bottom:1px solid #ccc;border-left:0px solid transparent;width:auto;"><p>引用 <strong>重点</strong></p><blockquote><p>嵌套</p><ol><li>完整步骤</li></ol></blockquote></blockquote><p>末尾</p>';
  const before = root.outerHTML, result = prepareLegacyWechatFragment(root);
  assert.equal(root.outerHTML, before);
  assert.equal(root.querySelectorAll('blockquote').length, 2);
  assert.equal(result.article.stats.quotes, 2);
  assert.equal(result.root.querySelectorAll('blockquote').length, 0);
  const quotes = result.root.querySelectorAll('section[role="note"][aria-label="引用"]');
  assert.equal(quotes.length, 2);
  assert.equal(quotes[0].querySelector('section[role="note"]'), quotes[1]);
  assert.equal(quotes[0].getAttribute('cite'), 'https://example.com/source');
  assert.equal(quotes[0].querySelector('strong').textContent, '重点');
  assert.equal(quotes[1].querySelector('ol > li').textContent, '完整步骤');
  assert.equal(result.text, root.textContent);
  assert.equal(quotes[0].style.borderTopWidth, '1px');
  assert.equal(quotes[0].style.borderLeftWidth, '0px');
  assert.equal(prepareLegacyWechatFragment(result.root).html, result.html);
  root.removeAttribute('data-mp-reading-background');
  const legacy = prepareLegacyWechatFragment(root);
  assert.equal(legacy.root.querySelectorAll('blockquote').length, 2);
  assert.equal(legacy.root.querySelectorAll('section[role="note"]').length, 0);
});

test('open quotes remain open and switching back restores legacy styles exactly', async () => {
  createDom();
  const { readingTheme, legacyTheme } = await loadModule('src/core/theme/themeRevisionRegistry.ts');
  const { TemplateManager } = await loadModule('src/templateManager.ts');
  const host = document.body.createDiv();
  host.innerHTML = '<section class="mp-content-section"><blockquote><p>保留原始引用</p></blockquote></section>';
  const manager = new TemplateManager({}, { getTemplate: () => legacyTheme('default') });
  manager.applyTemplate(host, legacyTheme('default'));
  const old = host.outerHTML;
  for (const id of ['deep-reading', 'apple-product', 'ink-opinion', 'zen-essence']) {
    manager.applyTemplate(host, readingTheme(id));
    const quote = host.querySelector('blockquote');
    assert.equal(quote.style.borderLeftWidth, '0px', id);
    assert.equal(quote.style.borderRightWidth, '0px', id);
    assert.equal(quote.style.borderTopWidth, '1px', id);
    assert.equal(quote.style.borderBottomWidth, '1px', id);
    const once = host.outerHTML;
    manager.applyTemplate(host, readingTheme(id));
    assert.equal(host.outerHTML, once, id + ' idempotence');
  }
  manager.applyTemplate(host, legacyTheme('default'));
  assert.equal(host.outerHTML, old);
});
