import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const report = JSON.parse(read('reports/source-provenance-audit.json'));
const normalize = text => text.replace(/\r\n/g, '\n').trim();
function files(path) {
  return readdirSync(new URL(path + '/', root), { withFileTypes: true }).flatMap(entry => {
    const name = path + '/' + entry.name;
    return entry.isDirectory() ? files(name) : entry.isFile() ? [name] : [];
  }).sort();
}

test('source report covers and hashes the entire current source without claiming clearance', () => {
  assert.deepEqual(report.files.map(entry => entry.path).sort(), files('src'));
  for (const entry of report.files) {
    const bytes = readFileSync(new URL(entry.path, root));
    const content = /\.(png|jpg|jpeg|webp)$/i.test(entry.path) ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n');
    assert.equal(entry.sha256, createHash('sha256').update(content).digest('hex'), entry.path);
    assert.match(entry.workingTreeSha256, /^[a-f0-9]{64}$/);
  }
  assert.match(report.methodology.contentDigest, /CRLF normalized to LF/);
  assert.equal(report.pluginVersion, JSON.parse(read('manifest.json')).version);
  assert.equal(report.upstream.commit, '49e77aabd62b7c01a812a10e457cf7a12e45199e');
  assert.equal(report.upstream.blobIntegrityVerified, true);
  assert.equal(report.summary.independentImplementationVerified, false);
  assert.equal(report.summary.officialSourceGate, 'unresolved-no-public-consent-evidence');
  assert.equal(report.summary.identicalFiles, report.files.filter(entry => entry.identicalUpstreamPaths.length).length);
  assert.equal(report.summary.identicalMethodBodies, report.identicalMethods.length);
  assert.equal(report.summary.longTokenRuns, report.longTokenRuns.length);
  for (const key of ['identicalFiles', 'identicalMethodBodies', 'longTokenRuns', 'cssFilesWithRetainedRules']) {
    assert.equal(report.summary[key], 0, `Rebuilt sources must not reintroduce audited exact matches: ${key}`);
  }
});

test('old QR resources are absent while personal contact and historical attribution remain', () => {
  for (const path of ['src/assets/donate.ts', 'src/assets/qrcode.ts', 'src/assets/donate/alipay.png', 'src/assets/donate/wechat_pay.png']) {
    assert.equal(existsSync(new URL(path, root)), false, path);
    assert.ok(report.removedLegacyResources.some(entry => entry.path === path));
  }
  assert.equal(existsSync(new URL('src/donateManager.ts', root)), false);
  assert.match(read('src/personalContact.ts'), /assets\/personal-wechat\.png/);
  assert.doesNotMatch(read('src/personalContact.ts'), /待补充|支持二维码|公众号二维码/);
  assert.match(read('LICENSES/MIT-original.txt'), /Copyright \(c\) 2025 夜半Yeban/);
  for (const path of ['README.md', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) {
    assert.match(read(path), /Yeban8090\/mp-preview/);
    assert.match(read(path), /SOURCE_PROVENANCE/);
  }
});

test('full runtime licenses match installed packages and are retained in future releases', () => {
  const workflow = read('.github/workflows/release.yml');
  for (const [name, license] of [['html2canvas', 'html2canvas'], ['nanoid', 'nanoid'], ['pangu', 'pangu'], ['dompurify', 'DOMPurify']]) {
    const path = `LICENSES/${license}.txt`;
    assert.equal(normalize(read(path)), normalize(read(`node_modules/${name}/LICENSE`)), name);
    assert.ok(workflow.includes(path), path);
    assert.match(read('THIRD_PARTY_NOTICES.md'), new RegExp(license));
  }
  for (const name of ['Microsoft-helpers', 'babel-helpers']) {
    assert.ok(workflow.includes(`LICENSES/${name}.txt`));
    assert.match(read(`LICENSES/${name}.txt`), /Copyright/);
    assert.match(read(`LICENSES/${name}.txt`), /Permission/);
  }
  assert.equal(normalize(read('LICENSES/Microsoft-helpers.txt')), normalize(read('node_modules/tslib/LICENSE.txt')));
  assert.match(read('NOTICE'), /not a\s+claim that all upstream implementation/);
});
