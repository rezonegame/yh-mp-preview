import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const upstreamRepository = 'Yeban8090/mp-preview';
const upstreamCommit = '49e77aabd62b7c01a812a10e457cf7a12e45199e';
const cache = resolve(root, 'output/refactor/provenance-upstream');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const hash = value => createHash('sha256').update(value).digest('hex');
const gitBlob = value => createHash('sha1').update(`blob ${value.length}\0`).update(value).digest('hex');
const normalize = text => text.replace(/\r\n/g, '\n');
const offline = process.argv.includes('--offline');
mkdirSync(cache, { recursive: true });
const treePath = resolve(cache, 'tree.json');
if (!offline) {
  const tree = execFileSync('gh', ['api', `repos/${upstreamRepository}/git/trees/${upstreamCommit}?recursive=1`], { encoding: 'utf8' });
  writeFileSync(treePath, tree);
}
if (!existsSync(treePath)) throw new Error('Run the audit online once before using --offline.');
const tree = JSON.parse(readFileSync(treePath, 'utf8'));
if (tree.sha !== upstreamCommit || tree.truncated) throw new Error('Unpinned or incomplete upstream tree.');
const originalFiles = tree.tree.filter(entry => entry.type === 'blob' && entry.path.startsWith('src/'));
let cursor = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (cursor < originalFiles.length) {
    const entry = originalFiles[cursor++];
    const destination = resolve(cache, entry.path);
    if (!existsSync(destination)) {
      if (offline) throw new Error(`Missing cached upstream file: ${entry.path}`);
      const response = await fetch(`https://raw.githubusercontent.com/${upstreamRepository}/${upstreamCommit}/${entry.path}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Upstream ${entry.path}: HTTP ${response.status}`);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
    }
    const content = readFileSync(destination);
    if (gitBlob(content) !== entry.sha) throw new Error(`Upstream blob mismatch: ${entry.path}`);
    entry.content = content;
  }
}));

function tokens(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const result = [];
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    const position = scanner.getTokenPos();
    result.push({ value: `${scanner.getToken()}:${scanner.getTokenText()}`, position });
  }
  return result;
}
function methods(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const result = [];
  const visit = node => {
    if ((ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isFunctionDeclaration(node)) && node.body) {
      const body = tokens(node.body.getText(source)).map(token => token.value);
      if (body.length >= 60) result.push({ path, name: node.name?.getText(source) || 'constructor', line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, tokens: body.length, hash: hash(body.join('\0')) });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}
const upstreamMethods = originalFiles.filter(entry => entry.path.endsWith('.ts') && !entry.path.startsWith('src/assets/'))
  .flatMap(entry => methods(entry.path, entry.content.toString('utf8')));
const methodIndex = new Map();
for (const method of upstreamMethods) {
  const list = methodIndex.get(method.hash) || [];
  list.push(method);
  methodIndex.set(method.hash, list);
}
function sourcePaths(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourcePaths(path) : entry.isFile() ? [path] : [];
  });
}
const localPaths = sourcePaths('src').sort();
const sameMethods = [];
const entries = localPaths.map(path => {
  const content = readFileSync(resolve(root, path));
  const upstream = originalFiles.find(entry => entry.path === path);
  const identical = originalFiles.filter(entry => entry.content.equals(content) || (!/\.(png|jpg|jpeg|webp)$/i.test(path) && normalize(entry.content.toString('utf8')) === normalize(content.toString('utf8'))));
  if (path.endsWith('.ts') && !path.startsWith('src/assets/')) {
    for (const method of methods(path, content.toString('utf8'))) {
      for (const match of methodIndex.get(method.hash) || []) sameMethods.push({ local: method, upstream: match });
    }
  }
  const image = /\.(png|jpg|jpeg|webp)$/i.test(path);
  return { path, sha256: hash(image ? content : normalize(content.toString('utf8'))),
    workingTreeSha256: hash(content), upstreamPath: upstream?.path || null,
    identicalUpstreamPaths: identical.map(entry => entry.path),
    classification: identical.length ? 'identical-upstream-content' : upstream ? 'changed-upstream-path-not-independent-proof' : 'added-path-not-independent-proof' };
});

// Supplement whole-method matching with long exact token runs, including
// anonymous callbacks and fragments in changed methods. Identifiers/literals
// are preserved. Findings are leads, not a copyright or independence verdict.
const windowSize = 80;
const runs = [];
const upstreamStreams = originalFiles.filter(entry => entry.path.endsWith('.ts') && !entry.path.startsWith('src/assets/'))
  .map(entry => ({ path: entry.path, text: entry.content.toString('utf8'), tokens: tokens(entry.content.toString('utf8')) }));
