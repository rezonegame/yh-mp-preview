import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

const repository = 'rezonegame/yh-mp-preview', tag = '3.19.0';
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const release = JSON.parse(gh('release', 'view', tag, '--repo', repository, '--json', 'tagName,isDraft,isPrerelease,url,assets,publishedAt'));
assert.equal(release.tagName, tag);
assert.equal(release.isDraft, false);
assert.equal(release.isPrerelease, false);
const latest = JSON.parse(gh('api', `repos/${repository}/releases/latest`));
assert.equal(latest.tag_name, tag);
const commit = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim();
const runs = JSON.parse(gh('run', 'list', '--repo', repository, '--workflow', 'release.yml', '--limit', '20', '--json', 'databaseId,headSha,headBranch,status,conclusion'));
const run = runs.find(item => item.headBranch === tag && item.headSha === commit);
assert.ok(run);
assert.equal(run.status, 'completed');
assert.equal(run.conclusion, 'success');
const paths = [
  'main.js', 'manifest.json', 'styles.css', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md',
  'LICENSES/MIT-original.txt', 'LICENSES/DOMPurify.txt', 'LICENSES/html2canvas.txt',
  'LICENSES/nanoid.txt', 'LICENSES/pangu.txt', 'LICENSES/Microsoft-helpers.txt', 'LICENSES/babel-helpers.txt',
];
assert.deepEqual(release.assets.map(item => item.name).sort(), paths.map(path => basename(path)).sort());
const verification = JSON.parse(readFileSync('reports/release-3.19-verification.json', 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = paths.map(path => {
  const name = basename(path);
  const bytes = readFileSync(`output/refactor/release-3.19-assets/${name}`);
  const expected = execFileSync('git', ['show', `${tag}:${path}`], { maxBuffer: 8 * 1024 * 1024 });
  assert.deepEqual(bytes, expected, `Published bytes differ from tagged source: ${name}`);
  if (verification.assets[name]) assert.equal(hash(bytes), verification.assets[name], `Native-tested bytes differ: ${name}`);
  const remote = release.assets.find(item => item.name === name);
  assert.equal(bytes.length, remote.size);
  return { name, size: bytes.length, sha256: hash(bytes), url: remote.url };
});
const manifest = JSON.parse(readFileSync('output/refactor/release-3.19-assets/manifest.json', 'utf8'));
assert.equal(manifest.version, tag);
assert.equal(manifest.id, 'yh-mp-preview');
const report = {
  version: tag, repository, commit, publishedAt: release.publishedAt, url: release.url,
  status: 'published stable; CI passed; downloaded assets byte-verified against tag and native-tested core files',
  latestStable: latest.tag_name, isDraft: false, isPrerelease: false,
  ci: { ...run, url: `https://github.com/${repository}/actions/runs/${run.databaseId}` },
  assets, priorReleaseAssetsOverwritten: false, pluginIdMigrated: false, marketingVaultModified: false,
  brat: 'Same repository and three-file contract; actual BRAT installation UI not run',
  officialDirectory: 'Separate draft review; source qualification unresolved, not a publication claim',
};
writeFileSync('reports/release-3.19-publication.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ version: tag, commit, assets: assets.length, status: report.status, url: report.url }));
