(async()=>{
    if(app.vault.getName()!=='MPPreview-Refactor-Test')throw new Error('Refusing a real vault');
    const plugin=app.plugins.plugins['yh-mp-preview'],view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const file=app.vault.getAbstractFileByPath('Regression.md'),original=plugin.settingsManager.getSettings();
    const delay=ms=>new Promise(resolve=>require('timers').setTimeout(resolve,ms));
    let modal;
    try {
        await view.onFileOpen(file);const article=view.previewEl.querySelector('.mp-content-section');
        const paragraph=article.querySelector(':scope > p');
        while(article.textContent.length<5500)article.appendChild(paragraph.cloneNode(true));
        const chars=article.textContent.length;
        view.openThemeGallery();modal=view.gallery || {contentEl:document.querySelector('.mp-theme-gallery-modal .modal-content'),close:()=>document.querySelector('.mp-gallery-btn-cancel').click()};
        const selector=modal.contentEl.querySelector('.mp-gallery-selector');if(selector)selector.open=true;
        await delay(60);
        const values=[];
        for(let index=0;index<22;index++) {
            const id=index%2?'default':'deep-reading';const card=modal.contentEl.querySelector(`[data-theme-id="${id}"]`);
            const start=performance.now();card.click();if(modal.transaction)await modal.transaction.pending;
            view.previewEl.querySelector('.mp-content-section').getBoundingClientRect();
            const host=modal.contentEl.querySelector('.mp-gallery-preview-host');host?.shadowRoot?.querySelector('.mp-content-section')?.getBoundingClientRect();
            if(index>1)values.push(performance.now()-start);
        }
        const sorted=values.slice().sort((a,b)=>a-b);
        const last=view.getActiveWechatTemplateId();
        if(last!=='default')throw new Error('Rapid switches did not end with the final selected theme');
        return JSON.stringify({version:plugin.manifest.version,chars,iterations:20,p50:sorted[9],p95:sorted[18],values,last,
            includes:modal.transaction?'main trial, shared sanitizer and layout flush':'legacy trial and layout flush'});
    } finally {modal?.close();await view.onFileOpen(file);if(JSON.stringify(plugin.settingsManager.getSettings())!==JSON.stringify(original))throw new Error('Benchmark changed settings');}
})()
