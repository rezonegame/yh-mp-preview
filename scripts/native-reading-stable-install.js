/* Check the native installer using the official listing's repository; isolated vault only. */
(async () => {
    const fs=require('fs'),path=require('path'),crypto=require('crypto');
    const base='C:/AgentTest/github/mp-preview/output/refactor/MPPreview-Refactor-Test';
    if(app.vault.getName()!=='MPPreview-Refactor-Test'||path.resolve(app.vault.adapter.getBasePath()).toLowerCase()!==path.resolve(base).toLowerCase())throw Error('Refusing a real vault');
    const folder=path.join(base,'.obsidian/plugins/yh-mp-preview');
    const repo='C:/AgentTest/github/mp-preview',assets=path.join(repo,'output/refactor/release-3.21.0-assets'),backup=path.join(repo,'output/refactor/reading-stable-install-backup');
    const checks=[],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
    const check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name);};
    const plugin=app.plugins.plugins['yh-mp-preview'];
    check('native installed stable plugin enabled',plugin?.manifest.version==='3.21.0');
    check('plugin ID preserved',plugin.manifest.id==='yh-mp-preview');
    const installedMain=fs.readFileSync(path.join(folder,'main.js'),'utf8'),publishedMain=fs.readFileSync(path.join(assets,'main.js'),'utf8');
    const hostFooter='/* nosourcemap */';
    check('installed JavaScript matches published body excluding known host footer',installedMain===publishedMain||(installedMain.endsWith(hostFooter)&&installedMain.slice(0,-hostFooter.length).trimEnd()===publishedMain.trimEnd()));
    check('styles.css installed bytes match published asset',fs.readFileSync(path.join(folder,'styles.css')).equals(fs.readFileSync(path.join(assets,'styles.css'))));
    check('manifest fields match official stable asset',JSON.stringify(JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'))))===JSON.stringify(JSON.parse(fs.readFileSync(path.join(assets,'manifest.json')))));
    check('user settings byte-identical after installation',fs.readFileSync(path.join(folder,'data.json')).equals(fs.readFileSync(path.join(backup,'data.json'))));
    check('community enabled list preserved',JSON.stringify(JSON.parse(fs.readFileSync(path.join(base,'.obsidian/community-plugins.json'))))===JSON.stringify(JSON.parse(fs.readFileSync(path.join(backup,'community-plugins.json')))));
    const file=app.vault.getAbstractFileByPath('_test-artifacts/Quote-Mobile.md');
    const source=await app.vault.read(file);
    let leaf=app.workspace.getLeavesOfType('yh-mp-preview')[0];
    if(!leaf){leaf=app.workspace.getLeaf(true);await leaf.setViewState({type:'yh-mp-preview',active:true});}
    const view=leaf.view,oldFile=view.currentFile;
    try {
        await view.onFileOpen(file);
        check('installed workbench renders complete fixture',/QUOTE\s*-\s*END/.test(view.previewEl.textContent));
        check('local source quote structure retained',view.previewEl.querySelectorAll('.mp-content-section blockquote').length===2);
        const snapshot=await view.createExportSnapshot();
        try{check('stable export retains article end',/QUOTE\s*-\s*END/.test(snapshot.element.textContent));}finally{snapshot.cleanup();}
        check('Markdown fixture unchanged',await app.vault.read(file)===source);
    }finally{if(oldFile)await view.onFileOpen(oldFile);}
    check('settings unchanged after render/export',fs.readFileSync(path.join(folder,'data.json')).equals(fs.readFileSync(path.join(backup,'data.json'))));
    return JSON.stringify({version:plugin.manifest.version,checkedAt:new Date().toISOString(),scope:'Native Obsidian installPlugin using exact repository/version from the official listing and verified stable release; existing beta.3 to stable. Not automatic catalog detection or CLI installation.',checks,assets:Object.fromEntries(['main.js','manifest.json','styles.css'].map(name=>[name,sha(fs.readFileSync(path.join(folder,name)))])),hostJavaScriptFooter:hostFooter,automaticUpdateDetected:false,marketingModified:false,limits:['Windows Obsidian 1.13.7 only.','No new WeChat backend or full theme matrix; accepted JS/CSS unchanged.','CLI refused an existing install; update detector returned no candidate and the legacy GitHub directory lacks this ID.']});
})()
