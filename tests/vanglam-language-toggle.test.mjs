import assert from 'node:assert/strict';
import fs from 'node:fs';

const languageSource = fs.existsSync('components/vanglam/VanglamLanguage.tsx')
  ? fs.readFileSync('components/vanglam/VanglamLanguage.tsx', 'utf8')
  : '';
const navbarSource = fs.readFileSync('components/vanglam/VanglamNavbar.tsx', 'utf8');
const homeSource = fs.readFileSync('components/vanglam/VanglamHome.tsx', 'utf8');
const pagesSource = fs.readFileSync('components/vanglam/VanglamPages.tsx', 'utf8');
const footerSource = fs.readFileSync('components/vanglam/VanglamFooter.tsx', 'utf8');
const cssSource = fs.readFileSync('components/vanglam/vanglam.css', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('VANGLAM has a reusable Chinese and English language state', () => {
  assert.match(languageSource, /VanglamLanguageProvider/);
  assert.match(languageSource, /useVanglamLanguage/);
  assert.match(languageSource, /useVanglamCopy/);
  assert.match(languageSource, /localStorage/);
  assert.match(languageSource, /toggleLanguage/);
});

runTest('top-right navbar language button exposes Chinese and English states', () => {
  assert.match(navbarSource, /vanglam-language-toggle/);
  assert.match(navbarSource, /aria-label=\{copy\.languageToggleAria\}/);
  assert.match(navbarSource, /onClick=\{toggleLanguage\}/);
  assert.match(cssSource, /\.vanglam-navbar-inner\s*\{[\s\S]*position:\s*relative/);
  assert.match(cssSource, /\.vanglam-language-toggle\s*\{[\s\S]*position:\s*absolute[\s\S]*right:/);
});

runTest('VANGLAM pages render copy through the language dictionary', () => {
  assert.match(homeSource, /useVanglamCopy/);
  assert.match(pagesSource, /useVanglamCopy/);
  assert.match(footerSource, /useVanglamCopy/);
  assert.match(languageSource, /Soul of Color\. Signature in Every Surface\./);
  assert.match(languageSource, /灵魂之色，落于每一寸纸面/);
  assert.match(languageSource, /REQUEST SAMPLE KIT/);
  assert.match(languageSource, /索取样品套装/);
  assert.match(languageSource, /Color System/);
  assert.match(languageSource, /色彩系统/);
});
