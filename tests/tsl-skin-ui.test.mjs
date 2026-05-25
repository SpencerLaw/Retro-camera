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
  assert.match(appSource, /React\.lazy\(\(\) => import\('\.\/components\/TslSkinApp'\)\)/);
  assert.match(appSource, /<React\.Suspense/);
  assert.match(appSource, /<Route path="\/tsl-skin" element=\{<TslSkinRoute \/>\} \/>/);
  assert.match(homeSource, /to="\/tsl-skin"/);
  assert.match(homeSource, /特斯拉皮肤/);
});

runTest('tsl skin page includes canvas editor controls', () => {
  assert.equal(componentFileExists, true);
  assert.match(componentSource, /TESLA_MODEL_TEMPLATES/);
  assert.match(componentSource, /type="file"/);
  assert.match(componentSource, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(componentSource, /downloadCanvas/);
  assert.match(componentSource, /downloadZipPackage/);
  assert.match(componentSource, /generateBodyMask/);
  assert.match(componentSource, /moveLayer/);
  assert.match(componentSource, /deleteLayer/);
  assert.match(componentSource, /原创或已授权素材/);
  assert.match(componentSource, /图片仅在你的浏览器本地处理，不会上传服务器/);
});

runTest('tsl skin page includes monetization-ready catalog and custom order UI', () => {
  assert.match(componentSource, /SKIN_CATALOG_PRODUCTS/);
  assert.match(componentSource, /DOWNLOAD_PRICE_TIERS/);
  assert.match(componentSource, /getCatalogProductsForTemplate/);
  assert.match(componentSource, /商品库/);
  assert.match(componentSource, /价格说明/);
  assert.match(componentSource, /加入画布预览/);
  assert.match(componentSource, /单张下载|五张打包|自定义设计/);
  assert.match(componentSource, /示例预览/);
  assert.doesNotMatch(componentSource, /授权码|激活码|待接入支付|后端支付|定制套餐|CUSTOM_WRAP_PACKAGES|calculateCustomOrderQuote/);
  assert.match(homeSource, /车机皮肤工作台/);
});

runTest('tsl skin page separates download and design workflows', () => {
  assert.match(componentSource, /现有皮肤下载/);
  assert.match(componentSource, /自己设计皮肤/);
  assert.match(componentSource, /activeWorkspace/);
  assert.match(componentSource, /setActiveWorkspace/);
});

runTest('tsl skin download mode exposes a visible skin gallery', () => {
  assert.match(componentSource, /皮肤画廊/);
  assert.match(componentSource, /先挑选现成皮肤/);
  assert.match(componentSource, /适配车型/);
  assert.match(componentSource, /马上预览/);
  assert.match(componentSource, /catalogProducts\.map/);
});

runTest('tsl skin page supports zip package export and per-layer crop modes', () => {
  assert.match(componentSource, /buildTslSkinZipFileName/);
  assert.match(componentSource, /buildWrapInstallGuide/);
  assert.match(componentSource, /createStoredZip/);
  assert.match(componentSource, /wrap\.png/);
  assert.match(componentSource, /install-guide\.txt/);
  assert.match(componentSource, /model-info\.json/);
  assert.match(componentSource, /下载压缩包/);
  assert.match(componentSource, /clipMode/);
  assert.match(componentSource, /贴合车身/);
  assert.match(componentSource, /保留完整图案/);
});

runTest('tsl skin page is Chinese-first and includes day mode plus help', () => {
  assert.match(componentSource, /浅色模式/);
  assert.match(componentSource, /深色模式/);
  assert.match(componentSource, /使用说明/);
  assert.match(componentSource, /第一步/);
  assert.match(componentSource, /第二步/);
  assert.match(componentSource, /第三步/);
  assert.match(componentSource, /2 元/);
  assert.match(componentSource, /9\.99 元/);
  assert.match(componentSource, /30 元/);
  assert.doesNotMatch(
    componentSource,
    /Tesla Paint Shop|TSL Skin|Body Color|Loading Tesla template|Instant PNG download|Free PNG sample|Race stripe|Tech grid|Satin wave|procedural|Quick Polish|Quote|workspace|Export-ready|Commercial-use|Priority designer|Color match|One uploaded logo|Full Custom|Brand Drop|导出 PNG|下载 ZIP 包/,
  );
  assert.doesNotMatch(appSource, /Loading TSL Skin/);
});
