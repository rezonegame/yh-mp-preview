import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve } from 'node:path';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const textExtensions = new Set(['.css', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.yml', '.yaml']);
const decoder = new TextDecoder('utf-8', { fatal: true });
const trackedFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: rootDir, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter((file) => textExtensions.has(extname(file).toLowerCase()));

const failures = [];
for (const relativePath of trackedFiles) {
  try {
    const content = decoder.decode(readFileSync(resolve(rootDir, relativePath)));
    if (content.includes('\uFFFD')) {
      failures.push(`${relativePath}: contains the Unicode replacement character`);
    }
  } catch (error) {
    failures.push(`${relativePath}: ${error.message}`);
  }
}

if (failures.length > 0) {
  throw new Error(`UTF-8 validation failed:\n${failures.join('\n')}`);
}

console.log(`UTF-8 validation passed for ${trackedFiles.length} tracked text files.`);
