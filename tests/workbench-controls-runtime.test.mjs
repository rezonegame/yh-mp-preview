import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
const stub = `export class App {} export class Notice {constructor(message){globalThis.fixtureNotices.push(message)}} export function setIcon(){} export class Modal {constructor(app){this.app=app;this.modalEl=document.body.createDiv();this.contentEl=this.modalEl.createDiv();} open(){this.onOpen()} close(){this.closed=true;this.onClose();this.modalEl.remove()}}`;

test('native grouped selector preserves hidden current selection and rolls back failed saves', async () => {
  createDom(); globalThis.fixtureNotices=[];
  const {createCustomSelect}=await loadModule('src/ui/CustomSelect.ts',stub);
  const parent=document.body.createDiv();
  const control=createCustomSelect(parent,'mp-font-select',[{header:true,label:'字体',value:''},{label:'衬线',value:'serif'}],async()=>{throw new Error('disk full')});
  control.setValue('custom-hidden-font');
  const select=parent.querySelector('select');
  assert.equal(select.value,'custom-hidden-font'); assert.equal(select.querySelectorAll('optgroup').length,1);
  select.value='serif';select.dispatchEvent(new window.Event('change'));
  assert.equal(select.disabled,true); await settle();
  assert.equal(select.value,'custom-hidden-font'); assert.equal(select.disabled,false);
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
