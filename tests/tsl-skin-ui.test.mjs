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
  assert.match(componentSource, /下载现有皮肤/);
  assert.match(componentSource, /自定义上传裁剪/);
  assert.match(componentSource, /activeWorkspace/);
  assert.match(componentSource, /setActiveWorkspace/);
});

runTest('tsl skin page is redesigned around two original product entrances', () => {
  assert.match(componentSource, /特斯拉皮肤/);
  assert.match(componentSource, /双入口工作台/);
  assert.match(componentSource, /下载现有皮肤/);
  assert.match(componentSource, /自定义上传裁剪/);
  assert.match(componentSource, /先选车型，再挑现成皮肤/);
  assert.match(componentSource, /上传图片，拖动缩放裁剪/);
  assert.match(componentSource, /本地生成，不上传服务器/);
  assert.match(componentSource, /tsl-skin-entry-panel/);
  assert.match(componentSource, /tsl-skin-model-strip/);
  assert.match(componentSource, /scrollToWorkbench/);
  assert.doesNotMatch(componentSource, /排行榜|联盟计划|联系我们|首页 \/ 使用教程|tsl-skin-brand-tutorial|特斯拉车机皮肤下载与[\s\S]*创作平台|landingStats|scrollToTutorial/);
  assert.doesNotMatch(componentSource, /Network（网络）|抓包|爬虫|Python 脚本|BeautifulSoup|批量下载爬虫/);
});

runTest('tsl skin page keeps compact help inside the two workflows', () => {
  assert.match(componentSource, /三步完成/);
  assert.match(componentSource, /选择车型/);
  assert.match(componentSource, /预览调整/);
  assert.match(componentSource, /导出交付包/);
  assert.match(componentSource, /1024x1024/);
  assert.match(componentSource, /Wraps/);
  assert.match(componentSource, /exFAT/);
});

runTest('tsl skin download mode exposes a visible skin gallery', () => {
  assert.match(componentSource, /皮肤画廊/);
  assert.match(componentSource, /先挑选现成皮肤/);
  assert.match(componentSource, /适配车型/);
  assert.match(componentSource, /马上预览/);
  assert.match(componentSource, /officialExamples\.map/);
  assert.match(componentSource, /getOfficialExampleWrapsForTemplate/);
  assert.match(componentSource, /特斯拉官方示例/);
  assert.match(componentSource, /官方免费示例/);
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

runTest('tsl skin page shows an approximate in-car render preview', () => {
  assert.match(componentSource, /vehiclePreviewCanvasRef/);
  assert.match(componentSource, /drawVehiclePreview/);
  assert.match(componentSource, /vehicleImageUrl/);
  assert.match(componentSource, /vehicle_image\.png/);
  assert.match(componentSource, /drawSmartContainedImage\(vehicleImage/);
  assert.match(componentSource, /getVisibleImageBounds/);
  assert.match(componentSource, /getImageBackgroundSample/);
  assert.match(componentSource, /backgroundDistance > 54/);
  assert.match(componentSource, /车型渲染参考/);
  assert.match(componentSource, /当前皮肤贴图/);
  assert.match(componentSource, /官方渲染底图/);
  assert.doesNotMatch(componentSource, /createPattern|fillPatch/);
});

runTest('tsl skin workbench layout keeps render preview large and balanced', () => {
  assert.match(componentSource, /tsl-skin-workbench-grid/);
  assert.match(componentSource, /tsl-skin-stage-grid/);
  assert.match(componentSource, /tsl-skin-gallery-strip/);
  assert.match(componentSource, /vehicle-reference-panel/);
  assert.match(componentSource, /lg:sticky/);
  assert.match(componentSource, /overflow-x-auto/);
  assert.match(componentSource, /min-w-\[220px\]/);
  assert.match(componentSource, /max-w-\[620px\]/);
  assert.match(componentSource, /max-h-\[58vh\]/);
  assert.match(componentSource, /xl:grid-cols-\[minmax\(0,1fr\)_440px\]/);
  assert.match(componentSource, /max-w-\[440px\]/);
  assert.match(componentSource, /max-h-\[420px\]/);
  assert.match(componentSource, /drawSmartContainedImage\(vehicleImage, 24, 24, 912, 360, true\)/);
  assert.doesNotMatch(componentSource, /错误覆盖/);
});

runTest('tsl skin page is Chinese-first and includes day mode plus help', () => {
  assert.match(componentSource, /浅色模式/);
  assert.match(componentSource, /深色模式/);
  assert.match(componentSource, /三步完成/);
  assert.match(componentSource, /选择车型/);
  assert.match(componentSource, /预览调整/);
  assert.match(componentSource, /导出交付包/);
  assert.match(componentSource, /2 元/);
  assert.match(componentSource, /9\.99 元/);
  assert.match(componentSource, /30 元/);
  assert.doesNotMatch(
    componentSource,
    /Tesla Paint Shop|TSL Skin|Body Color|Loading Tesla template|Instant PNG download|Free PNG sample|Race stripe|Tech grid|Satin wave|procedural|Quick Polish|Quote|workspace|Export-ready|Commercial-use|Priority designer|Color match|One uploaded logo|Full Custom|Brand Drop|导出 PNG|下载 ZIP 包/,
  );
  assert.doesNotMatch(appSource, /Loading TSL Skin/);
});
