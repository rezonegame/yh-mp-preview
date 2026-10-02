import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const readResult=path=>{
    const lines=readFileSync(path,'utf8').split(/\r?\n/);
    const line=lines.filter(line=>line.startsWith('=> {')||line.startsWith('=> [')).at(-1);
    assert.ok(line,`Missing completed native result ${path}`);return JSON.parse(line.slice(3));
};
const legacy=readResult('output/refactor/native-theme-output-legacy.log');
const candidate=readResult('output/refactor/native-theme-output-candidate.log');
assert.deepEqual(candidate.outputs,legacy.outputs);assert.equal(Object.keys(candidate.outputs).length,114);
assert.ok(legacy.dataUnchanged&&candidate.dataUnchanged&&legacy.sourceUnchanged&&candidate.sourceUnchanged);
const gallery=readResult('output/refactor/native-theme-experience-gallery.log');
const workspace=readResult('output/refactor/native-theme-experience-workspace.log');
const host=readResult('output/refactor/native-theme-experience-full.log');
assert.ok(gallery.checks.every(check=>check.pass));assert.ok(workspace.results.every(check=>check.pass));
assert.ok(host.results.every(check=>check.pass||check.skipped==='background-clipboard'));
const assets=Object.fromEntries(['main.js','manifest.json','styles.css'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const visuals=readResult('output/refactor/native-theme-experience-visuals.log');
const version=JSON.parse(readFileSync('manifest.json','utf8')).version;
const performanceBaseline=readResult('output/refactor/native-theme-performance-legacy.log');
const performanceCandidate=readResult('output/refactor/native-theme-performance-candidate.log');
assert.ok(performanceCandidate.p95<=Math.max(150,performanceBaseline.p95*1.25));
const report={version,host:'Obsidian 1.13.7 Windows',scope:'MPPreview-Refactor-Test only; Marketing not modified',assets,
  performance:{baseline:performanceBaseline,candidate:performanceCandidate,threshold:Math.max(150,performanceBaseline.p95*1.25),pass:true},
  legacyOutputs:{version:legacy.version,combinations:114,exactMatch:true,sourceAndDataUnchanged:true,outputs:candidate.outputs},
  gallery,workspace,hostRegression:host,visuals:visuals.map(entry=>{
    const path='reports/assets/'+entry.path.split('/').at(-1);assert.ok(existsSync(path));return {...entry,path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')};
  }),
  limitations:['No user BRAT acceptance or WeChat-backend paste of this candidate yet. Stable track unchanged.',
    'Windows Obsidian 1.13.7 / devicePixelRatio 2 only. Older hosts, other OS and explicit 100/125/150% scaling matrix not tested.',
    'Real system clipboard foreground access skipped; canonical copying and complete HTML/image output checked separately.',
    'OS Save As dialogs not automated; native download artifacts captured in the isolated test vault.',
    'Frozen definitions guarantee the 3.19.1 revision, not every earlier historical visual revision.',
    'P2 structural themes / background priority and P3 palettes / density not implemented before P1 acceptance.']};
writeFileSync('reports/theme-experience-host-regression.json',JSON.stringify(report,null,2)+'\n');
console.log(`Recorded ${gallery.checks.length} gallery checks, ${workspace.results.length} workspace checks, ${host.results.filter(check=>check.pass).length} host/output checks, 114 exact legacy outputs.`);
