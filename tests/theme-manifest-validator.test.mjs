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
    frameworkId: 'structured-guide',
    surfaces: ['wechat'],
    scene: '教程与知识',
    recommendation: '适合教程和方法论内容。',
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

test('rejects CSS declaration injection and remote resources in portable themes', () => {
  const manifest = validManifest();
  manifest.tokens.text = '#123456; background:url(https://unsafe.invalid)';
  manifest.tokens.fontSize = '16px; position:fixed';
  manifest.components[0].legacyStyle = 'background:u\\72l(https://unsafe.invalid)';
  const result = validateThemeManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.path === 'tokens.text'));
  assert.ok(result.issues.some(issue => issue.path === 'tokens.fontSize'));
  assert.ok(result.issues.some(issue => issue.path === 'components[0].legacyStyle'));
});
