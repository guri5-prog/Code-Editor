import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

function collectTestFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      files.push(...collectTestFiles(full));
      continue;
    }
    if (entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }

  return files;
}

const root = process.cwd();
const testsDir = join(root, 'src', 'tests');
const testFiles = collectTestFiles(testsDir).map((file) => relative(root, file));

if (testFiles.length === 0) {
  console.log('No test files found under src/tests.');
  process.exit(0);
}

const quotedFiles = testFiles.map((file) => `"${file.replace(/\\/g, '/')}"`);
const cmd = `npx tsx --test ${quotedFiles.join(' ')}`;
const result = spawnSync(cmd, {
  stdio: 'inherit',
  cwd: root,
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'test',
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
