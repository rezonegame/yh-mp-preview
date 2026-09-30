import test from 'node:test';
import assert from 'node:assert/strict';
import {createDom,loadModule} from './helpers/dom-runtime.mjs';
createDom();
const {MPConverter}=await loadModule('src/converter.ts');
const {applyArticleRecipe,resetArticleRecipe}=await loadModule('src/core/recipe/articleRecipeFormatter.ts');
const {CopyManager}=await loadModule('src/copyManager.ts');
const {PreviewSession}=await loadModule('src/core/render/previewSession.ts');

test('multiple containers match exact content in order and conversion is idempotent',()=>{
    const source=['```dialogue {title="第一段"}','甲：第一条','```','```js','const x = "```gallery";','```','```gallery','![](https://fixture.invalid/one.png)','```','```dialogue {title="第二段"}','乙：第二条','```','```gallery','![](https://fixture.invalid/two.png)','```'].join('\n');
    const root=document.createElement('div');
    for(const [type,text] of [['dialogue','甲：第一条\n'],['js','const x = "```gallery";\n'],['gallery','![](https://fixture.invalid/one.png)\n'],['dialogue','乙：第二条\n'],['gallery','![](https://fixture.invalid/two.png)\n']]) root.createEl('pre').createEl('code',{cls:`language-${type}`,text});
    MPConverter.formatContent(root,source);
    const article=root.querySelector('.mp-content-section');
    assert.equal(article.querySelectorAll('[data-container="dialogue"]').length,2);
    assert.match(article.children[0].textContent,/第一段.*甲.*第一条/s);
    assert.match(article.children[3].textContent,/第二段.*乙.*第二条/s);
    assert.match(article.children[2].querySelector('img').src,/one.png$/);
    assert.match(article.children[4].querySelector('img').src,/two.png$/);
    const before=root.innerHTML;MPConverter.formatContent(root,source);assert.equal(root.innerHTML,before);
    assert.equal(new Set(Array.from(article.children,b=>b.dataset.mpBlockId)).size,5);
});
test('repeated recipe and switched recipe have no duplicate labels and restore underlying styles',async()=>{
    const root=document.createElement('section');root.className='mp-content-section';
    const list=root.createEl('ol');list.style.padding='20px';list.createEl('li',{text:'第一步'});list.createEl('li',{text:'第二步'});
    const original=list.getAttribute('style');
    applyArticleRecipe(root,'tutorial');applyArticleRecipe(root,'tutorial');
    assert.equal(root.querySelectorAll('.mp-recipe-step-label').length,2);
    const output=await CopyManager.prepareForExport(root,{recipeId:'tutorial'});
    assert.equal((output.text.match(/步骤/g)||[]).length,2);
    applyArticleRecipe(root,'checklist');assert.equal(root.querySelectorAll('.mp-recipe-step-label').length,0);assert.equal(root.querySelectorAll('.mp-recipe-check').length,2);
    resetArticleRecipe(root);assert.equal(list.getAttribute('style'),original);assert.equal(list.textContent,'第一步第二步');
});
test('canonical export retains header, nested order, footer and manual edits without mutating source',async()=>{
    const article=document.createElement('section');article.className='mp-content-section';
    article.createEl('div',{cls:'mp-custom-header',text:'文章头部'}).dataset.mpBlockId='header';
    article.createEl('h2',{text:'章节标题'});
    const quote=article.createEl('blockquote');quote.createEl('p',{text:'嵌套内容'});
    article.createEl('p',{text:'手动改动后的正文'});
    article.createEl('div',{cls:'mp-custom-footer',text:'文章尾部'}).dataset.mpBlockId='footer';
    const before=article.innerHTML;
    const output=await CopyManager.prepareForExport(article);
    assert.deepEqual(output.blocks.map(b=>b.tag),['div','h2','blockquote','p','div']);
    assert.equal(output.blocks[0].id,'header');assert.equal(output.blocks.at(-1).id,'footer');
    assert.equal(output.text,'文章头部章节标题嵌套内容手动改动后的正文文章尾部');
    assert.ok(output.root.querySelector('blockquote > p'));assert.equal(article.innerHTML,before);
});
test('preview session rejects superseded and closed jobs, isolated per pane',()=>{
    const first=new PreviewSession(),second=new PreviewSession();
    const old=first.begin(),current=first.begin(),other=second.begin();
    assert.equal(old.isCurrent(),false);assert.equal(old.signal.aborted,true);assert.equal(current.isCurrent(),true);
    first.trialTemplateId='deep-reading';assert.equal(second.trialTemplateId,null);
    first.close();assert.equal(current.isCurrent(),false);assert.equal(other.isCurrent(),true);
});
