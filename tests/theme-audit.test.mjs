import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const report = JSON.parse(readFileSync(new URL('../reports/theme-audit.json', import.meta.url), 'utf8'));

test('theme provenance audit covers every bundled theme', () => {
  execFileSync(process.execPath, ['scripts/audit-themes.mjs', '--check'], { stdio: 'pipe' });
  assert.equal(report.summary.total, 7);
  assert.equal(report.summary.coreThemes, 7);
  assert.equal(report.summary.xiaohuImported, 0);
  assert.equal(report.summary.pendingProvenanceReview, 0);
  assert.equal(report.summary.duplicateIds.length, 0);
  assert.equal(report.templates.length, report.summary.total);
});
