import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
  Object.defineProperty(window.document, 'win', { value: window });
  for (const [name, tag] of [['createEl', null], ['createDiv', 'div'], ['createSpan', 'span']]) {
    const create = (...args) => {
      const holder = window.document.createElement('div');
      const child = tag ? holder.createEl(tag, args[0]) : holder.createEl(...args);
      child.remove(); return child;
    };
    globalThis[name] = window[name] = create;
  }
  return dom;
}

export async function loadModule(path, stub = '') {
  const result = await build({
    entryPoints: [path], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2020',
    loader: { '.png': 'dataurl' },
    plugins: [{ name: 'obsidian-fixture', setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: stub || 'export class Notice {} export class App {} export function requestUrl(){throw new Error("fixture requires an explicit resource loader");}', loader: 'js' }));
    } }],
  });
  const directory = await mkdtemp(join(tmpdir(), 'mp-preview-test-'));
  const output = join(directory, 'module.mjs');
  await writeFile(output, result.outputFiles[0].text);
  return import(pathToFileURL(output).href);
}
