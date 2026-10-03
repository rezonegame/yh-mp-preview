import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const candidate='3.21.0-beta.1';
const git=(...args)=>execFileSync('git',args,{maxBuffer:16*1024*1024});
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const prior=path=>JSON.parse(git('show',`${candidate}:${path}`).toString());
const version=read('manifest.json').version;assert.equal(version,'3.21.0');
assert.deepEqual(read('manifest.json'),{...prior('manifest.json'),version});
assert.deepEqual(read('package.json'),{...prior('package.json'),version});
const lock=prior('package-lock.json');lock.version=version;lock.packages[''].version=version;assert.deepEqual(read('package-lock.json'),lock);
assert.equal(git('diff',candidate,'--','src','esbuild.config.mjs','.github/workflows/release.yml','LICENSE','NOTICE','LICENSES','THIRD_PARTY_NOTICES.md').toString().trim(),'','Runtime/build/notices must match candidate');
const assets={};for(const path of ['main.js','styles.css','manifest.json']){const bytes=readFileSync(path);assets[path]=createHash('sha256').update(bytes).digest('hex');if(path!=='manifest.json')assert.equal(Buffer.compare(bytes,git('show',`${candidate}:${path}`)),0,`${path} differs from tested beta`);}
for(const path of ['reports/core-theme-visual-baseline.json','reports/theme-audit.json','reports/wechat-compatibility-baseline.json','reports/source-provenance-audit.json'])assert.deepEqual(read(path),{...prior(path),pluginVersion:version},`${path} findings changed during preflight`);
const log=readFileSync('output/refactor/reading-preflight-verify.log','utf8');assert.match(log,/(?:#|ℹ)\s*tests\s+148/);assert.match(log,/(?:#|ℹ)\s*fail\s+0/);assert.match(log,/Release metadata is valid for 3\.21\.0/);
writeFileSync('reports/reading-theme-preflight.json',JSON.stringify({version,verifiedAt:new Date().toISOString(),baseline:candidate,candidateCommit:git('rev-parse',`${candidate}^{commit}`).toString().trim(),branch:git('branch','--show-current').toString().trim(),status:'Prepared numeric-version review only; not released or accepted',assets,runtimeByteIdentical:true,stylesByteIdentical:true,sourceDependenciesBuildNoticesUnchanged:true,manifestOnlyVersionChanged:true,auditFindingsUnchanged:true,automatedTests:{passed:148,failed:0},publication:{tagCreated:false,releaseCreated:false,mainChanged:false,officialUpdateSubmitted:false},gates:{wechatBackend:false,userP2Acceptance:false,clipboardRoundTrip:false},limits:['Numeric metadata only for non-publishing official branch preview.','Final stable publication and official synchronization are separate, pending manual acceptance.','Native evidence remains labelled beta; identical runtime does not turn skipped clipboard checks into passes.']},null,2)+'\n');
console.log('Numeric preflight verified: 148 tests; runtime/styles/source/dependencies/notices identical to beta; no stable publication.');
