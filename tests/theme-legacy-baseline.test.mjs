import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { captureThemeOutputs } from './helpers/real-theme-fixture.mjs';
test('all 19 legacy themes and six recipes preserve canonical HTML, text and order',async()=>{
  const baseline=JSON.parse(readFileSync('reports/theme-experience-legacy-baseline.json','utf8'));
  assert.deepEqual(await captureThemeOutputs(),baseline.outputs);
});
