import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const log = fs.readFileSync('output/refactor/quote-beta2-native.log', 'utf8').trim();
assert(log.startsWith('=> '));
const native = JSON.parse(log.slice(3));
assert.equal(native.version, '3.21.0-beta.2');
assert.equal(native.checks.length, 236);
assert(native.checks.every(check => check.pass));
assert.equal(native.outputs.length, 14);
assert(native.outputs.every(output => output.widths.length === 6));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(native.bundleSha256, sha(fs.readFileSync('main.js')));
assert.match(fs.readFileSync('output/refactor/quote-beta2-verify.log', 'utf8'), /tests\s+150/);
assert.match(fs.readFileSync('output/refactor/quote-beta2-verify.log', 'utf8'), /fail\s+0/);
assert(fs.readFileSync('output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/yh-mp-preview/data.json').equals(fs.readFileSync('output/refactor/quote-beta1-backup/data.json')));
for (const capture of native.captures) {
  const source = 'output/refactor/MPPreview-Refactor-Test/' + capture.path;
  assert.equal(sha(fs.readFileSync(source)), capture.sha256);
  capture.path = 'reports/assets/deep-reading-quote-fixed.png';
  fs.copyFileSync(source, capture.path);
}
const report = {
  ...native,
  scope: 'Real production presentation and canonical image-export snapshot; detached native layout under synthetic normal/foreign CSS defaults; not actual WeChat',
  automatedTests: { pass: 150, fail: 0 },
  userFeedback: { theme: 'deep-reading', destination: 'WeChat mobile preview', acceptedBeforeFix: false, issue: 'Unexpected left closing border and right edge extending to phone boundary', afterFixAcceptance: false },
  hypothesis: 'Concrete quote-edge declarations and width:auto avoid initial-valued border resets and native quote width defaults. The actual remote paste transformation cannot be inspected in this environment.',
  firstAttempt: 'Tail assertion did not account for the existing text normalization of QUOTE-END to QUOTE - END; only the harness assertion was corrected, then the complete 236-check run passed.',
  assets: Object.fromEntries(['main.js','manifest.json','styles.css'].map(name => [name, sha(fs.readFileSync(name))])),
  stableVersion: '3.20.0', stableChanged: false, marketingModified: false,
};
fs.writeFileSync('reports/reading-quote-beta2-regression.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version: native.version, checks: native.checks.length, combinations: 84, automatedTests: 150, backendAccepted: false }));
