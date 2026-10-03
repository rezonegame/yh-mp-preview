import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const line=fs.readFileSync('output/refactor/quote-beta3-output.log','utf8').split(/\r?\n/).filter(line=>line.startsWith('=> {')).at(-1);
assert(line,'Missing completed native output run');
const result=JSON.parse(line.slice(3));
assert.equal(result.version,'3.21.0-beta.3');
assert(result.checks.every(check=>check.pass));
assert.equal(result.outputs.length,84);
assert(result.sizes.length>=3);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const base='output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/yh-mp-preview/';
assert(fs.readFileSync(base+'data.json').equals(fs.readFileSync('output/refactor/quote-beta2-backup/data.json')));
const assets=Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>{
  const bytes=fs.readFileSync(name);assert(bytes.equals(fs.readFileSync(base+name)));return [name,sha(bytes)];
}));
fs.writeFileSync('reports/reading-quote-beta3-output.json',JSON.stringify({...result,checkedAt:new Date().toISOString(),assets,scope:'84 real native canonical export snapshots; representative case-file/review full HTML, long PNG and segmented PNG generation. Not all 84 PNG combinations or WeChat acceptance.',marketingModified:false,backendAccepted:false},null,2)+'\n');
console.log(JSON.stringify({version:result.version,checks:result.checks.length,outputs:result.outputs.length,pngs:result.sizes.length}));