const windows = new Map();
for (const stream of upstreamStreams) {
  for (let i = 0; i <= stream.tokens.length - windowSize; i++) {
    const key = hash(stream.tokens.slice(i, i + windowSize).map(token => token.value).join('\0'));
    const locations = windows.get(key) || [];
    locations.push({ stream, index: i });
    windows.set(key, locations);
  }
}
for (const path of localPaths.filter(path => path.endsWith('.ts') && !path.startsWith('src/assets/'))) {
  const text = readFileSync(resolve(root, path), 'utf8');
  const stream = tokens(text);
  const covered = new Map();
  for (let i = 0; i <= stream.length - windowSize; i++) {
    const key = hash(stream.slice(i, i + windowSize).map(token => token.value).join('\0'));
    for (const location of windows.get(key) || []) {
      const diagonal = `${location.stream.path}:${location.index - i}`;
      if ((covered.get(diagonal) ?? -1) >= i) continue;
      let length = windowSize;
      while (i + length < stream.length && location.index + length < location.stream.tokens.length && stream[i + length].value === location.stream.tokens[location.index + length].value) length++;
      covered.set(diagonal, i + length - windowSize);
      const line = (value, position) => value.slice(0, position).split('\n').length;
      runs.push({ localPath: path, localStartLine: line(text, stream[i].position), localEndLine: line(text, stream[i + length - 1].position), upstreamPath: location.stream.path,
        upstreamStartLine: line(location.stream.text, location.stream.tokens[location.index].position), tokens: length });
    }
  }
}
const cssRules = text => [...text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]+)\}/g)]
  .map(match => ({ selector: match[1].trim(), declarations: match[2].replace(/\s+/g, '').replace(/;$/, '') })).filter(rule => rule.declarations.length >= 60);
const retainedCssRules = [];
for (const entry of entries.filter(entry => entry.path.endsWith('.css'))) {
  const localRules = cssRules(readFileSync(resolve(root, entry.path), 'utf8'));
  for (const upstream of originalFiles.filter(file => file.path.endsWith('.css'))) {
    const rules = cssRules(upstream.content.toString('utf8'));
    const matching = localRules.filter(rule => rules.some(other => rule.selector === other.selector && rule.declarations === other.declarations));
    if (matching.length) retainedCssRules.push({ localPath: entry.path, upstreamPath: upstream.path, matchingRules: matching.length, selectors: matching.map(rule => rule.selector) });
  }
}
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const dependencies = Object.keys(packageJson.dependencies).map(name => {
  const pkg = JSON.parse(readFileSync(resolve('node_modules', name, 'package.json'), 'utf8'));
  return { name, version: pkg.version, license: pkg.license, repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url,
    installedLicenseFiles: ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'COPYING', 'NOTICE'].filter(file => existsSync(resolve('node_modules', name, file))),
    projectLicenseFiles: [`LICENSES/${name === 'dompurify' ? 'DOMPurify' : name}.txt`].filter(file => existsSync(resolve(root, file))) };
});
const report = {
  schemaVersion: 1, auditDate: '2026-10-01', pluginVersion: packageJson.version, baselineCommit: git('rev-parse', 'HEAD'),
  scope: 'Current working-tree src files; all pinned upstream src blobs; runtime package metadata. Git history and existing release assets are preserved.',
  upstream: { repository: upstreamRepository, commit: upstreamCommit, sourceFiles: originalFiles.length, blobIntegrityVerified: true },
  methodology: { textNormalization: 'CRLF to LF only for whole-file comparison',
    contentDigest: 'sha256: binary bytes or UTF-8 text with CRLF normalized to LF; workingTreeSha256: original audit bytes. Portable digest allows Git checkout line-ending differences, not content changes.',
    methodMinimumTokens: 60, contiguousRunMinimumTokens: windowSize, cssRuleMinimumDeclarationCharacters: 60,
    limitations: ['No-match is not proof of independent implementation.', 'Short fragments, renamed identifiers, altered algorithms, and conceptual similarity require human review.', 'This is not a legal opinion or official-directory approval.'] },
  summary: { localSourceFiles: entries.length, identicalFiles: entries.filter(entry => entry.identicalUpstreamPaths.length).length,
    identicalMethodBodies: sameMethods.length, longTokenRuns: runs.length, cssFilesWithRetainedRules: new Set(retainedCssRules.map(entry => entry.localPath)).size,
    independentImplementationVerified: false, officialSourceGate: 'unresolved-no-public-consent-evidence' },
  files: entries, identicalMethods: sameMethods, longTokenRuns: runs, retainedCssRules, dependencies,
  removedLegacyResources: originalFiles.filter(entry => /^src\/assets\//.test(entry.path) && !existsSync(resolve(root, entry.path)))
    .map(entry => ({ path: entry.path, upstreamBlob: entry.sha, status: 'absent-from-current-source-preserved-in-git-history' })),
};
writeFileSync('reports/source-provenance-audit.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
console.log('Identical files: ' + entries.filter(entry => entry.identicalUpstreamPaths.length).map(entry => entry.path).join(', '));
console.log('Identical methods: ' + sameMethods.map(match => `${match.local.path}:${match.local.line} ${match.local.name}`).join(', '));
