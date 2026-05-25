import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const homeSource = fs.readFileSync('components/HomePage.tsx', 'utf8');
const componentFileExists = fs.existsSync('components/TslSkinApp.tsx');
const componentSource = componentFileExists ? fs.readFileSync('components/TslSkinApp.tsx', 'utf8') : '';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('tsl skin route and homepage entry are wired', () => {
  assert.match(appSource, /import TslSkinApp from '\.\/components\/TslSkinApp'/);
  assert.match(appSource, /<Route path="\/tsl-skin" element=\{<TslSkinApp \/>\} \/>/);
  assert.match(homeSource, /to="\/tsl-skin"/);
  assert.match(homeSource, /TSL Skin/);
});

runTest('tsl skin page includes canvas editor controls', () => {
  assert.equal(componentFileExists, true);
  assert.match(componentSource, /TESLA_MODEL_TEMPLATES/);
  assert.match(componentSource, /type="file"/);
  assert.match(componentSource, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(componentSource, /downloadCanvas/);
  assert.match(componentSource, /generateBodyMask/);
  assert.match(componentSource, /moveLayer/);
  assert.match(componentSource, /deleteLayer/);
  assert.match(componentSource, /原创或已授权素材/);
});

runTest('tsl skin page includes monetization-ready catalog and custom order UI', () => {
  assert.match(componentSource, /SKIN_CATALOG_PRODUCTS/);
  assert.match(componentSource, /CUSTOM_WRAP_PACKAGES/);
  assert.match(componentSource, /getCatalogProductsForTemplate/);
  assert.match(componentSource, /calculateCustomOrderQuote/);
  assert.match(componentSource, /商品库/);
  assert.match(componentSource, /定制套餐/);
  assert.match(componentSource, /加入画布预览/);
  assert.doesNotMatch(componentSource, /授权码|激活码|待接入支付|后端支付/);
  assert.match(homeSource, /Tesla 车机皮肤工作台/);
});
