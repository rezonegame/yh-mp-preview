import assert from 'node:assert/strict';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// This release-specific collector leaves earlier evidence untouched.
const version = '3.19.0';
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
assert.equal(manifest.version, version);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const builtAt = statSync('main.js').mtimeMs;
const nativeLogs = {};
const verifyBytes = readFileSync('output/refactor/release-3.19-verify.log');
const verifyText = verifyBytes.toString('utf8');
assert.match(verifyText, /tests 126/);
assert.match(verifyText, /pass 126/);
assert.match(verifyText, /fail 0/);
assert.match(verifyText, /blockers: 0.*warnings: 30/);
const result = name => {
  const path = `output/refactor/release-3.19-${name}.log`;
  assert.ok(statSync(path).mtimeMs >= builtAt, `Stale log: ${path}`);
  const bytes = readFileSync(path);
  nativeLogs[name] = { path, sha256: hash(bytes) };
  const output = bytes.toString('utf8');
  const marker = output.lastIndexOf('=> ');
  assert.ok(marker >= 0, `Missing CLI result: ${path}`);
  let value = JSON.parse(output.slice(marker + 3));
  if (typeof value === 'string') value = JSON.parse(value);
  if (value.version !== undefined) assert.equal(value.version, version, path);
  return value;
};
const layout = result('layout'), settings = result('settings'), contracts = result('contracts');
const media = result('media'), host = result('host'), storage = result('storage'), visuals = result('visuals');
const native = {
  layout: layout.results, settings: settings.results, rebuiltContracts: contracts.checks,
  articleOutput: host.results, storage: storage.checks,
};
for (const [group, checks] of Object.entries(native)) {
  for (const check of checks) {
    assert.ok(check.pass === true || (group === 'articleOutput' && check.skipped === 'background-clipboard'), check.name);
  }
}
assert.equal(media.pass, true);
assert.ok(media.embedded.every(Boolean));
assert.equal(media.sourceUnchanged, true);
const installed = `output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/${manifest.id}/`;
const assets = Object.fromEntries(['main.js', 'manifest.json', 'styles.css'].map(path => {
  const bytes = readFileSync(path);
  assert.deepEqual(bytes, readFileSync(installed + path), `Untested installed asset: ${path}`);
  return [path, hash(bytes)];
}));
assert.equal(visuals.images.length, 5);
const screenshots = visuals.images.map(item => {
  assert.ok(item.title.includes('MPPreview-Refactor-Test'));
  const path = `output/refactor/release-3.19-${item.path.split('/').at(-1)}`;
  assert.ok(statSync(path).mtimeMs >= builtAt, `Stale capture: ${path}`);
  return { ...item, path, sha256: hash(readFileSync(path)) };
});
const checks = Object.values(native).flat();
const report = {
  version, status: 'release candidate verified locally; publication checked separately',
  host: 'Windows Obsidian 1.13.7', repository: 'rezonegame/yh-mp-preview',
  scope: 'MPPreview-Refactor-Test only; Marketing vault not modified',
  assets, nativeLogs, verifyLogSha256: hash(verifyBytes),
  automation: { tests: 126, failed: 0, lintErrors: 0, lintWarnings: 30, dependencyVulnerabilities: 0,
    officialMetadata: 'passed with numeric manifest and matching bare tag' },
  counts: { total: checks.length, passed: checks.filter(item => item.pass === true).length,
    skipped: checks.filter(item => item.skipped).length },
  native, dimensions: host.dimensions, layoutDimensions: layout.dimensions,
  images: host.pngSizes, media, codeContrasts: contracts.codeContrasts, screenshots,
  provenance: JSON.parse(readFileSync('reports/source-provenance-audit.json', 'utf8')).summary,
  limitations: [
    'BRAT installation UI and WeChat backend paste were not run for this build.',
    'Background clipboard skips are not counted as passes; see the exact run result.',
    'Generated download artifacts were captured; OS save dialogs were not automated.',
    'Storage checks use the real store and adapter with a custom directory, not a changed vault configDir.',
    'Other platforms and older supported hosts were not tested in this round.',
    'Zero exact source matches are not authorship clearance or official-directory approval.',
  ],
};
writeFileSync('reports/release-3.19-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version, counts: report.counts, assets, screenshots: screenshots.length }));
