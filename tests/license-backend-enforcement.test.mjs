import assert from 'node:assert/strict';
import fs from 'node:fs';

const morningTreeSource = fs.readFileSync('public/morning-energy-tree/script.js', 'utf8');
const magicRollCallSource = fs.readFileSync('public/magic-roll-call/script.js', 'utf8');
const homeworkCrushSource = fs.readFileSync('public/homework-crush/script.js', 'utf8');
const broadcastLicenseManagerSource = fs.readFileSync('broadcast-assistant/utils/licenseManager.ts', 'utf8');
const doraemonLicenseManagerSource = fs.readFileSync('doraemon-monitor/utils/licenseManager.ts', 'utf8');
const tugLicenseManagerSource = fs.readFileSync('components/TugOfWarLicenseManager.ts', 'utf8');
const kiddiePlanLicenseManagerSource = fs.readFileSync('kiddieplan/utils/licenseManager.ts', 'utf8');
const adminConsoleSource = fs.readFileSync('public/console-admin-8x92lz.html', 'utf8');
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

runTest('morning energy tree verifies licenses through the backend before caching', () => {
  assert.match(morningTreeSource, /async function verifyLicense\(\)/);
  assert.match(morningTreeSource, /fetch\('\/api\/verify-license'/);
  assert.match(morningTreeSource, /licenseCode:\s*input/);
  assert.match(morningTreeSource, /deviceId:\s*getLicenseDeviceId\(\)/);
  assert.match(morningTreeSource, /if \(data\.success\) \{[\s\S]*localStorage\.setItem\(AUTH_KEY,\s*input\)[\s\S]*showApp\(\)/);
  assert.doesNotMatch(morningTreeSource, /if \(input\.startsWith\(LICENSE_PREFIX\) && input\.length >= 5\) \{[\s\S]*localStorage\.setItem\(AUTH_KEY,\s*input\)[\s\S]*showApp\(\)/);
});

runTest('cached morning energy tree licenses enter without backend revalidation', () => {
  assert.match(morningTreeSource, /const savedAuth = localStorage\.getItem\(AUTH_KEY\)/);
  assert.match(morningTreeSource, /if \(savedAuth && savedAuth\.startsWith\(LICENSE_PREFIX\)\) \{[\s\S]*showApp\(\);/);
  assert.doesNotMatch(morningTreeSource, /async function validateSavedLicense\(\)/);
  assert.doesNotMatch(morningTreeSource, /verifyLicenseWithBackend\(savedAuth\)/);
});

runTest('magic roll call only uses backend for first-time license entry', () => {
  assert.doesNotMatch(magicRollCallSource, /data\.success \|\| code\.length > 10/);
  assert.doesNotMatch(magicRollCallSource, /catch \(e\) \{\s*if \(code\.length > 5\)/);
  assert.match(magicRollCallSource, /if \(STATE\.authorized\) \{[\s\S]*showApp\(\);/);
  assert.doesNotMatch(magicRollCallSource, /if \(STATE\.authorized\) validateLicense\(\);/);
});

runTest('homework crush only reuses cached verified licenses after first backend validation', () => {
  assert.match(homeworkCrushSource, /var getHCDeviceId = function\(\)/);
  assert.match(homeworkCrushSource, /var verifyWithBackend = function\(code\)/);
  assert.match(homeworkCrushSource, /if \(STATE\.isVerified && STATE\.licenseCode\) \{[\s\S]*initApp\(\);/);
  assert.doesNotMatch(homeworkCrushSource, /verifyWithBackend\(STATE\.licenseCode\)\.then/);
  assert.doesNotMatch(homeworkCrushSource, /deviceId:\s*'hc-user'/);
});

runTest('license API does not grant offline success when backend recording fails', () => {
  assert.doesNotMatch(verifyLicenseSource, /message:\s*'验证成功\(离线\)'/);
  assert.doesNotMatch(verifyLicenseSource, /data:\s*\{\s*validFor:\s*'1年'\s*\}/);
  assert.match(verifyLicenseSource, /return res\.status\(500\)\.json\(\{[\s\S]*success:\s*false/);
});

runTest('license expiry is based on first activation instead of generated date', () => {
  assert.match(verifyLicenseSource, /function getActivationExpiryDate\(firstActivatedAt/);
  assert.match(verifyLicenseSource, /const existingExpiryDate = getActivationExpiryDate\(metadata\.firstActivatedAt \|\| metadata\.generatedDate\)/);
  assert.match(verifyLicenseSource, /const newExpiryDate = getActivationExpiryDate\(dateNowISO\)/);
  assert.doesNotMatch(verifyLicenseSource, /const expiryDate = new Date\(generatedDate\);\s*expiryDate\.setFullYear\(expiryDate\.getFullYear\(\) \+ 1\);\s*if \(new Date\(\) > expiryDate\)/);
});

runTest('cached license usage is reported without blocking offline users', () => {
  assert.match(verifyLicenseSource, /action === 'usage'/);
  assert.match(verifyLicenseSource, /recordProductUsage\(metadata,\s*product,\s*dateNowISO\)/);
  assert.match(verifyLicenseSource, /usageByProduct/);

  assert.match(morningTreeSource, /recordLicenseUsage\(savedAuth\)/);
  assert.match(morningTreeSource, /product:\s*'morning-energy-tree'/);
  assert.match(morningTreeSource, /catch \(error\) \{\s*console\.debug\('\[License Usage\] skipped'/);

  assert.match(magicRollCallSource, /recordLicenseUsage\(STATE\.licenseCode\)/);
  assert.match(magicRollCallSource, /product:\s*'magic-roll-call'/);

  assert.match(homeworkCrushSource, /recordLicenseUsage\(STATE\.licenseCode\)/);
  assert.match(homeworkCrushSource, /product:\s*'homework-crush'/);

  assert.match(broadcastLicenseManagerSource, /export const recordBCUsage/);
  assert.match(broadcastLicenseManagerSource, /product:\s*'broadcast-assistant'/);

  assert.match(doraemonLicenseManagerSource, /export const recordDoraemonUsage/);
  assert.match(doraemonLicenseManagerSource, /product:\s*'doraemon-monitor'/);

  assert.match(tugLicenseManagerSource, /export const recordTugLicenseUsage/);
  assert.match(tugLicenseManagerSource, /product:\s*config\.productId \|\| config\.storagePrefix \|\| config\.licensePrefix/);

  assert.match(kiddiePlanLicenseManagerSource, /export const recordKiddiePlanUsage/);
  assert.match(kiddiePlanLicenseManagerSource, /product:\s*'kiddieplan'/);
});

runTest('admin console displays per-product usage counts', () => {
  assert.match(adminConsoleSource, /formatUsageByProduct/);
  assert.match(adminConsoleSource, /item\.usageByProduct/);
  assert.match(adminConsoleSource, /功能使用/);
});
