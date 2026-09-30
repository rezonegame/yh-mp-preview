import test from 'node:test';
import assert from 'node:assert/strict';
import {createDom,loadModule} from './helpers/dom-runtime.mjs';
const dom=createDom();
const {SettingsRepository}=await loadModule('src/core/settings/settingsRepository.ts');
const {SettingsManager}=await loadModule('src/settings/settings.ts');
const {styleFields}=await loadModule('src/core/settings/styleFields.ts');
test('failed persistence leaves published state unchanged and queue recovers',async()=>{
 let fail=true;const repo=new SettingsRepository({items:[]},async()=>{if(fail)throw new Error('disk');});
 await assert.rejects(repo.update(draft=>draft.items.push('lost')),/disk/);assert.deepEqual(repo.read(),{items:[]});
 fail=false;await Promise.all([repo.update(draft=>draft.items.push('A')),repo.update(draft=>draft.items.push('B'))]);
 assert.deepEqual(repo.read(),{items:['A','B']});const detached=repo.read();detached.items.push('C');assert.equal(repo.read().items.length,2);
});
test('manager editing is isolated and failures do not leak changes',async()=>{
 let saved={};let fail=false;const manager=new SettingsManager({loadData:async()=>structuredClone(saved),saveData:async data=>{if(fail)throw new Error('disk');saved=structuredClone(data);}});await manager.loadSettings();
 const original=manager.getSettings();original.fontSize=24;assert.equal(manager.getSettings().fontSize,16);
 fail=true;await assert.rejects(manager.updateSettings({fontSize:20}));assert.equal(manager.getSettings().fontSize,16);
 fail=false;await manager.addCustomFont({value:'Test',label:'测试'});assert.equal(manager.getFontOptions().at(-1).value,'Test');
});
test('style schema includes unknown fields and array values without discarding data',()=>{const data={title:{base:'color:red'},code:{colors:['#111','#222']},extension:{css:'margin:3px',keep:8}};const fields=styleFields(data);assert.equal(fields.length,4);fields.find(f=>f.path==='code.colors.0').set('#333');assert.equal(data.code.colors[0],'#333');assert.equal(data.extension.keep,8);});
test.after(()=>dom.window.close());
