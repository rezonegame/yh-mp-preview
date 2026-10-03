/* Production quote/canonical output checked in the isolated native host. */
(async () => {
    const fs = require('fs'), path = require('path'), crypto = require('crypto');
    const base = 'C:/AgentTest/github/mp-preview/output/refactor/MPPreview-Refactor-Test';
    if (app.vault.getName() !== 'MPPreview-Refactor-Test' || path.resolve(app.vault.adapter.getBasePath()).toLowerCase() !== path.resolve(base).toLowerCase()) throw Error('Refusing a real vault');
    const plugin = app.plugins.plugins['yh-mp-preview'];
    if (plugin.manifest.version !== '3.21.0-beta.2') throw Error('Install tested candidate first');
    const view = app.workspace.getLeavesOfType('yh-mp-preview')[0]?.view;
    if (!view) throw Error('Preview must be open');
    const manager = plugin.settingsManager, original = manager.getSettings(), oldFile = view.currentFile;
    const dataPath = path.join(base, '.obsidian/plugins/yh-mp-preview/data.json'), dataBefore = fs.readFileSync(dataPath);
    const source = '# 手机引用验证\n\n## 章节标题\n\n这是用于手机阅读的正文。\n\n> 引用第一段应保持完整，中文 English 与链接、强调都不能丢失。\n>\n> 第二段 **重点**。\n>\n> > 嵌套引用仍要保持层级。\n\n完整末尾 QUOTE-END。\n';
    const fixturePath = '_test-artifacts/Quote-Mobile.md';
    let file = app.vault.getAbstractFileByPath(fixturePath);
    if (file) { if (await app.vault.read(file) !== source) throw Error('Unexpected fixture'); } else file = await app.vault.create(fixturePath, source);
    const ids = ['default','deep-reading','clear-guide','knowledge-notes','apple-product','product-review','red-white-editorial','ink-opinion','data-blueprint','briefing-grid','zen-essence','warm-paper','olive-journal','case-file'];
    const openIds = new Set(['deep-reading','apple-product','ink-opinion','zen-essence']);
    const checks = [], outputs = [], captures = [];
    const check = (name, pass, detail = null) => { checks.push({ name, pass: !!pass, detail }); if (!pass) throw Error(name + ': ' + JSON.stringify(detail)); };
    const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    const board = document.createElement('div'); board.className = 'mp-quote-fixture';
    board.style.cssText = 'position:fixed;top:4px;left:4px;width:375px;max-height:900px;overflow:hidden;background:white;z-index:99999;';
    document.body.append(board);
    const hostile = document.createElement('style');
    hostile.textContent = '.mp-quote-fixture blockquote{border-left:4px solid #c00000;width:100%;max-width:none;margin:1em 40px;padding:16px;box-sizing:content-box;}';
    const wc = require('electron').remote.getCurrentWebContents();
    const delay = ms => new Promise(resolve => require('timers').setTimeout(resolve, ms));
    try {
        for (const id of ids) {
            const settings = structuredClone(original); settings.templateId = id; settings.backgroundId = 'default'; settings.fontSize = 16; settings.v3.selectedRecipeId = 'legacy-compatible';
            settings.wechatAppearance = { schemaVersion: 1, referencesById: { [id]: { id, kind: 'builtin', revision: 'reading-2026.1' } }, preferencesByReference: {} };
            manager.repository.initialize(settings); view.trialAppearance = null; view.trialTemplateId = null; await view.onFileOpen(file);
            const before = view.previewEl.querySelector('.mp-content-section').outerHTML;
            const snapshot = await view.createExportSnapshot();
            try {
                const canonical = snapshot.element.cloneNode(true);
                check(id + ' quote nesting and text preserved', canonical.querySelectorAll('blockquote').length === 2 && /QUOTE\s*-\s*END/.test(canonical.textContent) && canonical.querySelector('blockquote strong')?.textContent === '重点', { quotes: canonical.querySelectorAll('blockquote').length, emphasis: canonical.querySelector('blockquote strong')?.textContent, tail: canonical.textContent.slice(-90) });
                check(id + ' no initial quote border declarations', [...canonical.querySelectorAll('blockquote')].every(q => !/border-[^;:]+:\s*initial/.test(q.getAttribute('style') || '')));
                const widths = [];
                for (const width of [320,375,414]) for (const hostDefaults of [false,true]) {
                    board.style.width = width + 'px'; board.replaceChildren(); if (hostDefaults) board.append(hostile);
                    const root = canonical.cloneNode(true); root.style.width = '100%'; root.style.maxWidth = '100%'; board.append(root);
                    const bounds = root.getBoundingClientRect(), quotes = [...root.querySelectorAll('blockquote')];
                    const geometry = quotes.map(q => { const b = q.getBoundingClientRect(), css = getComputedStyle(q), parent = q.parentElement.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, parentLeft: parent.left, parentRight: parent.right, borderLeft: css.borderLeftWidth, borderRight: css.borderRightWidth }; });
                    check(id + '/' + width + '/' + hostDefaults + ' nested quotes bounded', geometry.every(q => q.left >= q.parentLeft - 1 && q.right <= q.parentRight + 1), geometry);
                    check(id + '/' + width + '/' + hostDefaults + ' paper padding remains', Math.abs(geometry[0].left - bounds.left - 20) <= 1 && Math.abs(bounds.right - geometry[0].right - 20) <= 1, geometry[0]);
                    if (openIds.has(id)) check(id + '/' + width + '/' + hostDefaults + ' no lateral border', geometry.every(q => q.borderLeft === '0px' && q.borderRight === '0px'), geometry);
                    widths.push({ width, hostDefaults, geometry });
                    if (id === 'deep-reading' && width === 375 && hostDefaults) {
                        await delay(100); const rect = { x: 4, y: 4, width: 375, height: Math.min(900, Math.ceil(root.getBoundingClientRect().height)) };
                        await wc.capturePage(rect, { stayHidden: true, stayAwake: true }); await delay(100);
                        const png = (await wc.capturePage(rect, { stayHidden: true, stayAwake: true })).toPNG();
                        const capturePath = '_test-artifacts/deep-reading-quote-fixed.png'; await app.vault.adapter.writeBinary(capturePath, png); captures.push({ path: capturePath, sha256: sha(png), scope: 'Native 375px canonical output with simulated foreign quote defaults; not WeChat backend' });
                    }
                }
                outputs.push({ id, widths });
            } finally { snapshot.cleanup(); }
            check(id + ' production source DOM unchanged by output', view.previewEl.querySelector('.mp-content-section').outerHTML === before);
        }
        check('Markdown fixture unchanged', await app.vault.read(file) === source);
        check('data.json unchanged', fs.readFileSync(dataPath).equals(dataBefore));
        return JSON.stringify({ version: plugin.manifest.version, checkedAt: new Date().toISOString(), checks, outputs, captures, bundleSha256: sha(fs.readFileSync(path.join(base, '.obsidian/plugins/yh-mp-preview/main.js'))), limits: ['Simulated ordinary quote defaults are not an actual WeChat parser or paste/save/mobile test.', 'User reported deep-reading defect in WeChat mobile; backend reacceptance is still required.', 'Native Windows Obsidian 1.13.7 only.'] });
    } finally {
        board.remove(); hostile.remove(); manager.repository.initialize(original); view.trialAppearance = null; view.trialTemplateId = null;
        if (oldFile) await view.onFileOpen(oldFile);
    }
})()
