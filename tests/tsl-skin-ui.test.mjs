import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const homeSource = fs.readFileSync('components/HomePage.tsx', 'utf8');
const componentFileExists = fs.existsSync('components/TslSkinApp.tsx');
const componentSource = componentFileExists ? fs.readFileSync('components/TslSkinApp.tsx', 'utf8') : '';
const packageSource = fs.readFileSync('package.json', 'utf8');
const vehicle3DFileExists = fs.existsSync('components/TslVehicle3DPreview.tsx');
const vehicle3DSource = vehicle3DFileExists ? fs.readFileSync('components/TslVehicle3DPreview.tsx', 'utf8') : '';

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

runTest('tsl skin page uses a gallery-first 3d workbench layout', () => {
  assert.equal(vehicle3DFileExists, true);
  assert.match(packageSource, /"three"/);
  assert.match(componentSource, /TslVehicle3DPreview/);
  assert.match(componentSource, /tsl-skin-studio-workbench/);
  assert.match(componentSource, /tsl-skin-sidebar/);
  assert.match(componentSource, /tsl-skin-render-stage/);
  assert.match(componentSource, /tsl-skin-wrap-grid/);
  assert.match(componentSource, /activeWorkspace/);
  assert.match(componentSource, /searchWrapQuery/);
  assert.match(componentSource, /filteredGalleryItems/);
  assert.match(componentSource, /applyOfficialWrapToPreview/);
  assert.match(componentSource, /downloadSelectedWrapAsset/);
  assert.match(componentSource, /removeCustomWrap/);
  assert.match(componentSource, /删除自定义图片/);
  assert.match(componentSource, /拖动旋转/);
  assert.match(componentSource, /滚轮缩放/);
  assert.match(componentSource, /清除皮肤/);
  assert.match(componentSource, /下载当前皮肤/);
  assert.doesNotMatch(componentSource, /skin-detail-dialog/);
});

runTest('tsl skin 3d preview uses threejs orbit controls without copying remote model assets', () => {
  assert.match(vehicle3DSource, /from 'three'/);
  assert.match(vehicle3DSource, /OrbitControls/);
  assert.match(vehicle3DSource, /WebGLRenderer/);
  assert.match(vehicle3DSource, /requestAnimationFrame/);
  assert.match(vehicle3DSource, /autoRotate/);
  assert.match(vehicle3DSource, /TextureLoader/);
  assert.match(vehicle3DSource, /createVehicleBody/);
  assert.match(vehicle3DSource, /模型为本站自建预览/);
  assert.doesNotMatch(vehicle3DSource, /Bayberry|tesla_3d_models|GLTFLoader|DRACOLoader|wrap_templates/);
});

runTest('tsl skin page includes monetization-ready catalog and custom order UI', () => {
  assert.match(componentSource, /SKIN_CATALOG_PRODUCTS/);
  assert.match(componentSource, /DOWNLOAD_PRICE_TIERS/);
  assert.match(componentSource, /getCatalogProductsForTemplate/);
  assert.match(componentSource, /下载现有皮肤/);
  assert.match(componentSource, /价格说明/);
  assert.match(componentSource, /加入自定义编辑/);
  assert.match(componentSource, /单张下载|五张打包|自定义设计/);
  assert.match(componentSource, /官方免费皮肤/);
  assert.doesNotMatch(componentSource, /授权码|激活码|待接入支付|后端支付|定制套餐|CUSTOM_WRAP_PACKAGES|calculateCustomOrderQuote/);
  assert.match(homeSource, /特斯拉皮肤/);
});

runTest('tsl skin page separates download and design workflows', () => {
  assert.match(componentSource, /下载现有皮肤/);
  assert.match(componentSource, /自定义上传裁剪/);
  assert.match(componentSource, /activeWorkspace/);
  assert.match(componentSource, /setActiveWorkspace/);
});

