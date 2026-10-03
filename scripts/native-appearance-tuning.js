/* Actual production paths; never run against a user vault. */
(async()=>{
  const fs=require('fs'),path=require('path'),crypto=require('crypto');
  const base='C:/AgentTest/github/mp-preview/output/refactor/MPPreview-Refactor-Test';
  if(app.vault.getName()!=='MPPreview-Refactor-Test'||path.resolve(app.vault.adapter.getBasePath()).toLowerCase()!==path.resolve(base).toLowerCase())throw Error('Refusing a real vault');
  const plugin=app.plugins.plugins['yh-mp-preview'];if(plugin?.manifest.version!=='3.22.0-beta.1')throw Error('Install current candidate');
  const manager=plugin.settingsManager,view=app.workspace.getLeavesOfType('yh-mp-preview')[0]?.view;if(!view)throw Error('Preview must be open');
  const original=manager.getSettings(),oldFile=view.currentFile,previewClass=view.previewEl.className,bodyClass=document.body.className;
  const file=app.vault.getAbstractFileByPath('_test-artifacts/Reading-Themes.md'),source=await app.vault.read(file),dataPath='.obsidian/plugins/yh-mp-preview/data.json',dataBefore=await app.vault.adapter.read(dataPath);
  const ids=['default','deep-reading','clear-guide','knowledge-notes','apple-product','product-review','red-white-editorial','ink-opinion','data-blueprint','briefing-grid','zen-essence','warm-paper','olive-journal','case-file'];
  const checks=[],matrix=[],outputs=[],captures=[],windows=[];
  const check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail));};
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  const article=()=>view.previewEl.querySelector('.mp-content-section');
  const delay=ms=>new Promise(resolve=>require('timers').setTimeout(resolve,ms));
  const wc=require('electron').remote.getCurrentWebContents();if(!wc.getTitle().includes('MPPreview-Refactor-Test'))throw Error('Wrong capture surface');const zoom=wc.getZoomFactor();
  const stage=document.createElement('div');stage.style.cssText='position:fixed;left:4px;top:4px;width:375px;max-height:680px;overflow:hidden;background:white;z-index:99999;pointer-events:none;';document.body.append(stage);
  const color=value=>{const c=value.match(/[\d.]+/g)?.map(Number);return c?.length>=3?c:null;};
  const luminance=rgb=>rgb.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const background=el=>{const layers=[];for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(s.backgroundImage!=='none')return null;const c=color(s.backgroundColor);if(c&&c[3]!==0){layers.push(c);if(c.length===3||c[3]===1)break}}let result=[255,255,255];for(const layer of layers.reverse()){const a=layer[3]??1;result=layer.slice(0,3).map((n,i)=>n*a+result[i]*(1-a))}return result};
  const select=async(id,paletteId='original',density='theme',recipe='legacy-compatible')=>{
    const settings=structuredClone(original);settings.templateId=id;settings.fontSize=16;settings.backgroundId='default';settings.v3.selectedRecipeId=recipe;
    settings.wechatAppearance={schemaVersion:1,referencesById:{[id]:{id,kind:'builtin',revision:'reading-2026.1'}},preferencesByReference:{[`${id}@reading-2026.1`]:{paletteId,density}}};
    manager.repository.initialize(settings);view.trialAppearance=null;view.trialTemplateId=null;await view.onFileOpen(file);await view.updatePreview();
  };
  try{
    document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');wc.setZoomFactor(1);
    for(const id of ids){
      await select(id);view.openThemeGallery();const modal=view.gallery;
      const palettes=[...modal.contentEl.querySelectorAll('[data-palette-id]')].map(el=>({id:el.getAttribute('data-palette-id'),name:el.textContent}));modal.close();check(id+' three choices only',palettes.length===3,palettes);
      const root=article(),canvas=document.createElement('canvas');canvas.width=320;canvas.height=120;const ctx=canvas.getContext('2d');ctx.fillStyle='#edf2f5';ctx.fillRect(0,0,320,120);ctx.fillStyle='#40505c';ctx.fillRect(24,40,240,48);
      const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=canvas.toDataURL();img.width=320;img.height=120;img.alt='本地图示';caption.textContent='图注保持比例和正文顺序';figure.append(img,caption);root.querySelector('hr').before(figure);view.applyPresentation(view.previewEl);
      const text=root.textContent,paper=getComputedStyle(root).backgroundColor;
      for(const palette of palettes)for(const density of ['theme','compact','airy']){
        view.applyThemeTrial(id,'reading-2026.1',{paletteId:palette.id,density});
        const current=article(),before=current.outerHTML;view.applyPresentation(view.previewEl);check(id+'/'+palette.id+'/'+density+' idempotent',article().outerHTML===before);
        check(id+'/'+palette.id+'/'+density+' preferences and paper',view.getActiveWechatAppearance().preferences.paletteId===palette.id&&view.getActiveWechatAppearance().preferences.density===density&&getComputedStyle(article()).backgroundColor===paper);
        const snap=await view.createExportSnapshot();let output;
        try{output={id,palette:palette.id,density,width:snap.width,htmlHash:hash(snap.element.outerHTML),textHash:hash(snap.element.textContent)};
          check(id+'/'+palette.id+'/'+density+' complete output',snap.element.textContent===text&&snap.element.querySelectorAll('blockquote').length===0&&snap.element.querySelectorAll('section[role="note"]').length===current.querySelectorAll('blockquote').length);
        }finally{snap.cleanup()}
        view.previewEl.classList.toggle('mp-phone-preview');const phone=await view.createExportSnapshot();try{check(id+'/'+palette.id+'/'+density+' export invariant',phone.width===output.width&&hash(phone.element.outerHTML)===output.htmlHash)}finally{phone.cleanup();view.previewEl.className=previewClass}outputs.push(output);
        for(const width of [320,375,414]){
          stage.style.width=width+'px';const copy=article().cloneNode(true);stage.replaceChildren(copy);const bounds=copy.getBoundingClientRect(),overflow=[],lowContrast=[];
          for(const node of copy.querySelectorAll('*')){const b=node.getBoundingClientRect();if(b.width&&b.height&&(b.right>bounds.right+1||b.left<bounds.left-1||node.scrollWidth>node.clientWidth+1&&getComputedStyle(node).display==='block'))overflow.push(node.tagName+'.'+node.className);
            if([...node.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())){const fg=color(getComputedStyle(node).color),bg=background(node),ratio=fg&&bg?contrast(fg,bg):null;if(ratio===null||ratio<4.5)lowContrast.push({node:node.tagName,ratio,text:node.textContent.slice(0,24)})}}
          const line=parseFloat(getComputedStyle(copy.querySelector(':scope > p')).lineHeight)/16;
          matrix.push({id,palette:palette.id,density,width,actualWidth:bounds.width,overflow,lowContrast,line,textHash:hash(copy.textContent)});
          check(id+'/'+palette.id+'/'+density+'/'+width+' readable',Math.abs(bounds.width-width)<=1&&overflow.length===0&&lowContrast.length===0&&copy.textContent===text&&line>=1.65&&line<=1.95,{overflow,lowContrast,line});
          if(width===375&&density==='theme'&&palette.id!=='original'&&ids.indexOf(id)%2===0){await delay(120);const r=stage.getBoundingClientRect(),rect={x:Math.round(r.x),y:Math.round(r.y),width:375,height:Math.min(640,Math.floor(r.height))};await wc.capturePage(rect,{stayHidden:true,stayAwake:true});await delay(100);const image=await wc.capturePage(rect,{stayHidden:true,stayAwake:true});const name=`tuning-${id}-${palette.id}.png`;await app.vault.adapter.writeBinary('_test-artifacts/'+name,image.toPNG());captures.push({path:'_test-artifacts/'+name,size:image.getSize(),id,palette:palette.id})}
        }
      }
    }
    stage.remove();await select('default','spruce','airy','tutorial');const baseline=article().outerHTML;article().querySelector(':scope > p').append(' 手工内容必须保留');const manual=article().outerHTML;
    view.openThemeGallery();let modal=view.gallery;modal.contentEl.querySelector('[data-palette-id="marine"]').click();await modal.transaction.pending;
    check('trial reaches active output and retains manual edits',view.getActiveWechatAppearance().preferences.paletteId==='marine'&&article().textContent.includes('手工内容必须保留'));
    const trial=article().outerHTML;modal.contentEl.querySelector('[aria-label="画廊预览来源"] button:nth-child(2)').click();await delay(70);modal.contentEl.querySelector('[aria-label="画廊外观对照"] button:nth-child(2)').click();await delay(70);
    check('sample and saved comparison never own actual output',article().outerHTML===trial);
    modal.close();check('cancel exact manual baseline and no disk write',article().outerHTML===manual&&await app.vault.adapter.read(dataPath)===dataBefore);
    for(const factor of [1,1.25,1.5])for(const mode of ['theme-light','theme-dark'])for(const [width,height] of [[900,700],[600,460],[375,700],[320,460],[260,360]]){
      wc.setZoomFactor(factor);document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(mode);view.openThemeGallery();modal=view.gallery;
      modal.modalEl.style.setProperty('width',width+'px','important');modal.modalEl.style.setProperty('height',height+'px','important');modal.updateLayout();modal.contentEl.querySelector('.mp-gallery-tuning').open=true;await delay(50);
      const bounds=modal.modalEl.getBoundingClientRect(),preview=modal.contentEl.querySelector('.mp-gallery-preview-host').getBoundingClientRect();
      const actions=[...modal.contentEl.querySelectorAll('.mp-gallery-actions button')];check('tuning window '+factor+'/'+mode+'/'+width+' usable',actions.every(el=>{const b=el.getBoundingClientRect();return b.height>0&&b.top>=bounds.top-1&&b.bottom<=bounds.bottom+1&&b.right<=bounds.right+1})&&preview.height>25,{preview:preview.toJSON(),bounds:bounds.toJSON()});
      const overflow=[...modal.contentEl.querySelectorAll('.mp-gallery-tuning button')].filter(el=>{const b=el.getBoundingClientRect();return b.width&&(b.left<bounds.left-1||b.right>bounds.right+1)}).map(el=>el.textContent);check('tuning options fit '+width,overflow.length===0,overflow);windows.push({factor,mode,width,height,previewHeight:preview.height});
      if(factor===1&&mode==='theme-light'&&[900,375].includes(width)){await delay(180);const rect={x:Math.round(bounds.x),y:Math.round(bounds.y),width:Math.floor(bounds.width),height:Math.floor(bounds.height)};await wc.capturePage(rect,{stayHidden:true,stayAwake:true});await delay(100);const image=await wc.capturePage(rect,{stayHidden:true,stayAwake:true});const name=`tuning-gallery-${width}.png`;await app.vault.adapter.writeBinary('_test-artifacts/'+name,image.toPNG());captures.push({path:'_test-artifacts/'+name,size:image.getSize()})}modal.close();
    }
    wc.setZoomFactor(zoom);document.body.className=bodyClass;await select('case-file','burgundy','airy','review');
    const downloads=[],originalClick=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.push({name:this.download,bytes:fetch(this.href).then(r=>r.arrayBuffer())});else originalClick.call(this)};
    try{const button=document.createElement('button');await view.exportHtmlFragment(button);await view.exportLongImage(button);await view.exportSegmentedImages(button)}finally{HTMLAnchorElement.prototype.click=originalClick}
    const sizes=[];for(const item of downloads){const bytes=await item.bytes;await app.vault.adapter.writeBinary('_test-artifacts/tuning-output-'+item.name,bytes);if(item.name.endsWith('.png')){const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));sizes.push({name:item.name,width:bitmap.width,height:bitmap.height});bitmap.close()}else check('HTML complete tail',/END\s*-\s*OF\s*-\s*READING\s*-\s*ARTICLE/.test(new TextDecoder().decode(bytes)))}
    check('all exports generated, full long image',downloads.some(d=>d.name.endsWith('.html'))&&sizes.length>=3&&sizes[0].height>view.previewEl.clientHeight*3,sizes);
    check('data and source unchanged',await app.vault.adapter.read(dataPath)===dataBefore&&await app.vault.read(file)===source);
    return JSON.stringify({version:plugin.manifest.version,checks,matrix,outputs,captures,windows,sizes,sourceHash:hash(source),dataHash:hash(dataBefore),limits:['Windows Obsidian 1.13.7 / DPR2 only; zoom tests simulate CSS zoom, not OS display settings.','WeChat paste/save/mobile and user BRAT acceptance are pending.','PNG generation covers representative case-file/burgundy/airy/review, not all 126 variants.','Persistence/snapshot error paths additionally covered by automated runtime tests.']});
  }finally{stage.remove();view.gallery?.invalidate();manager.repository.initialize(original);view.trialAppearance=null;view.trialTemplateId=null;view.previewEl.className=previewClass;document.body.className=bodyClass;wc.setZoomFactor(zoom);if(oldFile)await view.onFileOpen(oldFile)}
})()
