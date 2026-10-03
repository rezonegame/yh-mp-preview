/* Real BRAT release installation, restricted to the agent-owned test vault. */
(async () => {
    const expectedVault = 'C:/AgentTest/github/mp-preview/output/refactor/MPPreview-Refactor-Test';
    const fs = require('fs'), path = require('path'), crypto = require('crypto');
    if (app.vault.getName() !== 'MPPreview-Refactor-Test' || path.resolve(app.vault.adapter.getBasePath()).toLowerCase() !== path.resolve(expectedVault).toLowerCase()) throw Error('Refusing a real vault');
    const brat = app.plugins.plugins['obsidian42-brat'];
    if (!brat || brat.manifest.version !== '2.2.0' || typeof brat.betaPlugins?.addPlugin !== 'function') throw Error('Unexpected BRAT API');
    if (brat.settings.globalTokenName) throw Error('This isolated public download test must not use credentials');
    const folder = path.join(expectedVault, '.obsidian/plugins/yh-mp-preview');
    const assets = 'C:/AgentTest/github/mp-preview/output/refactor/release-3.21.0-beta.1-assets';
    const dataBefore = fs.readFileSync(path.join(folder, 'data.json'));
    const file = app.workspace.getActiveFile();
    const sourceBefore = file ? await app.vault.read(file) : null;
    const hashes = value => crypto.createHash('sha256').update(value).digest('hex');
    const checks = [], downloads = [], writes = [];
    const check = (name, pass, detail = null) => { checks.push({ name, pass: !!pass, detail }); if (!pass) throw Error(name); };
    const api = brat.betaPlugins, getFiles = api.getAllReleaseFiles, writeFiles = api.writeReleaseFilesToPluginFolder;
    api.getAllReleaseFiles = async function (...args) {
        const files = await getFiles.apply(this, args);
        downloads.push({ repository: args[0], manifestBeta: args[1], specifiedVersion: args[2], mainSha256: hashes(files.mainJs), stylesSha256: hashes(files.styles), manifestVersion: JSON.parse(files.manifest).version });
        return files;
    };
    api.writeReleaseFilesToPluginFolder = async function (id, files) {
        await writeFiles.call(this, id, files);
        writes.push({ id, mainSha256: hashes(fs.readFileSync(path.join(folder, 'main.js'))) });
    };
    let result;
    try {
        result = await api.addPlugin('rezonegame/yh-mp-preview', true, false, false, '3.21.0-beta.1', true, true, '');
        check('BRAT forced pinned install succeeded', result === true);
        check('actual release downloader ran once', downloads.length === 1, downloads);
        check('release was pinned', downloads[0].specifiedVersion === '3.21.0-beta.1');
        check('plugin folder was written once', writes.length === 1 && writes[0].id === 'yh-mp-preview', writes);
        const manifests = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
        check('installed ID preserved', manifests.id === 'yh-mp-preview');
        check('installed version preserved', manifests.version === '3.21.0-beta.1');
        for (const name of ['main.js', 'styles.css']) {
            const installed = fs.readFileSync(path.join(folder, name)), published = fs.readFileSync(path.join(assets, name));
            check(name + ' matches published beta byte for byte', installed.equals(published), { sha256: hashes(installed) });
        }
        const publishedManifest = fs.readFileSync(path.join(assets, 'manifest.json'));
        check('manifest metadata equals published beta', require('util').isDeepStrictEqual(manifests, JSON.parse(publishedManifest)), { byteIdentical: fs.readFileSync(path.join(folder, 'manifest.json')).equals(publishedManifest), scope: 'BRAT serializes manifest JSON; compare all parsed fields rather than formatting' });
        check('plugin enabled after reload', app.plugins.enabledPlugins.has('yh-mp-preview'));
        check('live plugin reports beta version', app.plugins.plugins['yh-mp-preview']?.manifest.version === '3.21.0-beta.1');
        check('settings preserved byte for byte', dataBefore.equals(fs.readFileSync(path.join(folder, 'data.json'))));
        check('source Markdown unchanged', !file || await app.vault.read(file) === sourceBefore);
        check('BRAT frozen version registered', brat.settings.pluginSubListFrozenVersion.some(item => item.repo === 'rezonegame/yh-mp-preview' && item.version === '3.21.0-beta.1'));
        return { status: 'passed', checkedAt: new Date().toISOString(), scope: 'Isolated forced reinstall of an existing beta via real BRAT 2.2.0; not a stable-to-beta migration, UI click test, or human acceptance', vault: expectedVault, version: manifests.version, checks, downloads, writes, stableReleased: false, userAccepted: false };
    } finally {
        api.getAllReleaseFiles = getFiles;
        api.writeReleaseFilesToPluginFolder = writeFiles;
    }
})()
