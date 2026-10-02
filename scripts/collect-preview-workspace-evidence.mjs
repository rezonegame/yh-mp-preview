import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const vault='output/refactor/MPPreview-Refactor-Test';
const manifest=JSON.parse(readFileSync('manifest.json','utf8'));
const workspace=JSON.parse(readFileSync('output/refactor/native-preview-workspace-result.json','utf8'));
const exports=JSON.parse(readFileSync('reports/preview-workspace-export-regression.json','utf8'));
assert.equal(workspace.version,manifest.version);
assert.equal(exports.version,manifest.version);
assert.ok(workspace.results.every(item=>item.pass));
assert.ok(exports.results.every(item=>item.pass || item.skipped==='background-clipboard'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>{
    const bytes=readFileSync(name);
    assert.deepEqual(bytes,readFileSync(`${vault}/.obsidian/plugins/${manifest.id}/${name}`));
    return [name,hash(bytes)];
}));
const screenshots=['600x460-theme-light','375x700-theme-dark','320x460-theme-dark-settings'].map(name=>{
    const path=`${vault}/_test-artifacts/preview-priority-${name}.png`;
    return {path,sha256:hash(readFileSync(path)),inspected:true};
});
writeFileSync('reports/preview-workspace-regression.json',JSON.stringify({
    version:manifest.version,date:'2026-10-02',status:'local candidate; not published',
    host:'Obsidian 1.13.7',platform:'Windows',devicePixelRatio:exports.devicePixelRatio,
    scope:'Isolated MPPreview-Refactor-Test; Marketing untouched',assets,
    checks:workspace.results,dimensions:workspace.dimensions,screenshots,
    exportChecks:exports.results,pngSizes:exports.pngSizes,
    limits:['Native size matrix explicitly triggers window resize to avoid background ResizeObserver throttling.',
        'Foreground system clipboard was skipped in this run; canonical rich-text copy is covered by automated tests.',
        'Other computers, operating systems, host versions and DPI combinations were not tested.',
        'CLI screenshots returning preceding painted frames were rejected; accepted screenshots use double native owner-WebContents capture.'],
},null,2)+'\n');
console.log(`Recorded ${workspace.results.length} workspace checks, ${exports.results.filter(item=>item.pass).length} export/host checks, ${exports.results.filter(item=>item.skipped).length} explicit skip, three inspected screenshots.`);
