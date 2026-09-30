import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

const dom = createDom();
const safety = await loadModule('src/core/security/safeDom.ts');
const dialogue = await loadModule('src/containers/DialogueRenderer.ts');
const gallery = await loadModule('src/containers/GalleryRenderer.ts');

test('dialogue preserves text as text and cannot create active markup', () => {
  const element = dialogue.createDialogueElement({ type: 'dialogue', title: '<script>bad</script>',
    lines: [{ speaker: '<img onerror="void 0">', content: '<img src=x onerror="void 0"> & 中文' }] });
  assert.equal(element.querySelector('img,script'), null);
  assert.equal(element.querySelector('[data-container="dialogue-text"]').textContent, '<img src=x onerror="void 0"> & 中文');
  assert.ok(element.getAttribute('style').includes('padding'));
});

test('gallery validates URLs and cannot break out of src or style attributes', () => {
  const element = gallery.createGalleryElement({ type: 'gallery', title: '<img src=x>',
    images: ['x" onerror="void 0', 'javascript:void(0)', 'https://example.org/image.png'] }, { item: 'color:red; background:url(https://unsafe.invalid/)' });
  assert.equal(element.querySelector('[onerror]'), null);
  assert.equal(element.querySelectorAll('img')[0].getAttribute('src'), null);
  assert.equal(element.querySelectorAll('img')[1].getAttribute('src'), null);
  assert.equal(element.querySelectorAll('img')[2].getAttribute('src'), 'https://example.org/image.png');
  assert.equal(element.querySelector('figure').getAttribute('style'), null);
});

test('custom HTML is cleaned before insertion while safe typography survives', () => {
  const result = safety.sanitizeHtmlFragment('<section style="padding:16px; color:#123456; line-height:1.78"><script>bad</script><iframe src="https://bad.invalid"></iframe><p onclick="void 0">正文<strong>强调</strong></p><a href="javascript:void(0)">链接</a><img src="data:image/png;base64,aGVsbG8=" onerror="void 0"></section>');
  assert.equal(result.fragment.querySelector('script,iframe,[onclick],[onerror]'), null);
  assert.equal(result.fragment.querySelector('a').hasAttribute('href'), false);
  assert.ok(result.fragment.querySelector('img').getAttribute('src').startsWith('data:image/png'));
  assert.equal(result.fragment.querySelector('section').style.lineHeight, '1.78');
  assert.equal(result.fragment.querySelector('strong').textContent, '强调');
  assert.ok(result.removedCount > 0);
});

test('CSS resource loading and obfuscated unsafe protocols are rejected', () => {
  for (const css of ['color:red;background:url(https://bad.invalid)', 'color:red; background:u\\72l(https://bad.invalid)', '@import "https://bad.invalid";', 'width:expression(void 0)']) {
    assert.equal(safety.safeInlineCss(css), '');
  }
  for (const url of ['javascript:void(0)', 'java\nscript:void(0)', 'vbscript:void(0)', 'data:text/html;base64,eA==', 'data:image/svg+xml;base64,eA==']) {
    assert.equal(safety.safeUrl(url, 'image'), null);
  }
  assert.equal(safety.safeUrl('app://local/vault/image.png', 'image'), 'app://local/vault/image.png');
  assert.equal(safety.safeUrl('https://example.org/?q=%E4%B8%AD%E6%96%87', 'image'), 'https://example.org/?q=%E4%B8%AD%E6%96%87');
});

test.after(() => dom.window.close());
