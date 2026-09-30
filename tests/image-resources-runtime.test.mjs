import test from 'node:test';
import assert from 'node:assert/strict';
import {createDom,loadModule} from './helpers/dom-runtime.mjs';
createDom();
const {embedArticleImages}=await loadModule('src/core/resources/imageResources.ts');
const response=(status=200,mime='image/png',size=8)=>({status,mime,bytes:new Uint8Array(size).buffer});
const rootFor=(urls)=>{const root=document.createElement('div');for(const src of urls)root.createEl('img',{attr:{src}});return root;};
test('bounded image workers cache duplicates and embed all images',async()=>{
    const root=rootFor(['one','two','one','three','four'].map(path=>`https://fixture.invalid/${path}.png`));
    let active=0,max=0,calls=0;
    await embedArticleImages(root,{concurrency:2,loader:async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return response();}});
    assert.equal(calls,4);assert.ok(max<=2);assert.ok(Array.from(root.querySelectorAll('img')).every(img=>img.src.startsWith('data:image/png;base64,')));
});
test('offline, HTTP, MIME, per-image and total limits produce explicit errors',async()=>{
    for(const [loader,options,pattern] of [
        [async()=>{throw new Error('offline');},{},/offline/],
        [async()=>response(403),{},/HTTP 403/],
        [async()=>response(200,'text/html'),{},/图片类型/],
        [async()=>response(),{maxImageBytes:4},/大小限制/],
        [async()=>response(),{maxTotalBytes:4},/大小限制/],
    ]) await assert.rejects(embedArticleImages(rootFor(['https://fixture.invalid/bad.png']),{loader,...options}),pattern);
});
test('resource timeout and cancellation settle even if the host request never returns',async()=>{
    await assert.rejects(embedArticleImages(rootFor(['https://fixture.invalid/slow.png']),{timeoutMs:20,loader:()=>new Promise(()=>{})}),/超时/);
    const controller=new AbortController();
    const pending=embedArticleImages(rootFor(['https://fixture.invalid/slow.png']),{signal:controller.signal,loader:()=>new Promise(()=>{})});
    controller.abort();await assert.rejects(pending,/取消/);
});
test('data images are reused and SVG or oversized data are rejected',async()=>{
    const root=rootFor(['data:image/png;base64,AA==']);await embedArticleImages(root);assert.equal(root.firstChild.src,'data:image/png;base64,AA==');
    await assert.rejects(embedArticleImages(rootFor(['data:image/svg+xml;base64,AA=='])),/不支持/);
    await assert.rejects(embedArticleImages(rootFor(['data:image/png;base64,AAAA']),{maxImageBytes:1}),/大小限制/);
});
