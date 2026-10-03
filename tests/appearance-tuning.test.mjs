import test from 'node:test';
import assert from 'node:assert/strict';
import {createDom,loadModule} from './helpers/dom-runtime.mjs';

test('42 role palettes and bounded density preserve paper, typography and horizontal geometry',async()=>{
  createDom();
  const {readingPalettes,normalizeReadingPreferences}=await loadModule('src/core/theme/readingPreferences.ts');
  const {readingTheme}=await loadModule('src/core/theme/themeRevisionRegistry.ts');
  assert.equal(Object.keys(readingPalettes).length,14);
  for(const id of ['__proto__','constructor','toString'])assert.deepEqual(normalizeReadingPreferences(id,{paletteId:'spruce',density:'airy'}),{paletteId:'original',density:'airy'});
  for(const [id,options] of Object.entries(readingPalettes)){
    assert.equal(options.length,3);assert.equal(new Set(options.map(o=>o.id)).size,3);
    const original=readingTheme(id);
    for(const option of options)for(const density of ['theme','compact','airy']){
      const theme=readingTheme(id,{paletteId:option.id,density});
      assert.equal(theme.styles.accentColor,option.color);
      assert.equal(theme.reading.rootCss,original.reading.rootCss);
      const host=document.body.createDiv();host.createEl('p').setAttribute('style',theme.styles.paragraph);
      assert.ok(+host.firstChild.style.lineHeight>=1.65&&+host.firstChild.style.lineHeight<=1.95);
      for(const selector of ['quote','image','hr']){
        const a=host.createEl('div'),b=host.createEl('div');a.setAttribute('style',original.styles[selector]);b.setAttribute('style',theme.styles[selector]);
        for(const key of ['fontSize','paddingLeft','paddingRight','marginLeft','marginRight','width','maxWidth','borderRadius'])assert.equal(b.style[key],a.style[key],`${id}/${density}/${selector}/${key}`);
      }
      assert.equal(theme.styles.code.block.match(/font-size:[^;]+/)[0],original.styles.code.block.match(/font-size:[^;]+/)[0]);
      const cell=host.createEl('td'),baseline=host.createEl('td');cell.setAttribute('style',theme.styles.table.cell);baseline.setAttribute('style',original.styles.table.cell);
      for(const key of ['fontSize','padding','lineHeight','background','color'])assert.equal(cell.style[key],baseline.style[key]);
    }
    assert.deepEqual(readingTheme(id,{paletteId:'original',density:'theme'}),original);
    assert.deepEqual(normalizeReadingPreferences(id,{paletteId:'future',density:'future'}),{paletteId:'original',density:'theme'});
  }
});

