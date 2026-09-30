import { build } from 'esbuild';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';

mkdirSync('output/refactor', { recursive: true });
const imports = readdirSync('src/templates').filter(name => name.endsWith('.json'))
  .map((name, index) => `import t${index} from './src/templates/${name}';`);
await build({
  stdin: { contents: `
    import { TemplateManager } from './src/templateManager';
    import { replaceWithSafeHtml } from './src/core/security/safeDom';
    import { createDialogueElement } from './src/containers/DialogueRenderer';
    ${imports.join('\n')}
    HTMLElement.prototype.setCssStyles = function(styles) { Object.assign(this.style, styles); return this; };
    const themes = [${imports.map((_, index) => `t${index}`).join(',')}];
    const select = document.querySelector('select');
    for (const theme of themes) select.add(new Option(theme.name, theme.id));
    function render() {
      const theme = themes.find(t => t.id === select.value);
      const root = document.querySelector('#preview');
      replaceWithSafeHtml(root, '<section class="mp-content-section"><h1>手机阅读与安全排版</h1><p>正文 Chinese English 共同呈现，保留清晰的段落节奏与强调色。</p><h2>二级标题</h2><p>安全清洗不应该让正常主题失去层级，也不应该改变笔记原文。</p><h3>三级标题</h3><blockquote><p>引用内容保持克制，供读者停顿。</p></blockquote><ul><li>清晰的列表内容</li><li>第二条阅读说明</li></ul><pre><code>const message = "中文English";</code></pre><table><tr><th>项目</th><th>内容</th></tr><tr><td>主题</td><td>十九套保留</td></tr></table></section>');
      root.querySelector('section').append(createDialogueElement({ type:'dialogue', title:'对话组件', lines:[{speaker:'读者',content:'安全文本与普通排版一起验收。'},{speaker:'作者',content:'保留样式，不执行输入中的 HTML。'}] }));
      const manager = new TemplateManager({}, {getTemplate:()=>theme});
      manager.setCurrentTemplate(theme.id); manager.applyTemplate(root);
    }
    select.onchange = render;
    document.querySelectorAll('[data-width]').forEach(button => button.onclick = () => document.querySelector('#preview').style.width = button.dataset.width + 'px');
    render();
  `, resolveDir: process.cwd(), sourcefile: 'security-theme-fixture.ts', loader: 'ts' },
  bundle: true, format: 'iife', platform: 'browser', target: 'es2020', outfile: 'output/refactor/security-theme.js',
  plugins: [{ name: 'host-fixture', setup(build) {
    build.onResolve({ filter: /^obsidian$/ }, () => ({ path:'obsidian', namespace:'fixture' }));
    build.onLoad({ filter: /.*/, namespace:'fixture' }, () => ({ contents:'export class App {} export class Notice { constructor(message) { console.warn(message); } }', loader:'js' }));
  } }],
});
writeFileSync('output/refactor/security-theme.html', `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>P1 actual theme DOM fixture</title>
<style>body{margin:0;background:#e8ecf0;font-family:"Microsoft YaHei",sans-serif}nav{padding:12px;background:white;display:flex;gap:8px}select,button{font:inherit;padding:6px}#preview{width:375px;max-width:100%;margin:16px auto;background:white;box-sizing:border-box}#preview>section{padding:16px 20px;box-sizing:border-box}</style>
<nav><select aria-label="主题"></select><button data-width="320">320px</button><button data-width="375">375px</button><button data-width="414">414px</button></nav><main id="preview"></main><script src="security-theme.js"></script></html>`, 'utf8');
console.log('Generated output/refactor/security-theme.html using actual source modules. Host APIs are a fixture, not Obsidian acceptance.');
