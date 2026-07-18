import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/core/theme/legacyThemeAdapter.ts', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'esm', target: 'es2020' }).code;
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
