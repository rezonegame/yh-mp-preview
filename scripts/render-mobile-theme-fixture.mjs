import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { buildSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paletteModule = buildSync({
  entryPoints: [join(root, 'src/core/theme/wechatPalette.ts')],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'es2020',
}).outputFiles[0].text;
const { resolveWechatPalette } = await import(`data:text/javascript;base64,${Buffer.from(paletteModule).toString('base64')}`);
const ids = [
  'default', 'deep-reading', 'clear-guide', 'knowledge-notes', 'apple-product', 'product-review',
  'red-white-editorial', 'ink-opinion', 'data-blueprint', 'briefing-grid',
  'zen-essence', 'warm-paper', 'olive-journal', 'case-file',
];
const rhythm = {
  compact: 'line-height:1.72;margin-bottom:0.85em;',
  standard: 'line-height:1.78;margin-bottom:0.95em;',
  airy: 'line-height:1.82;margin-bottom:1.05em;',
};
const profiles = {
  default: 'standard', 'deep-reading': 'airy', 'clear-guide': 'compact', 'knowledge-notes': 'compact',
  'apple-product': 'standard', 'product-review': 'compact',
  'red-white-editorial': 'standard', 'ink-opinion': 'standard',
  'data-blueprint': 'compact', 'briefing-grid': 'compact',
  'zen-essence': 'airy', 'warm-paper': 'airy',
  'olive-journal': 'standard', 'case-file': 'standard',
};
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="#e8edf2"/><text x="320" y="165" text-anchor="middle" fill="#455466" font-size="30">公众号配图示例</text></svg>');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function article(theme) {
  const s = theme.styles;
  const palette = resolveWechatPalette(theme);
  const heading = (level, value) => {
    const style = s.title[level];
    return `<${level} style="${escape(style.base)}line-height:1.45;word-break:break-word;"><span style="${escape(style.content)}">${value}</span><span style="${escape(style.after)}"></span></${level}>`;
  };
  const paragraph = value => `<p style="${escape(s.paragraph)}font-size:16px;letter-spacing:0;text-align:left;margin-top:0;word-break:break-word;overflow-wrap:anywhere;${rhythm[profiles[theme.id]]}">${value}</p>`;
  const cellStyle = 'line-height:1.65;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;';
  return `<article class="sample" data-theme="${theme.id}" style="width:375px;box-sizing:border-box;padding:16px 20px;background:#fff;color:#263238;">
    ${heading('h1', '在手机上读懂一篇长文章')}
    ${paragraph('这是一篇用于验收的中文长文。它同时包含 English、<strong>重点信息</strong>与一段较长的说明，检验字号、行距、段落分隔和小屏幕换行是否稳定。')}
    ${paragraph('第二段说明主题不能只靠颜色区分。读者在上下滑动时，应该可以迅速识别章节、步骤、引用和结论，同时不会被连续的高饱和卡片打断。')}
    ${heading('h2', '01 · 先看正文与层级')}
    ${paragraph('长文的第一任务是连续阅读。过宽的标题、拥挤的列表以及过多外框，都会让信息在手机上显得沉重。')}
    ${heading('h3', '一个次级标题')}
    <ul style="${escape(s.list.container)}margin:0.9em 0 1.1em;padding-left:1.45em;">
      <li style="${escape(s.list.item)}font-size:16px;line-height:1.8;margin-bottom:0.5em;">第一项强调步骤与操作的清楚程度。</li>
      <li style="${escape(s.list.item)}font-size:16px;line-height:1.8;margin-bottom:0.5em;">第二项检查较长的中文说明能否自然换行。</li>
    </ul>
    <blockquote style="${escape(s.quote)}font-size:16px;line-height:1.8;text-align:left;font-style:normal;word-break:break-word;">引用是为了帮读者停顿和思考，而不是制造一张抢眼的海报。</blockquote>
    ${heading('h2', '02 · 再看信息块')}
    <section style="margin:1.2em 0;padding:14px 16px;border:1px solid ${palette.border};border-left:3px solid ${palette.accent};background:${palette.surface};box-sizing:border-box;">
      <strong style="color:${palette.accentText};">操作提示</strong>
      ${paragraph('这个信息块用于检查主题强调色和正文灰阶是否协调，以及卡片在窄屏中是否占用过多空间。')}
    </section>
    <pre style="${escape(s.code.block)}font-size:14px;line-height:1.65;white-space:pre-wrap;word-break:break-word;">const article = renderMarkdown(note);</pre>
    <img alt="公众号配图示例" src="${image}" style="${escape(s.image)}max-width:100%;height:auto;display:block;margin:1.2em auto;box-sizing:border-box;" />
    ${heading('h2', '03 · 表格与收尾')}
    <table style="${escape(s.table.container)}width:100%;max-width:100%;table-layout:auto;"><tr><th style="${escape(s.table.header)}${cellStyle}">维度</th><th style="${escape(s.table.header)}${cellStyle}">说明</th></tr><tr><td style="${escape(s.table.cell)}${cellStyle}">节奏</td><td style="${escape(s.table.cell)}${cellStyle}">适合连续阅读</td></tr></table>
    ${paragraph('结尾再用一小段文字检验整篇文章的阅读节奏。')}
  </article>`;
}

const themes = ids.map(id => JSON.parse(readFileSync(join(root, 'src', 'templates', `${id}.json`), 'utf8')));
const options = themes.map(theme => `<option value="${theme.id}">${escape(theme.name)}</option>`).join('');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公众号主题手机阅读验收</title>
<style>body{margin:0;background:#e8ecf0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.toolbar{position:sticky;top:0;z-index:2;padding:10px;background:#fff;border-bottom:1px solid #cbd5e1;display:flex;gap:8px}.sample{display:none;margin:18px auto 32px}.sample.active{display:block}select,button{font:inherit;padding:6px 8px}img{width:100%}</style>
<div class="toolbar"><select id="theme">${options}</select><button data-width="320">320px</button><button data-width="375">375px</button><button data-width="414">414px</button></div>
${themes.map(article).join('\n')}
<script>const search=new URLSearchParams(location.search);const select=document.querySelector('#theme');function show(){document.querySelectorAll('.sample').forEach(card=>{card.classList.toggle('active',card.dataset.theme===select.value);card.style.width=(search.get('width')||'375')+'px'})}select.value=search.get('theme')||'default';select.onchange=()=>{search.set('theme',select.value);history.replaceState(null,'','?'+search);show()};document.querySelectorAll('[data-width]').forEach(button=>button.onclick=()=>{search.set('width',button.dataset.width);history.replaceState(null,'','?'+search);show()});show()</script></html>`;
const outputDir = join(root, 'output', 'playwright');
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'mobile-article.html'), html, 'utf8');
console.log(join(outputDir, 'mobile-article.html'));
