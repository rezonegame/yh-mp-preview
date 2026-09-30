import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

test('canvas clone excludes unrelated host images but keeps article ancestors and styles', async () => {
  createDom(); const {shouldIgnoreExportElement}=await loadModule('src/core/render/exportCanvas.ts');
  const host=document.body.createDiv();const article=host.createEl('section');const image=article.createEl('img');
  const unrelated=document.body.createEl('img');
  assert.equal(shouldIgnoreExportElement(image,article),false);
  assert.equal(shouldIgnoreExportElement(host,article),false);
  assert.equal(shouldIgnoreExportElement(unrelated,article),true);
  assert.equal(shouldIgnoreExportElement(document.head.createEl('style'),article),false);
});

test('canvas timeout and close cancellation settle even when rendering never returns', async () => {
  createDom();const {boundedCanvasRender}=await loadModule('src/core/render/exportCanvas.ts');
  await assert.rejects(boundedCanvasRender(window,new AbortController().signal,()=>new Promise(()=>{}),20),/超时/);
  const controller=new AbortController();const pending=boundedCanvasRender(window,controller.signal,()=>new Promise(()=>{}));
  controller.abort();await assert.rejects(pending,/取消/);
  assert.equal(await boundedCanvasRender(window,new AbortController().signal,async()=>42),42);
});

test('canvas jobs serialize within one document and recover after failure', async () => {
  createDom();const {queueCanvasRender}=await loadModule('src/core/render/exportCanvas.ts');
  const order=[];let release;
  const first=queueCanvasRender(document,async()=>{order.push('first');await new Promise(resolve=>{release=resolve});throw new Error('failure')});
  const failed=assert.rejects(first,/failure/);
  const second=queueCanvasRender(document,async()=>{order.push('second');return 2});
  await new Promise(resolve=>setTimeout(resolve,5));assert.deepEqual(order,['first']);release();
  await failed;assert.equal(await second,2);assert.deepEqual(order,['first','second']);
});
