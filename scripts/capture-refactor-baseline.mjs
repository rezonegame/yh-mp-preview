import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const ref = '411ead4';
const upstream = '49e77aabd62b7c01a812a10e457cf7a12e45199e';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const jsonAt = file => JSON.parse(git('show', `${ref}:${file}`));
const original = JSON.parse(execFileSync('gh', ['api', `repos/Yeban8090/mp-preview/git/trees/${upstream}?recursive=1`], { encoding: 'utf8' }));
const origins = new Map(original.tree.filter(file => file.type === 'blob').map(file => [file.path, file.sha]));
const sources = git('ls-tree', '-r', ref, 'src').split('\n').map(line => {
  const [meta, path] = line.split('\t');
  const blob = meta.split(' ')[2];
  const upstreamBlob = origins.get(path);
  return { path, blob, upstreamBlob: upstreamBlob || null,
    classification: !upstreamBlob ? 'maintainer-added-path-review-required' : blob === upstreamBlob ? 'identical-upstream-blob' : 'retained-or-reworked-review-required',
    upstreamLicense: upstreamBlob ? 'MIT' : null,
    reviewNote: 'Path and blob comparison is provenance evidence, not a copyright or independent-implementation verdict.' };
});
const stable = JSON.parse(execFileSync('gh', ['release', 'view', 'v3.15.0', '--json', 'assets'], { encoding: 'utf8' }));
const baseline = {
  schemaVersion: 1, capturedDate: '2026-09-30', baselineCommit: git('rev-parse', ref),
  stableCommit: git('rev-parse', 'v3.15.0^{commit}'), stableTag: 'v3.15.0', upstreamCommit: upstream,
  manifest: jsonAt('manifest.json'), package: jsonAt('package.json'),
  themeIds: sources.filter(file => /^src\/templates\/.*\.json$/.test(file.path)).map(file => jsonAt(file.path).id).sort(),
  stableAssets: stable.assets.map(asset => ({ name: asset.name, size: asset.size, digest: asset.digest })),
  sources,
  boundaries: ['No production vault was read or modified.', 'QR resource placeholders are already in the baseline.', 'Historical source attribution remains applicable.'],
};
writeFileSync('reports/refactor-baseline.json', JSON.stringify(baseline, null, 2) + '\n');
console.log(`Captured ${sources.length} source entries and ${baseline.stableAssets.length} stable assets.`);
