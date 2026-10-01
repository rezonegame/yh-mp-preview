import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const line = readFileSync('output/refactor/native-workbench-layout.log','utf8').split(/\r?\n/).filter(item=>item.startsWith('=> {')).at(-1);
assert.ok(line,'Missing successful native UI result');
const result = JSON.parse(line.slice(3));
assert.ok(result.results.every(check=>check.pass === true));
const manifest = JSON.parse(readFileSync('manifest.json','utf8'));
assert.equal(result.version,manifest.version,'Native test version differs from candidate');
const assets = Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>{
    const current=readFileSync(name);
    assert.equal(Buffer.compare(current,readFileSync(`output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/${manifest.id}/${name}`)),0,`Native test asset differs: ${name}`);
    return [name,createHash('sha256').update(current).digest('hex')];
}));
const output = {
    status:'tested release candidate; publication and BRAT status recorded in execution ledger',version:manifest.version,previousVersion:'3.18.0-beta.1',
    host:'Obsidian 1.13.7',platform:'Windows',scope:'MPPreview-Refactor-Test only; Marketing plugin/config/notes untouched',
    assets,checks:result.results,dimensions:result.dimensions,
    visualEvidence:['workbench-520-light.png','workbench-375-dark.png'].map(name=>({name,sha256:createHash('sha256').update(readFileSync('output/refactor/'+name)).digest('hex')})),
    limitations:['No BRAT installation of this candidate; GitHub release verification is recorded separately in the execution ledger.','This test covers interface layout and enhancement selection; it does not repeat the prior full image-export/clipboard/platform matrix.'],
};
writeFileSync('reports/workbench-layout-regression.json',JSON.stringify(output,null,2)+'\n');
console.log(`Recorded ${result.results.length} passing native UI checks and two screenshot hashes for ${manifest.version}.`);
