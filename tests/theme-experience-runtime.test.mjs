import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('latest preview wins; save waits for it; failed save keeps draft and can retry',async()=>{
  createDom();
  const {ThemeTrialSession}=await loadModule('src/core/render/themeTrialSession.ts');
  const trial=new ThemeTrialSession(()=>{}), first=deferred(), second=deferred();let painted='',writes=0;
  trial.preview(async valid=>{await first.promise;if(valid())painted='first'});
  trial.preview(async valid=>{await second.promise;if(valid())painted='second'});
  const save=trial.apply(()=>{writes++;throw new Error('disk full')});assert.equal(trial.state,'saving');assert.equal(trial.close(),false);
  first.resolve();await delay(0);assert.equal(painted,'');assert.equal(writes,0);
  second.resolve();await assert.rejects(save,/disk full/);assert.equal(painted,'second');assert.equal(trial.state,'previewing');
  await trial.apply(()=>{writes++});assert.equal(trial.state,'applied');assert.equal(writes,2);
});
test('long save becomes uncertain, allows closing, and settles actual eventual commit exactly once',async()=>{
  createDom();
  const {ThemeTrialSession}=await loadModule('src/core/render/themeTrialSession.ts');
  const trial=new ThemeTrialSession(()=>{},15), write=deferred();let count=0;
  const saving=trial.apply(()=>{count++;return write.promise});await delay(30);
  assert.equal(trial.state,'saving-unknown');assert.equal(trial.close(),true);
  await trial.apply(()=>{count++});assert.equal(count,1);write.resolve();await saving;assert.equal(trial.state,'applied');
});
test('context invalidation before persistence prevents writing and rejects stale preview jobs',async()=>{
  createDom();
  const {ThemeTrialSession}=await loadModule('src/core/render/themeTrialSession.ts');
  const trial=new ThemeTrialSession(()=>{}), work=deferred();let painted=false,writes=0;
  trial.preview(async valid=>{await work.promise;if(valid())painted=true});const saving=trial.apply(()=>{writes++});trial.close(true);
  work.resolve();await assert.rejects(saving,/上下文/);assert.equal(writes,0);assert.equal(painted,false);
});
test('settings migrate without load writes, preserve unknown schema and revisions, and serialize partial commits',async()=>{
  createDom();const {SettingsManager}=await loadModule('src/settings/settings.ts');
  const {resolveWechatAppearance,appearanceConflictKey}=await loadModule('src/core/theme/wechatAppearance.ts');
  let writes=0,saved={templateId:'deep-reading',templates:[{id:'deep-reading',isVisible:false}],unknownSetting:42};
  const manager=new SettingsManager({loadData:async()=>saved,saveData:async value=>{writes++;saved=structuredClone(value)}});
  await manager.loadSettings();assert.equal(writes,0);assert.equal(manager.getSettings().themeCatalogVersion,4);
  assert.equal(manager.getTemplate('deep-reading').isVisible,false);
  const appearance=resolveWechatAppearance(manager.getSettings(),'default'), key=appearanceConflictKey(manager.getSettings());
  await Promise.all([manager.updateSettings({enableFrontMatterCard:true}),manager.commitWechatAppearance(appearance.reference,appearance.preferences,key)]);
  assert.equal(saved.enableFrontMatterCard,true);assert.equal(saved.unknownSetting,42);assert.equal(saved.templateId,'default');
  await assert.rejects(manager.commitWechatAppearance(appearance.reference,appearance.preferences,key),/外观已变化/);
  saved.wechatAppearance={schemaVersion:8,opaque:{keep:true}};await manager.loadSettings();
  await manager.updateSettings({fontSize:18});assert.deepEqual(saved.wechatAppearance,{schemaVersion:8,opaque:{keep:true}});
  await assert.rejects(manager.commitWechatAppearance(appearance.reference,appearance.preferences,appearanceConflictKey(manager.getSettings())),/较新版本/);
  saved.wechatAppearance={schemaVersion:1,referencesById:{default:{id:'default',kind:'builtin',revision:'future'}},preferencesByReference:{future:{paletteId:'mystery',density:'unknown'}}};
  await manager.loadSettings();assert.equal(resolveWechatAppearance(manager.getSettings()).reference.revision,'legacy-3.19.1');
  await manager.saveSettings();assert.equal(saved.wechatAppearance.referencesById.default.revision,'future');
});
test('custom snapshot freezes definition and restoring old snapshots selects legacy revision',async()=>{
  createDom();const {SettingsManager}=await loadModule('src/settings/settings.ts');const {snapshotAppearance}=await loadModule('src/core/theme/wechatAppearance.ts');
  const manager=new SettingsManager({loadData:async()=>({}),saveData:async()=>{}});await manager.loadSettings();
  const custom={...manager.getTemplate('default'),id:'custom-test',isPreset:false};await manager.addCustomTemplate(custom);await manager.updateSettings({templateId:custom.id});
  const snapshot={id:'fixture',templateId:custom.id,backgroundId:'default',fontFamily:'serif',fontSize:18,recipeId:'tutorial',appearance:snapshotAppearance(manager.getSettings())};
  await manager.updateTemplate(custom.id,{name:'Changed',styles:{...custom.styles,accentColor:'#000000'}});await manager.restoreLayoutSnapshot(snapshot);
  assert.equal(manager.getTemplate(custom.id).name,custom.name);assert.equal(manager.getTemplate(custom.id).styles.accentColor,custom.styles.accentColor);
  await manager.restoreLayoutSnapshot({...snapshot,templateId:'minimal',appearance:undefined});
  assert.equal(manager.getSettings().wechatAppearance.referencesById.minimal.revision,'legacy-3.19.1');
});
test('gallery display uses isolated sanitized real article copies, preserves content, and destroys them',async()=>{
  createDom();const {ThemeGalleryPreview}=await loadModule('src/ui/themeGalleryPreview.ts');
  const host=document.body.createDiv(),article=document.createElement('section');article.className='mp-content-section';
  article.innerHTML='<h2>首章</h2><p style="color:#333" onclick="alert(1)">手工编辑</p><script>bad()</script><p>末尾</p>';
  const before=article.outerHTML;const preview=new ThemeGalleryPreview(host,'serif',18,true);preview.show(article);
  assert.equal(host.shadowRoot.querySelector('script'),null);assert.equal(host.shadowRoot.querySelector('[onclick]'),null);
  assert.match(host.shadowRoot.textContent,/手工编辑/);assert.equal(article.outerHTML,before);preview.destroy();assert.equal(host.shadowRoot.childNodes.length,0);
});
test('gallery reuses loaded images across theme and sample switches without parsing repeated sources',async()=>{
  createDom();const {ThemeGalleryPreview}=await loadModule('src/ui/themeGalleryPreview.ts');
  const host=document.body.createDiv(),article=document.createElement('section');article.innerHTML='<p>照片</p><img src="https://fixture.invalid/photo.png" alt="本地测试 &gt; 照片" style="width:100%">';
  const preview=new ThemeGalleryPreview(host,'serif',15,false);preview.show(article);
  const first=host.shadowRoot.querySelector('img');article.querySelector('img').style.borderRadius='8px';preview.show(article);
  assert.equal(host.shadowRoot.querySelector('img'),first);assert.equal(first.style.borderRadius,'8px');
  const sample=document.createElement('section');sample.textContent='示例';preview.show(sample);preview.show(article);
  assert.equal(host.shadowRoot.querySelector('img'),first);assert.equal(first.getAttribute('data-mp-preview-resource'),null);preview.destroy();assert.equal(preview.imageCache.size,0);
});

