(async()=>{
    if(app.vault.getName()!=='MPPreview-Refactor-Test')throw new Error('Refusing a real vault');
    const plugin=app.plugins.plugins['yh-mp-preview'],manager=plugin.settingsManager;
    const view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const original=manager.getSettings(),file=app.vault.getAbstractFileByPath('Regression.md');
    const before=await app.vault.read(file), dataBefore=await app.vault.adapter.read('.obsidian/plugins/yh-mp-preview/data.json');
    const hash=value=>require('crypto').createHash('sha256').update(value).digest('hex');
    const outputs={};
    try {
        for(const theme of original.templates)for(const recipe of ['legacy-compatible','tutorial','checklist','product-intro','commentary','review']) {
            const draft=structuredClone(original);draft.templateId=theme.id;draft.v3.selectedRecipeId=recipe;
            manager.repository.initialize(draft);view.trialTemplateId=null;
            await view.onFileOpen(file);view.session.headerEnabled=true;view.session.footerEnabled=true;await view.updatePreview();
            const article=view.previewEl.querySelector('.mp-content-section');
            article.querySelector(':scope > p').append(' 手工内容标记');
            outputs[theme.id+'/'+recipe]={sha256:hash(article.outerHTML),textHash:hash(article.textContent),head:article.firstElementChild.tagName,tail:article.lastElementChild.textContent};
        }
        return JSON.stringify({version:plugin.manifest.version,outputs,sourceUnchanged:before===await app.vault.read(file),dataUnchanged:dataBefore===await app.vault.adapter.read('.obsidian/plugins/yh-mp-preview/data.json')});
    } finally {manager.repository.initialize(original);view.trialTemplateId=null;await view.onFileOpen(file);}
})()
