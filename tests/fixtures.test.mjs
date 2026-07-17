import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/article-fixtures.json', import.meta.url), 'utf8'));

for (const fixture of fixtures) {
  test(`fixture ${fixture.id} includes its required Markdown features`, () => {
    const content = readFileSync(new URL(`./fixtures/articles/${fixture.file}`, import.meta.url), 'utf8');
    assert.ok(content.trim().length > 0);
    for (const marker of fixture.requiredMarkers) {
      assert.ok(content.includes(marker), `${fixture.file} is missing ${marker}`);
    }
  });
}
