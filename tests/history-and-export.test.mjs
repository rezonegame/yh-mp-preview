import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settings = readFileSync(new URL('../src/settings/settings.ts', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/view.ts', import.meta.url), 'utf8');

test('layout snapshots preserve the user-selected local typesetting settings', () => {
  assert.match(settings, /layoutSnapshots: LayoutSnapshot\[\]/);
  assert.match(settings, /saveLayoutSnapshot/);
  assert.match(settings, /restoreLayoutSnapshot/);
  assert.match(view, /contentHash: this\.hashText\(content\)/);
});

test('local export supports HTML fragments and fixed-ratio image segments', () => {
  assert.match(view, /exportHtmlFragment/);
  assert.match(view, /text\/html;charset=utf-8/);
  assert.match(view, /exportSegmentedImages/);
  assert.match(view, /canvas\.width \* 4 \/ 3/);
});
