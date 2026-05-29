import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const navbarSource = fs.readFileSync('components/vanglam/VanglamNavbar.tsx', 'utf8');
const dataSource = fs.readFileSync('components/vanglam/vanglamData.ts', 'utf8');
const languageSource = fs.readFileSync('components/vanglam/VanglamLanguage.tsx', 'utf8');
const pagesFileExists = fs.existsSync('components/vanglam/VanglamPages.tsx');
const pagesSource = pagesFileExists ? fs.readFileSync('components/vanglam/VanglamPages.tsx', 'utf8') : '';
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

const vanglamRoutes = [
  '/vanglam/color-system',
  '/vanglam/collections',
  '/vanglam/surfaces',
  '/vanglam/applications',
  '/vanglam/artcard-lab',
  '/vanglam/atelier',
  '/vanglam/request-sample-kit',
];

runTest('App wires every PDF V1 secondary page under the VANGLAM site namespace', () => {
  for (const route of vanglamRoutes) {
    assert.match(appSource, new RegExp(`<Route path="${route}"`));
  }
  for (const component of [
    'VanglamColorSystemPage',
    'VanglamCollectionsPage',
    'VanglamSurfacesPage',
    'VanglamApplicationsPage',
    'VanglamArtcardLabPage',
    'VanglamAtelierPage',
    'VanglamRequestSampleKitPage',
  ]) {
    assert.match(appSource, new RegExp(component));
  }
});

runTest('VANGLAM navigation links to real pages, not only homepage anchors', () => {
  for (const route of vanglamRoutes.slice(0, -1)) {
    assert.match(languageSource, new RegExp(`to: '${route}'`));
  }
  assert.match(navbarSource, /to="\/vanglam\/request-sample-kit"/);
  assert.doesNotMatch(navbarSource, /href: '#color-system'/);
  assert.doesNotMatch(navbarSource, /scrollToSection/);
});

runTest('secondary page components cover all PDF V1 content groups', () => {
  assert.equal(pagesFileExists, true);
  const pageCopySource = `${pagesSource}\n${languageSource}`;
  for (const text of [
    'Overview / Signature Colors / Six Families / Full Color Index / Color Guidance / Color Deck',
    'Curated families for every expression.',
    'Texture and finishes that bring ideas to life.',
    'Wine & Spirits Labels',
    'Paper for emotion.',
    'Real manufacturing. Thoughtful process. Lasting quality.',
    'Experience the difference. Request Your Sample Kit.',
  ]) {
    assert.match(pageCopySource, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('site data includes the PDF V1 secondary page datasets', () => {
  for (const exportName of [
    'SURFACE_DETAILS',
    'ARTCARD_ITEMS',
    'REQUEST_SAMPLE_FIELDS',
    'COLOR_GUIDANCE',
    'ATELIER_STORY_POINTS',
  ]) {
    assert.match(dataSource, new RegExp(`export const ${exportName}`));
  }
  for (const sampleField of [
    'Name',
    'Company',
    'Country',
    'Email',
    'Website',
    'Industry',
    'Application',
    'Interested Products',
    'Printing Method',
    'Finishing Process',
    'Expected Quantity',
    'Message',
  ]) {
    assert.match(dataSource, new RegExp(sampleField));
  }
});

runTest('secondary pages use the VANGLAM editorial page styling system', () => {
  for (const className of [
    '.vanglam-inner-page',
    '.vanglam-page-hero',
    '.vanglam-editorial-grid',
    '.vanglam-spec-card',
    '.vanglam-sample-form',
  ]) {
    assert.match(cssSource, new RegExp(className.replace('.', '\\.')));
  }
});
