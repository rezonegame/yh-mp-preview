/* Capture the actual isolated WebContents twice to reject stale background frames. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const root=view.containerEl.querySelector('.mp-view-content');
    const sidebar=app.workspace.rightSplit.containerEl;
    const initial=globalThis.mpWorkspaceVisualRestore || {root:root.getAttribute('style'),sidebar:sidebar.getAttribute('style'),theme:document.body.className};
    const delay=ms=>new Promise(resolve=>require('timers').setTimeout(resolve,ms));
    const wc=root.ownerDocument.defaultView.require('electron').remote.getCurrentWebContents();
    if (!wc.getTitle().includes('MPPreview-Refactor-Test')) throw new Error('Wrong capture surface');
    const captures=[];
    try {
        for(const [width,height,mode,expanded] of [[600,460,'theme-light',false],[375,700,'theme-dark',false],[320,460,'theme-dark',true]]) {
            sidebar.style.width=width+'px';root.style.blockSize=height+'px';
            document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(mode);
            window.dispatchEvent(new Event('resize'));
            root.querySelector('.mp-settings-disclosure').open=expanded;
            root.querySelector('.mp-validation-details').open=false;view.previewEl.scrollTop=0;
            await delay(150);
            const bounds=root.getBoundingClientRect();
            const rect={x:Math.round(bounds.x),y:Math.round(bounds.y),width:Math.round(bounds.width),height:Math.round(bounds.height)};
            await wc.capturePage(rect,{stayHidden:true,stayAwake:true});await delay(150);
            const image=await wc.capturePage(rect,{stayHidden:true,stayAwake:true});
            const path='_test-artifacts/preview-priority-'+width+'x'+height+'-'+mode+(expanded?'-settings':'')+'.png';
            await app.vault.adapter.writeBinary(path,image.toPNG());captures.push({path,size:image.getSize(),rect});
        }
        return JSON.stringify(captures);
    } finally {
        document.body.className=initial.theme;
        if(initial.root === null) root.removeAttribute('style');else root.setAttribute('style',initial.root);
        if(initial.sidebar === null) sidebar.removeAttribute('style');else sidebar.setAttribute('style',initial.sidebar);
        window.dispatchEvent(new Event('resize'));delete globalThis.mpWorkspaceVisualRestore;
    }
})()
