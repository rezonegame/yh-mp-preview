/* Install verified stable release in the isolated regression vault only. */
(async () => {
    const fs=require('fs'),path=require('path'),crypto=require('crypto');
    const repo='C:/AgentTest/github/mp-preview',base=path.join(repo,'output/refactor/MPPreview-Refactor-Test');
    if(app.vault.getName()!=='MPPreview-Refactor-Test'||path.resolve(app.vault.adapter.getBasePath()).toLowerCase()!==path.resolve(base).toLowerCase())throw Error('Refusing a real vault');
    const folder=path.join(base,'.obsidian/plugins/yh-mp-preview'),assets=path.join(repo,'output/refactor/release-3.22.0-assets');
    const backup=path.join(repo,'output/refactor/appearance-stable-install-backup');
    if(fs.existsSync(backup))throw Error('Preserve existing backup; do not repeat installation blindly');
    fs.mkdirSync(backup);
    for(const name of ['main.js','manifest.json','styles.css','data.json'])fs.copyFileSync(path.join(folder,name),path.join(backup,name));
    fs.copyFileSync(path.join(base,'.obsidian/community-plugins.json'),path.join(backup,'community-plugins.json'));
    const manifest=JSON.parse(fs.readFileSync(path.join(assets,'manifest.json'),'utf8'));
    if(manifest.version!=='3.22.0'||manifest.id!=='yh-mp-preview')throw Error('Wrong verified release');
    const installed=await app.plugins.installPlugin('rezonegame/yh-mp-preview','3.22.0',manifest);
    const checks=[],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
    const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
    const plugin=app.plugins.plugins['yh-mp-preview'];
    check('native installed stable plugin enabled',plugin?.manifest.version==='3.22.0');
    check('plugin ID preserved',plugin.manifest.id==='yh-mp-preview');
    const main=fs.readFileSync(path.join(folder,'main.js'),'utf8'),published=fs.readFileSync(path.join(assets,'main.js'),'utf8'),footer='/* nosourcemap */';
    check('installed JS equals release except exact known host EOF footer',main===published||(main.endsWith(footer)&&main.slice(0,-footer.length).trimEnd()===published.trimEnd()));
    check('styles match release bytes',fs.readFileSync(path.join(folder,'styles.css')).equals(fs.readFileSync(path.join(assets,'styles.css'))));
    check('manifest matches release fields',JSON.stringify(JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'))))===JSON.stringify(manifest));
    check('settings bytes preserved',fs.readFileSync(path.join(folder,'data.json')).equals(fs.readFileSync(path.join(backup,'data.json'))));
    check('enabled list bytes preserved',fs.readFileSync(path.join(base,'.obsidian/community-plugins.json')).equals(fs.readFileSync(path.join(backup,'community-plugins.json'))));
    const file=app.vault.getAbstractFileByPath('_test-artifacts/Quote-Mobile.md'),source=await app.vault.read(file);
    let leaf=app.workspace.getLeavesOfType('yh-mp-preview')[0];
    if(!leaf){leaf=app.workspace.getLeaf(true);await leaf.setViewState({type:'yh-mp-preview',active:true});}
    const view=leaf.view,oldFile=view.currentFile;
    try {
        await view.onFileOpen(file);
        check('workbench renders full article',/QUOTE\s*-\s*END/.test(view.previewEl.textContent));
        check('local semantic quote structure retained',view.previewEl.querySelectorAll('.mp-content-section blockquote').length===2);
        const snapshot=await view.createExportSnapshot();
        try{check('export retains article end',/QUOTE\s*-\s*END/.test(snapshot.element.textContent));}finally{snapshot.cleanup();}
        check('Markdown source unchanged',await app.vault.read(file)===source);
    }finally{if(oldFile)await view.onFileOpen(oldFile);}
    check('settings preserved after render/export',fs.readFileSync(path.join(folder,'data.json')).equals(fs.readFileSync(path.join(backup,'data.json'))));
    return JSON.stringify({version:plugin.manifest.version,checkedAt:new Date().toISOString(),repository:'rezonegame/yh-mp-preview',installMethod:"app.plugins.installPlugin(repository,'3.22.0',verifiedManifest)",installReturned:!!installed,checks,assets:Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>[name,sha(fs.readFileSync(path.join(folder,name)))])),hostJavaScriptFooter:footer,marketingModified:false,limits:['Native exact repository/version update, not BRAT or automatic catalog update detection.','Windows Obsidian 1.13.7 only; accepted JS/CSS unchanged, no repeated full theme matrix.','User-reported WeChat acceptance, not agent backend inspection.']});
})()
