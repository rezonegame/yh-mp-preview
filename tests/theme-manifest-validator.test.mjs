import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { transformSync } from 'esbuild';

const source = readFileSync(new URL('../src/core/theme/themeManifestValidator.ts', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'esm', target: 'es2020' }).code;
const { validateThemeManifest } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

function validManifest() {
  return {
    schemaVersion: 3,
    id: 'portable-blue',
    name: 'Portable Blue',
    version: '1.0.0',
    license: 'AGPL-3.0-or-later',
    source: 'https://example.org/theme',
    tokens: {
      accent: '#2878d4', text: '#25324a', mutedText: '#667085',
      background: '#fff', fontSize: '16px', lineHeight: '1.8',
    },
    components: [{ id: 'paragraph', legacyStyle: 'margin: 1em 0;' }],
    recipes: [{ id: 'tutorial', name: 'Tutorial', componentIds: ['steps'] }],
    compatibility: { mode: 'legacy', notes: ['Bridged to legacy renderer.'] },
  };
}

test('accepts a complete V3 theme manifest', () => {
  const result = validateThemeManifest(validManifest());
  assert.equal(result.valid, true);
  assert.equal(result.manifest.id, 'portable-blue');
});

test('rejects malformed identifiers and incomplete schema fields', () => {
  const manifest = validManifest();
  manifest.id = 'Portable Blue';
  delete manifest.tokens.lineHeight;
  manifest.compatibility.mode = 'unsupported';
  const result = validateThemeManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.path === 'id'));
  assert.ok(result.issues.some(issue => issue.path === 'tokens.lineHeight'));
  assert.ok(result.issues.some(issue => issue.path === 'compatibility'));
});
