/* Capture each actual owner WebContents, not the unrelated primary window. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const p = app.plugins.plugins['yh-mp-preview'];
    const v = app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const sidebar = app.workspace.rightSplit.containerEl;
    const initial = { theme: document.body.className, side: sidebar.getAttribute('style'), header: v.session.headerEnabled, footer: v.session.footerEnabled };
    const delay = ms => new Promise(resolve => require('timers').setTimeout(resolve, ms));
    const images = [];
    const theme = (doc, value) => { doc.body.classList.remove('theme-light', 'theme-dark'); doc.body.classList.add(value); };
    const capture = async (doc, name) => {
        const wc = doc.defaultView.require('electron').remote.getCurrentWebContents();
        if (!wc.getTitle().includes('MPPreview-Refactor-Test')) throw new Error('Wrong capture target');
        await delay(150);
        // A background Electron surface can return its preceding painted frame.
        await wc.capturePage(undefined, { stayHidden: true, stayAwake: true });
        await delay(150);
        const image = await wc.capturePage(undefined, { stayHidden: true, stayAwake: true });
        const path = '_test-artifacts/source-rebuild-' + name + '.png';
        await app.vault.adapter.writeBinary(path, image.toPNG());
        images.push({ path, title: wc.getTitle(), size: image.getSize() });
    };
    try {
        p.settingTab.containerEl.ownerDocument.querySelector('.mp-donate-close')?.click(); app.setting.close();
        v.session.headerEnabled = false; v.session.footerEnabled = false;
        await v.onFileOpen(app.vault.getAbstractFileByPath('Regression.md')); v.previewEl.scrollTop = 0;
        theme(document, 'theme-light'); sidebar.style.width = '520px'; await capture(document, 'workbench-light-final');
        theme(document, 'theme-dark'); sidebar.style.width = '375px'; await capture(document, 'workbench-dark-final');
        app.setting.open(); app.setting.openTabById(p.manifest.id); p.settingTab.display();
        const owner = p.settingTab.containerEl.ownerDocument;
        [...p.settingTab.containerEl.querySelectorAll('button')].find(button => button.textContent === '个人联系').click();
        await owner.querySelector('.mp-personal-qr').decode();
        theme(owner, 'theme-light'); await capture(owner, 'contact-light');
        owner.querySelector('.mp-donate-close').click();
        theme(owner, 'theme-dark');
        [...p.settingTab.containerEl.querySelectorAll('button')].find(button => button.textContent === '个人联系').click();
        await owner.querySelector('.mp-personal-qr').decode();
        await capture(owner, 'contact-dark');
        owner.querySelector('.mp-donate-close').click();
        p.settingTab.containerEl.querySelectorAll('.settings-section').forEach(section => { if (!section.classList.contains('is-expanded')) section.querySelector('.settings-section-header').click(); });
        [...p.settingTab.containerEl.querySelectorAll('button')].find(button => button.textContent.includes('新建背景')).click();
        const modal = owner.querySelector('.mp-background-modal');
        const mode = modal.querySelector('.background-basic-section select'); mode.value = 'css'; mode.dispatchEvent(new owner.defaultView.Event('change'));
        const pattern = modal.querySelector('.background-css-section select'); pattern.value = 'honeycomb'; pattern.dispatchEvent(new owner.defaultView.Event('change'));
        await capture(owner, 'background-form-final');
        [...modal.querySelectorAll('button')].find(button => button.textContent === '取消').click();
        return JSON.stringify({ version: p.manifest.version, images });
    } finally {
        p.settingTab.containerEl.ownerDocument.querySelector('.mp-donate-close')?.click(); app.setting.close();
        document.body.className = initial.theme;
        if (initial.side === null) sidebar.removeAttribute('style'); else sidebar.setAttribute('style', initial.side);
        v.session.headerEnabled = initial.header; v.session.footerEnabled = initial.footer;
        await v.onFileOpen(app.vault.getAbstractFileByPath('Regression.md'));
    }
})()
