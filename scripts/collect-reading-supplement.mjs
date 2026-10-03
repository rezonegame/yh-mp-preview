import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const text=readFileSync('output/refactor/reading-themes-supplement.log','utf8').trim();
assert.ok(text.startsWith('=> '),'Native supplement did not return evidence');
const result=JSON.parse(text.slice(3));
assert.equal(result.version,'3.21.0-beta.1');
assert.ok(result.checks.every(check=>check.pass===true));
assert.equal(result.dimensions.length,24);assert.equal(result.captures.length,42);
assert.equal(result.assetHash,JSON.parse(readFileSync('reports/reading-theme-host-regression.json','utf8')).assets['main.js']);
const report={version:result.version,verifiedAt:new Date().toISOString(),scope:'Isolated Windows Obsidian 1.13.7; production binary unchanged',...result,
  firstAttempt:'Harness selector corrected; first complete measurement failed report serialization of ArrayBuffer. Neither failed attempt counted as a pass.',
  clipboardDiagnostics:{foreground:true,documentVisible:true,webWriteRead:'OS formats=[]; ClipboardItem types=[[]]',electronWriteRead:'OS formats=[]; plain/html marker reads both false',ui:'Window activation failed; capture returned black window. No input sent to an unknown surface.',verified:false},
  wechatBackend:{status:'Blocked by browser site-safety policy; no alternate surface or workaround attempted',manualAcceptanceRequested:true,passed:false},
  stablePublication:{version:'3.20.0',changed:false,reason:'P2 backend/manual acceptance gate not yet satisfied'}};
writeFileSync('reports/reading-theme-supplement.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:result.checks.length,dimensions:result.dimensions.length,captures:result.captures.length,largeP95:result.performance[1].p95}));
