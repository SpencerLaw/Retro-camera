import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function collectApiFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectApiFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const badImports = collectApiFiles(path.resolve('api')).flatMap(file => {
  const source = fs.readFileSync(file, 'utf8');
  const matches = source.matchAll(
    /import\s+(?!type\b)[^;]*\bVercel(?:Request|Response)\b[^;]*from\s+['"]@vercel\/node['"]/g,
  );

  return Array.from(matches, match => path.relative(process.cwd(), file) + ': ' + match[0]);
});

assert.deepEqual(badImports, []);
console.log('PASS Vercel request/response imports are type-only');
