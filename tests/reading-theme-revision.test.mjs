import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

test('reading revisions exist only for 14 featured IDs and legacy definitions remain detached', async () => {
  createDom();
  const {curatedThemeEntries}=await loadModule('src/core/theme/themeCatalog.ts');
  const {legacyTheme,readingTheme,READING_THEME_REVISION}=await loadModule('src/core/theme/themeRevisionRegistry.ts');
  for(const entry of curatedThemeEntries) {
    const old=legacyTheme(entry.id),before=JSON.stringify(old),next=readingTheme(entry.id);
    assert.equal(!!next,entry.status==='featured',entry.id);
    if(next) {assert.equal(next.reading.revision,READING_THEME_REVISION);assert.notEqual(next.styles.paragraph,old.styles.paragraph);next.styles.paragraph='changed';}
    assert.equal(JSON.stringify(legacyTheme(entry.id)),before);
  }
});

test('new installs use reading revisions; existing config, unknown revisions and old snapshots remain legacy',async()=>{
  createDom();const {SettingsManager}=await loadModule('src/settings/settings.ts');
  const {resolveWechatAppearance}=await loadModule('src/core/theme/wechatAppearance.ts');
  let writes=0;
  const fresh=new SettingsManager({loadData:async()=>null,saveData:async()=>writes++});await fresh.loadSettings();
  assert.equal(resolveWechatAppearance(fresh.getSettings()).reference.revision,'reading-2026.1');assert.equal(writes,0);
  const old=new SettingsManager({loadData:async()=>({templateId:'default',templates:[{id:'default',isVisible:false}]}),saveData:async()=>writes++});await old.loadSettings();
  assert.equal(resolveWechatAppearance(old.getSettings()).reference.revision,'legacy-3.19.1');assert.equal(old.getTemplate('default').isVisible,false);
  assert.equal(old.getSettings().themeCatalogVersion,5);
  const trial=resolveWechatAppearance(old.getSettings(),'default','reading-2026.1');assert.equal(trial.reference.revision,'reading-2026.1');
  assert.equal(resolveWechatAppearance(old.getSettings()).reference.revision,'legacy-3.19.1');
  const future={...old.getSettings(),wechatAppearance:{schemaVersion:1,referencesById:{default:{id:'default',kind:'builtin',revision:'future'}},preferencesByReference:{}}};
  assert.equal(resolveWechatAppearance(future).reference.revision,'legacy-3.19.1');assert.equal(future.wechatAppearance.referencesById.default.revision,'future');
});

test('new root background, padding, font and all six heading levels survive presentation and canonical output',async()=>{
  createDom();const {TemplateManager}=await loadModule('src/templateManager.ts');const {BackgroundManager}=await loadModule('src/backgroundManager.ts');
  const {readingTheme}=await loadModule('src/core/theme/themeRevisionRegistry.ts');
  const theme=readingTheme('warm-paper'),bg={id:'default',style:'background:#fff;padding:0;'};
  const settings={getTemplate:()=>theme,getBackground:()=>bg};const manager=new TemplateManager({},settings),background=new BackgroundManager(settings);
  const host=document.body.createDiv();host.innerHTML='<section class="mp-content-section">'+[1,2,3,4,5,6].map(n=>`<h${n}>标题 <em>完整</em></h${n}>`).join('')+'<blockquote><p>第一段</p><p>第二段</p></blockquote><p>正文</p></section>';
  manager.setFont('serif');manager.setFontSize(18);background.setBackground('default');
  manager.applyTemplate(host,theme);background.applyBackground(host,theme.reading,{family:'serif',size:18});
  const root=host.firstElementChild;assert.equal(root.style.backgroundColor,'rgb(251, 247, 239)');assert.equal(root.style.fontSize,'18px');assert.equal(root.style.paddingLeft,'20px');
  assert.equal(new Set([...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>h.style.fontSize)).size,6);
  assert.equal(root.querySelector(':scope > p').style.fontFamily,'serif');
  assert.equal(root.querySelector('h4 em').textContent,'完整');assert.equal(root.querySelector('blockquote p:last-child').style.marginBottom,'0px');
  const before=root.outerHTML;manager.applyTemplate(host,theme);background.applyBackground(host,theme.reading,{family:'serif',size:18});assert.equal(root.outerHTML,before);
  bg.id='custom';bg.style='background:#f0f4f8;padding:24px 28px;';background.setBackground('custom');background.applyBackground(host,theme.reading,{family:'serif',size:18});
  assert.equal(root.style.backgroundColor,'rgb(240, 244, 248)');assert.equal(root.style.paddingLeft,'28px');assert.equal(root.style.fontSize,'18px');
  const {prepareLegacyWechatFragment}=await loadModule('src/core/render/legacyWechatPipeline.ts');
  const output=prepareLegacyWechatFragment(root);assert.match(output.html,/18px/);assert.match(output.text,/第一段第二段正文/);
});