test('gallery tuning stays a draft; returning to a theme reads its own saved preference; reset and cancel are scoped',async()=>{
  createDom();const stub=`export class App {} export class Notice {} export function setIcon(){} export class Modal {constructor(){this.modalEl=document.body.createDiv();this.contentEl=this.modalEl.createDiv()} open(){this.onOpen()} close(){this.onClose();this.modalEl.remove()}}`;
  const {ThemeGalleryModal}=await loadModule('src/settings/ThemeGalleryModal.ts',stub);
  const themes=[{id:'default',name:'通用长文',isPreset:true},{id:'deep-reading',name:'深度阅读',isPreset:true}];
  const settings={templates:themes,customTemplates:[],v3:{selectedRecipeId:'tutorial'},wechatAppearance:{schemaVersion:1,referencesById:{default:{id:'default',kind:'builtin',revision:'reading-2026.1'}},preferencesByReference:{'default@reading-2026.1':{paletteId:'spruce',density:'airy'},'deep-reading@reading-2026.1':{paletteId:'cocoa',density:'compact'}}}};
  const raw=JSON.stringify(settings),events=[];let commits=0;
  const modal=new ThemeGalleryModal({}, {getSettings:()=>settings,getVisibleTemplates:()=>themes},'default',()=>commits++,(...args)=>events.push(args),{fontSize:16,fontFamily:'serif',renderPreview:async()=>null,cancel:()=>events.push('cancel'),settled:()=>{},disposed:()=>{},isValid:()=>true});
  modal.open();assert.equal(modal.contentEl.querySelector('.mp-gallery-tuning').open,false);
  modal.contentEl.querySelector('[data-palette-id="marine"]').click();await modal.transaction.pending;
  assert.deepEqual(events.at(-1)[2],{paletteId:'marine',density:'airy'});assert.match(modal.contentEl.querySelector('.mp-gallery-revision-row').textContent,/试用升级版/);
  modal.contentEl.querySelector('[data-theme-id="deep-reading"]').click();await modal.transaction.pending;
  assert.deepEqual(events.at(-1)[2],{paletteId:'cocoa',density:'compact'});
  modal.contentEl.querySelector('[data-theme-id="default"]').click();await modal.transaction.pending;
  assert.deepEqual(events.at(-1)[2],{paletteId:'spruce',density:'airy'});
  modal.contentEl.querySelector('.mp-gallery-tuning-reset').click();await modal.transaction.pending;
  assert.deepEqual(events.at(-1)[2],{paletteId:'original',density:'theme'});
  modal.contentEl.querySelector('.mp-gallery-revision-btn').click();await modal.transaction.pending;
  assert.equal(modal.contentEl.querySelector('[data-palette-id]'),null);
  assert.equal(JSON.stringify(settings),raw);modal.close();assert.equal(commits,0);assert.equal(events.at(-1),'cancel');
});

test('resolver remembers only matching revision; snapshots round-trip; unknown data and legacy stay untouched',async()=>{
  createDom();const {SettingsManager}=await loadModule('src/settings/settings.ts');
  const {resolveWechatAppearance,snapshotAppearance,appearanceConflictKey}=await loadModule('src/core/theme/wechatAppearance.ts');
  let writes=0;const manager=new SettingsManager({loadData:async()=>null,saveData:async()=>writes++});await manager.loadSettings();
  const a=resolveWechatAppearance(manager.getSettings(),'default','reading-2026.1',{paletteId:'spruce',density:'airy'});
  await manager.commitWechatAppearance(a.reference,a.preferences,appearanceConflictKey(manager.getSettings()));
  assert.equal(resolveWechatAppearance(manager.getSettings()).preferences.paletteId,'spruce');
  assert.equal(resolveWechatAppearance(manager.getSettings(),'deep-reading','reading-2026.1').preferences.density,'theme');
  const snapshot={id:'tuning',templateId:'default',backgroundId:'default',fontFamily:manager.getSettings().fontFamily,fontSize:16,recipeId:manager.getSettings().v3.selectedRecipeId,appearance:snapshotAppearance(manager.getSettings())};
  const before=resolveWechatAppearance(manager.getSettings());
  assert.notEqual(before.fingerprint,resolveWechatAppearance(manager.getSettings(),'default','reading-2026.1',{paletteId:'original',density:'theme'}).fingerprint);
  await manager.updateSettings({fontSize:18});await manager.restoreLayoutSnapshot(snapshot);
  assert.equal(resolveWechatAppearance(manager.getSettings()).fingerprint,before.fingerprint);
  const settings=manager.getSettings();settings.wechatAppearance.preferencesByReference['default@reading-2026.1']={paletteId:'future',density:'future',extra:42};
  const raw=JSON.stringify(settings),count=writes;
  assert.deepEqual(resolveWechatAppearance(settings).preferences,{paletteId:'original',density:'theme'});
  assert.equal(JSON.stringify(settings),raw);assert.equal(writes,count);
  const legacy=resolveWechatAppearance(settings,'default','legacy-3.19.1',{paletteId:'spruce',density:'airy'});
  assert.deepEqual(legacy.preferences,{paletteId:'original',density:'theme'});assert.equal(legacy.template.reading,undefined);
});
