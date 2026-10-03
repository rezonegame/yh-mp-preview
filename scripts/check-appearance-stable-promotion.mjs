import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const candidate = '3.22.0-beta.1', version = '3.22.0';
const git = (...args) => execFileSync('git', args, { maxBuffer: 16 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(JSON.parse(readFileSync('manifest.json')).version, version);
assert.equal(git('diff', candidate, '--', 'src').toString().trim(), '', 'Accepted runtime source must not change');
const prior = JSON.parse(git('show', candidate + ':package.json'));
const current = JSON.parse(readFileSync('package.json'));
assert.deepEqual(current.dependencies, prior.dependencies);
assert.deepEqual(current.devDependencies, prior.devDependencies);
for (const name of ['main.js', 'styles.css']) assert(readFileSync(name).equals(git('show', candidate + ':' + name)), name + ' must match accepted candidate');
const priorManifest = JSON.parse(git('show', candidate + ':manifest.json'));
assert.deepEqual(JSON.parse(readFileSync('manifest.json')), { ...priorManifest, version });
const verify = readFileSync('output/refactor/appearance-stable-verify.log', 'utf8');
assert.match(verify, /tests\s+154/); assert.match(verify, /fail\s+0/);
const report = {
  date: '2026-10-03', version, acceptedCandidate: candidate,
  candidateCommit: git('rev-parse', candidate + '^{commit}').toString().trim(),
  acceptance: { reply: '可以了，你直接发布吧', scope: 'User accepted the P3 candidate and authorized stable publication; not an agent-run WeChat backend inspection' },
  status: 'Local stable promotion verified; publication and official synchronization tracked separately',
  runtimeAndStylesByteIdentical: true, runtimeSourceAndDependenciesUnchanged: true, manifestOnlyVersionChanged: true,
  assets: Object.fromEntries(['main.js','styles.css','manifest.json'].map(name => [name, sha(readFileSync(name))])),
  automatedTests: { passed: 154, failed: 0 },
  candidateNativeEvidence: ['reports/appearance-tuning-beta1-host.json','reports/appearance-tuning-beta1-release.json'],
  rollbackVersion: '3.21.0', minimumHost: priorManifest.minAppVersion, marketingVaultModified: false,
  limits: ['No new native matrix during promotion; identical accepted JS/CSS.', 'User acceptance does not erase initial failed performance/fixture probes or untested-platform limits.', 'Historical source and license notices retained; scans do not establish independent authorship.'],
};
writeFileSync('reports/release-3.22.0-promotion.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version, identicalRuntime: true, tests: 154, candidate }));
