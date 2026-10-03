/* Additional production-path evidence, isolated Obsidian vault only. */
(async()=>{
    if(app.vault.getName()!=='MPPreview-Refactor-Test')throw Error('Refusing a real vault');
    const plugin=app.plugins.plugins['yh-mp-preview'],manager=plugin.settingsManager,view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    if(!view)throw Error('Preview must be open');
    const original=manager.getSettings(),oldFile=view.currentFile,bodyClass=document.body.className,previewClass=view.previewEl.className;
    const dataPath='.obsidian/plugins/yh-mp-preview/data.json',dataBefore=await app.vault.adapter.read(dataPath);
    const wc=require('electron').remote.getCurrentWebContents();if(!wc.getTitle().includes('MPPreview-Refactor-Test'))throw Error('Wrong capture surface');
    const zoom=wc.getZoomFactor(),checks=[],dimensions=[],captures=[],performanceResults=[];
    const hash=value=>require('crypto').createHash('sha256').update(value instanceof ArrayBuffer?Buffer.from(value):value).digest('hex');
    const delay=ms=>new Promise(resolve=>require('timers').setTimeout(resolve,ms));
    const check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail));};
    const article=()=>view.previewEl.querySelector('.mp-content-section');
    const fixture=app.vault.getAbstractFileByPath('_test-artifacts/Reading-Themes.md'),source=await app.vault.read(fixture);
    const ids=['default','deep-reading','clear-guide','knowledge-notes','apple-product','product-review','red-white-editorial','ink-opinion','data-blueprint','briefing-grid','zen-essence','warm-paper','olive-journal','case-file'];
    const setAppearance=(id,revision)=>{const settings=structuredClone(original);settings.templateId=id;settings.backgroundId='default';settings.fontSize=16;settings.v3.selectedRecipeId='legacy-compatible';settings.wechatAppearance={schemaVersion:1,referencesById:{[id]:{id,kind:'builtin',revision}},preferencesByReference:{}};manager.repository.initialize(settings);view.trialAppearance=null;view.trialTemplateId=null;};
    let board;
    try{
        setAppearance('default','reading-2026.1');await view.onFileOpen(fixture);
        for(const factor of [1,1.25,1.5]){
            wc.setZoomFactor(factor);await delay(180);
            for(const mode of ['theme-light','theme-dark']){
                document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(mode);
                for(const [width,height] of [[600,460],[375,700],[320,460],[260,360]]){
                    view.openThemeGallery();const modal=view.gallery;modal.modalEl.style.setProperty('width',width+'px','important');modal.modalEl.style.setProperty('height',height+'px','important');modal.updateLayout();await delay(120);
                    const bounds=modal.modalEl.getBoundingClientRect(),elements=[...modal.contentEl.querySelectorAll('button,select,input,summary')].filter(el=>{const b=el.getBoundingClientRect();return b.width&&b.height;});
                    const overflow=elements.filter(el=>{const b=el.getBoundingClientRect();return b.left<bounds.left-1||b.right>bounds.right+1;}).map(el=>el.getAttribute('aria-label')||el.textContent);
                    check('zoom '+factor+' '+mode+' '+width+' controls fit',overflow.length===0,overflow);
                    const confirm=modal.contentEl.querySelector('.mp-gallery-btn-apply'),cancel=modal.contentEl.querySelector('.mp-gallery-btn-cancel');
                    check('zoom '+factor+' '+mode+' '+width+' actions reachable',[confirm,cancel].every(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1;}));
                    dimensions.push({factor,mode,requestedWidth:width,requestedHeight:height,width:bounds.width,height:bounds.height,viewport:{width:innerWidth,height:innerHeight},preview:modal.contentEl.querySelector('.mp-gallery-preview-host').getBoundingClientRect().toJSON(),overflow});modal.close();
                }
            }
        }
        wc.setZoomFactor(1);await delay(300);document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');
        // Full coloured article, three consecutive screenfuls per theme; never a synthetic CSS replica.
        board=document.createElement('div');board.style.cssText='position:fixed;left:4px;top:4px;width:375px;height:640px;overflow:hidden;background:white;z-index:9999;pointer-events:none;';document.body.append(board);
        for(const id of ids){
            setAppearance(id,'reading-2026.1');await view.onFileOpen(fixture);const root=article().cloneNode(true);board.replaceChildren(root);
            check(id+' coloured paper is 375 CSS px',Math.abs(root.getBoundingClientRect().width-375)<=1,root.getBoundingClientRect().width);
            check(id+' coloured render retains tail',/END\s*-\s*OF\s*-\s*READING\s*-\s*ARTICLE/.test(root.textContent));
            const height=root.getBoundingClientRect().height;
            for(const [label,top] of [['top',0],['middle',Math.max(0,Math.round(height/2-320))],['end',Math.max(0,Math.ceil(height-640))]]){
                board.scrollTop=top;await delay(100);const r=board.getBoundingClientRect(),rect={x:Math.round(r.x),y:Math.round(r.y),width:375,height:640};
                await wc.capturePage(rect,{stayHidden:true,stayAwake:true});await delay(120);
                const shot=await wc.capturePage(rect,{stayHidden:true,stayAwake:true});const path='_test-artifacts/reading-colour-'+id+'-'+label+'.png';await app.vault.adapter.writeBinary(path,shot.toPNG());captures.push({id,label,path,top,articleHeight:height,size:shot.getSize(),sha256:hash(shot.toPNG())});
            }
        }
        board.remove();board=null;
        // A new, self-owned large Markdown fixture, not a user document.
        const largePath='_test-artifacts/Large-Reading-Generated.md';
        const paragraph='连续阅读需要稳定的标题层级、可辨认的段落边界与合理留白。测试不会修改作者的 Markdown，也不会把手机预览尺寸写入导出。长文章中每一节的内容顺序、引用和列表都应得到保留。';
        const largeSource='# 大文章原生验证\n\n'+Array.from({length:72},(_,i)=>'## 章节 '+(i+1)+'\n\n'+Array.from({length:9},()=>paragraph).join('\n\n')+'\n\n> 章节引用：确认长文仍有清晰节奏。\n\n1. 验证内容顺序\n2. 检查完整末尾\n\n').join('')+'\nEND-OF-LARGE-READING\n';
        let large=app.vault.getAbstractFileByPath(largePath);if(large){check('generated large fixture matches',await app.vault.read(large)===largeSource);}else large=await app.vault.create(largePath,largeSource);
        for(const revision of ['legacy-3.19.1','reading-2026.1']){
            setAppearance('default',revision);const start=performance.now();await view.onFileOpen(large);article().getBoundingClientRect();const firstRender=performance.now()-start;
            check(revision+' large render complete',article().textContent.includes('END-OF-LARGE-READING')&&article().querySelectorAll('h2').length===72);
            const values=[];for(let n=0;n<22;n++){const started=performance.now();view.applyThemeTrial(n%2?'default':'deep-reading',revision);article().getBoundingClientRect();if(n>1)values.push(performance.now()-started);}
            const sorted=values.slice().sort((a,b)=>a-b);performanceResults.push({revision,characters:largeSource.length,articleCharacters:article().textContent.length,firstFixtureRenderMs:firstRender,iterations:values.length,p50:sorted[9],p95:sorted[18],values,scope:'production applyThemeTrial and actual layout, no gallery projection'});
            check(revision+' final large switch complete',view.getActiveWechatTemplateId()==='default'&&article().querySelectorAll('h2').length===72&&article().textContent.includes('END-OF-LARGE-READING'));
        }
        const [baseline,current]=performanceResults;const threshold=Math.max(800,baseline.p95*1.25);check('large warm pipeline performance gate',current.p95<=threshold,{p95:current.p95,threshold});
        check('reading fixture unchanged',await app.vault.read(fixture)===source);check('large fixture unchanged after render',await app.vault.read(large)===largeSource);check('settings disk unchanged',await app.vault.adapter.read(dataPath)===dataBefore);
        return JSON.stringify({version:plugin.manifest.version,checks,dimensions,captures,performance:performanceResults,largeWarmThresholdMs:threshold,assetHash:hash(await app.vault.adapter.readBinary('.obsidian/plugins/yh-mp-preview/main.js')),limitations:['Electron per-window zoom only; OS scaling not changed or measured.','First fixture render is on an already-running host, not cold process startup.','Coloured top/middle/end captures do not prove WeChat backend rendering.','System clipboard unavailable; actual WeChat backend must be checked by the user.']});
    }finally{board?.remove();view.gallery?.invalidate();wc.setZoomFactor(zoom);document.body.className=bodyClass;view.previewEl.className=previewClass;manager.repository.initialize(original);view.trialAppearance=null;view.trialTemplateId=null;if(oldFile)await view.onFileOpen(oldFile);}
})()
