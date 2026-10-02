import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDom, loadModule } from './dom-runtime.mjs';

export const recipes=['legacy-compatible','tutorial','checklist','product-intro','commentary','review'];
export async function captureThemeOutputs() {
  const dom=createDom();
  const [{TemplateManager},{BackgroundManager},{prepareLegacyWechatFragment},{applyArticleRecipe},{resolveWechatPalette},{resolveWechatAppearance}]=await Promise.all([
    loadModule('src/templateManager.ts'),loadModule('src/backgroundManager.ts'),loadModule('src/core/render/legacyWechatPipeline.ts'),
    loadModule('src/core/recipe/articleRecipeFormatter.ts'),loadModule('src/core/theme/wechatPalette.ts'),loadModule('src/core/theme/wechatAppearance.ts'),
  ]);
  const themes=readdirSync('src/templates').filter(name=>name.endsWith('.json')).map(name=>JSON.parse(readFileSync(`src/templates/${name}`,'utf8')));
  const settings={getTemplate:id=>themes.find(theme=>theme.id===id),getBackground:()=>({id:'default',style:'background: #fff; padding: 0;'})};
  const manager=new TemplateManager({},settings), background=new BackgroundManager(settings);
  background.setBackground('default');manager.setFont('system-ui, sans-serif');manager.setFontSize(16);
  const outputs={};
  for(const theme of themes) for(const recipe of recipes) {
    const host=document.createElement('div');
    host.innerHTML=`<section class="mp-content-section"><div class="mp-custom-header"><p>HEADER</p></div>
      <h1>完整阅读</h1><p>手工编辑正文 <strong>重点</strong> 与 English / 数字 12345。</p>
      <h2>同名章节</h2><blockquote><p>引用第一段</p><p>引用第二段</p></blockquote><h3>知识步骤</h3>
      <ol><li>第一步<ul><li>嵌套要点</li></ul></li><li>第二步</li></ol><h4>四级</h4><h5>五级</h5><h6>六级</h6>
      <pre><code>const n = 1;\nconsole.log(n);</code></pre><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="本地图示">
      <table><thead><tr><th>指标</th><th>说明</th></tr></thead><tbody><tr><td>16</td><td>表格完整内容</td></tr></tbody></table>
      <section class="mp-layout-card"><p>信息组件</p></section><h2>同名章节</h2><p>END - OF - ARTICLE</p><div class="mp-custom-footer"><p>FOOTER</p></div></section>`;
    const appearance=resolveWechatAppearance({templates:themes.map(item=>({...item,isPreset:true})),customTemplates:[],backgrounds:[settings.getBackground()],customBackgrounds:[],backgroundId:'default',fontFamily:'system-ui, sans-serif',fontSize:16,v3:{selectedRecipeId:recipe}},theme.id);
    manager.setCurrentTemplate(theme.id);manager.applyTemplate(host,appearance.template);background.applyBackground(host);
    const article=host.firstElementChild,palette=resolveWechatPalette(theme);
    applyArticleRecipe(article,recipe,palette);
    const result=prepareLegacyWechatFragment(article,{themeId:theme.id,recipeId:recipe,palette});
    outputs[`${theme.id}/${recipe}`]={sha256:createHash('sha256').update(result.html).digest('hex'),text:result.text,blocks:result.blocks.map(block=>block.tag)};
  }
  dom.window.close();return outputs;
}
