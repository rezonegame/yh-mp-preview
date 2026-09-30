import { JSDOM } from 'jsdom';
import { build } from 'esbuild';

export function createDom() {
  const dom = new JSDOM('', { url: 'https://fixture.invalid/' });
  const { window } = dom;
  for (const name of ['window', 'document', 'Node', 'NodeFilter', 'HTMLElement', 'Element', 'XMLSerializer']) {
    globalThis[name] = name === 'window' ? window : window[name];
  }
  const prototype = window.HTMLElement.prototype;
  prototype.setCssStyles = function (styles) { Object.assign(this.style, styles); return this; };
  prototype.createEl = function (tag, options = {}) {
    const child = window.document.createElement(tag);
    if (typeof options === 'string') child.className = options;
    else {
      if (options.cls) child.className = options.cls;
      if (options.text) child.textContent = options.text;
      for (const [key, value] of Object.entries(options.attr || {})) child.setAttribute(key, value);
    }
    this.appendChild(child);
    return child;
  };
  prototype.createDiv = function (options) { return this.createEl('div', options); };
  prototype.createSpan = function (options) { return this.createEl('span', options); };
  prototype.empty = function () { this.replaceChildren(); };
  prototype.setText = function (text) { this.textContent = text; };
  prototype.addClass = function (...classes) { this.classList.add(...classes); };
  prototype.hasClass = function (cls) { return this.classList.contains(cls); };
  prototype.toggleClass = function (cls, force) { this.classList.toggle(cls, force); };
  return dom;
}

export async function loadModule(path, stub = '') {
  const result = await build({
    entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2020',
    plugins: [{ name: 'obsidian-fixture', setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: stub || 'export class Notice {} export class App {}', loader: 'js' }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
