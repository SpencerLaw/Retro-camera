import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const navbarSource = fs.readFileSync('components/vanglam/VanglamNavbar.tsx', 'utf8');
const pagesSource = fs.readFileSync('components/vanglam/VanglamPages.tsx', 'utf8');
const languageSource = fs.readFileSync('components/vanglam/VanglamLanguage.tsx', 'utf8');
const cssSource = fs.readFileSync('components/vanglam/vanglam.css', 'utf8');

const englishJsonPath = 'components/vanglam/locales/en.json';
const chineseJsonPath = 'components/vanglam/locales/zh.json';
const englishCopy = JSON.parse(fs.readFileSync(englishJsonPath, 'utf8'));
const chineseCopy = JSON.parse(fs.readFileSync(chineseJsonPath, 'utf8'));

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const expectedLibraryIds = [
  'color-matching',
  'paper-texture',
  'paper-sample-craft',
  'customization',
  'anti-counterfeiting',
  'special-process',
];

runTest('VANGLAM keeps Library and Tools copy in editable English and Chinese JSON files', () => {
  assert.match(languageSource, /import englishCopy from '\.\/locales\/en\.json'/);
  assert.match(languageSource, /import chineseCopy from '\.\/locales\/zh\.json'/);
  assert.equal(englishCopy.libraryTools.libraries.length, expectedLibraryIds.length);
  assert.equal(chineseCopy.libraryTools.libraries.length, expectedLibraryIds.length);
  assert.deepEqual(englishCopy.libraryTools.libraries.map((item) => item.id), expectedLibraryIds);
  assert.deepEqual(chineseCopy.libraryTools.libraries.map((item) => item.id), expectedLibraryIds);
});

runTest('Library and Tools has the requested bilingual library categories', () => {
  for (const label of [
    'Color Matching Library',
    'Paper Texture Library',
    'Paper Sample Craft Library',
    'Customization Library',
    'Anti-counterfeiting Library',
    'Special Process Library',
  ]) {
    assert.ok(englishCopy.libraryTools.libraries.some((item) => item.title === label), label);
  }

  for (const label of ['颜色搭配库', '纸张纹路库', '纸样工艺库', '定制库', '防伪库', '特殊工艺库']) {
    assert.ok(chineseCopy.libraryTools.libraries.some((item) => item.title === label), label);
  }
});

runTest('Library and Tools is wired as a real VANGLAM page from the navbar', () => {
  assert.match(appSource, /VanglamLibraryToolsPage/);
  assert.match(appSource, /path="\/vanglam\/library-tools"/);
  assert.match(navbarSource, /to=\{copy\.navActionTo\}/);
  assert.match(pagesSource, /export const VanglamLibraryToolsPage/);
  assert.match(pagesSource, /copy\.libraryTools\.libraries\.map/);
  assert.match(cssSource, /\.vanglam-library-tool-grid/);
  assert.match(cssSource, /\.vanglam-library-tool-card/);
});
