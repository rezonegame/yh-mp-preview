import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const readResult = path => {
  const line=readFileSync(path,'utf8').split(/\r?\n/).filter(line=>line.startsWith('=> {')).at(-1);
  assert.ok(line,`Missing successful native result: ${path}`);
  return JSON.parse(line.slice(3));
};
const host=readResult('output/refactor/native-host-3.18-final-3.log');
const media=readResult('output/refactor/native-media-3.18-final.log');
const settings=readResult('output/refactor/native-settings-final-3.log');
assert.ok(host.results.every(result=>result.pass === true || result.skipped === 'background-clipboard'));assert.ok(media.pass && settings.pass);
const priorClipboard=readResult('output/refactor/native-host-3.18.log').results.find(result=>result.name==='real system clipboard contains full canonical article');
assert.equal(priorClipboard?.pass,true);
const manifest=JSON.parse(readFileSync('manifest.json','utf8'));
const assets=Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>{
  const current=readFileSync(name);
  assert.equal(Buffer.compare(current,readFileSync(`output/refactor/MPPreview-Refactor-Test/.obsidian/plugins/${manifest.id}/${name}`)),0,`Test vault ${name} differs from candidate`);
  return [name,createHash('sha256').update(current).digest('hex')];
}));
const output={version:manifest.version,host:'Obsidian 1.13.7',platform:host.platform,devicePixelRatio:host.devicePixelRatio,
  scope:'Generated MPPreview-Refactor-Test vault only; Marketing plugin/config/notes untouched',assets,
  checks:host.results,dimensions:host.dimensions,pngSizes:host.pngSizes,
  priorForegroundClipboard:{...priorClipboard,version:'3.18.0-beta.1',scope:'Earlier candidate build before final About/Help focus adjustment; final background-only run skips clipboard access.'},
  media:{pass:media.pass,images:media.embedded.length,allEmbedded:media.embedded.every(Boolean),width:media.width,height:media.height,sourceUnchanged:media.sourceUnchanged},
  settings:settings.results,
  visualEvidence:['native-375-light.png','native-gallery-dark-final.png','native-settings-dark.png','native-about-dark.png'].map(name=>({name,sha256:createHash('sha256').update(readFileSync('output/refactor/'+name)).digest('hex')})),
  limitations:['PNG/HTML download handlers were captured to the isolated vault; OS Save As dialogs were not automated.',
    'No WeChat backend paste or BRAT installation of this candidate yet; no older host/macOS/Android/iOS or exhaustive scaling matrix.',
    'External requestUrl operations cannot be physically aborted; timeout/cancellation discards late results.',
    'Native capture API returned wrong-window images for some form screenshots; these were excluded, not treated as visual evidence.']};
writeFileSync('reports/refactor-host-regression.json',JSON.stringify(output,null,2)+'\n');
console.log(`Recorded ${host.results.length} article/output checks, ${settings.results.length} settings checks and ${media.embedded.length} native images.`);
