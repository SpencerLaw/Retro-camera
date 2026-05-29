import assert from 'node:assert/strict';
import fs from 'node:fs';

const homeSource = fs.readFileSync('components/vanglam/VanglamHome.tsx', 'utf8');
const footerSource = fs.readFileSync('components/vanglam/VanglamFooter.tsx', 'utf8');
const pagesSource = fs.readFileSync('components/vanglam/VanglamPages.tsx', 'utf8');
const languageSource = fs.readFileSync('components/vanglam/VanglamLanguage.tsx', 'utf8');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('homepage CTAs route to the PDF V1 site pages instead of dead actions or mail links', () => {
  assert.match(homeSource, /navigate\('\/vanglam\/color-system'\)/);
  assert.match(homeSource, /navigate\('\/vanglam\/artcard-lab'\)/);
  assert.match(homeSource, /to="\/vanglam\/request-sample-kit"/);
  assert.doesNotMatch(homeSource, /href="mailto:info@qilipaper\.com\?subject=VANGLAM%20Sample%20Kit"/);
  assert.doesNotMatch(homeSource, /<button className="vanglam-text-link" type="button">\s*EXPLORE ARTCARD LAB/);
});

runTest('homepage visual cards expose click targets for their Explore affordances', () => {
  assert.match(homeSource, /<Link[\s\S]*to="\/vanglam\/color-system"[\s\S]*className="vanglam-signature-card"/);
  assert.match(homeSource, /<Link[\s\S]*to="\/vanglam\/collections"[\s\S]*className="vanglam-collection-item"/);
});

runTest('footer links are routed or real contact links, never inert hash placeholders', () => {
  assert.match(footerSource, /to="\/vanglam\/request-sample-kit"/);
  assert.match(languageSource, /['"]\/vanglam\/color-system['"]/);
  assert.match(footerSource, /href="mailto:info@qilipaper\.com"/);
  assert.match(footerSource, /href="tel:\+862112345678"/);
  assert.doesNotMatch(footerSource, /href="#request-sample-kit"/);
});

runTest('sample form submit has a visible success state for the click action', () => {
  assert.match(pagesSource, /useState/);
  assert.match(pagesSource, /sampleFormSubmitted/);
  assert.match(pagesSource, /setSampleFormSubmitted\(true\)/);
  assert.match(languageSource, /Sample kit request received/);
});
