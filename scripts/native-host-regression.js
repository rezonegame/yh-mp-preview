/* Run with Obsidian CLI eval, only against the generated isolated test vault. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing to test a real vault');
    const results = [];
    globalThis.mpRefactorTestProgress = 'starting';
    const check = (name, condition, detail = null) => {
        globalThis.mpRefactorTestProgress = name;
        results.push({ name, pass: Boolean(condition), detail });
        if (!condition) throw new Error(name + ': ' + JSON.stringify(detail));
    };
    const plugin = app.plugins.plugins['yh-mp-preview'];
    const view = app.workspace.getLeavesOfType('yh-mp-preview')[0]?.view;
    if (!plugin || !view) throw new Error('Open the plugin preview first');
    const file = app.vault.getAbstractFileByPath('Regression.md');
    const second = app.vault.getAbstractFileByPath('Second.md');
    const source = await app.vault.read(file);
    const originalSettings = plugin.settingsManager.getSettings();
    const initialTheme = document.body.className;
    const sidebar = app.workspace.rightSplit.containerEl;
    const sidebarStyle = sidebar.getAttribute('style');
    // Only the test harness uses a desktop clock; plugin timers are untouched.
    const delay = ms => new Promise(resolve => require('timers').setTimeout(resolve, ms));
    const article = () => view.previewEl.querySelector('.mp-content-section');
    const dimensions = [];
    const galleryDocument = () => [document, plugin.settingTab.containerEl.ownerDocument].find(doc=>doc.querySelector('.mp-theme-gallery-modal')) || document;
    try {
        galleryDocument().querySelector('.mp-theme-gallery-modal .modal-close-button')?.click();
        view.session.headerEnabled=false; view.session.footerEnabled=false;
        await view.onFileOpen(file);
        check('real Markdown renderer preserves both dialogue blocks', article().querySelectorAll('[data-container="dialogue"]').length === 2);
        view.toggleHeader(); view.toggleFooter();
        check('header and footer inside article boundary', article().firstElementChild.classList.contains('mp-custom-header') && article().lastElementChild.classList.contains('mp-custom-footer'));
        for (const width of [320, 375, 414, 469, 508, 600]) {
            sidebar.style.width = width + 'px';
            await delay(100);
            view.previewEl.scrollTop = 0;
            const root = view.containerEl.querySelector('.mp-view-content');
            const controls = [...root.querySelectorAll('button,select,input,summary')].filter(el => el.getBoundingClientRect().width > 0);
            const bounds = root.getBoundingClientRect();
            const overflow = controls.filter(el => { const r = el.getBoundingClientRect(); return r.left < bounds.left - 1 || r.right > bounds.right + 1; }).map(el => el.textContent || el.getAttribute('aria-label'));
            dimensions.push({ width, paneWidth: view.containerEl.clientWidth, articleWidth: article().clientWidth, articleHeight: article().scrollHeight, previewHeight: view.previewEl.clientHeight, overflow });
            check('workbench controls fit ' + width, overflow.length === 0, overflow);
            check('article has no horizontal overflow ' + width, article().scrollWidth <= article().clientWidth + 1);
            if ([414,469,508].includes(width)) check('actual article width ' + (width - 94), article().clientWidth === width - 94);
        }
        const snapshotAdaptive = await view.createExportSnapshot();
        const adaptive = { width: snapshotAdaptive.width, height: snapshotAdaptive.height };
        snapshotAdaptive.cleanup();
        // Apply the viewport projection directly: background windows may defer ResizeObserver eligibility updates.
        view.previewEl.classList.add('mp-phone-preview');
        const snapshotPhone = await view.createExportSnapshot();
        check('phone mode does not change export width or article height', snapshotPhone.width === adaptive.width && snapshotPhone.height === adaptive.height, {adaptive, phone:{width:snapshotPhone.width,height:snapshotPhone.height}});
        check('full export includes article below viewport', snapshotPhone.height > view.previewEl.clientHeight * 3 && snapshotPhone.element.textContent.includes('END - OF - ARTICLE'));
        snapshotPhone.cleanup(); view.previewEl.classList.remove('mp-phone-preview');
        const before = JSON.stringify(plugin.settingsManager.getSettings());
        view.openThemeGallery();
        await delay(100);
        const galleryDoc=galleryDocument();
        const cards = galleryDoc.querySelectorAll('.mp-theme-card');
        const alternate = [...cards].find(card => card.dataset.themeId !== originalSettings.templateId);
        if (alternate) {
            alternate.focus(); alternate.click();
            check('gallery keeps keyboard focus after selection', galleryDoc.activeElement === alternate);
            galleryDoc.querySelector('.mp-gallery-btn-cancel').click();
            check('gallery cancel restores persisted theme without writes', before === JSON.stringify(plugin.settingsManager.getSettings()) && view.getActiveWechatTemplateId() === originalSettings.templateId);
        } else throw new Error('No alternative theme in gallery fixture');
        await plugin.settingsManager.updateSettings({v3:{...originalSettings.v3, selectedRecipeId:'tutorial'}});
        view.applyPresentation(view.previewEl); view.applyPresentation(view.previewEl);
        const labels = article().querySelectorAll('.mp-recipe-step-label').length;
        check('repeated recipe does not duplicate labels', labels === article().querySelectorAll('ol > li,ul > li').length, {labels});
        await plugin.settingsManager.updateSettings(originalSettings);
        view.applyPresentation(view.previewEl);
        const leaf = app.workspace.getLeaf('split');
        await leaf.setViewState({type:'yh-mp-preview',active:false});
        const other = leaf.view;
        try {
            await other.onFileOpen(second);
            other.applyThemeTrial('deep-reading');
            check('theme trial is isolated per preview pane', view.getActiveWechatTemplateId() === originalSettings.templateId && other.getActiveWechatTemplateId() === 'deep-reading');
        } finally { leaf.detach(); }
        const originalRead = app.vault.cachedRead;
        let release;
        const blocked = new Promise(resolve => { release=resolve; });
        app.vault.cachedRead = function(input) { return input.path === file.path ? blocked : originalRead.call(this,input); };
        try {
            const oldRender = view.updatePreview();
            await view.onFileOpen(second);
            release(source); await oldRender;
            check('late previous render cannot overwrite new article', article().textContent.includes('第二篇文章') && !article().textContent.includes('第一个组件'));
        } finally { app.vault.cachedRead=originalRead; }
        await view.onFileOpen(file); view.toggleHeader(); view.toggleFooter();
        const downloads = [];
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() { if(this.download) downloads.push({name:this.download,url:this.href,bytes:fetch(this.href).then(response=>response.arrayBuffer())}); else originalClick.call(this); };
        const button = document.createElement('button');
        try {
            globalThis.mpRefactorTestProgress = 'rendering long image';
            await view.exportLongImage(button);
            globalThis.mpRefactorTestProgress = 'exporting HTML';
            await view.exportHtmlFragment(button);
            globalThis.mpRefactorTestProgress = 'rendering segmented images';
            await view.exportSegmentedImages(button);
        } finally { HTMLAnchorElement.prototype.click=originalClick; }
        const long = downloads.find(item => /yh-mp-preview-\d+\.png$/.test(item.name));
        const html = downloads.find(item => item.name.endsWith('.html'));
        const segments = downloads.filter(item => /-\d+\.png$/.test(item.name) && item !== long);
        check('all export adapters generate complete artifacts', long && html && segments.length > 1, {names:downloads.map(item=>item.name)});
        const artifacts = '_test-artifacts';
        if(!await app.vault.adapter.exists(artifacts)) await app.vault.adapter.mkdir(artifacts);
        const pngSizes=[];
        for(const [index,item] of downloads.entries()) {
            const bytes = await item.bytes;
            await app.vault.adapter.writeBinary(artifacts+'/'+item.name,bytes);
            if(item.name.endsWith('.png')) {
                const blob = new Blob([bytes], {type:'image/png'});
                const image = await createImageBitmap(blob);
                pngSizes.push({name:item.name,width:image.width,height:image.height}); image.close();
            } else check('HTML contains header, footer and final article text', new TextDecoder().decode(bytes).includes('END - OF - ARTICLE') && new TextDecoder().decode(bytes).includes('测试头部') && new TextDecoder().decode(bytes).includes('测试尾部'));
        }
        check('long image covers full article', pngSizes[0].height > view.previewEl.clientHeight * 3);
        if(document.visibilityState === 'visible' && document.hasFocus()) {
            const copyButton = view.containerEl.querySelector('.mp-copy-button');
            check('copy action is enabled after export', !copyButton.disabled);
            copyButton.click();
            await delay(50); // The event wrapper starts the action in a microtask.
            // Wait for the async copy receipt, not an assumed fixed duration.
            const deadline = Date.now() + 10000;
            while (copyButton.textContent === '复制中...' && Date.now() < deadline) await delay(50);
            check('copy action reports successful completion', copyButton.textContent.startsWith('复制成功'), {
                text: copyButton.textContent, focused: document.hasFocus(),
                notices: [...document.querySelectorAll('.notice')].map(node => node.textContent),
            });
            const clipboard = await navigator.clipboard.read();
            const htmlBlob = await clipboard[0].getType('text/html');
            const copied = await htmlBlob.text();
            check('real system clipboard contains full canonical article', copied.includes('END - OF - ARTICLE') && copied.includes('测试头部') && copied.includes('测试尾部'));
        } else results.push({name:'real system clipboard contains full canonical article',pass:null,skipped:'background-clipboard',detail:'Foreground access required; do not claim background clipboard verification.'});
        check('source Markdown remains unchanged', await app.vault.read(file) === source);
        return JSON.stringify({vault:app.vault.getName(),platform:navigator.platform,devicePixelRatio,results,dimensions,pngSizes,artifacts});
    } finally {
        galleryDocument().querySelector('.mp-theme-gallery-modal .modal-close-button')?.click();
        await plugin.settingsManager.updateSettings(originalSettings);
        document.body.className=initialTheme;
        if(sidebarStyle === null) sidebar.removeAttribute('style'); else sidebar.setAttribute('style',sidebarStyle);
        await view.onFileOpen(file); view.previewEl.scrollTop=0;
    }
})()
