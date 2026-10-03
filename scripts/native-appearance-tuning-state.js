(async()=>{
  const fs=require('fs'),path=require('path'),base='C:/AgentTest/github/mp-preview/output/refactor/MPPreview-Refactor-Test';
  if(app.vault.getName()!=='MPPreview-Refactor-Test'||path.resolve(app.vault.adapter.getBasePath()).toLowerCase()!==path.resolve(base).toLowerCase())throw Error('Wrong vault');
  const plugin=app.plugins.plugins['yh-mp-preview'];if(plugin.manifest.version!=='3.22.0-beta.1')throw Error('Wrong version');
  const manager=plugin.settingsManager,view=app.workspace.getLeavesOfType('yh-mp-preview')[0].view,original=structuredClone(manager.getSettings()),oldFile=view.currentFile;
  const dataPath='.obsidian/plugins/yh-mp-preview/data.json',dataBefore=await app.vault.adapter.read(dataPath),file=app.vault.getAbstractFileByPath('_test-artifacts/Reading-Themes.md'),source=await app.vault.read(file),checks=[],performanceResults=[];
  const check=(name,pass,detail=null)=>{checks.push({name,pass:!!pass,detail});if(!pass)throw Error(name+': '+JSON.stringify(detail))};
  const delay=ms=>new Promise(resolve=>require('timers').setTimeout(resolve,ms));
  const waitApplied=async modal=>{for(let n=0;n<100&&modal.transaction.state!=='applied';n++){await delay(20);if(modal.transaction.state==='previewing'&&n>2)throw Error('Save failed')}check('actual apply completed',modal.transaction.state==='applied');await delay(0)};
  let wrote=false;
  try{
    await view.onFileOpen(file);view.openThemeGallery();let modal=view.gallery;
    modal.contentEl.querySelector('[data-theme-id="default"]').click();await modal.transaction.pending;
    modal.contentEl.querySelector('[data-palette-id="spruce"]').click();await modal.transaction.pending;
    modal.contentEl.querySelector('[data-density="airy"]').click();await modal.transaction.pending;
    wrote=true;modal.contentEl.querySelector('.mp-gallery-btn-apply').click();await waitApplied(modal);
    const saved=JSON.parse(await app.vault.adapter.read(dataPath));check('disk contains scoped choices',saved.wechatAppearance.preferencesByReference['default@reading-2026.1'].paletteId==='spruce'&&saved.wechatAppearance.preferencesByReference['default@reading-2026.1'].density==='airy');
    view.openThemeGallery();modal=view.gallery;check('reopen restores selected controls',modal.contentEl.querySelector('[data-palette-id="spruce"]').getAttribute('aria-pressed')==='true'&&modal.contentEl.querySelector('[data-density="airy"]').getAttribute('aria-pressed')==='true');
    modal.contentEl.querySelector('[data-theme-id="deep-reading"]').click();await modal.transaction.pending;check('different theme does not borrow preferences',view.getActiveWechatAppearance().preferences.paletteId==='original'&&view.getActiveWechatAppearance().preferences.density==='theme');
    modal.contentEl.querySelector('[data-theme-id="default"]').click();await modal.transaction.pending;check('return restores saved theme choices',view.getActiveWechatAppearance().preferences.paletteId==='spruce'&&view.getActiveWechatAppearance().preferences.density==='airy');modal.close();
    await view.saveCurrentSnapshot();const snapshot=structuredClone(manager.getSettings().layoutSnapshots[0]),appearance=view.getActiveWechatAppearance();
    check('real snapshot records complete appearance',snapshot.appearance.preferences.paletteId==='spruce'&&snapshot.appearance.preferences.density==='airy'&&snapshot.appearance.fingerprint===appearance.fingerprint&&snapshot.appearance.renderRevision===appearance.renderRevision);
    view.openThemeGallery();modal=view.gallery;modal.contentEl.querySelector('.mp-gallery-tuning-reset').click();await modal.transaction.pending;modal.contentEl.querySelector('.mp-gallery-btn-apply').click();await waitApplied(modal);
    check('scoped reset applied',view.getActiveWechatAppearance().preferences.paletteId==='original'&&manager.getSettings().fontSize===snapshot.fontSize&&manager.getSettings().backgroundId===snapshot.backgroundId&&manager.getSettings().v3.selectedRecipeId===snapshot.recipeId);
    await manager.restoreLayoutSnapshot(snapshot);view.applyPresentation(view.previewEl);check('real snapshot restores fingerprint',view.getActiveWechatAppearance().fingerprint===appearance.fingerprint);
    for(const count of [5500,22000]){
      await view.onFileOpen(file);const article=view.previewEl.querySelector('.mp-content-section'),p=article.querySelector(':scope > p');while(article.textContent.length<count)article.appendChild(p.cloneNode(true));
      view.openThemeGallery();modal=view.gallery;const values=[];
      for(let index=0;index<22;index++){const start=performance.now();modal.contentEl.querySelector(`[data-palette-id="${index%2?'spruce':'marine'}"]`).click();modal.contentEl.querySelector(`[data-density="${index%2?'airy':'compact'}"]`).click();await modal.transaction.pending;view.previewEl.querySelector('.mp-content-section').getBoundingClientRect();modal.contentEl.querySelector('.mp-gallery-preview-host').shadowRoot.querySelector('.mp-content-section').getBoundingClientRect();if(index>1)values.push(performance.now()-start)}
      const sorted=values.slice().sort((a,b)=>a-b);performanceResults.push({chars:article.textContent.length,iterations:20,p50:sorted[9],p95:sorted[18],values});check(count+' switches deliver final complete appearance',view.getActiveWechatAppearance().preferences.paletteId==='spruce'&&view.getActiveWechatAppearance().preferences.density==='airy');modal.close();check(count+' gallery clean after close',!view.gallery&&!view.galleryObserver&&!view.galleryBaseline);
    }
    check('source unchanged',await app.vault.read(file)===source);
    return JSON.stringify({version:plugin.manifest.version,checks,performanceResults,persistence:'Actual isolated-vault save/apply/snapshot/reset/restore; data restored in finally',limits:['No WeChat or BRAT installation claim.','Benchmark measures two sequential tuning gestures and shared preview layout, not parser startup.']});
  }finally{view.gallery?.invalidate();if(wrote)await app.vault.adapter.write(dataPath,dataBefore);manager.repository.initialize(original);view.trialAppearance=null;view.trialTemplateId=null;if(oldFile)await view.onFileOpen(oldFile);if(await app.vault.adapter.read(dataPath)!==dataBefore)throw Error('Failed to restore isolated test data')}
})()
