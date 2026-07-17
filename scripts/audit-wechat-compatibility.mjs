import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = resolve(rootDir, 'src/templates');
const reportPath = resolve(rootDir, 'reports/wechat-compatibility-baseline.json');
const args = new Set(process.argv.slice(2));
const rules = [
  ['displayFlex', /display\s*:\s*(?:inline-)?flex\b/i],
  ['displayGrid', /display\s*:\s*grid\b/i],
  ['fixedOrStickyPosition', /position\s*:\s*(?:fixed|sticky)\b/i],
  ['absolutePosition', /position\s*:\s*absolute\b/i],
  ['overflow', /overflow(?:-[xy])?\s*:/i],
  ['preformattedWhitespace', /white-space\s*:\s*pre(?:-wrap|-line)?\b/i],
  ['cssVariables', /var\s*\(/i],
  ['gradients', /(?:linear|radial)-gradient\s*\(/i],
  ['boxShadow', /box-shadow\s*:/i],
];

function listJsonFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(fullPath);
      return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
    })
    .sort();
}

function posixRelative(filePath) {
  return relative(rootDir, filePath).split(sep).join('/');
}

function collectStrings(value, results = []) {
  if (typeof value === 'string') results.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, results));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, results));
  return results;
}

const findings = Object.fromEntries(rules.map(([name]) => [name, []]));
for (const filePath of listJsonFiles(templatesDir)) {
  const relativePath = posixRelative(filePath);
  const strings = collectStrings(JSON.parse(readFileSync(filePath, 'utf8')));
  for (const [name, pattern] of rules) {
    const matches = strings.filter((value) => pattern.test(value)).length;
    if (matches > 0) findings[name].push({ file: relativePath, matches });
  }
}

const rendererFiles = ['src/layoutEnhancer.ts', 'src/converter.ts', 'src/containers/GalleryRenderer.ts'];
const rendererFindings = rendererFiles.map((relativePath) => {
  const content = readFileSync(resolve(rootDir, relativePath), 'utf8');
  return {
    file: relativePath,
    divTemplates: (content.match(/<div\b/g) ?? []).length,
    flexDeclarations: (content.match(/display\s*:\s*(?:inline-)?flex\b/gi) ?? []).length,
    overflowDeclarations: (content.match(/overflow(?:-[xy])?\s*:/gi) ?? []).length,
  };
});

const report = {
  schemaVersion: 1,
  pluginVersion: JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')).version,
  status: 'baseline-known-gaps',
  rules: Object.fromEntries(Object.entries(findings).map(([name, files]) => [name, {
    files,
    totalMatches: files.reduce((sum, file) => sum + file.matches, 0),
  }])),
  rendererFindings,
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (args.has('--write')) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, serialized, 'utf8');
  console.log(`Wrote ${posixRelative(reportPath)}.`);
} else if (args.has('--check')) {
  if (readFileSync(reportPath, 'utf8') !== serialized) {
    throw new Error('reports/wechat-compatibility-baseline.json is stale. Run npm run audit:wechat:write.');
  }
  console.log('WeChat compatibility baseline is current.');
} else {
  process.stdout.write(serialized);
}
