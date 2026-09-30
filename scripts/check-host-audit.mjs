import { ESLint } from 'eslint';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

// Keep the full recommended check enabled. Known legacy TypeScript debt is
// frozen per file/rule while P2/P3 replace those implementations. Host/security
// errors and every new-file error are never eligible for that allowance.
const baselinePath = 'reports/host-audit-debt.json';
const results = await new ESLint().lintFiles(['src']);
const debt = {};
const blockers = [];
let warnings = 0;
for (const result of results) {
  const file = relative(process.cwd(), result.filePath).replaceAll('\\', '/');
  for (const message of result.messages) {
    if (message.severity !== 2) { warnings++; continue; }
    const rule = message.ruleId || 'parse-error';
    const key = `${file}::${rule}`;
    if (!rule.startsWith('@typescript-eslint/') || file.startsWith('src/core/security/')) {
      blockers.push(`${file}:${message.line} ${rule}: ${message.message}`);
    } else debt[key] = (debt[key] || 0) + 1;
  }
}
if (blockers.length) throw new Error(`Host/security blockers:\n${blockers.join('\n')}`);
if (process.argv.includes('--write')) {
  writeFileSync(baselinePath, JSON.stringify({
    status: 'known-legacy-type-debt-not-full-lint-pass',
    scope: '3.15.1-beta.1 P1; resolve during P2/P3, do not silently enlarge',
    counts: Object.fromEntries(Object.entries(debt).sort(([a], [b]) => a.localeCompare(b))),
  }, null, 2) + '\n');
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  for (const [key, count] of Object.entries(debt)) {
    if (count > (baseline.counts[key] || 0)) throw new Error(`New type debt: ${key} (${count} > ${baseline.counts[key] || 0})`);
  }
}
const count = Object.values(debt).reduce((a, b) => a + b, 0);
console.log(`Host/security blockers: 0; remaining frozen legacy type findings: ${count}; warnings: ${warnings}. This is not a full lint pass.`);
