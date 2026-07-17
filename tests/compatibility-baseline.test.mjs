import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const report = JSON.parse(readFileSync(new URL('../reports/wechat-compatibility-baseline.json', import.meta.url), 'utf8'));

test('wechat compatibility baseline is reproducible', () => {
  execFileSync(process.execPath, ['scripts/audit-wechat-compatibility.mjs', '--check'], { stdio: 'pipe' });
  assert.equal(report.status, 'baseline-known-gaps');
  assert.ok(report.rendererFindings.length >= 3);
  assert.ok(Object.keys(report.rules).length >= 8);
});
