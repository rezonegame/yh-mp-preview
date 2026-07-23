import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/core/theme/wechatReadingBaseline.ts', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'esm', target: 'es2020' }).code;
const baseline = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const templateManager = readFileSync(new URL('../src/templateManager.ts', import.meta.url), 'utf8');

test('WeChat reading baseline keeps long-form text readable', () => {
  assert.equal(baseline.WECHAT_READING_BASELINE_VERSION, '2026.07');
  assert.match(baseline.wechatReadingBaseline.paragraph, /line-height: 1\.85/);
  assert.match(baseline.wechatReadingBaseline.paragraph, /text-align: left/);
  assert.match(baseline.wechatReadingBaseline.quote, /font-style: normal/);
  assert.match(baseline.wechatReadingBaseline.codeBlock, /white-space: pre-wrap/);
  assert.match(baseline.wechatReadingBaseline.tableCell, /word-break: break-word/);
  assert.match(baseline.appendWechatReadingBaseline('color: #123', 'line-height: 1.8'), /color: #123; line-height: 1\.8/);
});

test('every bundled theme receives the shared reading baseline at render time', () => {
  for (const selector of [
    'wechatReadingBaseline.paragraph',
    'wechatReadingBaseline.list',
    'wechatReadingBaseline.listItem',
    'wechatReadingBaseline.quote',
    'wechatReadingBaseline.codeBlock',
    'wechatReadingBaseline.inlineCode',
    'wechatReadingBaseline.table',
    'wechatReadingBaseline.tableCell',
    'wechatReadingBaseline.image',
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(templateManager, new RegExp(escaped));
  }
});
