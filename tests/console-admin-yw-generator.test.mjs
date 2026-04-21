import assert from 'node:assert/strict';
import fs from 'node:fs';

const adminHtml = fs.readFileSync('public/console-admin-8x92lz.html', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('admin console exposes an English word tug generator button', () => {
  assert.match(adminHtml, /generateCodes\('yw'\)/);
  assert.match(adminHtml, /生成英语单词拔河码 \(YW\)/);
});

runTest('admin console categorizes and generates YW license codes', () => {
  assert.match(adminHtml, /'YW': \{ name: '英语单词拔河'/);
  assert.match(adminHtml, /type === 'yw'/);
  assert.match(adminHtml, /code = 'YW-' \+ datePart \+ '-' \+ random/);
});

runTest('admin console generates math tug codes with the SX prefix', () => {
  assert.match(adminHtml, /generateCodes\('sx'\)/);
  assert.match(adminHtml, /生成数学拔河码 \(SX\)/);
  assert.match(adminHtml, /'SX': \{ name: '数学拔河'/);
  assert.match(adminHtml, /type === 'sx'/);
  assert.match(adminHtml, /code = 'SX-' \+ datePart \+ '-' \+ random/);
});
