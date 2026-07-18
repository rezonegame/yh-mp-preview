import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(rootDir, 'config/core-themes.json'), 'utf8'));
const themeReport = JSON.parse(readFileSync(join(rootDir, 'reports/theme-audit.json'), 'utf8'));
const outputPath = join(rootDir, 'reports/core-theme-visual-baseline.json');
const args = new Set(process.argv.slice(2));

const themes = config.themeIds.map((id) => {
  const entry = themeReport.templates.find((theme) => theme.id === id);
  if (!entry) throw new Error(`Core theme not present in audit report: ${id}`);
  const theme = JSON.parse(readFileSync(join(rootDir, entry.file), 'utf8'));
  const styles = theme.styles || {};
  const visualTokens = {
    container: styles.container || '',
    h1: styles.title?.h1?.base || '',
    h2: styles.title?.h2?.base || '',
    h3: styles.title?.h3?.base || '',
    paragraph: styles.paragraph || '',
    quote: styles.quote || '',
    codeBlock: styles.code?.block || '',
    table: styles.table?.container || '',
  };
  const snapshot = JSON.stringify(visualTokens);
  return {
    id,
    name: theme.name,
    fingerprint: createHash('sha256').update(snapshot).digest('hex'),
    visualTokens,
  };
});

const report = {
  schemaVersion: 1,
  pluginVersion: JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).version,
  description: 'Deterministic Core theme visual-style baseline. Screenshot comparison is a later RC task.',
  themes,
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (args.has('--write')) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized, 'utf8');
  console.log(`Wrote reports/core-theme-visual-baseline.json for ${themes.length} Core themes.`);
} else if (args.has('--check')) {
  if (readFileSync(outputPath, 'utf8') !== serialized) {
    throw new Error('reports/core-theme-visual-baseline.json is stale. Run npm run audit:core-themes:write.');
  }
  console.log(`Core theme visual-style baseline is current for ${themes.length} themes.`);
} else {
  process.stdout.write(serialized);
}
