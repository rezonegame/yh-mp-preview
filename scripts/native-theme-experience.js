/* Actual Obsidian renderer/DOM only. Never run in Marketing or another real vault. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const plugin = app.plugins.plugins['yh-mp-preview'], manager = plugin.settingsManager;
    const view = app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const originalSettings = manager.getSettings();
    const originalPersist = manager.plugin.saveData;
    const file = app.vault.getAbstractFileByPath('Regression.md');
    const source = await app.vault.read(file), dataPath = '.obsidian/plugins/yh-mp-preview/data.json';
    const dataBefore = await app.vault.adapter.read(dataPath);
    const delay = ms => new Promise(resolve => require('timers').setTimeout(resolve, ms));
    const until = async predicate => { for(let attempt=0;attempt<40&&!predicate();attempt++)await delay(100); };
    const checks = [], dimensions = [], typography = [];
    const check = (name, pass, detail = null) => { checks.push({ name, pass: !!pass, detail }); if (!pass) throw new Error(name + ': ' + JSON.stringify(detail)); };
    const article = () => view.previewEl.querySelector('.mp-content-section');
    const paper = () => view.gallery?.contentEl.querySelector('.mp-gallery-preview-host')?.shadowRoot.querySelector('.mp-content-section');
    const open = async () => { view.openThemeGallery(); await delay(80); return view.gallery; };
    const pick = id => { view.gallery.contentEl.querySelector('.mp-gallery-selector').open=true; view.gallery.contentEl.querySelector(`[data-theme-id="${id}"]`).click(); };
    const normalized = root => root.outerHTML;
    let otherLeaf = null;
    let finishPendingWrite = null;
    try {
        app.setting.close(); await view.onFileOpen(file);
        view.previewEl.classList.add('mp-phone-preview');
        const edit = article().querySelector('p'); edit.append(' 手工修改保护标记');
        const image=article().ownerDocument.createElement('img');
        image.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';image.alt='本地图示';
        image.style.cssText='display:block;width:100%;max-width:100%;height:auto;';
        const footer=article().querySelector('.mp-custom-footer');if(footer)footer.before(image);else article().appendChild(image);
        const baseline = normalized(article());
        const gallery = await open();
        check('shared current article preserves manual edit and full tail', paper().textContent.includes('手工修改保护标记') && paper().textContent.includes('END - OF - ARTICLE'));
        check('gallery uses a separate read-only shadow root', !!paper().getRootNode().host && !paper().isContentEditable);
        const firstImage=paper().querySelector('img');
        pick('deep-reading'); await delay(30);
        check('theme change reuses the existing image resource',paper().querySelector('img')===firstImage);
        const trialHtml = normalized(article()), trialId = view.getActiveWechatTemplateId();
        gallery.contentEl.querySelector('[aria-label="画廊外观对照"] button:nth-child(2)').click(); await delay(30);
        check('saved comparison does not change actual draft or export identity', normalized(article()) === trialHtml && view.getActiveWechatTemplateId() === trialId);
        gallery.contentEl.querySelector('[aria-label="画廊预览来源"] button:nth-child(2)').click(); await delay(80);
        check('example contains local sample only in gallery', paper().textContent.includes('把想法写成一篇清晰的文章') && !article().textContent.includes('本地示例不会被复制'));
        check('example and comparison leave actual current article unchanged', normalized(article()) === trialHtml && view.currentFile === file);
        gallery.close();
        check('cancel restores exact saved HTML and preserves manual edit', normalized(article()) === baseline);
        check('trial/source/comparison/cancel do not write data.json', await app.vault.adapter.read(dataPath) === dataBefore);
        const sizePairs = [[900,700],[600,460],[375,700],[320,460],[260,360]];
        for (const mode of ['theme-light','theme-dark']) {
            const initialTheme = document.body.className;
            document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(mode);
            const modal = await open();
            for (const [width,height] of sizePairs) {
                modal.modalEl.style.setProperty('width',width+'px','important');modal.modalEl.style.setProperty('height',height+'px','important');
                modal.modalEl.style.setProperty('max-width','96vw','important');modal.updateLayout();await delay(50);
                const box = modal.modalEl.getBoundingClientRect(), preview = modal.contentEl.querySelector('.mp-gallery-preview-host').getBoundingClientRect();
                const controls = [...modal.contentEl.querySelectorAll('button,input,summary')].filter(el=>el.checkVisibility() && el.getBoundingClientRect().width && el.getBoundingClientRect().height);
                const overflow = controls.filter(el=>{const r=el.getBoundingClientRect();return r.left<box.left-1||r.right>box.right+1||r.bottom>box.bottom+1}).map(el=>el.textContent||el.getAttribute('aria-label'));
                dimensions.push({mode,width:box.width,height:box.height,previewHeight:preview.height,overflow});
                check('gallery controls fit '+mode+' '+width+'x'+height,overflow.length===0,overflow);
                check('shared preview remains visible '+mode+' '+width+'x'+height,preview.height>=70,preview.height);
                const viewport=modal.contentEl.querySelector('.mp-gallery-preview-host').shadowRoot.querySelector('.viewport');
                check('gallery article does not create horizontal canvas scrolling '+mode+' '+width,viewport.scrollWidth<=viewport.clientWidth+1,{width:viewport.clientWidth,scroll:viewport.scrollWidth});
                const selector = modal.contentEl.querySelector('details'); selector.open = true;await delay(30);
                check('expanded selection and apply remain reachable '+width+'x'+height,modal.contentEl.querySelector('.mp-gallery-btn-apply').getBoundingClientRect().bottom<=box.bottom+1);
                selector.open = false;
            }
            const bodyStyle = view.previewEl.style.cssText;
            view.previewEl.style.width='500px';
            modal.modalEl.style.setProperty('width','900px','important'); modal.modalEl.style.setProperty('height','700px','important');modal.updateLayout();await delay(60);
            const main=article(), shared=paper();
            for(const selector of ['p','h2','blockquote p','img']) {
                const a=main.querySelector(selector),b=shared.querySelector(selector); if(!a||!b)continue;
                const x=getComputedStyle(a),y=getComputedStyle(b);
                const entry={mode,selector,main:{font:x.fontSize,line:x.lineHeight,width:a.getBoundingClientRect().width,margin:x.marginBottom},shared:{font:y.fontSize,line:y.lineHeight,width:b.getBoundingClientRect().width,margin:y.marginBottom}};
                typography.push(entry);check('shared typography matches '+mode+' '+selector,x.fontSize===y.fontSize&&x.lineHeight===y.lineHeight&&x.marginBottom===y.marginBottom,entry);
            }
            view.previewEl.style.cssText=bodyStyle; modal.close();document.body.className=initialTheme;
        }
        const failed = await open(); pick('deep-reading');
        manager.plugin.saveData = async () => { throw new Error('fixture disk full'); };
        failed.contentEl.querySelector('.mp-gallery-btn-apply').click();await delay(60);
        check('failed persistence retains live draft and enables retry',view.gallery===failed&&!failed.contentEl.querySelector('.mp-gallery-btn-apply').disabled&&manager.getSettings().templateId===originalSettings.templateId);
        manager.plugin.saveData=originalPersist;failed.close();
        await view.onFileOpen(file);
        const pending=await open();pick('deep-reading');pending.transaction.unknownAfterMs=20;
        manager.plugin.saveData=async data=>{await new Promise(resolve=>{finishPendingWrite=resolve;globalThis.mpThemeFixtureReleaseWrite=resolve});await originalPersist.call(manager.plugin,data)};
        pending.contentEl.querySelector('.mp-gallery-btn-apply').click();
        for(let attempt=0;attempt<40 && pending.transaction.state!=='saving-unknown';attempt++) await delay(100);
        check('uncertain save permits closing without a second write',pending.transaction.state==='saving-unknown');pending.close();
        const second=app.vault.getAbstractFileByPath('Second.md');await view.onFileOpen(second);
        const nextText=article().textContent;
        check('closing a pending save releases old article draft',view.trialTemplateId===null&&!view.galleryBaseline);
        finishPendingWrite();await manager.repository.tail;await delay(30);manager.plugin.saveData=originalPersist;
        check('late successful save does not restore an old article over the new one',view.currentFile===second&&article().textContent===nextText&&!view.gallery&&manager.getSettings().templateId==='deep-reading', {file:view.currentFile?.path,sameText:article().textContent===nextText,gallery:!!view.gallery,saved:manager.getSettings().templateId,state:pending.transaction.state});
        await manager.updateSettings(originalSettings);await view.onFileOpen(file);
        await open();pick('deep-reading');article().querySelector('p').append(' 同步编辑标记');await delay(30);
        check('manual article change invalidates draft without discarding new text',!view.gallery&&article().textContent.includes('同步编辑标记'));
        await view.onFileOpen(file);await open();pick('deep-reading');await manager.updateSettings({fontSize:18});
        check('external appearance commit invalidates stale pane trial',!view.gallery&&view.getActiveWechatTemplateId()===manager.getSettings().templateId);
        await manager.updateSettings({fontSize:originalSettings.fontSize});
        otherLeaf=app.workspace.getLeaf('split');await otherLeaf.setViewState({type:'yh-mp-preview'});const other=otherLeaf.view;await other.onFileOpen(file);
        const a=await open();pick('deep-reading');other.openThemeGallery();await delay(30);
        const b=other.gallery;
        check('two panes have independent drafts',view.getActiveWechatTemplateId()==='deep-reading'&&other.getActiveWechatTemplateId()===originalSettings.templateId);
        b.contentEl.querySelector('[data-theme-id="deep-reading"]').click();b.contentEl.querySelector('.mp-gallery-btn-apply').click();await until(()=>!view.gallery&&!other.gallery);
        check('one pane commit invalidates the other stale transaction',!view.gallery&&!other.gallery&&manager.getSettings().templateId==='deep-reading',{first:!!view.gallery,second:!!other.gallery,state:b.transaction.state,saved:manager.getSettings().templateId});
        check('source Markdown remains unchanged',await app.vault.read(file)===source);
        return JSON.stringify({version:plugin.manifest.version,host:app.getVersion?.()??'1.13.7',checks,dimensions,typography,sourceUnchanged:true});
    } finally {
        finishPendingWrite?.();delete globalThis.mpThemeFixtureReleaseWrite;
        manager.plugin.saveData=originalPersist;
        view.gallery?.invalidate();otherLeaf?.view.gallery?.invalidate();otherLeaf?.detach();
        view.previewEl.classList.remove('mp-phone-preview');
        await manager.updateSettings(originalSettings);await view.onFileOpen(file);
    }
})()
