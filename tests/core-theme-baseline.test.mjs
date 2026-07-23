import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const registry = readFileSync(new URL('../src/core/components/standardComponents.ts', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../config/core-themes.json', import.meta.url), 'utf8'));
const baseline = JSON.parse(readFileSync(new URL('../reports/core-theme-visual-baseline.json', import.meta.url), 'utf8'));

test('standard component registry exposes the supported deterministic components', () => {
  for (const component of ['toc', 'steps', 'checklist', 'quote-card', 'summary', 'author-card', 'subscribe', 'faq', 'timeline', 'comparison-table']) {
    assert.match(registry, new RegExp(`id: '${component}'`));
  }
});

test('Core theme visual-style baseline is reproducible', () => {
  execFileSync(process.execPath, ['scripts/audit-core-theme-baseline.mjs', '--check'], { stdio: 'pipe' });
  assert.deepEqual(config.themeIds, [
    'default',
    'minimal',
    'academic-pro',
    'academic-pro-forest',
    'modern-report',
    'zen-essence',
    'apple-product',
  ]);
  assert.equal(baseline.themes.length, config.themeIds.length);
  assert.ok(baseline.themes.every((theme) => /^[a-f0-9]{64}$/.test(theme.fingerprint)));
});
