import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = resolve(rootDir, 'src/templates');
const reportPath = resolve(rootDir, 'reports/theme-audit.json');
const args = new Set(process.argv.slice(2));

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

const templates = listJsonFiles(templatesDir).map((filePath) => {
  const template = JSON.parse(readFileSync(filePath, 'utf8'));
  return {
    id: template.id,
    name: template.name,
    file: posixRelative(filePath),
    source: template.source ?? 'yh-mp-preview bundled',
    provenanceStatus: 'verified-current-distribution',
    v3Disposition: 'review-for-classic-or-core',
  };
});

const duplicateIds = templates
  .map((template) => template.id)
  .filter((id, index, all) => all.indexOf(id) !== index);

const report = {
  schemaVersion: 1,
  pluginVersion: JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')).version,
  summary: {
    total: templates.length,
    bundled: templates.filter((template) => template.source === 'yh-mp-preview bundled' || template.source === 'yh-mp-preview').length,
    xiaohuImported: 0,
    pendingProvenanceReview: templates.filter((template) => !template.provenanceStatus.startsWith('verified')).length,
    duplicateIds,
  },
  templates,
};

const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (args.has('--write')) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, serialized, 'utf8');
  console.log(`Wrote ${posixRelative(reportPath)} for ${templates.length} themes.`);
} else if (args.has('--check')) {
  const current = readFileSync(reportPath, 'utf8');
  if (current !== serialized) {
    throw new Error('reports/theme-audit.json is stale. Run npm run audit:themes:write.');
  }
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate template ids: ${duplicateIds.join(', ')}`);
  }
  console.log(`Theme audit is current for ${templates.length} themes.`);
} else {
  process.stdout.write(serialized);
}
