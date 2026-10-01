import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const stub = `export class App {} export class Notice {constructor(message){globalThis.fixtureNotices.push(message)}} export function setIcon(){} export class Modal {constructor(app){this.app=app;this.modalEl=document.body.createDiv();this.contentEl=this.modalEl.createDiv();} open(){this.onOpen()} close(){this.closed=true;this.onClose();this.modalEl.remove()}}`;

test('compact workbench has one appearance group and a separate secondary group', async () => {
  createDom();
  const {createWorkbenchControls}=await loadModule('src/ui/workbenchControls.ts');
  const {toolbar,controlsGroup,secondaryRow}=createWorkbenchControls(document.body);
  assert.equal(toolbar.querySelectorAll('.mp-compact-controls').length,1);
  assert.equal(toolbar.querySelector('.mp-typography-row'),null);
  assert.equal(controlsGroup.getAttribute('class'),'mp-controls-group mp-compact-controls');
  assert.equal(secondaryRow.getAttribute('aria-label'),'文章操作');
});

test('local enhancement labels keep all persisted recipe IDs and expose active effect', async () => {
  const {recipeOptions,recipeSummaryLabel}=await loadModule('src/ui/recipeLabels.ts');
  assert.deepEqual(recipeOptions.map(option=>option.value),['legacy-compatible','tutorial','checklist','product-intro','commentary','review']);
  assert.deepEqual(recipeOptions.map(option=>option.label),['不额外增强','步骤列表','勾选清单','导语强调','引用与结语强调','小标题强调']);
  assert.equal(recipeSummaryLabel('legacy-compatible'),'更多工具');
  for(const option of recipeOptions.slice(1)) assert.equal(recipeSummaryLabel(option.value),`更多工具 · ${option.label}`);
  assert.equal(recipeSummaryLabel('unknown'),'更多工具');
});

test('enhancement selector accessible name matches visible effect terminology', async () => {
  createDom(); globalThis.fixtureNotices=[];
  const {createCustomSelect}=await loadModule('src/ui/CustomSelect.ts',stub);
  const {recipeOptions}=await loadModule('src/ui/recipeLabels.ts');
  const parent=document.body.createDiv();
  const changes=[];
  const control=createCustomSelect(parent,'mp-recipe-select',recipeOptions,value=>changes.push(value));
  control.setValue('tutorial');
  const select=parent.querySelector('select');
  assert.equal(select.getAttribute('aria-label'),'局部排版增强');
  assert.equal(select.selectedOptions[0].textContent,'步骤列表');
  assert.equal(select.title,'步骤列表');
  select.value='legacy-compatible';select.dispatchEvent(new window.Event('change'));await settle();
  assert.deepEqual(changes,['legacy-compatible']);
  assert.equal(select.title,'不额外增强');
});

test('native grouped selector preserves hidden current selection and rolls back failed saves', async () => {
  createDom(); globalThis.fixtureNotices=[];
  const {createCustomSelect}=await loadModule('src/ui/CustomSelect.ts',stub);
  const parent=document.body.createDiv();
  const control=createCustomSelect(parent,'mp-font-select',[{header:true,label:'字体',value:''},{label:'衬线',value:'serif'}],async()=>{throw new Error('disk full')});
  control.setValue('custom-hidden-font');
  const select=parent.querySelector('select');
  assert.equal(select.value,'custom-hidden-font'); assert.equal(select.querySelectorAll('optgroup').length,1);
  assert.equal(select.title,'当前字体');
  select.value='serif';select.dispatchEvent(new window.Event('change'));
  assert.equal(select.disabled,true); await settle();
  assert.equal(select.value,'custom-hidden-font'); assert.equal(select.disabled,false);
  assert.equal(select.title,'当前字体');
  assert.ok(fixtureNotices.some(message=>message.includes('disk full')));
});

test('gallery retains focused card and cancels trials without changing persisted selection', async () => {
  createDom(); globalThis.fixtureNotices=[];
  const {ThemeGalleryModal}=await loadModule('src/settings/ThemeGalleryModal.ts',stub);
  const themes=[{id:'default',name:'通用长文',isPreset:true},{id:'deep-reading',name:'深度阅读',isPreset:true}];
  const selected=[];
  const modal=new ThemeGalleryModal({}, {getVisibleTemplates:()=>themes},'default',()=>{},id=>selected.push(id));
  modal.open();const card=modal.contentEl.querySelector('[data-theme-id="deep-reading"]');card.focus();card.click();
  assert.equal(document.activeElement,card);assert.equal(card.getAttribute('aria-pressed'),'true');
  assert.equal(modal.contentEl.querySelectorAll('[aria-pressed="true"].mp-theme-card').length,1);
  modal.close();assert.deepEqual(selected,['deep-reading','default']);
});

test('gallery failed persistence remains open and allows cancellation', async () => {
  createDom();globalThis.fixtureNotices=[];
  const {ThemeGalleryModal}=await loadModule('src/settings/ThemeGalleryModal.ts',stub);
  const selected=[];const themes=[{id:'default',name:'通用长文',isPreset:true},{id:'deep-reading',name:'深度阅读',isPreset:true}];
  const modal=new ThemeGalleryModal({}, {getVisibleTemplates:()=>themes},'default',async()=>{throw new Error('save failed')},id=>selected.push(id));
  modal.open();modal.contentEl.querySelector('[data-theme-id="deep-reading"]').click();
  const apply=modal.contentEl.querySelector('.mp-gallery-btn-apply');apply.click(); await settle();
  assert.equal(modal.closed,undefined);assert.equal(apply.disabled,false);assert.equal(modal.hasApplied,false);
  assert.ok(fixtureNotices.some(message=>message.includes('save failed')));
  modal.close();assert.deepEqual(selected,['deep-reading','default']);
});

test('About traps Tab, closes before host Escape handling and restores focus', async () => {
  createDom(); const {DonateManager}=await loadModule('src/donateManager.ts');
  const parent=document.body.createDiv();const button=parent.createEl('button',{text:'帮助'});button.focus();
  DonateManager.showDonateModal(parent);
  let hostEscapes=0;document.addEventListener('keydown',event=>{if(event.key==='Escape') hostEscapes++});
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert.equal(document.activeElement.className,'mp-donate-close');
  // A host focus manager can move focus back outside a custom overlay.
  button.focus();
  document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  assert.equal(parent.querySelector('.mp-about-modal'),null);assert.equal(document.activeElement,button);assert.equal(hostEscapes,0);
});
