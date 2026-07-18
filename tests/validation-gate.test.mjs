import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const validator = readFileSync(new URL('../src/core/validation/wechatHtmlValidator.ts', import.meta.url), 'utf8');
const pipeline = readFileSync(new URL('../src/core/render/legacyWechatPipeline.ts', import.meta.url), 'utf8');
const copyManager = readFileSync(new URL('../src/copyManager.ts', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/view.ts', import.meta.url), 'utf8');

test('validator treats missing image sources as a blocking issue', () => {
  assert.match(validator, /missing-image-source/);
  assert.match(validator, /add\('error', 'missing-image-source'/);
});

test('copy uses the source validation gate and the view renders its report', () => {
  assert.match(pipeline, /const sourceValidation = validateWechatHtml\(clone\)/);
  assert.match(copyManager, /已取消复制/);
  assert.match(view, /检查：\$\{report\.errors\} 项阻断问题，已禁止复制/);
  assert.match(view, /refreshValidationReport\(\)/);
});
