import test from 'node:test';
import assert from 'node:assert/strict';
import { createDom, loadModule } from './helpers/dom-runtime.mjs';

test('preview priority uses both pane dimensions, not screen size', async () => {
  const {needsCompactWorkspace}=await loadModule('src/ui/previewWorkspace.ts');
  for(const [w,h,compact] of [[900,700,false],[520,560,false],[519,900,true],[900,559,true],[260,320,true]]) {
    assert.equal(needsCompactWorkspace(w,h),compact,`${w}x${h}`);
  }
});

test('warning details start collapsed, all grouped locations remain available, rerenders preserve disclosure', async () => {
  createDom(); const {renderPreviewValidation}=await loadModule('src/ui/previewWorkspace.ts');
  const panel=document.body.createEl('section');
  const issues=Array.from({length:29},(_,index)=>({severity:'warning',code:'overflow',message:'溢出风险',path:`section > div:${index}`}));
  const report={issues,errors:0,warnings:29};renderPreviewValidation(panel,report);
  const details=panel.querySelector('.mp-validation-details');
  assert.equal(details.open,false);assert.match(details.firstElementChild.textContent,/29/);
  assert.equal(panel.querySelectorAll('.mp-validation-issues > li').length,1);
  assert.equal(panel.querySelectorAll('.mp-validation-issues ul > li').length,29);
  assert.match(panel.textContent,/× 29/);assert.match(panel.textContent,/div:28/);
  details.open=true;renderPreviewValidation(panel,report);assert.equal(panel.querySelector('details').open,true);
  panel.querySelector('details').open=false;renderPreviewValidation(panel,report);assert.equal(panel.querySelector('details').open,false);
  renderPreviewValidation(panel,null);assert.equal(panel.hidden,true);
  renderPreviewValidation(panel,report);assert.equal(panel.hidden,false);
});

test('new blocking errors open details, take priority and never merge with warnings', async () => {
  createDom();const {renderPreviewValidation}=await loadModule('src/ui/previewWorkspace.ts');
  const panel=document.body.createDiv();
  const warning={severity:'warning',code:'same',message:'same',path:'p'};
  renderPreviewValidation(panel,{issues:[warning],warnings:1,errors:0});
  renderPreviewValidation(panel,{issues:[warning,{...warning,severity:'error'}],warnings:1,errors:1});
  assert.equal(panel.querySelector('details').open,true);assert.equal(panel.classList.contains('mp-has-errors'),true);
  assert.match(panel.querySelector('summary').textContent,/已禁止复制/);
  assert.equal(panel.querySelector('.mp-validation-issues').firstElementChild.className,'is-error');
  assert.equal(panel.querySelectorAll('.mp-validation-issues > li').length,2);
  panel.querySelector('details').open=false;
  renderPreviewValidation(panel,{issues:[warning,{...warning,severity:'error'}],warnings:1,errors:1});
  assert.equal(panel.querySelector('details').open,false);
});

test('focus preview is reversible chrome only and does not alter article HTML', async () => {
  createDom();const {togglePreviewFocus}=await loadModule('src/ui/previewWorkspace.ts');
  const root=document.body.createDiv();const button=root.createEl('button');
  const article=root.createDiv('mp-content-section');article.innerHTML='<p style="font-size:16px">原文</p>';
  const before=article.outerHTML;
  assert.equal(togglePreviewFocus(root,button),true);assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.equal(togglePreviewFocus(root,button),false);assert.equal(button.getAttribute('aria-label'),'专注预览');
  assert.equal(article.outerHTML,before);
});

test('responsive settings respect keyboard focus, allow Escape/outside dismissal and clean up observers', async () => {
  createDom();let callback,disconnected=false;
  window.ResizeObserver=class {constructor(fn){callback=fn} observe(){} disconnect(){disconnected=true}};
  const {observePreviewWorkspace}=await loadModule('src/ui/previewWorkspace.ts');
  const root=document.body.createDiv();let width=900,height=700;
  Object.defineProperties(root,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
  const settings=root.createEl('details');const summary=settings.createEl('summary',{text:'排版设置'});const input=settings.createEl('input');
  const cleanup=observePreviewWorkspace(root,settings);assert.equal(settings.open,true);
  height=450;callback();assert.equal(settings.open,false);assert.equal(root.classList.contains('mp-compact-workspace'),true);
  settings.open=true;input.focus();window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(settings.open,false);assert.equal(document.activeElement,summary);
  settings.open=true;input.focus();height=700;callback();height=450;callback();assert.equal(settings.open,true);
  root.click();assert.equal(settings.open,false);
  settings.open=true;cleanup();assert.equal(disconnected,true);root.click();assert.equal(settings.open,true);
});
