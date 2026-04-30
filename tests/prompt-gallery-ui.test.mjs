import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const homeSource = fs.readFileSync('components/HomePage.tsx', 'utf8');
const componentFileExists = fs.existsSync('components/PromptGalleryApp.tsx');
const componentSource = componentFileExists ? fs.readFileSync('components/PromptGalleryApp.tsx', 'utf8') : '';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('prompt gallery route and homepage entry are wired', () => {
  assert.match(appSource, /import PromptGalleryApp from '\.\/components\/PromptGalleryApp'/);
  assert.match(appSource, /<Route path="\/prompts" element=\{<PromptGalleryApp \/>\} \/>/);
  assert.match(homeSource, /to="\/prompts"/);
  assert.match(homeSource, /提示词图库/);
});

runTest('prompt gallery page has admin upload controls and image compression', () => {
  assert.equal(componentFileExists, true);
  assert.match(componentSource, /PROMPT_GALLERY_MAX_IMAGES/);
  assert.match(componentSource, /type="file"/);
  assert.match(componentSource, /accept="image\/\*"/);
  assert.match(componentSource, /multiple/);
  assert.match(componentSource, /document\.createElement\('canvas'\)/);
  assert.match(componentSource, /toDataURL\('image\/webp'/);
  assert.match(componentSource, /最多 5 张/);
});

runTest('prompt gallery page fetches list and detail separately', () => {
  assert.match(componentSource, /fetch\('\/api\/prompts'/);
  assert.match(componentSource, /response\.text\(\)/);
  assert.match(componentSource, /JSON\.parse/);
  assert.match(componentSource, /callPromptGalleryApi\('list'/);
  assert.match(componentSource, /callPromptGalleryApi\('detail'/);
  assert.match(componentSource, /callPromptGalleryApi\(form\.id \? 'update' : 'create'/);
  assert.match(componentSource, /callPromptGalleryApi\('delete'/);
});

runTest('prompt gallery page includes prompt copy and multi-image detail controls', () => {
  assert.match(componentSource, /navigator\.clipboard\.writeText/);
  assert.match(componentSource, /复制提示词/);
  assert.match(componentSource, /activeImageIndex/);
  assert.match(componentSource, /负面提示词/);
  assert.match(componentSource, /sourceUrl/);
});
