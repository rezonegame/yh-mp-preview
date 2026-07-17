import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const versions = JSON.parse(readFileSync(new URL('../versions.json', import.meta.url), 'utf8'));

test('release metadata is synchronized', () => {
  assert.equal(packageJson.version, manifest.version);
  assert.equal(versions[packageJson.version], manifest.minAppVersion);
  execFileSync(process.execPath, ['scripts/version-bump.mjs', '--check'], { stdio: 'pipe' });
  execFileSync(process.execPath, ['scripts/check-release.mjs', '--tag', `v${packageJson.version}`], { stdio: 'pipe' });
  execFileSync(process.execPath, ['scripts/check-text-encoding.mjs'], { stdio: 'pipe' });
});

test('release workflow runs the verification suite and ships the license', () => {
  const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
  assert.match(workflow, /npm run verify/);
  assert.match(workflow, /LICENSE/);
});
