import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { captureThemeOutputs } from '../tests/helpers/real-theme-fixture.mjs';
const files=[...readdirSync('src/templates').filter(name=>name.endsWith('.json')).map(name=>'src/templates/'+name),
  'src/core/theme/wechatReadingBaseline.ts','src/core/theme/templateStylePlan.ts','src/core/theme/applyWechatComponentPalette.ts',
  'src/backgroundManager.ts','src/core/recipe/articleRecipeFormatter.ts'];
const output={source:'3.19.1 / 834e87e77fead70e7819c807cc1cee45837d1b86',
  fingerprints:Object.fromEntries(files.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')])),
  outputs:await captureThemeOutputs()};
writeFileSync('reports/theme-experience-legacy-baseline.json',JSON.stringify(output,null,2)+'\n');
console.log(`Captured ${Object.keys(output.outputs).length} real presentation / canonical output combinations.`);
