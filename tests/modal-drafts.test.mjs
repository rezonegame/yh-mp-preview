import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

const stub = `export class App {} export class Notice {} export class Setting {} export class ColorComponent {} export function setIcon() {} export class Modal { constructor(app) {this.app=app;this.contentEl=document.createElement('div');this.titleEl=document.createElement('h2');} close(){this.closed=true;} }`;
test('all editor drafts detach nested custom data and preserve IDs', async () => {
    createDom();
    for (const [path, name, field, value] of [
        ['src/settings/CreateFontModal.ts','CreateFontModal','font',{id:'font-old',name:'Original',fontFamily:'serif',custom:{keep:1}}],
        ['src/settings/CreateBackgroundModal.ts','CreateBackgroundModal','background',{id:'background-old',name:'Original',style:'color: black;',custom:{keep:1}}],
    ]) {
        const module=await loadModule(path,stub);
        const modal=new module[name]({},()=>{},value);
        modal[field].name='Changed';modal[field].custom.keep=2;
        assert.equal(value.name,'Original');assert.equal(value.custom.keep,1);assert.equal(modal[field].id,value.id);
    }
    const {CreateTemplateModal}=await loadModule('src/settings/CreateTemplateModal.ts',stub);
    const original={id:'theme-old',name:'Original',description:'',styles:{custom:{css:'color: black;'}},extension:{keep:1}};
    const modal=new CreateTemplateModal({}, {},()=>{}, original);
    modal.template.styles.custom.css='color: red;';modal.template.extension.keep=2;
    assert.equal(original.styles.custom.css,'color: black;');assert.equal(original.extension.keep,1);assert.equal(modal.template.id,'theme-old');
});
test('draft submission waits, prevents duplicates, and stays open after persistence failure', async () => {
    createDom();
    const {submitDraft}=await loadModule('src/ui/submitDraft.ts');
    const button={buttonEl:document.createElement('button'),setDisabled(v){this.buttonEl.disabled=v;return this;},setButtonText(v){this.buttonEl.textContent=v;return this;}};
    button.setButtonText('保存');let calls=0,closed=0,release;
    const pending=submitDraft(button,()=>{calls++;return new Promise(resolve=>{release=resolve;});},()=>closed++);
    await submitDraft(button,()=>{calls++;},()=>closed++);
    assert.equal(calls,1);assert.equal(closed,0);release();await pending;
    assert.equal(closed,1);assert.equal(button.buttonEl.disabled,false);
    await submitDraft(button,async()=>{throw new Error('disk full');},()=>closed++);
    assert.equal(closed,1);assert.equal(button.buttonEl.disabled,false);assert.equal(button.buttonEl.textContent,'保存');
});
