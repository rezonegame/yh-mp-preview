import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(rootDir, relativePath), 'utf8'));
}

function writeJson(relativePath, value) {
  writeFileSync(resolve(rootDir, relativePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const packageJson = readJson('package.json');
const manifest = readJson('manifest.json');
const versions = readJson('versions.json');
const packageLock = readJson('package-lock.json');

if (!semverPattern.test(packageJson.version)) {
  throw new Error(`package.json version is not valid semver: ${packageJson.version}`);
}

const expectedManifest = { ...manifest, version: packageJson.version };
const expectedVersions = { ...versions, [packageJson.version]: manifest.minAppVersion };
const expectedLock = {
  ...packageLock,
  version: packageJson.version,
  packages: {
    ...packageLock.packages,
    '': {
      ...packageLock.packages[''],
      version: packageJson.version,
      license: packageJson.license,
    },
  },
};
const isSynced = manifest.version === packageJson.version
  && versions[packageJson.version] === manifest.minAppVersion
  && packageLock.version === packageJson.version
  && packageLock.packages?.['']?.version === packageJson.version
  && packageLock.packages?.['']?.license === packageJson.license;

if (checkOnly) {
  if (!isSynced) {
    throw new Error(
      `Version metadata is out of sync: package=${packageJson.version}, manifest=${manifest.version}, versions=${versions[packageJson.version] ?? 'missing'}`,
    );
  }
  console.log(`Version metadata is synchronized at ${packageJson.version}.`);
  process.exit(0);
}

writeJson('manifest.json', expectedManifest);
writeJson('versions.json', expectedVersions);
writeJson('package-lock.json', expectedLock);
console.log(`Synchronized manifest.json, versions.json, and package-lock.json to ${packageJson.version}.`);
