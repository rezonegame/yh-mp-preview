import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const baseline = '3.18.0-beta.2';
const manifest = JSON.parse(readFileSync('manifest.json','utf8'));
assert.equal(manifest.version,'3.18.0');
const previous = JSON.parse(readFileSync(`output/refactor/release-${baseline}/manifest.json`,'utf8'));
assert.deepEqual({...manifest,version:previous.version},previous,'Stable manifest changed beyond version');
assert.equal(execFileSync('git',['diff','--name-only',baseline,'--','src'],{encoding:'utf8'}).trim(),'','Runtime source changed after acceptance');
for(const name of ['package.json','package-lock.json']) {
    const accepted=JSON.parse(execFileSync('git',['show',`${baseline}:${name}`],{encoding:'utf8'}));
    const current=JSON.parse(readFileSync(name,'utf8'));
    current.version=accepted.version;
    if(name === 'package-lock.json') current.packages[''].version=accepted.packages[''].version;
    assert.deepEqual(current,accepted,`${name} changed beyond version`);
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>{
    const bytes=readFileSync(name);
    if(name !== 'manifest.json') assert.equal(Buffer.compare(bytes,readFileSync(`output/refactor/release-${baseline}/${name}`)),0,`${name} differs from accepted beta.2`);
    return [name,hash(bytes)];
}));
const log=readFileSync('output/refactor/verify-3.18-stable.log','utf8');
const tests={total:Number(log.match(/tests\s+(\d+)/)?.[1]),passed:Number(log.match(/pass\s+(\d+)/)?.[1]),failed:Number(log.match(/fail\s+(\d+)/)?.[1])};
assert.ok(tests.total>0 && tests.total === tests.passed && tests.failed === 0,'Stable automatic regression did not pass');
const published=process.argv.includes('--published');
const releaseAssets = [
    ['main.js','main.js'],['manifest.json','manifest.json'],['styles.css','styles.css'],
    ['LICENSE','LICENSE'],['NOTICE','NOTICE'],['THIRD_PARTY_NOTICES.md','THIRD_PARTY_NOTICES.md'],
    ['MIT-original.txt','LICENSES/MIT-original.txt'],['DOMPurify.txt','LICENSES/DOMPurify.txt'],
];
if(published) for(const [name,path] of releaseAssets) {
    // License files are copied from Git by CI; Windows checkout can transform LF into CRLF.
    const expected=['main.js','manifest.json','styles.css'].includes(name)
        ? readFileSync(path) : execFileSync('git',['show',`${manifest.version}:${path}`]);
    assert.equal(Buffer.compare(expected,readFileSync(`output/refactor/release-${manifest.version}/${name}`)),0,`Published asset differs: ${name}`);
}
const report={version:manifest.version,acceptedBaseline:baseline,status:published?'downloaded release assets match local build':'verified stable candidate; GitHub publication pending',
    runtimeSourceUnchanged:true,runtimeAssetsUnchanged:['main.js','styles.css'],manifestOnlyVersionChanged:true,dependenciesUnchanged:true,tests,assets,
    publishedAssetsVerified:published?releaseAssets.map(([name])=>name):[],
    licenseAssetByteSource:published?'canonical Git blobs at the stable tag; not Windows checkout line endings':null,
    maintainerAcceptance:'Maintainer reported beta.2 had no problems and explicitly approved stable publication; see execution ledger.',
    nativeEvidence:{version:baseline,file:'reports/workbench-layout-regression.json',scope:'Reuse accepted beta.2 evidence because runtime code/styles are byte-identical; no new stable-host test is claimed.'},
    limitations:['No new BRAT installation by the agent or writes to the Marketing vault.','Stable publication does not imply WeChat-backend/platform-matrix testing or official-directory approval.']};
writeFileSync('reports/stable-release-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(`Stable ${manifest.version}: ${tests.passed} tests; runtime/dependencies identical to accepted ${baseline}; published files verified: ${published}.`);
