import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const log = fs.readFileSync('output/refactor/quote-beta3-native.log', 'utf8').trim();
const line = log.split(/\r?\n/).filter(line => line.startsWith('=> {')).at(-1);
assert(line, 'Missing completed native result');
const native = JSON.parse(line.slice(3));
assert.equal(native.version, '3.21.0-beta.3');
assert.equal(native.checks.length, 348);
assert(native.checks.every(check => check.pass));
assert.equal(native.outputs.length, 14);
assert(native.outputs.every(output => output.widths.length === 6));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const base = 'output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/yh-mp-preview/';
assert.equal(native.bundleSha256, sha(fs.readFileSync('main.js')));
assert.match(fs.readFileSync('output/refactor/quote-beta3-verify.log', 'utf8'), /tests\s+151/);
assert.match(fs.readFileSync('output/refactor/quote-beta3-verify.log', 'utf8'), /fail\s+0/);
assert(fs.readFileSync(base + 'data.json').equals(fs.readFileSync('output/refactor/quote-beta2-backup/data.json')));
for (const capture of native.captures) {
  const source = 'output/refactor/MPPreview-Refactor-Test/' + capture.path;
  assert.equal(sha(fs.readFileSync(source)), capture.sha256);
  capture.path = 'reports/assets/deep-reading-quote-adapter.png';
  fs.copyFileSync(source, capture.path);
}
const report = {
  ...native,
  scope: 'Production canonical export snapshot under synthetic native-tag defaults; not actual WeChat',
  automatedTests: { pass: 151, fail: 0 },
  userFeedback: { theme: 'deep-reading', destination: 'WeChat mobile preview', beta2Accepted: false, beta3Accepted: false, issue: 'Left gray bar remains after beta.2 re-copy' },
  hypothesis: 'Native quote import can replace inline styles. Adapt upgraded output to ordinary styled sections; local source and ArticleModel keep semantic quotes. Inference supported by public doocs/md issue 447, not inspection of the account.',
  source: 'https://github.com/doocs/md/issues/447',
  assets: Object.fromEntries(['main.js','manifest.json','styles.css'].map(name => {
    const bytes = fs.readFileSync(name);
    assert(bytes.equals(fs.readFileSync(base + name)), name + ' installed candidate');
    return [name, sha(bytes)];
  })),
  stableVersion: '3.20.0', stableChanged: false, marketingModified: false,
};
fs.writeFileSync('reports/reading-quote-beta3-regression.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version: native.version, checks: native.checks.length, combinations: 84, automatedTests: 151, backendAccepted: false }));
