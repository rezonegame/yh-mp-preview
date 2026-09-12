import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildSync } from 'esbuild';

const entryPoint = new URL('../src/core/theme/legacyThemeAdapter.ts', import.meta.url);
const compiled = buildSync({
  entryPoints: [fileURLToPath(entryPoint)],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  write: false,
}).outputFiles[0].text;
const { adaptLegacyTemplate } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('legacy theme adapter tolerates incomplete persisted v2 themes', () => {
  const result = adaptLegacyTemplate({
    id: 'academic-pro-slate',
    name: 'Incomplete legacy theme',
    styles: {
      paragraph: 'color: #334155;',
      title: {},
    },
  });

  assert.equal(result.id, 'academic-pro-slate');
  assert.equal(result.tokens.text, '#334155');
  assert.equal(result.components.find((component) => component.id === 'heading-2').legacyStyle, '');
  assert.equal(result.components.find((component) => component.id === 'code-block').legacyStyle, '');
});
