import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('tracked text files are valid UTF-8 without replacement characters', () => {
  execFileSync(process.execPath, ['scripts/check-text-encoding.mjs'], { stdio: 'pipe' });
});
