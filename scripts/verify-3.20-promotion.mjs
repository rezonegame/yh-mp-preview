import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const baseline = '3.20.0-beta.1';
const git = (...args) => execFileSync('git', args, { maxBuffer: 16 * 1024 * 1024 });
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const prior = path => JSON.parse(git('show', `${baseline}:${path}`).toString());
const manifest = read('manifest.json');
assert.equal(manifest.version, '3.20.0');
assert.deepEqual({ ...prior('manifest.json'), version: manifest.version }, manifest);
assert.deepEqual({ ...prior('package.json'), version: manifest.version }, read('package.json'));
const oldLock = prior('package-lock.json');
oldLock.version = manifest.version;
oldLock.packages[''].version = manifest.version;
assert.deepEqual(oldLock, read('package-lock.json'), 'Dependencies changed after acceptance');
assert.equal(git('diff', baseline, '--', 'src', 'esbuild.config.mjs', '.github/workflows/release.yml', 'LICENSE', 'NOTICE', 'LICENSES', 'THIRD_PARTY_NOTICES.md').toString().trim(), '', 'Runtime, build or notices changed after acceptance');
const assets = {};
for (const name of ['main.js', 'styles.css', 'manifest.json']) {
  const bytes = readFileSync(name);
  assets[name] = createHash('sha256').update(bytes).digest('hex');
  if (name !== 'manifest.json') assert.deepEqual(bytes, git('show', `${baseline}:${name}`), `${name} changed after acceptance`);
}
const log = readFileSync('output/refactor/theme-experience-stable-verify.log', 'utf8');
assert.ok(/(?:#|ℹ)\s*tests\s+141/.test(log), 'Completed verification must report 141 tests (TAP or spec reporter).');
assert.ok(/(?:#|ℹ)\s*fail\s+0/.test(log), 'Completed verification must report zero failures.');
assert.ok(/Release metadata is valid for 3\.20\.0/.test(log), 'Full verification must finish its release gate.');
writeFileSync('reports/release-3.20.0-promotion.json', JSON.stringify({
  date: '2026-10-03', version: manifest.version, acceptedCandidate: baseline,
  candidateCommit: git('rev-parse', `${baseline}^{commit}`).toString().trim(),
  acceptance: 'User explicitly replied: 好的，已验收',
  status: 'Stable promotion verified locally; publication tracked separately',
  runtimeAndStylesByteIdentical: true, runtimeSourceAndDependenciesUnchanged: true,
  manifestOnlyVersionChanged: true, assets, automatedTests: { passed: 141, failed: 0 },
  candidateNativeEvidence: 'reports/theme-experience-host-regression.json',
  rollbackVersion: '3.19.1', minimumHost: manifest.minAppVersion,
  marketingVaultModified: false,
  limits: ['No new native-host matrix: stable JS and CSS are byte-identical to accepted candidate.', 'Candidate clipboard skip and platform limits remain.', 'GitHub publication, official synchronization and actual app installation are separate.']
}, null, 2) + '\n');
console.log('Stable 3.20.0 promotion: 141 tests, identical accepted runtime/CSS/source/dependencies; manifest changes version only.');
