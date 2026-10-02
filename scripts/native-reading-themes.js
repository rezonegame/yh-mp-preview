/* Native Obsidian only: isolated fixture, in-memory settings, actual production presentation. */
(async () => {
    if (app.vault.getName() !== 'MPPreview-Refactor-Test') throw new Error('Refusing a real vault');
    const plugin=app.plugins.plugins['yh-mp-preview'],manager=plugin.settingsManager;
    const view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    const original=manager.getSettings(),file=app.vault.getAbstractFileByPath('_test-artifacts/Reading-Themes.md');
    const source=await app.vault.read(file),dataPath='.obsidian/plugins/yh-mp-preview/data.json',dataBefore=await app.vault.adapter.read(dataPath);
    const oldFile=view.currentFile,checks=[],matrix=[],pairMeasurements={},captures=[];
    const check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
    const delay=ms=>new Promise(resolve=>require('timers').setTimeout(resolve,ms));
    const hash=value=>require('crypto').createHash('sha256').update(value).digest('hex');
    const ids=['default','deep-reading','clear-guide','knowledge-notes','apple-product','product-review','red-white-editorial','ink-opinion','data-blueprint','briefing-grid','zen-essence','warm-paper','olive-journal','case-file'];
    const stage=document.createElement('div');stage.style.cssText='position:fixed;left:20px;top:20px;width:375px;background:white;z-index:9999;pointer-events:none;max-height:90vh;overflow:hidden;';document.body.append(stage);
    const savedBody=document.body.className;
    const color=value=>{const channels=value.match(/[\d.]+/g)?.map(Number);return channels?.length>=3?channels:null;};
    const luminance=rgb=>rgb.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
    const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const background=element=>{const layers=[];for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node);if(style.backgroundImage!=='none')return null;const c=color(style.backgroundColor);if(c&&c[3]!==0){layers.push(c);if(c.length===3||c[3]===1)break;}}let result=[255,255,255];for(const layer of layers.reverse()){const alpha=layer[3]??1;result=layer.slice(0,3).map((n,i)=>n*alpha+result[i]*(1-alpha));}return result;};
    const geometry=node=>{const s=getComputedStyle(node);return ['fontSize','lineHeight','marginTop','marginBottom','paddingTop','paddingLeft','borderLeftWidth','borderTopWidth','borderBottomWidth','borderTopStyle'].map(key=>s[key]);};
    const article=()=>view.previewEl.querySelector('.mp-content-section');
    const render=async(id,size=16,family=original.fontFamily,revision='reading-2026.1',recipe='legacy-compatible')=>{
        const draft=structuredClone(original);draft.templateId=id;draft.fontSize=size;draft.fontFamily=family;draft.backgroundId='default';draft.v3.selectedRecipeId=recipe;
        draft.wechatAppearance={schemaVersion:1,referencesById:{[id]:{id,kind:'builtin',revision}},preferencesByReference:{}};
        manager.repository.initialize(draft);view.trialAppearance=null;view.trialTemplateId=null;await view.onFileOpen(file);await view.updatePreview();
        const canvas=document.createElement('canvas');canvas.width=320;canvas.height=120;const ctx=canvas.getContext('2d');ctx.fillStyle='#edf2f5';ctx.fillRect(0,0,320,120);ctx.fillStyle='#40505c';ctx.fillRect(24,70,56,30);ctx.fillRect(100,48,56,52);ctx.fillRect(176,26,56,74);
        const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=canvas.toDataURL();img.alt='自有本地图示';img.width=320;img.height=120;caption.textContent='图注：保留图片比例与正文顺序。';figure.append(img,caption);article().querySelector('hr').before(figure);
        view.applyPresentation(view.previewEl);return article();
    };
    try {
        document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');
        for(const id of ids){
            const root=await render(id);check(id+' six headings and own components',root.querySelectorAll('h1,h2,h3,h4,h5,h6').length>=6&&root.querySelectorAll('.mp-layout-card').length===10);
            const text=root.textContent;
            for(const width of [320,375,414]){
                stage.style.width=width+'px';const copy=root.cloneNode(true);stage.replaceChildren(copy);
                const bounds=copy.getBoundingClientRect(),overflow=[],lowContrast=[];
                for(const node of copy.querySelectorAll('*')){
                    const box=node.getBoundingClientRect();if(box.width&&box.height&&(box.right>bounds.right+1||box.left<bounds.left-1||node.scrollWidth>node.clientWidth+1&&getComputedStyle(node).display==='block'))overflow.push(node.tagName+'.'+node.className);
                    if([...node.childNodes].some(child=>child.nodeType===3&&child.textContent.trim())){const fg=color(getComputedStyle(node).color),bg=background(node);const ratio=fg&&bg?contrast(fg,bg):null;if(ratio===null||ratio<4.5)lowContrast.push({node:node.tagName,ratio,text:node.textContent.slice(0,24)});}
                }
                matrix.push({id,width,actualWidth:bounds.width,overflow,lowContrast,textHash:hash(copy.textContent)});
                check(id+' exact paper width '+width,Math.abs(bounds.width-width)<=1,bounds.width);
                check(id+' '+width+' no overflow',overflow.length===0,overflow);check(id+' '+width+' ordinary text contrast',lowContrast.length===0,lowContrast);check(id+' '+width+' content intact',copy.textContent===text);
                if(width===375)pairMeasurements[id]={heading:geometry(copy.querySelector('h2')),quote:geometry(copy.querySelector('blockquote')),list:geometry(copy.querySelector('li')),image:geometry(copy.querySelector('img')),component:geometry(copy.querySelector('.mp-layout-card'))};
            }
            for(const size of [12,18,30]){
                const alternate=await render(id,size,size===18?'UnavailableFixtureFont, SimSun, serif':original.fontFamily);stage.style.width='320px';stage.replaceChildren(alternate.cloneNode(true));
                check(id+' typography '+size,parseFloat(getComputedStyle(stage.querySelector(':scope > section > p')).fontSize)===size && stage.scrollWidth<=321,{width:stage.scrollWidth});
            }
        }
        for(let index=0;index<ids.length;index+=2){const a=pairMeasurements[ids[index]],b=pairMeasurements[ids[index+1]];const differences=Object.keys(a).filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key]));check(ids[index]+'/'+ids[index+1]+' geometry differences',differences.length>=3,differences);}
        stage.remove();
        await render('default',16,original.fontFamily,'legacy-3.19.1','tutorial');
        const baseline=article().outerHTML;view.openThemeGallery();const modal=view.gallery;await delay(100);
        check('gallery opens saved old revision',modal.currentRevision==='legacy-3.19.1');
        modal.contentEl.querySelector('[data-theme-id="default"]').click();await modal.transaction.pending;
        check('same-ID card trials new revision',view.getActiveWechatAppearance().reference.revision==='reading-2026.1');
        const trial=article().outerHTML;
        modal.contentEl.querySelector('[aria-label="画廊预览来源"] button:nth-child(2)').click();await delay(100);
        const shadow=modal.contentEl.querySelector('.mp-gallery-preview-host').shadowRoot;
        check('sample disables enhancement only in sample',shadow.querySelector('.mp-content-section')?.getAttribute('data-mp-recipe')==='legacy-compatible'&&article().outerHTML===trial,{recipe:shadow.querySelector('.mp-content-section')?.getAttribute('data-mp-recipe'),sameArticle:article().outerHTML===trial});
        modal.contentEl.querySelector('[aria-label="画廊外观对照"] button:nth-child(2)').click();await delay(100);
        check('same-ID saved sample remains old',shadow.querySelector('h2').style.fontSize!==article().querySelector('h2').style.fontSize&&article().outerHTML===trial);
        modal.contentEl.querySelector('.mp-gallery-revision-btn').click();await modal.transaction.pending;
        check('old revision toggles without persistence',view.getActiveWechatAppearance().reference.revision==='legacy-3.19.1');modal.close();check('cancel exact HTML',article().outerHTML===baseline);
        await render('warm-paper');const warm=article();check('theme paper reaches actual root',getComputedStyle(warm).backgroundColor==='rgb(251, 247, 239)');
        const adaptive=view.previewEl.className,html=warm.outerHTML;view.previewEl.classList.toggle('mp-phone-preview');check('phone mode leaves output HTML unchanged',article().outerHTML===html);view.previewEl.className=adaptive;
        const wc=view.previewEl.ownerDocument.defaultView.require('electron').remote.getCurrentWebContents();if(!wc.getTitle().includes('MPPreview-Refactor-Test'))throw new Error('Wrong capture surface');
        // Capture each actual pair in grayscale. These are test-only mounted production-rendered copies.
        for(let index=0;index<ids.length;index+=2){
            const board=document.createElement('div');board.style.cssText='position:fixed;left:8px;top:8px;width:750px;height:700px;z-index:9999;display:flex;overflow:hidden;background:white;filter:grayscale(1);';document.body.append(board);
            for(const id of ids.slice(index,index+2)){const column=document.createElement('div');column.style.cssText='width:375px;flex:0 0 375px;height:700px;overflow:hidden;';const label=document.createElement('div');label.textContent=id;label.style.cssText='font:12px sans-serif;padding:4px;color:#263238;background:white;';column.append(label,(await render(id)).cloneNode(true));board.append(column);}
            await delay(120);const r=board.getBoundingClientRect(),rect={x:Math.round(r.x),y:Math.round(r.y),width:750,height:700};await wc.capturePage(rect,{stayHidden:true,stayAwake:true});await delay(100);const image=await wc.capturePage(rect,{stayHidden:true,stayAwake:true});const path='_test-artifacts/reading-pair-'+index+'.png';await app.vault.adapter.writeBinary(path,image.toPNG());captures.push({path,size:image.getSize(),ids:ids.slice(index,index+2)});board.remove();
        }
        check('source unchanged',await app.vault.read(file)===source);check('data unchanged',await app.vault.adapter.read(dataPath)===dataBefore);
        return JSON.stringify({version:plugin.manifest.version,host:app.getVersion?.()??'Obsidian',checks,matrix,pairMeasurements,captures,limitations:['Actual WeChat backend paste is a manual acceptance gate.','Windows/DPR2 only; no lowest-host or OS matrix.','Generated local image only; no network image loading claim.']});
    } finally {stage.remove();document.body.className=savedBody;view.gallery?.invalidate();manager.repository.initialize(original);view.trialAppearance=null;view.trialTemplateId=null;if(oldFile)await view.onFileOpen(oldFile);}
})()
