import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { officialReleaseIssues } from '../scripts/official-release-contract.mjs';

const current = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const stable = { ...current, version: '3.19.0' };

test('official metadata accepts an explicit numeric version and matching bare tag', () => {
  assert.deepEqual(officialReleaseIssues(stable, '3.19.0'), []);
});
test('BRAT prereleases cannot be mistaken for official-directory release metadata', () => {
  const beta = { ...stable, version: '3.19.0-beta.1' };
  assert.ok(officialReleaseIssues(beta, beta.version).some(issue => issue.includes('prerelease')));
});
test('official metadata rejects missing, prefixed and mismatched tags', () => {
  for (const tag of [undefined, 'v3.19.0', '3.18.0']) {
    assert.ok(officialReleaseIssues(stable, tag).some(issue => issue.includes('tag')));
  }
});
test('official metadata validates descriptions and explicit host compatibility', () => {
  for (const description of ['', 'Missing period', 'x'.repeat(251) + '.']) {
    assert.ok(officialReleaseIssues({ ...stable, description }, '3.19.0').some(issue => issue.includes('Description')));
  }
  assert.ok(officialReleaseIssues({ ...stable, minAppVersion: 'latest', isDesktopOnly: undefined }, '3.19.0').length >= 2);
});
