import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const tagIndex = args.indexOf('--tag');
const expectedTag = tagIndex >= 0 ? args[tagIndex + 1] : undefined;
const requireBuild = args.includes('--require-build');
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const packageJson = readJson('package.json');
const manifest = readJson('manifest.json');
const versions = readJson('versions.json');
const workflow = readFileSync(resolve(rootDir, '.github/workflows/release.yml'), 'utf8');
const license = readFileSync(resolve(rootDir, 'LICENSE'), 'utf8');

assert(semverPattern.test(packageJson.version), `Invalid package version: ${packageJson.version}`);
assert(manifest.version === packageJson.version, 'manifest.json version must match package.json');
assert(versions[packageJson.version] === manifest.minAppVersion, 'versions.json must contain the current manifest minAppVersion');
assert(packageJson.scripts['sync-version'], 'package.json must expose sync-version');
assert(packageJson.scripts.verify, 'package.json must expose verify');
assert(license.includes('MIT License'), 'v2.0.11 must retain the MIT license');
assert(existsSync(resolve(rootDir, 'NOTICE')), 'Release must include NOTICE');
assert(existsSync(resolve(rootDir, 'CHANGELOG.md')), 'Release must include CHANGELOG.md');
assert(workflow.includes('npm run verify'), 'Release workflow must run the verification suite');
assert(workflow.includes('LICENSE'), 'Release workflow must ship LICENSE');

if (expectedTag) {
  assert(expectedTag === `v${packageJson.version}`, `Tag ${expectedTag} does not match v${packageJson.version}`);
}

if (requireBuild) {
  for (const relativePath of ['main.js', 'styles.css']) {
    assert(existsSync(resolve(rootDir, relativePath)), `Missing build artifact: ${relativePath}`);
  }
}

console.log(`Release metadata is valid for v${packageJson.version}.`);
