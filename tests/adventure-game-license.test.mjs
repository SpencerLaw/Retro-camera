import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const gateExists = fs.existsSync('adventure-game/AdventureLicenseGate.tsx');
const gateSource = gateExists ? fs.readFileSync('adventure-game/AdventureLicenseGate.tsx', 'utf8') : '';
const verifyLicenseSource = fs.readFileSync('api/verify-license.ts', 'utf8');
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

runTest('adventure routes are protected by the DMX license gate', () => {
  assert.equal(gateExists, true);
  assert.match(appSource, /import AdventureLicenseGate from '\.\/adventure-game\/AdventureLicenseGate'/);
  assert.match(appSource, /<Route path="\/adventure" element=\{<AdventureLicenseGate><AdventureGameApp \/><\/AdventureLicenseGate>\} \/>/);
  assert.match(appSource, /<Route path="\/adventure\/edit" element=\{<AdventureLicenseGate><AdventureGameEdit \/><\/AdventureLicenseGate>\} \/>/);
  assert.match(gateSource, /licensePrefix:\s*'DMX'/);
  assert.match(gateSource, /storagePrefix:\s*'dmx'/);
  assert.match(gateSource, /verifyTugLicense/);
  assert.match(gateSource, /isTugLicenseVerified/);
});

runTest('license verification parses DMX before the existing DM prefix', () => {
  const dmxIndex = verifyLicenseSource.indexOf("startsWith('DMX')");
  const dmIndex = verifyLicenseSource.indexOf("startsWith('DM')");

  assert.ok(dmxIndex > -1);
  assert.ok(dmIndex > -1);
  assert.ok(dmxIndex < dmIndex);
  assert.match(verifyLicenseSource, /cleanCode\.startsWith\('DMX'\)[\s\S]*cleanCode = cleanCode\.substring\(3\)/);
});

runTest('admin console categorizes and generates DMX adventure codes', () => {
  const dmxCategoryIndex = adminHtml.indexOf("'DMX': { name: '奖惩大冒险'");
  const dmCategoryIndex = adminHtml.indexOf("'DM': { name: '炫酷点名器'");

  assert.match(adminHtml, /generateCodes\('adventure'\)/);
  assert.match(adminHtml, /生成奖惩大冒险码 \(DMX\)/);
  assert.ok(dmxCategoryIndex > -1);
  assert.ok(dmCategoryIndex > -1);
  assert.ok(dmxCategoryIndex < dmCategoryIndex);
  assert.match(adminHtml, /type === 'adventure'/);
  assert.match(adminHtml, /code = 'DMX-' \+ datePart \+ '-' \+ random/);
});
