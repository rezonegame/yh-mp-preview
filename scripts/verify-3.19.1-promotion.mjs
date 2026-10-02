import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const candidate=JSON.parse(readFileSync('reports/preview-workspace-regression.json','utf8'));
const manifest=JSON.parse(readFileSync('manifest.json','utf8'));
assert.equal(candidate.version,'3.19.1-beta.1');
assert.equal(manifest.version,'3.19.1');
const hashes=Object.fromEntries(['main.js','styles.css','manifest.json'].map(name=>[name,createHash('sha256').update(readFileSync(name)).digest('hex')]));
for (const name of ['main.js','styles.css']) assert.equal(hashes[name],candidate.assets[name],`${name} changed after acceptance`);
const prior=JSON.parse(readFileSync(`output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/${manifest.id}/manifest.json`,'utf8'));
assert.equal(prior.version,candidate.version);
assert.deepEqual({...prior,version:manifest.version},manifest,'Manifest changed beyond version');
writeFileSync('reports/release-3.19.1-promotion.json',JSON.stringify({
    date:'2026-10-02',version:manifest.version,candidateVersion:candidate.version,
    status:'prepared stable promotion; publication is recorded separately',
    acceptance:'User confirmed testing passed and explicitly authorized publication.',
    runtimeAndStylesByteIdentical:true,manifestOnlyVersionChanged:true,assets:hashes,
    retainedCandidateEvidence:'reports/preview-workspace-regression.json',
    rollbackVersion:'3.19.0',minimumHost:manifest.minAppVersion,desktopOnly:manifest.isDesktopOnly,
    limits:['No new stable-version native host matrix: runtime and stylesheet bytes are identical to the accepted final candidate.',
        'Background system clipboard skip and cross-platform limitations remain as recorded in candidate evidence.',
        'GitHub publication does not prove official application-directory synchronization or installation.'],
},null,2)+'\n');
console.log('Stable promotion verified: accepted JavaScript/CSS unchanged; manifest changes only version.');
