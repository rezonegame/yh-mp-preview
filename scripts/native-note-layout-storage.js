/* Obsidian CLI eval; MPPreview-Refactor-Test only. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const plugin = app.plugins.plugins['yh-mp-preview'];
    if (!plugin?.noteLayoutStore) throw new Error('Plugin storage is unavailable');
    const adapter = app.vault.adapter;
    const pluginDirectory = plugin.manifest.dir || `${app.vault.configDir}/plugins/${plugin.manifest.id}`;
    const actualPath = `${pluginDirectory}/note-layout.json`;
    const originalSettings = await adapter.exists(actualPath) ? await adapter.read(actualPath) : null;
    const sourceFile = app.vault.getAbstractFileByPath('Regression.md');
    const originalSource = await app.vault.read(sourceFile);
    const directory = `_test-artifacts/config-directory-${Date.now()}`;
    if (!await adapter.exists('_test-artifacts')) await adapter.mkdir('_test-artifacts');
    if (await adapter.exists(directory)) throw new Error('Test directory already exists');
    await adapter.mkdir(directory);
    const Store = plugin.noteLayoutStore.constructor;
    const store = new Store(adapter, directory);
    const checks = [];
    const check = (name, pass) => {
        checks.push({ name, pass: Boolean(pass) });
        if (!pass) throw new Error(name);
    };
    check('installed store uses actual plugin directory', plugin.noteLayoutStore.filePath === actualPath);
    await store.load();
    await store.updateSettings({ enabled: true });
    const baseline = store.getSettings();
    check('custom directory receives the settings file', await adapter.exists(`${directory}/note-layout.json`));
    await store.setDefaultProfile({ ...baseline.defaults, fontSize: 20 });
    const reloaded = new Store(adapter, directory);
    await reloaded.load();
    check('custom directory survives reload', reloaded.getSettings().defaults.fontSize === 20);
    check('backup stays under the custom directory', (await reloaded.listBackups()).every(item => item.path.startsWith(directory + '/')));
    await reloaded.restoreLatestBackup();
    check('backup restore preserves original profile', JSON.stringify(reloaded.getSettings()) === JSON.stringify(baseline));
    const unchangedSettings = await adapter.exists(actualPath) ? await adapter.read(actualPath) : null;
    check('installed plugin configuration remains unchanged', unchangedSettings === originalSettings);
    check('Markdown remains unchanged', await app.vault.read(sourceFile) === originalSource);
    return { version: plugin.manifest.version, vault: app.vault.getName(), checks, artifacts: directory,
        limitation: 'Custom storage directory exercised with the real store and vault adapter; vault configDir was not changed.' };
})();
