import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

const repository = 'rezonegame/yh-mp-preview', tag = '3.20.0';
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const release = JSON.parse(gh('api', `repos/${repository}/releases/tags/${tag}`));
const latest = JSON.parse(gh('api', `repos/${repository}/releases/latest`));
assert.equal(release.tag_name, tag);
assert.equal(latest.tag_name, tag);
assert.equal(release.draft, false);
assert.equal(release.prerelease, false);
const commit = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim();
const runs = JSON.parse(gh('run', 'list', '--repo', repository, '--workflow', 'release.yml', '--limit', '20', '--json', 'databaseId,headSha,headBranch,status,conclusion'));
const run = runs.find(item => item.headBranch === tag && item.headSha === commit);
assert.ok(run, 'Release CI not found');
assert.equal(run.status, 'completed');
assert.equal(run.conclusion, 'success');
const paths = ['main.js', 'manifest.json', 'styles.css', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md',
  'LICENSES/MIT-original.txt', 'LICENSES/DOMPurify.txt', 'LICENSES/html2canvas.txt',
  'LICENSES/nanoid.txt', 'LICENSES/pangu.txt', 'LICENSES/Microsoft-helpers.txt', 'LICENSES/babel-helpers.txt'];
assert.deepEqual(release.assets.map(item => item.name).sort(), paths.map(path => basename(path)).sort());
const promotion = JSON.parse(readFileSync('reports/release-3.20.0-promotion.json', 'utf8'));
const assets = paths.map(path => {
  const name = basename(path), bytes = readFileSync(`output/refactor/release-3.20.0-assets/${name}`);
  assert.deepEqual(bytes, execFileSync('git', ['show', `${tag}:${path}`], { maxBuffer: 8 * 1024 * 1024 }), `Tagged bytes differ: ${name}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const remote = release.assets.find(item => item.name === name);
  assert.equal(bytes.length, remote.size);
  assert.equal(remote.digest, `sha256:${sha256}`);
  if (promotion.assets[name]) assert.equal(sha256, promotion.assets[name], `Promotion bytes differ: ${name}`);
  return { name, size: bytes.length, sha256, url: remote.browser_download_url };
});
const manifest = JSON.parse(readFileSync('output/refactor/release-3.20.0-assets/manifest.json', 'utf8'));
assert.equal(manifest.version, tag);
assert.equal(manifest.id, 'yh-mp-preview');
assert.equal(manifest.minAppVersion, '1.7.2');
const report = {
  version: tag, repository, commit, verifiedAt: new Date().toISOString(), publishedAt: release.published_at, url: release.html_url,
  status: 'GitHub stable published; CI passed; all 13 downloaded assets match tagged source and GitHub digests',
  latestStable: latest.tag_name, isDraft: false, isPrerelease: false,
  ci: { ...run, url: `https://github.com/${repository}/actions/runs/${run.databaseId}` }, assets,
  acceptedBeta: '3.20.0-beta.1', acceptedRuntimeAndStylesUnchanged: true,
  priorReleaseAssetsOverwritten: false, pluginIdMigrated: false, marketingVaultModified: false,
  brat: 'User accepted beta; no new stable-version installation run during promotion',
  officialDirectory: 'Tracked separately; GitHub publication is not official-directory or application-installation verification'
};
writeFileSync('reports/release-3.20.0-publication.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version: tag, commit, assets: assets.length, status: report.status, url: report.url }));