test('new and old snapshots restore their revision; reading-only node styles leave no residue after rollback',async()=>{
  createDom();const {SettingsManager}=await loadModule('src/settings/settings.ts');
  const {resolveWechatAppearance,snapshotAppearance,appearanceConflictKey}=await loadModule('src/core/theme/wechatAppearance.ts');
  const {readingTheme,legacyTheme}=await loadModule('src/core/theme/themeRevisionRegistry.ts');
  const {TemplateManager}=await loadModule('src/templateManager.ts');
  const settings=new SettingsManager({loadData:async()=>({templateId:'default'}),saveData:async()=>{}});await settings.loadSettings();
  const next=resolveWechatAppearance(settings.getSettings(),'warm-paper','reading-2026.1');
  await settings.commitWechatAppearance(next.reference,next.preferences,appearanceConflictKey(settings.getSettings()));
  const snap={id:'new',templateId:'warm-paper',backgroundId:'default',fontFamily:'serif',fontSize:18,recipeId:'tutorial',appearance:snapshotAppearance(settings.getSettings())};
  await settings.restoreLayoutSnapshot({...snap,templateId:'default',appearance:undefined});
  assert.equal(resolveWechatAppearance(settings.getSettings()).reference.revision,'legacy-3.19.1');
  await settings.restoreLayoutSnapshot(snap);assert.equal(resolveWechatAppearance(settings.getSettings()).reference.revision,'reading-2026.1');
  const host=document.body.createDiv();host.innerHTML='<section class="mp-content-section"><blockquote><p>引用</p></blockquote><ol><li><p>完整步骤</p></li></ol><figure><img alt="图示"><figcaption style="color:#666">图注</figcaption></figure><section class="mp-layout-card" data-mp-layout="checklist" style="padding:8px"><div style="display:flex"><span style="color:green">✓</span><span>项</span></div></section></section>';
  const manager=new TemplateManager({},{getTemplate:()=>legacyTheme('default')});manager.applyTemplate(host,legacyTheme('default'));const old=host.outerHTML;
  for(const id of ['warm-paper','clear-guide','default'])manager.applyTemplate(host,readingTheme(id));
  manager.applyTemplate(host,legacyTheme('default'));
  const normalized=html=>{const node=document.createElement('div');node.innerHTML=html;node.querySelectorAll('[style]').forEach(el=>el.setAttribute('style',Array.from({length:el.style.length},(_,i)=>el.style.item(i)).sort().map(key=>key+':'+el.style.getPropertyValue(key)).join(';')));return node.innerHTML;};
  assert.equal(normalized(host.outerHTML),normalized(old));assert.equal(host.querySelector('[data-mp-reading-base-style]'),null);
});

test('same-scene reading pairs differ in at least three non-color categories and preserve original text',async()=>{
  createDom();const {curatedThemeEntries}=await loadModule('src/core/theme/themeCatalog.ts');const {readingTheme}=await loadModule('src/core/theme/themeRevisionRegistry.ts');
  const {TemplateManager}=await loadModule('src/templateManager.ts');
  const strip=s=>s.replace(/#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi,'COLOR');
  for(const scene of new Set(curatedThemeEntries.filter(e=>e.status==='featured').map(e=>e.scene))) {
    const themes=curatedThemeEntries.filter(e=>e.status==='featured'&&e.scene===scene).map(e=>readingTheme(e.id));
    const categories=t=>[JSON.stringify(t.styles.title),t.styles.quote,JSON.stringify(t.styles.list),t.styles.image,JSON.stringify(t.reading.component)];
    assert.ok(categories(themes[0]).filter((value,i)=>strip(value)!==strip(categories(themes[1])[i])).length>=3,scene);
    for(const theme of themes){const host=document.body.createDiv();host.innerHTML='<section class="mp-content-section"><h2>章节</h2><p>正文</p><blockquote><p>引用</p></blockquote><ol><li>步骤</li><li>末尾</li></ol></section>';const text=host.textContent;
      new TemplateManager({},{getTemplate:()=>theme}).applyTemplate(host,theme);assert.equal(host.textContent,text);assert.equal(host.querySelector('ol').style.listStyleType,'decimal');host.remove();}
  }
});

test('custom dark and complex backgrounds keep explicit warnings after canonical attributes are removed',async()=>{
  createDom();const {prepareLegacyWechatFragment}=await loadModule('src/core/render/legacyWechatPipeline.ts');
  const root=document.createElement('section');root.setAttribute('data-mp-reading-background','custom');root.innerHTML='<p>完整正文</p>';
  root.style.cssText='background:#111;color:#263238';let result=prepareLegacyWechatFragment(root);
  assert.ok(result.validation.issues.some(issue=>issue.code==='reading-background-low-contrast'));assert.equal(result.root.hasAttribute('data-mp-reading-background'),false);
  root.style.background='linear-gradient(#fff,#333)';result=prepareLegacyWechatFragment(root);
  assert.ok(result.validation.issues.some(issue=>issue.code==='reading-background-unverified'));assert.match(result.text,/完整正文/);
});

test('modern step enhancement respects separate list starts, nested bullets and reference lists',async()=>{
  createDom();const {applyArticleRecipe}=await loadModule('src/core/recipe/articleRecipeFormatter.ts');
  const root=document.createElement('section');root.setAttribute('data-mp-reading-background','theme');
  root.innerHTML='<ol><li>一<ul><li>要点</li></ul></li><li>二</li></ol><ol start="4"><li>四</li><li value="8">八</li></ol><section class="mp-reference-section"><ol><li>脚注</li></ol></section>';
  for(let i=0;i<2;i++)applyArticleRecipe(root,'tutorial');
  assert.deepEqual([...root.querySelectorAll('.mp-recipe-step-label')].map(n=>n.textContent.trim()),['步骤 1','步骤 2','步骤 4','步骤 8']);
  assert.equal(root.querySelector('ul .mp-recipe-step-label'),null);assert.equal(root.querySelector('.mp-reference-section .mp-recipe-step-label'),null);
  applyArticleRecipe(root,'checklist');assert.equal(root.querySelector('.mp-reference-section .mp-recipe-check'),null);
});
