import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=path=>{const line=readFileSync(path,'utf8').split(/\r?\n/).findLast(line=>line.startsWith('=> {'));assert.ok(line,`No completed result: ${path}`);return JSON.parse(line.slice(3));};
const matrix=read('output/refactor/native-reading-themes.log');
const gallery=read('output/refactor/reading-themes-gallery.log');
const workspace=read('output/refactor/reading-themes-workspace.log');
const host=read('output/refactor/reading-themes-export.log');
const legacy=read('output/refactor/reading-themes-legacy.log');
const original=read('output/refactor/native-theme-output-legacy.log');
const output=read('output/refactor/reading-themes-output.log');
const performance=read('output/refactor/reading-themes-performance.log');
const baseline=read('output/refactor/native-theme-performance-legacy.log');
for(const group of [matrix.checks,gallery.checks,workspace.results,host.results,output.checks])assert.ok(group.every(item=>item.pass||['background-clipboard','environment-clipboard-empty'].includes(item.skipped)));
assert.equal(matrix.matrix.length,42);assert.ok(matrix.matrix.every(item=>item.actualWidth===item.width&&item.overflow.length===0&&item.lowContrast.length===0));
assert.deepEqual(legacy.outputs,original.outputs);assert.equal(Object.keys(legacy.outputs).length,114);assert.ok(legacy.sourceUnchanged&&legacy.dataUnchanged);
assert.equal(output.outputs.length,84);assert.ok(performance.p95<=Math.max(150,baseline.p95*1.25));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
mkdirSync('reports/assets/reading-themes',{recursive:true});
const visuals=matrix.captures.map(entry=>{const path='reports/assets/reading-themes/'+entry.path.split('/').at(-1);copyFileSync('output/refactor/MPPreview-Refactor-Test/'+entry.path,path);return {...entry,path,sha256:sha(readFileSync(path))};});
const version=JSON.parse(readFileSync('manifest.json','utf8')).version;
const report={version,verifiedAt:new Date().toISOString(),host:'Windows Obsidian 1.13.7 / DPR2',scope:'Isolated MPPreview-Refactor-Test only; Marketing untouched',assets:Object.fromEntries(['main.js','manifest.json','styles.css'].map(path=>[path,sha(readFileSync(path))])),
  matrix,gallery,workspace,legacyOutputs:{combinations:114,exactMatch:true,sourceAndDataUnchanged:true},hostRegression:host,newOutput:output,
  performance:{baseline,candidate:performance,threshold:Math.max(150,baseline.p95*1.25)},visuals,
  visualReview:{kind:'Agent design judgment, not a user blind study',pairsReviewed:7,findings:'Chapter side anchors, horizontal or double rules, open hierarchy, boxed versus editorial quotes, and spacing differ visibly without colour. Heading top spacing was removed for first titles; tiny footer was compressed after a failed 260x360 run.',scope:'375px grayscale first-viewport pair captures; full continuous coloured article still requires user/backend acceptance.'},
  limitations:['BRAT user acceptance and all 14 new revisions pasted into WeChat backend are pending; no stable promotion.',
    'Foreground minimal navigator.clipboard.write/read probe returned no OS formats or ClipboardItem types in this environment. Real clipboard verification explicitly skipped after that failure; user paste remains a gate.',
    'Default-paper matrix covers 14 themes, all ten built-in components, six headings, lists, code, links, footnotes, table and generated local image. Not remote-media/network testing.',
    'Windows/DPR2 only; minimum Obsidian 1.7.2, other OS and 100/125/150% scaling matrix not tested.',
    'Root-only flat custom-background contrast and complex-background warning; not a proof of every colour against arbitrary user backgrounds.',
    'New output snapshots cover all 84 combinations; representative new PNG artifacts are case-file/review, not 84 PNG exports.',
    'Native export regression restores isolated settings through its normal save path; the gallery/matrix and legacy fingerprints separately verify no data writes.',
    'P3 palettes/density and complete P2 manual visual/backend gates are not complete.']};
writeFileSync('reports/reading-theme-host-regression.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version,matrix:42,checks:matrix.checks.length,gallery:gallery.checks.length,workspace:workspace.results.length,host:host.results.filter(c=>c.pass).length,newOutput:output.checks.length,legacy:114,visuals:7,p95:performance.p95}));
