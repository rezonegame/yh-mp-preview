import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogModule = buildSync({
  entryPoints: [join(root, 'src/core/theme/themeCatalog.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2020',
}).outputFiles[0].text;
const { curatedThemeEntries } = await import(`data:text/javascript;base64,${Buffer.from(catalogModule).toString('base64')}`);
const featured = curatedThemeEntries.filter(entry => entry.status === 'featured');
const legacy = curatedThemeEntries.filter(entry => entry.status === 'legacy');
const scenes = [...new Set(featured.map(entry => entry.scene))];
const templateName = id => JSON.parse(readFileSync(join(root, 'src/templates', `${id}.json`), 'utf8')).name;
const cards = entries => entries.map(entry => `<button class="mp-theme-card" data-id="${entry.id}"><span class="mp-theme-info"><strong class="mp-theme-name">${templateName(entry.id)}</strong></span></button>`).join('');
const select = (className, value) => `<div class="custom-select-container ${className}"><div class="custom-select"><span class="selected-text">${value}</span><span class="select-arrow">▾</span></div></div>`;
const toolbar = width => `<div class="preview-frame" style="width:${width}px"><p>预览面板 · ${width}px</p><div class="mp-toolbar">
  <div class="mp-controls-group mp-appearance-row"><div class="mp-toolbar-field mp-background-field"><span class="mp-toolbar-label">背景</span>${select('mp-background-select', '默认')}</div><button class="mp-gallery-btn">主题画廊</button><button class="mp-phone-preview-btn">手机 375px</button></div>
  <div class="mp-controls-group mp-typography-row"><div class="mp-toolbar-field mp-font-field"><span class="mp-toolbar-label">字体</span>${select('mp-font-select', '默认字体')}</div><div class="mp-toolbar-field mp-size-field"><span class="mp-toolbar-label">字号</span><div class="mp-font-size-group"><button>−</button><span>16</span><button>＋</button></div></div><div class="mp-toolbar-field mp-recipe-field"><span class="mp-toolbar-label">文章配方</span>${select('mp-recipe-select', '通用长文')}</div></div>
  <div class="mp-controls-group mp-secondary-row">${Array.from({ length: 9 }, (_, index) => `<button class="mp-icon-btn" aria-label="辅助操作 ${index + 1}"></button>`).join('')}</div>
</div></div>`;
const gallerySections = scenes.map(scene => `<section class="scene" data-scene="${scene}"><h3 class="mp-gallery-section-title">${scene}</h3><div class="mp-gallery-card-grid">${cards(featured.filter(entry => entry.scene === scene))}</div></section>`).join('');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>主题画廊和工具栏布局检查</title>
<style>:root{--background-primary:#fff;--background-secondary:#f7f7f7;--background-modifier-border:#d9dde2;--background-modifier-hover:#eef1f3;--text-normal:#27313b;--text-muted:#64717d;--text-accent:#355a72;--interactive-accent:#355a72;--text-on-accent:#fff}*{box-sizing:border-box}body{margin:0;padding:24px;background:#e9edf0;color:var(--text-normal);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.preview-frame{max-width:100%;margin:0 0 24px}.preview-frame>p{margin:0 0 8px}.mp-theme-gallery-modal{margin:24px auto;box-shadow:0 18px 48px #33415526}.mp-font-size-group>span{min-width:30px;text-align:center}.mp-font-size-group>button{min-width:28px;padding:0}.scene{margin-bottom:24px}</style>
<style>${readFileSync(join(root, 'src/styles/view/layout.css'), 'utf8')}</style><style>${readFileSync(join(root, 'src/styles/settings/theme-gallery.css'), 'utf8')}</style>
${toolbar(980)}${toolbar(520)}
<div class="mp-theme-gallery-modal"><div class="modal-content"><div class="mp-gallery-header"><div class="mp-gallery-heading"><h2>公众号主题画廊</h2><p>每个场景两套不同的阅读版式；点击主题先试用，再确认应用。</p></div><div class="mp-gallery-header-actions"><input class="mp-gallery-search" placeholder="搜索主题或文章场景"><button class="mp-gallery-history-btn" type="button">历史主题</button></div></div><div class="mp-gallery-scenes"><button class="mp-gallery-scene is-active" data-scene="全部">全部主题 · 14</button>${scenes.map(scene => `<button class="mp-gallery-scene" data-scene="${scene}">${scene} · 2</button>`).join('')}</div><div class="mp-gallery-grid">${gallerySections}<section class="scene" data-scene="历史主题" hidden><h3 class="mp-gallery-section-title">历史主题 · 5 个主题</h3><div class="mp-gallery-card-grid">${cards(legacy)}</div></section></div><div class="mp-gallery-footer"><div class="mp-gallery-trial-info"><div class="mp-gallery-try-hint">推荐作用：选择一个主题查看用途</div><div class="mp-gallery-trial-note">试用不会保存到笔记设置。</div></div><div class="mp-gallery-actions"><button class="mp-gallery-btn-cancel">取消试用</button><button class="mp-gallery-btn-apply">应用主题</button></div></div></div></div>
<script>const scenes=document.querySelectorAll('.scene');const pills=document.querySelectorAll('.mp-gallery-scene');const history=document.querySelector('.mp-gallery-history-btn');function show(scene){scenes.forEach(el=>el.hidden=scene!=='全部'&&el.dataset.scene!==scene||scene==='全部'&&el.dataset.scene==='历史主题');pills.forEach(el=>el.classList.toggle('is-active',el.dataset.scene===scene));history.classList.toggle('is-active',scene==='历史主题')}pills.forEach(el=>el.onclick=()=>show(el.dataset.scene));history.onclick=()=>show('历史主题');document.querySelectorAll('.mp-theme-card').forEach(card=>card.onclick=()=>{document.querySelectorAll('.mp-theme-card').forEach(el=>el.classList.remove('is-selected'));card.classList.add('is-selected');document.querySelector('.mp-gallery-try-hint').textContent='推荐作用：'+card.dataset.id})</script></html>`;
const output = join(root, 'output/playwright/gallery-ui-3.15.html');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html, 'utf8');
console.log(output);
