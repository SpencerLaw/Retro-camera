import assert from 'node:assert/strict';
import fs from 'node:fs';

const verifyLicenseSource = fs.readFileSync('api/verify-license.ts', 'utf8');
const maxDevicesFunction = verifyLicenseSource.match(/function getEffectiveMaxDevices[\s\S]*?return 5;[^\n]*\r?\n}/)?.[0] || '';
const decompressMetadataFunction = verifyLicenseSource.match(/export function decompressMetadata[\s\S]*?return \{[\s\S]*?devices: c\.d\.map[\s\S]*?\n  \};\r?\n}/)?.[0] || '';

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

runTest('math and word tug-of-war licenses are limited to two devices', () => {
  assert.match(
    maxDevicesFunction,
    /cleanCode\.startsWith\('SX'\)[\s\S]*cleanCode\.startsWith\('YW'\)[\s\S]*return 2;/
  );
});

runTest('existing full YW and SX metadata is displayed with the latest two-device limit', () => {
  assert.match(
    decompressMetadataFunction,
    /if \('devices' in compressed\) \{\s*return \{[\s\S]*\.\.\.compressed,[\s\S]*maxDevices:\s*getEffectiveMaxDevices\(code\)/
  );
});
