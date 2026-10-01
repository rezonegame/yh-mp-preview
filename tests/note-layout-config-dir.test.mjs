import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModule } from './helpers/dom-runtime.mjs';

const { NoteLayoutStore, resolveNoteLayoutDirectory } = await loadModule('src/core/note-layout/noteLayoutStore.ts', `
  export function normalizePath(path) { return path.replaceAll('\\\\', '/').replace(/\\/+/g, '/').replace(/\\/$/, ''); }
`);

function memoryAdapter() {
  const files = new Map();
  const directories = new Set();
  return {
    files,
    async exists(path) { return files.has(path) || directories.has(path); },
    async read(path) { assert.ok(files.has(path), `Missing file ${path}`); return files.get(path); },
    async write(path, value) { files.set(path, value); },
    async mkdir(path) { directories.add(path); },
    async remove(path) { files.delete(path); },
    async rename(from, to) { assert.ok(files.has(from)); files.set(to, files.get(from)); files.delete(from); },
    async list(path) { return { files: [...files.keys()].filter(key => key.startsWith(path + '/')), folders: [] }; },
  };
}

test('note layout resolves the actual vault configuration directory rather than a default folder', () => {
  assert.equal(resolveNoteLayoutDirectory('.custom-settings', 'yh-mp-preview'), '.custom-settings/plugins/yh-mp-preview');
  assert.equal(resolveNoteLayoutDirectory('.obsidian', 'yh-mp-preview'), '.obsidian/plugins/yh-mp-preview');
});

test('the actual installed plugin directory takes precedence over the fallback', () => {
  assert.equal(resolveNoteLayoutDirectory('.custom-settings', 'yh-mp-preview', '.installed/plugins/yh-mp-preview'), '.installed/plugins/yh-mp-preview');
  assert.equal(resolveNoteLayoutDirectory('.custom-settings', 'yh-mp-preview', '  '), '.custom-settings/plugins/yh-mp-preview');
});

test('missing storage locations fail without guessing a directory or writing files', () => {
  const adapter = memoryAdapter();
  assert.throws(() => new NoteLayoutStore(adapter, ''), /配置目录不可用/);
  assert.throws(() => resolveNoteLayoutDirectory('', 'yh-mp-preview'), /配置目录不可用/);
  assert.throws(() => resolveNoteLayoutDirectory('.custom', ''), /配置目录不可用/);
  assert.equal(adapter.files.size, 0);
});

test('custom-directory settings survive saves, reload, backup and restore', async () => {
  const adapter = memoryAdapter();
  const directory = resolveNoteLayoutDirectory('.custom-settings', 'yh-mp-preview');
  const store = new NoteLayoutStore(adapter, directory);
  await store.load();
  await store.updateSettings({ enabled: true });
  const baseline = store.getSettings();
  await store.setDefaultProfile({ ...baseline.defaults, fontSize: 20 });
  const reloaded = new NoteLayoutStore(adapter, directory);
  await reloaded.load();
  assert.equal(reloaded.getSettings().defaults.fontSize, 20);
  assert.equal((await reloaded.listBackups()).length, 1);
  await reloaded.restoreLatestBackup();
  assert.deepEqual(reloaded.getSettings(), baseline);
  assert.ok([...adapter.files.keys()].every(path => path.startsWith(directory + '/')));
  assert.ok(![...adapter.files.keys()].some(path => path.startsWith('.obsidian/')));
});

test('existing directory settings remain readable without migration or rewriting', async () => {
  const adapter = memoryAdapter();
  const directory = resolveNoteLayoutDirectory('.obsidian', 'yh-mp-preview');
  const original = new NoteLayoutStore(adapter, directory).getSettings();
  original.files['笔记.md'] = { mode: 'custom', profile: { ...original.defaults, themeId: 'minimal' } };
  const raw = JSON.stringify(original);
  adapter.files.set(directory + '/note-layout.json', raw);
  const store = new NoteLayoutStore(adapter, directory);
  await store.load();
  assert.deepEqual(store.getSettings(), original);
  assert.equal(adapter.files.get(directory + '/note-layout.json'), raw);
  assert.equal(adapter.files.size, 1);
});
