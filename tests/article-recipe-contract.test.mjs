import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildSync } from 'esbuild';

const compiled = buildSync({
  entryPoints: [fileURLToPath(new URL('../src/core/recipe/articleRecipeFormatter.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2020',
}).outputFiles[0].text;
const { normalizeArticleRecipeId } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('article recipes accept the supported local layouts and safely fall back', () => {
  for (const recipe of ['legacy-compatible', 'tutorial', 'checklist', 'product-intro', 'commentary', 'review']) {
    assert.equal(normalizeArticleRecipeId(recipe), recipe);
  }
  assert.equal(normalizeArticleRecipeId('unknown-recipe'), 'legacy-compatible');
});

test('selected article recipes are applied in both preview and copy paths', () => {
  const view = readFileSync(new URL('../src/view.ts', import.meta.url), 'utf8');
  const copyPipeline = readFileSync(new URL('../src/core/render/legacyWechatPipeline.ts', import.meta.url), 'utf8');
  assert.match(view, /applyArticleRecipe\(contentSection, settings\.v3\.selectedRecipeId,/);
  assert.match(copyPipeline, /applyArticleRecipe\(clone, plan\.recipeId, options\.palette\)/);
  assert.match(view, /applyThemeTrial\(templateId\)/);
});
