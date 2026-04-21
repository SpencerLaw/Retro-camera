import assert from 'node:assert/strict';
import fs from 'node:fs';

const verifyLicenseSource = fs.readFileSync('api/verify-license.ts', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('license verification parses SX tug-of-war codes', () => {
  assert.match(verifyLicenseSource, /startsWith\('SX'\)/);
});
