import assert from 'node:assert/strict';
import fs from 'node:fs';

const viteConfigSource = fs.readFileSync('vite.config.ts', 'utf8');
const indexSource = fs.readFileSync('index.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('development server does not register a PWA service worker', () => {
  assert.doesNotMatch(viteConfigSource, /devOptions\s*:\s*\{[\s\S]*enabled\s*:\s*true/);
  assert.match(viteConfigSource, /devOptions\s*:\s*\{[\s\S]*enabled\s*:\s*false/);
});

runTest('bootstrap clears already installed local PWA caches before rendering', () => {
  assert.match(indexSource, /clearLocalDevelopmentPwaCache/);
  assert.match(indexSource, /navigator\.serviceWorker\.getRegistrations\(\)/);
  assert.match(indexSource, /\.unregister\(\)/);
  assert.match(indexSource, /caches\.keys\(\)/);
  assert.match(indexSource, /caches\.delete\(/);
  assert.match(indexSource, /localhost/);
  assert.match(indexSource, /127\.0\.0\.1/);
  assert.match(indexSource, /import\.meta\.env\.DEV/);
});
