(async () => {
    if(app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing to test a real vault');
    const v=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=120;
    const context=canvas.getContext('2d');context.fillStyle='#e8f3f1';context.fillRect(0,0,240,120);context.fillStyle='#0f766e';context.fillRect(20,20,60,80);context.fillRect(100,50,120,50);
    const bytes=await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer();
    if(!await app.vault.adapter.exists('_test-artifacts')) await app.vault.adapter.mkdir('_test-artifacts');
    await app.vault.adapter.writeBinary('_test-artifacts/media.png',bytes);
    const source='# 本地图片回归\n\n![[media.png]]\n\n```gallery {title="本地图组"}\n![](_test-artifacts/media.png)\n```\n\n图片结尾 MEDIA-END';
    let file=app.vault.getAbstractFileByPath('Media-regression.md');
    if(file) await app.vault.modify(file,source); else file=await app.vault.create('Media-regression.md',source);
    await v.onFileOpen(file);
    const article=v.previewEl.querySelector('.mp-content-section');
    const rendered=[...article.querySelectorAll('img')].map(img=>img.src);
    const snapshot=await v.createExportSnapshot();
    try {
        const embedded=[...snapshot.element.querySelectorAll('img')].map(img=>img.src.startsWith('data:image/'));
        if(embedded.length !== 2 || embedded.some(value=>!value)) throw new Error('Local images failed to embed: '+JSON.stringify({rendered,embedded}));
        const output=await v.renderExportCanvas(snapshot.element,snapshot.width,snapshot.height,2);
        await app.vault.adapter.writeBinary('_test-artifacts/media-output.png',await (await fetch(output.toDataURL('image/png'))).arrayBuffer());
        if(await app.vault.read(file)!==source) throw new Error('Source was modified');
        return JSON.stringify({pass:true,rendered,embedded,width:output.width,height:output.height,sourceUnchanged:true});
    } finally {snapshot.cleanup();await v.onFileOpen(app.vault.getAbstractFileByPath('Regression.md'));v.previewEl.scrollTop=0;}
})()
