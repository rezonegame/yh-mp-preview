import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

const dom = createDom();
const { SettingsManager } = await loadModule('src/settings/settings.ts');
const seed = JSON.parse(readFileSync('src/templates/default.json', 'utf8'));
const ids = readdirSync('src/templates').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/templates/${name}`, 'utf8')).id);

function fixture(id) {
  return {
    schemaVersion: 3, templateId: id, themeCatalogVersion: 1,
    templates: [{ id: 'default', isVisible: false }],
    customTemplates: [{ ...structuredClone(seed), id: 'my-theme', isVisible: false, unknownExtension: { preserve: true } }],
    backgroundId: 'my-background', customBackgrounds: [{ id: 'my-background', name: '背景', style: 'background:#eee;', unknownExtension: 7 }],
    fontFamily: 'My Font, serif', fontSize: 18, customFonts: [{ label: '字体', value: 'My Font, serif' }],
    customHeader: '<p>头</p>', customFooter: '<p>尾</p>', unknownSetting: { preserve: true },
    v3: { enabled: true, selectedRecipeId: 'tutorial', migrationSource: 'v2' },
    layoutSnapshots: [{ id: 'old-snapshot', templateId: id, backgroundId: 'my-background', fontFamily: 'My Font, serif', fontSize: 18, recipeId: 'tutorial', createdAt: '2026-01-01', filePath: 'fixture.md', contentHash: 'fixture', validation: { errors: 0, warnings: 1 } }],
  };
}

for (const id of [...ids, 'my-theme']) {
  test(`saved selection ${id}, custom fields and snapshot survive load/save/reload`, async () => {
    let saved = fixture(id);
    const plugin = { loadData: async () => structuredClone(saved), saveData: async value => { saved = structuredClone(value); } };
    const manager = new SettingsManager(plugin);
    await manager.loadSettings();
    assert.equal(manager.getSettings().templateId, id);
    assert.equal(manager.getTemplate('default').isVisible, false);
    assert.equal(manager.getTemplate('my-theme').unknownExtension.preserve, true);
    await manager.restoreLayoutSnapshot(saved.layoutSnapshots[0]);
    const restarted = new SettingsManager(plugin); await restarted.loadSettings();
    assert.equal(restarted.getSettings().templateId, id);
    assert.deepEqual(restarted.getSettings().unknownSetting, { preserve: true });
    assert.equal(restarted.getSettings().customBackgrounds[0].unknownExtension, 7);
    assert.equal(restarted.getSettings().layoutSnapshots[0].id, 'old-snapshot');
    assert.equal(restarted.getSettings().customHeader, '<p>头</p>');
    assert.equal(restarted.getSettings().v3.selectedRecipeId, 'tutorial');
  });
}
test.after(() => dom.window.close());
