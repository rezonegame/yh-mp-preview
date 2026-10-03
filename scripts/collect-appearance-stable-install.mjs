import fs from 'node:fs';
import assert from 'node:assert/strict';
const line=fs.readFileSync('output/refactor/appearance-stable-install.log','utf8').split(/\r?\n/).filter(line=>line.startsWith('=> {')).at(-1);
assert(line,'Completed native result required');
const report=JSON.parse(line.slice(3));
assert.equal(report.version,'3.22.0');assert.equal(report.checks.length,12);assert(report.checks.every(check=>check.pass));
fs.writeFileSync('reports/appearance-stable-native-install.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:report.version,checks:report.checks.length,nativeInstallerPassed:true,automaticCatalogUpdateVerified:false}));
