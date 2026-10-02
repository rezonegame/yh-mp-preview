(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const initialTheme=document.body.className;
    const delay=ms=>new Promise(resolve=>require('timers').setTimeout(resolve,ms));
    const captures=[];
    try {
        for(const [width,height,mode,expanded] of [[900,700,'theme-light',false],[375,700,'theme-dark',false],[320,460,'theme-light',true],[260,360,'theme-dark',false]]) {
            document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(mode);
            view.openThemeGallery();const modal=view.gallery;
            modal.modalEl.style.setProperty('width',width+'px','important');modal.modalEl.style.setProperty('height',height+'px','important');modal.updateLayout();
            modal.contentEl.querySelector('.mp-gallery-selector').open=expanded || width>=820;
            await delay(180);
            const wc=modal.contentEl.ownerDocument.defaultView.require('electron').remote.getCurrentWebContents();
            if(!wc.getTitle().includes('MPPreview-Refactor-Test'))throw new Error('Wrong capture surface');
            const bounds=modal.modalEl.getBoundingClientRect();
            const rect={x:Math.round(bounds.x),y:Math.round(bounds.y),width:Math.round(bounds.width),height:Math.round(bounds.height)};
            await wc.capturePage(rect,{stayHidden:true,stayAwake:true});await delay(120);
            const image=await wc.capturePage(rect,{stayHidden:true,stayAwake:true});
            const path='_test-artifacts/theme-gallery-'+width+'x'+height+'-'+mode+(expanded?'-expanded':'')+'.png';
            await app.vault.adapter.writeBinary(path,image.toPNG());captures.push({path,size:image.getSize(),rect});modal.close();
        }
        return JSON.stringify(captures);
    } finally {view.gallery?.invalidate();document.body.className=initialTheme;}
})()
