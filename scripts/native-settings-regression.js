(async () => {
    if(app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const p=app.plugins.plugins['yh-mp-preview'];
    app.setting.open();app.setting.openTabById(p.manifest.id);
    const tab=p.settingTab;tab.display();
    const baseline=JSON.stringify(p.settingsManager.getSettings());const results=[];
    const docs=()=>[tab.containerEl.ownerDocument,document];
    const find=selector=>docs().map(doc=>doc.querySelector(selector)).find(Boolean);
    docs().forEach(doc=>doc.querySelectorAll('.mp-template-modal,.mp-font-modal,.mp-background-modal').forEach(modal=>{
        [...modal.querySelectorAll('button')].find(button=>button.textContent==='取消')?.click();
    }));
    await new Promise(resolve=>window.setTimeout(resolve,250));
    for(const [name,label,selector] of [
        ['theme','新建模板','.mp-template-modal'],['font','添加字体','.mp-font-modal'],['background','新建背景','.mp-background-modal']
    ]) {
        tab.containerEl.querySelectorAll('.settings-section').forEach(section=>section.classList.add('is-expanded'));
        const button=[...tab.containerEl.querySelectorAll('button')].find(button=>button.textContent.includes(label));
        if(!button) throw new Error('Missing '+name+' entry');button.click();
        await new Promise(resolve=>window.setTimeout(resolve,100));
        const modal=find(selector);if(!modal) throw new Error('Missing '+name+' modal');
        const input=modal.querySelector('input[type="text"],input:not([type])');
        if(input) {input.value='取消验证草稿';input.dispatchEvent(new modal.ownerDocument.defaultView.Event('input',{bubbles:true}));}
        [...modal.querySelectorAll('button')].find(button=>button.textContent==='取消').click();
        await new Promise(resolve=>window.setTimeout(resolve,250));
        const unchanged=JSON.stringify(p.settingsManager.getSettings())===baseline;
        if(!unchanged || find(selector)) throw new Error(name+' cancel leaked state: '+JSON.stringify({unchanged,remaining:Boolean(find(selector))}));
        results.push({name:name+' native form opens and cancel leaves settings unchanged',pass:true});
    }
    const header=tab.containerEl.querySelector('.settings-section-header');
    const section=header.parentElement;const original=section.classList.contains('is-expanded');
    header.dispatchEvent(new header.ownerDocument.defaultView.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    if(section.classList.contains('is-expanded')===original) throw new Error('Keyboard accordion failed');
    header.dispatchEvent(new header.ownerDocument.defaultView.KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true}));
    if(section.classList.contains('is-expanded')!==original) throw new Error('Keyboard accordion restore failed');
    results.push({name:'native settings keyboard accordion',pass:true});
    [...tab.containerEl.querySelectorAll('button')].find(button=>button.textContent==='关于与帮助').click();
    const about=find('.mp-about-modal');if(!about) throw new Error('About missing');
    about.dispatchEvent(new about.ownerDocument.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    if(find('.mp-about-modal')) throw new Error('About Escape failed');
    results.push({name:'native About Escape closes even after host focus changes',pass:true});
    return JSON.stringify({pass:true,version:p.manifest.version,results,settingsUnchanged:JSON.stringify(p.settingsManager.getSettings())===baseline});
})()
