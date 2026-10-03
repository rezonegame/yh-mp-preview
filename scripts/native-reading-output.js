(async()=>{
    const base='C:/AgentTest/github/mp-preview/output/refactor/MPPreview-Refactor-Test',path=require('path');
    if(app.vault.getName()!=='MPPreview-Refactor-Test'||path.resolve(app.vault.adapter.getBasePath()).toLowerCase()!==path.resolve(base).toLowerCase())throw new Error('Refusing a real vault');
    const plugin=app.plugins.plugins['yh-mp-preview'],manager=plugin.settingsManager,view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view;
    if(plugin.manifest.version!=='3.21.0-beta.3')throw new Error('Install current quote candidate first');
    const original=manager.getSettings(),oldFile=view.currentFile,file=app.vault.getAbstractFileByPath('_test-artifacts/Reading-Themes.md'),source=await app.vault.read(file),checks=[],outputs=[];
    const article=()=>view.previewEl.querySelector('.mp-content-section');
    const check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw new Error(name+': '+JSON.stringify(detail));};
    const hash=value=>require('crypto').createHash('sha256').update(value).digest('hex');
    const ids=['default','deep-reading','clear-guide','knowledge-notes','apple-product','product-review','red-white-editorial','ink-opinion','data-blueprint','briefing-grid','zen-essence','warm-paper','olive-journal','case-file'];
    const previewClass=view.previewEl.className;
    try{
        for(const id of ids)for(const recipe of ['legacy-compatible','tutorial','checklist','product-intro','commentary','review']){
            const settings=structuredClone(original);settings.templateId=id;settings.fontSize=16;settings.backgroundId='default';settings.v3.selectedRecipeId=recipe;settings.wechatAppearance={schemaVersion:1,referencesById:{[id]:{id,kind:'builtin',revision:'reading-2026.1'}},preferencesByReference:{}};
            manager.repository.initialize(settings);view.trialTemplateId=null;view.trialAppearance=null;await view.onFileOpen(file);await view.updatePreview();
            const before=article().outerHTML,text=article().textContent,labels=article().querySelectorAll('[data-mp-step-label]').length;view.applyPresentation(view.previewEl);
            check(id+'/'+recipe+' idempotent',article().outerHTML===before&&article().querySelectorAll('[data-mp-step-label]').length===labels);
            const adaptive=await view.createExportSnapshot();let record;
            try{
                check(id+'/'+recipe+' output quote adapter retains all quotes',adaptive.element.querySelectorAll('blockquote').length===0&&adaptive.element.querySelectorAll('section[role="note"][aria-label="引用"]').length===article().querySelectorAll('blockquote').length);
                const expected=getComputedStyle(article()).backgroundColor;check(id+'/'+recipe+' image paper matches preview',getComputedStyle(adaptive.element).backgroundColor===expected,{expected,actual:getComputedStyle(adaptive.element).backgroundColor});
                check(id+'/'+recipe+' export preserves text',adaptive.element.textContent===text&&/END\s*-\s*OF\s*-\s*READING\s*-\s*ARTICLE/.test(adaptive.element.textContent),{same:adaptive.element.textContent===text,sourceTail:text.slice(-240),exportTail:adaptive.element.textContent.slice(-240)});
                check(id+'/'+recipe+' export strips private markers',!adaptive.element.querySelector('[data-mp-reading-base-style],[data-mp-recipe-base-style]'));
                record={id,recipe,width:adaptive.width,height:adaptive.height,htmlHash:hash(adaptive.element.outerHTML),textHash:hash(text),background:expected};
            }finally{adaptive.cleanup();}
            view.previewEl.classList.toggle('mp-phone-preview');const phone=await view.createExportSnapshot();try{check(id+'/'+recipe+' phone snapshot unchanged',phone.width===record.width&&hash(phone.element.outerHTML)===record.htmlHash);}finally{phone.cleanup();view.previewEl.className=previewClass;}
            outputs.push(record);
        }
        const downloads=[],originalClick=HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.push({name:this.download,bytes:fetch(this.href).then(r=>r.arrayBuffer())});else originalClick.call(this);};
        try{const button=document.createElement('button');await view.exportHtmlFragment(button);await view.exportLongImage(button);await view.exportSegmentedImages(button);}finally{HTMLAnchorElement.prototype.click=originalClick;}
        check('new theme produces HTML, long and segmented artifacts',downloads.some(d=>d.name.endsWith('.html'))&&downloads.filter(d=>d.name.endsWith('.png')).length>=3,downloads.map(d=>d.name));
        const sizes=[];for(const item of downloads){const bytes=await item.bytes;await app.vault.adapter.writeBinary('_test-artifacts/reading-output-'+item.name,bytes);if(item.name.endsWith('.png')){const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));sizes.push({name:item.name,width:image.width,height:image.height});image.close();}else check('new HTML retains complete tail',/END\s*-\s*OF\s*-\s*READING\s*-\s*ARTICLE/.test(new TextDecoder().decode(bytes)));}
        check('new long image covers complete article',sizes[0].height>view.previewEl.clientHeight*3);check('fixture source unchanged',source===await app.vault.read(file));
        return JSON.stringify({version:plugin.manifest.version,checks,outputs,sizes,limitations:['Full PNG generation is representative case-file/review, not all 84 combinations.','84 production snapshots cover all themes/recipes and phone-mode export equality.','No WeChat backend paste claim.']});
    }finally{manager.repository.initialize(original);view.previewEl.className=previewClass;view.trialAppearance=null;view.trialTemplateId=null;if(oldFile)await view.onFileOpen(oldFile);}
})()