runTest('tsl skin page is redesigned around two original product entrances', () => {
  assert.match(componentSource, /特斯拉皮肤/);
  assert.match(componentSource, /官方免费皮肤/);
  assert.match(componentSource, /下载现有皮肤/);
  assert.match(componentSource, /自定义上传裁剪/);
  assert.match(componentSource, /选择后右侧立即渲染/);
  assert.match(componentSource, /上传自己的皮肤/);
  assert.match(componentSource, /不会上传服务器/);
  assert.match(componentSource, /tsl-skin-studio-workbench/);
  assert.match(componentSource, /tsl-skin-wrap-grid/);
  assert.match(componentSource, /tsl-skin-render-stage/);
  assert.doesNotMatch(componentSource, /skin-detail-dialog/);
  assert.doesNotMatch(componentSource, /双入口工作台|tsl-skin-entry-panel|tsl-skin-model-strip|scrollToWorkbench|车机皮肤工作台/);
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
  assert.match(componentSource, /官方免费皮肤/);
  assert.match(componentSource, /选择后右侧立即渲染/);
  assert.match(componentSource, /适配车型/);
  assert.match(componentSource, /立即预览/);
  assert.match(componentSource, /applyOfficialWrapToPreview/);
  assert.match(componentSource, /selectedPreviewWrap/);
  assert.match(componentSource, /filteredGalleryItems\.map/);
  assert.match(componentSource, /getOfficialExampleWrapsForTemplate/);
  assert.match(componentSource, /特斯拉官方示例/);
  assert.doesNotMatch(componentSource, /马上预览|tsl-skin-gallery-strip/);
});

runTest('tsl skin page exposes external free sources as safe original-site links', () => {
  assert.match(componentSource, /EXTERNAL_WRAP_SOURCES/);
  assert.match(componentSource, /免费资源站/);
  assert.match(componentSource, /去原站下载/);
  assert.match(componentSource, /不在本站镜像素材/);
  assert.match(componentSource, /确认授权后再入库/);
  assert.match(componentSource, /target="_blank"/);
  assert.match(componentSource, /rel="noopener noreferrer"/);
  assert.match(componentSource, /externalSources\.map/);
  assert.doesNotMatch(componentSource, /axios|get\(|fetch\(.+tesla-wrap|beautifulsoup|scrapy|playwright.*tesla-wrap/i);
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
  assert.match(componentSource, /TslVehicle3DPreview/);
  assert.match(componentSource, /previewWrapUrl/);
  assert.match(componentSource, /customRenderUrl/);
  assert.match(componentSource, /wrapImageUrl=\{previewWrapUrl\}/);
  assert.match(componentSource, /三维动态预览/);
  assert.match(componentSource, /鼠标拖动旋转/);
  assert.match(componentSource, /滚轮缩放/);
  assert.match(componentSource, /模型为本站自建预览/);
  assert.match(vehicle3DSource, /createVehicleBody/);
  assert.match(vehicle3DSource, /OrbitControls/);
  assert.doesNotMatch(componentSource, /vehiclePreviewCanvasRef|drawVehiclePreview|drawSmartContainedImage|vehicle-reference-panel/);
});

runTest('tsl skin layout keeps gallery cards and custom editor clean', () => {
  assert.match(componentSource, /tsl-skin-shell/);
  assert.match(componentSource, /tsl-skin-wrap-grid/);
  assert.match(componentSource, /tsl-skin-wrap-card/);
  assert.match(componentSource, /tsl-skin-studio-workbench/);
  assert.match(componentSource, /lg:grid-cols-\[400px_minmax\(0,1fr\)\]/);
  assert.match(componentSource, /grid-cols-3/);
  assert.match(componentSource, /min-h-screen/);
  assert.match(componentSource, /lg:min-h-screen/);
  assert.match(componentSource, /裁剪画布/);
  assert.match(componentSource, /下载当前皮肤/);
  assert.doesNotMatch(componentSource, /错误覆盖|skin-detail-panel|vehicle-reference-panel|drawSmartContainedImage/);
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