const modalStub=`export class App {} export class Notice {constructor(message){globalThis.notices.push(message)}} export function setIcon(){} export class Modal {constructor(app){this.app=app;this.modalEl=document.body.createDiv();this.contentEl=this.modalEl.createDiv()} open(){this.onOpen()} close(){this.closed=true;this.onClose();this.modalEl.remove()}}`;
test('gallery controls cannot change or close a saving transaction; eventual commit closes once',async()=>{
  createDom();globalThis.notices=[];const {ThemeGalleryModal}=await loadModule('src/settings/ThemeGalleryModal.ts',modalStub);
  const write=deferred(),themes=[{id:'default',name:'通用长文',isPreset:true},{id:'deep-reading',name:'深度阅读',isPreset:true}];
  let writes=0,cancels=0,commits=0;
  const options={fontFamily:'serif',fontSize:15,renderPreview:async()=>null,isValid:()=>true,cancel:()=>{cancels++},settled:applied=>{if(applied)commits++},disposed:()=>{}};
  const modal=new ThemeGalleryModal({}, {getVisibleTemplates:()=>themes},'default',()=>{writes++;return write.promise},()=>{},options);modal.open();
  modal.contentEl.querySelector('[data-theme-id="deep-reading"]').click();modal.contentEl.querySelector('.mp-gallery-btn-apply').click();
  await delay(5);assert.equal(writes,1);assert.equal(modal.isSaving,true);modal.close();assert.equal(modal.closed,undefined);
  assert.equal(modal.contentEl.querySelector('.mp-gallery-btn-cancel').disabled,true);assert.equal(modal.contentEl.querySelector('[data-theme-id="default"]').disabled,true);
  modal.contentEl.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(modal.closed,undefined);
  write.resolve();await delay(10);assert.equal(modal.closed,true);assert.equal(commits,1);assert.equal(writes,1);assert.equal(cancels,0);
});
test('layout refresh respects an explicitly expanded compact selector and display switches never select a theme',async()=>{
  createDom();globalThis.notices=[];const {ThemeGalleryModal}=await loadModule('src/settings/ThemeGalleryModal.ts',modalStub);
  const themes=[{id:'default',name:'通用长文',isPreset:true}],events=[],selected=[];
  const modal=new ThemeGalleryModal({}, {getVisibleTemplates:()=>themes},'default',()=>{},id=>selected.push(id),{fontFamily:'serif',fontSize:15,renderPreview:async(...args)=>{events.push(args);return null},isValid:()=>true,cancel:()=>{},settled:()=>{},disposed:()=>{}});
  modal.open();const selector=modal.contentEl.querySelector('.mp-gallery-selector');selector.open=true;modal.updateLayout();assert.equal(selector.open,true);
  modal.contentEl.querySelector('[aria-label="画廊预览来源"] button:nth-child(2)').click();modal.contentEl.querySelector('[aria-label="画廊外观对照"] button:nth-child(2)').click();await delay(5);
  assert.deepEqual(selected,[]);assert.deepEqual(events.at(-1),['default',true,true]);modal.close();
});
