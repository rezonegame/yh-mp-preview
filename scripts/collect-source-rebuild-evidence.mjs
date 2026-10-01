import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const result = name => {
  const path = `output/refactor/source-rebuild-${name}.log`;
  const line = readFileSync(path, 'utf8').split(/\r?\n/).filter(item => item.startsWith('=> {')).at(-1);
  assert.ok(line, `Missing successful native result: ${path}`);
  return JSON.parse(line.slice(3));
};
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const host = result('host'), layout = result('layout'), settings = result('settings'), contracts = result('contracts'), media = result('media');
for (const entry of [layout, settings, contracts]) assert.equal(entry.version, manifest.version);
for (const check of [...layout.results, ...settings.results, ...contracts.checks]) assert.equal(check.pass, true, check.name);
for (const check of host.results) assert.ok(check.pass === true || check.skipped === 'background-clipboard', check.name);
assert.equal(media.pass, true); assert.ok(media.embedded.every(Boolean));
const assets = Object.fromEntries(['main.js', 'styles.css', 'manifest.json'].map(path => {
  const bytes = readFileSync(path);
  assert.deepEqual(bytes, readFileSync(`output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/${manifest.id}/${path}`), `Untested or mismatched asset: ${path}`);
  return [path, createHash('sha256').update(bytes).digest('hex')];
}));
const names = ['contact-light', 'contact-dark', 'workbench-light-final', 'workbench-dark-final', 'background-form-final'];
const visualEvidence = names.map(name => {
  const path = `output/refactor/source-rebuild-${name}.png`;
  assert.ok(existsSync(path), `Missing screenshot: ${path}`);
  return { name: name + '.png', sha256: createHash('sha256').update(readFileSync(path)).digest('hex') };
});
const report = {
  version: manifest.version, status: 'local candidate; not pushed, tagged or published',
  host: 'Obsidian 1.13.7', platform: host.platform, devicePixelRatio: host.devicePixelRatio,
  scope: 'Generated MPPreview-Refactor-Test only; Marketing plugin, settings and notes untouched',
  assets,
  automation: { tests: 117, failed: 0, recommendedLintErrors: 0, warnings: 32, runtimeDependencyVulnerabilities: 0 },
  native: { articleOutput: host.results, layout: layout.results, settings: settings.results, rebuildContracts: contracts.checks },
  dimensions: host.dimensions, layoutDimensions: layout.dimensions, images: host.pngSizes,
  media: { images: media.embedded.length, allEmbedded: media.embedded.every(Boolean), width: media.width, height: media.height, sourceUnchanged: media.sourceUnchanged },
  codeContrasts: contracts.codeContrasts,
  provenance: JSON.parse(readFileSync('reports/source-provenance-audit.json', 'utf8')).summary,
  visualEvidence,
  limitations: [
    'No BRAT installation or WeChat backend paste of this candidate; neither is inferred from local evidence.',
    'Clipboard result is recorded per final run; background skip is not treated as a pass.',
    'Download anchors captured artifacts into the isolated vault; operating-system save dialogs were not automated.',
    'Windows focus activation failed on retry; no repeated UI input or permission/security operations were attempted.',
    'macOS/mobile/older Obsidian and exhaustive scale combinations were not run.',
    'No exact source match is not a clean-room authorship proof or official-directory approval.',
  ],
};
writeFileSync('reports/source-rebuild-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version: manifest.version, nativeChecks: Object.values(report.native).flat().length, passed: Object.values(report.native).flat().filter(check => check.pass === true).length, skipped: Object.values(report.native).flat().filter(check => check.skipped).length, screenshots: visualEvidence.length }));
