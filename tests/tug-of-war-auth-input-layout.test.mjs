import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('components/TugOfWarApp.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('license input uses a separate prefix badge instead of an overlapping icon', () => {
  assert.match(source, /aria-label="授权码前缀"/);
  assert.match(source, /{productConfig\.licensePrefix}/);
  assert.doesNotMatch(source, /absolute inset-y-0 left-5/);
  assert.doesNotMatch(source, /placeholder={`请输入 \$\{productConfig\.licensePrefix\} 开头的授权码`}/);
});

runTest('license input keeps text responsive inside the field', () => {
  assert.match(source, /min-w-0 flex-1/);
  assert.match(source, /placeholder="输入完整授权码"/);
});
