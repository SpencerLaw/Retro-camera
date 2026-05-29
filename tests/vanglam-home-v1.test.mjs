import assert from 'node:assert/strict';
import fs from 'node:fs';

const homeSource = fs.readFileSync('components/vanglam/VanglamHome.tsx', 'utf8');
const navbarSource = fs.readFileSync('components/vanglam/VanglamNavbar.tsx', 'utf8');
const footerSource = fs.readFileSync('components/vanglam/VanglamFooter.tsx', 'utf8');
const dataSource = fs.readFileSync('components/vanglam/vanglamData.ts', 'utf8');
const languageSource = fs.readFileSync('components/vanglam/VanglamLanguage.tsx', 'utf8');
const cssSource = fs.readFileSync('components/vanglam/vanglam.css', 'utf8');
const homeCopySource = `${homeSource}\n${languageSource}`;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('VANGLAM homepage uses the V1 editorial hero instead of the old packaging hero', () => {
  assert.match(homeCopySource, /Soul of Color\. Signature in Every Surface\./);
  assert.match(homeCopySource, /QiLi Paper is a material atelier/);
  assert.match(homeCopySource, /DISCOVER VANGLAM COLOR SYSTEM/);
  assert.match(homeSource, /hero-paper\.png/);
  assert.doesNotMatch(homeSource, /Color, Paper & Surface for Premium Packaging/);
  assert.doesNotMatch(homeSource, /selectedFinish/);
});

runTest('homepage hero hides the intro paragraph while keeping the Discover VANGLAM action', () => {
  assert.doesNotMatch(homeSource, /copy\.home\.heroBodyLines/);
  assert.match(homeSource, /copy\.home\.discoverColorSystem/);
  assert.match(homeSource, /navigate\('\/vanglam\/color-system'\)/);
});

runTest('VANGLAM homepage follows the PDF V1 section order', () => {
  const requiredInOrder = [
    'THREE SIGNATURE COLORS',
    'VANGLAM COLOR SYSTEM',
    'COLLECTIONS',
    'SURFACES',
    'APPLICATIONS',
    'ARTCARD LAB',
    'ATELIER',
  ];

  let lastIndex = -1;
  for (const label of requiredInOrder) {
    const nextIndex = homeCopySource.indexOf(label, lastIndex + 1);
    assert.notEqual(nextIndex, -1, `${label} should be present`);
    assert.ok(nextIndex > lastIndex, `${label} should appear after the previous section`);
    lastIndex = nextIndex;
  }
});

runTest('signature colors and visual assets match the PDF V1 mockup', () => {
  const homeAndDataSource = `${homeSource}\n${dataSource}`;
  assert.match(homeAndDataSource, /STONE GREEN/);
  assert.match(homeAndDataSource, /AUTUMN CITRON/);
  assert.match(homeAndDataSource, /COBALT BLUE/);
  assert.match(homeAndDataSource, /signature-green\.png/);
  assert.match(homeAndDataSource, /signature-citron\.png/);
  assert.match(homeAndDataSource, /signature-blue\.png/);
  assert.match(homeAndDataSource, /color-deck-fan\.png/);
  assert.match(homeAndDataSource, /surface-tile\.png/);
  assert.match(homeAndDataSource, /application-bags\.png/);
  assert.match(homeAndDataSource, /artcard-thanks\.png/);
  assert.match(homeAndDataSource, /atelier-roll\.png/);
});

runTest('navigation labels mirror the V1 primary navigation', () => {
  for (const label of ['Color System', 'Collections', 'Surfaces', 'Applications', 'Artcard Lab', 'Atelier']) {
    assert.match(languageSource, new RegExp(label));
  }
  assert.match(languageSource, /Library and Tools/);
  assert.match(languageSource, /REQUEST SAMPLE KIT/);
  assert.doesNotMatch(navbarSource, /VANGLAM 42/);
});

runTest('navbar brand lockup makes QiLi Paper dominant and VANGLAM secondary', () => {
  assert.match(navbarSource, /className="vanglam-brand-qili">QiLi Paper/);
  assert.match(navbarSource, /className="vanglam-brand-vanglam"/);
  assert.match(cssSource, /\.vanglam-navbar \.vanglam-brand-qili\s*\{[\s\S]*font-size:\s*34px/);
  assert.match(cssSource, /\.vanglam-navbar \.vanglam-brand-vanglam\s*\{[\s\S]*font-size:\s*19px/);
  assert.match(cssSource, /\.vanglam-navbar \.vanglam-brand-divider\s*\{[\s\S]*height:\s*40px/);
});

runTest('collections data uses the eight V1 collection families', () => {
  for (const label of ['Color Print', 'Touch', 'Pearl', 'Coated', 'Digital Coated', 'Bag', 'Label', 'Bespoke']) {
    assert.match(dataSource, new RegExp(label));
  }
  assert.doesNotMatch(dataSource, /SEVEN PRODUCT LINES/);
});

runTest('footer uses the V1 multi-column editorial footer', () => {
  const footerCopySource = `${footerSource}\n${languageSource}`;
  assert.match(footerCopySource, /About QiLi Paper/);
  assert.match(footerCopySource, /Technical Information/);
  assert.match(footerSource, /info@qilipaper\.com/);
  assert.match(footerCopySource, /Crafted in paper\. Made for beauty\./);
});

runTest('footer restores the PDF contact snippet UI', () => {
  assert.match(footerSource, /vanglam-footer-contact-card/);
  assert.match(footerSource, /vanglam-footer-contact-link/);
  assert.match(footerSource, /vanglam-footer-social-link/);
  assert.match(footerSource, /info@qilipaper\.com/);
  assert.match(footerSource, /\+8651088231801/);
  assert.match(footerSource, /\+8613861882862/);
  assert.match(footerSource, /withoutContactPunctuation/);
  assert.doesNotMatch(footerSource, /<span>，\s*<\/span>/);
  assert.doesNotMatch(footerSource, /\+8651088231801[,，]/);
  assert.doesNotMatch(footerSource, /\+86 21 1234 5678/);
  assert.match(cssSource, /\.vanglam-footer-phone-links\s*\{[\s\S]*display:\s*grid/);
  assert.match(cssSource, /\.vanglam-footer-columns \.vanglam-footer-contact-card\s*\{[\s\S]*display:\s*flex/);
  assert.match(cssSource, /\.vanglam-footer-contact-link\s*\{[\s\S]*font-variant-numeric:\s*tabular-nums/);
  assert.match(cssSource, /\.vanglam-footer-social-link\s*\{[\s\S]*border-radius:\s*50%/);
});

runTest('homepage removes the client-rejected sample kit banner', () => {
  assert.doesNotMatch(homeSource, /vanglam-sample-cta/);
  assert.doesNotMatch(homeSource, /sample-kit-heading/);
  assert.doesNotMatch(cssSource, /\.vanglam-sample-cta/);
  assert.doesNotMatch(cssSource, /\.vanglam-primary-button/);
});

runTest('V1 stylesheet defines the mockup-aligned page system', () => {
  assert.match(cssSource, /\.vanglam-v1-page/);
  assert.match(cssSource, /\.vanglam-hero/);
  assert.match(cssSource, /\.vanglam-signature-card/);
  assert.match(cssSource, /\.vanglam-footer/);
});
