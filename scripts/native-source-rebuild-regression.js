/* Run only with Obsidian CLI eval vault=MPPreview-Refactor-Test. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const plugin = app.plugins.plugins['yh-mp-preview'];
    const view = app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const file = app.vault.getAbstractFileByPath('Regression.md');
    const source = await app.vault.read(file);
    const originalTheme = document.body.className;
    const sidebar = app.workspace.rightSplit.containerEl;
    const originalStyle = sidebar.getAttribute('style');
    const checks = [], codeContrasts = [];
    const check = (name, pass, detail = null) => { checks.push({ name, pass: Boolean(pass), detail }); if (!pass) throw new Error(name + ': ' + JSON.stringify(detail)); };
    const lum = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    try {
        app.setting.close(); await view.onFileOpen(file);
        view.setPreviewLocked(true);
        check('pause state reports pressed and accurate label', view.lockButton.getAttribute('aria-pressed') === 'true' && view.lockButton.title.includes('暂停'));
        await view.togglePreviewLock();
        check('resume updates all lock accessibility attributes', view.lockButton.getAttribute('aria-pressed') === 'false' && view.lockButton.title.includes('实时预览中'));
        view.toggleEditMode();
        check('manual edit automatically locks with the same accessible state', view.isPreviewLocked && view.lockButton.getAttribute('aria-pressed') === 'true');
        view.toggleEditMode(); await view.onFileOpen(file);
        check('file opening resets lock attributes', view.lockButton.getAttribute('aria-pressed') === 'false');
        view.applySeoText('ISOLATED-HIDDEN-TEXT');
        check('hidden-text insertion uses shared lock state', view.isPreviewLocked && view.lockButton.getAttribute('aria-pressed') === 'true');
        await view.onFileOpen(file);
        for (const hostTheme of ['theme-light', 'theme-dark']) {
            document.body.classList.remove('theme-light', 'theme-dark'); document.body.classList.add(hostTheme);
            for (const template of plugin.settingsManager.getSettings().templates) {
                view.applyThemeTrial(template.id);
                const pre = view.previewEl.querySelector('pre'), code = pre.querySelector('code');
                const text = getComputedStyle(code).color, background = getComputedStyle(pre).backgroundColor;
                const ratio = (Math.max(lum(text), lum(background)) + .05) / (Math.min(lum(text), lum(background)) + .05);
                const tokens = [...code.querySelectorAll('.token')];
                codeContrasts.push({ hostTheme, id: template.id, text, background, ratio });
                check(hostTheme + ' code theme color and contrast ' + template.id, ratio >= 4.5 && tokens.every(token => getComputedStyle(token).color === text), { ratio });
            }
        }
        check('Markdown remains unchanged after theme and lock tests', await app.vault.read(file) === source);
        app.setting.open(); app.setting.openTabById(plugin.manifest.id); plugin.settingTab.display();
        [...plugin.settingTab.containerEl.querySelectorAll('button')].find(button => button.textContent === '个人联系').click();
        const owner = plugin.settingTab.containerEl.ownerDocument;
        const dialog = owner.querySelector('.mp-about-modal');
        const image = dialog.querySelector('img'); await image.decode();
        const bounds = dialog.getBoundingClientRect();
        check('personal QR is the only image and loaded with original dimensions', dialog.querySelectorAll('img').length === 1 && image.naturalWidth === 940 && image.naturalHeight === 1395 && image.src.startsWith('data:image/png;base64,'));
        check('contact dialog fits the actual host and has no horizontal overflow', bounds.left >= 0 && bounds.right <= owner.defaultView.innerWidth && bounds.top >= 0 && bounds.bottom <= owner.defaultView.innerHeight && dialog.scrollWidth <= dialog.clientWidth);
        check('personal contact has no promotion or article image insertion', !/打赏|公众号|待补充/.test(dialog.textContent) && !view.previewEl.querySelector('.mp-personal-qr'));
        dialog.querySelector('button').click();
        const baseline = JSON.stringify(plugin.settingsManager.getSettings());
        plugin.settingTab.containerEl.querySelectorAll('.settings-section').forEach(section => { if (!section.classList.contains('is-expanded')) section.querySelector('.settings-section-header').click(); });
        [...plugin.settingTab.containerEl.querySelectorAll('button')].find(button => button.textContent.includes('新建背景')).click();
        const modal = owner.querySelector('.mp-background-modal');
        const mode = modal.querySelector('.background-basic-section select'); mode.value = 'css'; mode.dispatchEvent(new owner.defaultView.Event('change'));
        const pattern = modal.querySelector('.background-css-section select');
        const generated = [...pattern.options].filter(option => option.value !== 'custom');
        for (const option of generated) {
            pattern.value = option.value; pattern.dispatchEvent(new owner.defaultView.Event('change'));
            check('native background pattern parses ' + option.value, modal.querySelector('.background-preview').style.backgroundImage !== '');
        }
        [...modal.querySelectorAll('button')].find(button => button.textContent === '取消').click();
        check('pattern editor cancellation leaves all settings unchanged', JSON.stringify(plugin.settingsManager.getSettings()) === baseline);
        app.setting.close();
        return JSON.stringify({ version: plugin.manifest.version, checks, codeContrasts });
    } finally {
        plugin.settingTab.containerEl.ownerDocument.querySelector('.mp-donate-close')?.click();
        app.setting.close();
        view.session.trialTemplateId = null;
        document.body.className = originalTheme;
        if (originalStyle === null) sidebar.removeAttribute('style'); else sidebar.setAttribute('style', originalStyle);
        await view.onFileOpen(file); view.applyPresentation(view.previewEl);
    }
})()
