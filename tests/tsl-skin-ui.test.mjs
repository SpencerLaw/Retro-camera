import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('App.tsx', 'utf8');
const homeSource = fs.readFileSync('components/HomePage.tsx', 'utf8');
const componentFileExists = fs.existsSync('components/TslSkinApp.tsx');
const componentSource = componentFileExists ? fs.readFileSync('components/TslSkinApp.tsx', 'utf8') : '';
const logicSource = fs.readFileSync('components/tslSkinLogic.js', 'utf8');
const packageSource = fs.readFileSync('package.json', 'utf8');
const vehicle3DFileExists = fs.existsSync('components/TslVehicle3DPreview.tsx');
const vehicle3DSource = vehicle3DFileExists ? fs.readFileSync('components/TslVehicle3DPreview.tsx', 'utf8') : '';
const wheelModuleFileExists = fs.existsSync('components/tslVehicleWheel.ts');
const wheelModuleSource = wheelModuleFileExists
  ? fs.readFileSync('components/tslVehicleWheel.ts', 'utf8')
  : '';
const previewDialogFileExists = fs.existsSync('components/TslSkinPreviewDialog.tsx');
const previewDialogSource = previewDialogFileExists
  ? fs.readFileSync('components/TslSkinPreviewDialog.tsx', 'utf8')
  : '';

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
  assert.match(componentSource, /generateBodyMask/);
  assert.match(componentSource, /moveLayer/);
  assert.match(componentSource, /deleteLayer/);
  assert.match(componentSource, /原创或已授权素材/);
  assert.match(componentSource, /图片仅在你的浏览器本地处理，不会上传服务器/);
});

runTest('tsl skin page only offers stable Model 3 and Model Y variants', () => {
  assert.match(logicSource, /modely-2025-premium/);
  assert.match(logicSource, /Model 3（2024前）/);
  assert.match(logicSource, /Model 3（2024\+）标准\/长续航/);
  assert.match(logicSource, /Model Y（2025前）/);
  assert.match(logicSource, /Model Y（2025\+）标准版/);
  assert.match(logicSource, /Model Y（2025\+）长续航/);
  assert.doesNotMatch(logicSource, /Cybertruck|Model S|Model X|性能版|Model Y L/);
  assert.doesNotMatch(vehicle3DSource, /ModelS_|ModelX_|Cybertruck|SX_UV0_ALLOWLIST|FORCE_BLACK_TRIM/);
});

runTest('tsl skin page uses a gallery-first 3d workbench layout', () => {
  assert.equal(vehicle3DFileExists, true);
  assert.match(packageSource, /"three"/);
  assert.equal(previewDialogFileExists, true);
  assert.match(previewDialogSource, /TslVehicle3DPreview/);
  assert.match(componentSource, /tsl-skin-studio-workbench/);
  assert.match(componentSource, /tsl-skin-flow-steps/);
  assert.match(componentSource, /tsl-skin-filter-bar/);
  assert.match(componentSource, /tsl-skin-gallery-board/);
  assert.match(componentSource, /tsl-skin-wrap-grid/);
  assert.match(componentSource, /activeWorkspace/);
  assert.match(componentSource, /searchWrapQuery/);
  assert.match(componentSource, /selectedWrapTag/);
  assert.match(componentSource, /gallerySort/);
  assert.match(componentSource, /filteredGalleryItems/);
  assert.match(componentSource, /openWrapPreview/);
  assert.match(componentSource, /PreviewDialogTarget/);
  assert.match(componentSource, /downloadPreviewTarget/);
  assert.match(componentSource, /removeCustomWrap/);
  assert.match(componentSource, /删除自定义图片/);
  assert.match(previewDialogSource, /下载当前皮肤/);
  assert.doesNotMatch(componentSource, /skin-detail-dialog/);
});

runTest('tsl skin gallery opens an on-demand native 3d preview dialog', () => {
  assert.equal(previewDialogFileExists, true);
  assert.match(previewDialogSource, /<dialog/);
  assert.match(previewDialogSource, /showModal\(\)/);
  assert.match(previewDialogSource, /aria-labelledby/);
  assert.match(previewDialogSource, /TslVehicle3DPreview/);
  assert.match(previewDialogSource, /下载当前皮肤/);
  assert.match(componentSource, /TslSkinPreviewDialog/);
  assert.match(componentSource, /openWrapPreview/);
  assert.match(componentSource, /查看 3D 效果/);
});

runTest('tsl skin gallery no longer keeps a persistent right preview column', () => {
  assert.doesNotMatch(componentSource, /tsl-skin-render-stage/);
  assert.doesNotMatch(componentSource, /lg:grid-cols-\[minmax\(0,1fr\)_420px\]/);
  assert.match(componentSource, /2xl:grid-cols-6/);
});

runTest('tsl skin 3d preview uses threejs orbit controls without copying remote model assets', () => {
  assert.match(vehicle3DSource, /from 'three'/);
  assert.match(vehicle3DSource, /OrbitControls/);
  assert.match(vehicle3DSource, /OBJLoader/);
  assert.match(vehicle3DSource, /MTLLoader/);
  assert.match(vehicle3DSource, /GLTFLoader/);
  assert.match(vehicle3DSource, /DRACOLoader/);
  assert.match(vehicle3DSource, /setDecoderPath\('\/draco\/'\)/);
  assert.match(vehicle3DSource, /WebGLRenderer/);
  assert.match(vehicle3DSource, /requestAnimationFrame/);
  assert.match(vehicle3DSource, /autoRotate/);
  assert.match(vehicle3DSource, /TextureLoader/);
  assert.match(vehicle3DSource, /prepareVehicleModel/);
  assert.match(vehicle3DSource, /uv1/);
  assert.match(vehicle3DSource, /PAINT_MATERIAL_HINTS/);
  assert.match(vehicle3DSource, /官方静态预览/);
  assert.doesNotMatch(vehicle3DSource, /function createWheel\(|createBodyShellGeometry|sideSkirt|frontBumper|rearBumper/);
});

runTest('tsl skin 3d preview builds proportionate twin-spoke Model Y wheels', () => {
  assert.equal(wheelModuleFileExists, true);
  assert.match(vehicle3DSource, /from '\.\/tslVehicleWheel'/);
  assert.match(wheelModuleSource, /MODEL_Y_TIRE_WIDTH_M = 0\.255/);
  assert.match(wheelModuleSource, /MODEL_Y_TIRE_OUTER_RADIUS_M = 0\.356/);
  assert.match(wheelModuleSource, /GEMINI_SPOKE_PAIR_COUNT = 10/);
  assert.match(wheelModuleSource, /GEMINI_SPOKE_PAIR_OFFSETS = \[-0\.04, 0\.04\] as const/);
  assert.match(wheelModuleSource, /GEMINI_SPOKE_DEPTH_M = 0\.018/);
  assert.match(wheelModuleSource, /new THREE\.CylinderGeometry/);
  assert.match(wheelModuleSource, /new THREE\.CylinderGeometry\([\s\S]{0,240}MODEL_Y_TIRE_WIDTH_M/);
  assert.match(wheelModuleSource, /new THREE\.ExtrudeGeometry/);
  assert.match(wheelModuleSource, /new THREE\.ExtrudeGeometry\([\s\S]{0,180}GEMINI_SPOKE_DEPTH_M/);
  assert.match(wheelModuleSource, /createGeminiSpoke/);
  assert.match(wheelModuleSource, /makeMarkerTireMaterial/);
  assert.match(wheelModuleSource, /makeGeminiWheelMaterial/);
  assert.match(wheelModuleSource, /WHEEL_MARKER_PATTERN/);
  assert.match(wheelModuleSource, /addMarkerWheels/);
  assert.match(wheelModuleSource, /tire\.rotation\.x = Math\.PI \/ 2/);
  assert.match(wheelModuleSource, /for \(let pairIndex = 0; pairIndex < GEMINI_SPOKE_PAIR_COUNT; pairIndex \+= 1\)[\s\S]{0,500}GEMINI_SPOKE_PAIR_OFFSETS[\s\S]{0,500}createGeminiSpoke/);
  assert.match(vehicle3DSource, /group\.traverse\([\s\S]+addMarkerWheels\(group\);[\s\S]+fitVehicleGroup/);
  assert.doesNotMatch(vehicle3DSource, /addMarkerWheels\(group\);\s*group\.traverse/);
});

runTest('tsl skin 3d preview fits the full vehicle into narrow dialog stages', () => {
  assert.match(vehicle3DSource, /camera\.aspect < 1\.35/);
  assert.match(vehicle3DSource, /let requiredDistance = 0/);
  assert.match(vehicle3DSource, /const fitSpan = size\.length\(\)/);
  assert.match(vehicle3DSource, /const fitHeightDistance = fitSpan \/ \(2 \* Math\.tan\(verticalFov \/ 2\)\)/);
  assert.match(vehicle3DSource, /const fitWidthDistance = fitHeightDistance \/ camera\.aspect/);
  assert.match(vehicle3DSource, /const fitDistance = Math\.max\(fitHeightDistance, fitWidthDistance\) \* 1\.2/);
  assert.match(vehicle3DSource, /controls\.maxDistance = Math\.max\(size\.length\(\) \* 1\.55, requiredDistance \* 1\.15, 7\.5\)/);
});

runTest('tsl skin preview dialog keeps its mobile subtitle readable', () => {
  assert.match(
    previewDialogSource,
    /<p className=\{`mt-1 line-clamp-2 text-xs font-medium sm:line-clamp-1 \$\{mutedTextClassName\}`\}>/,
  );
  assert.match(
    previewDialogSource,
    /<span className="whitespace-nowrap">\{viewModel\.model\.label\}<\/span>/,
  );
  assert.match(previewDialogSource, /<br className="sm:hidden" \/>/);
  assert.match(
    previewDialogSource,
    /<span className="hidden sm:inline">\s*·\s*<\/span>/,
  );
  assert.match(
    previewDialogSource,
    /<span className="whitespace-nowrap">\{viewModel\.sourceLabel\}<\/span>/,
  );
  assert.doesNotMatch(
    previewDialogSource,
    /<p className=\{`mt-1 truncate text-xs font-medium \$\{mutedTextClassName\}`\}>\s*\{viewModel\.model\.label\}/,
  );
});

runTest('tsl skin 3d preview updates only paint material slots', () => {
  assert.match(vehicle3DSource, /type MaterialTarget/);
  assert.match(vehicle3DSource, /materialIndex/);
  assert.match(vehicle3DSource, /getMeshMaterialSlots/);
  assert.match(vehicle3DSource, /assignTargetMaterial/);
  assert.match(vehicle3DSource, /hasUsableWrapUv\(target\.mesh/);
  assert.match(vehicle3DSource, /WHEEL_MATERIAL_HINTS/);
  assert.match(vehicle3DSource, /isWheelMaterialSlot/);
  assert.match(vehicle3DSource, /makeTireMaterial/);
  assert.match(vehicle3DSource, /makeWheelMaterial/);
  assert.match(wheelModuleSource, /buildMarkerWheelAssembly/);
  assert.match(wheelModuleSource, /WHEEL_MARKER_PATTERN/);
  assert.match(vehicle3DSource, /isWheelMaterialSlot\(slot, mesh\)[\s\S]{0,250}return;/);
  assert.doesNotMatch(vehicle3DSource, /isObjPaintMaterial\(slot\)[\s\S]{0,250}isWheelMaterialSlot/);
  assert.doesNotMatch(vehicle3DSource, /mesh\.material = makeWrapMaterial\(texture\);/);
  assert.doesNotMatch(vehicle3DSource, /mesh\.material = makePaintMaterial\(wrapColor\);/);
});

runTest('tsl skin 3d preview uses clear non-mirrored paint materials', () => {
  assert.match(vehicle3DSource, /metalness: 0\.12/);
  assert.match(vehicle3DSource, /roughness: 0\.38/);
  assert.match(vehicle3DSource, /envMapIntensity: 1\.2/);
  assert.match(vehicle3DSource, /HemisphereLight/);
});

runTest('tsl skin 3d preview respects reduced motion', () => {
  assert.match(vehicle3DSource, /prefers-reduced-motion: reduce/);
  assert.match(vehicle3DSource, /addEventListener\('change'/);
  assert.match(vehicle3DSource, /removeEventListener\('change'/);
  assert.doesNotMatch(vehicle3DSource, /controls\.autoRotate\s*=\s*true/);
});

runTest('tsl skin 3d preview releases dialog-scoped webgl resources', () => {
  assert.match(vehicle3DSource, /replaceTargetMaterial/);
  assert.match(vehicle3DSource, /disposeMaterialTextures/);
  assert.match(vehicle3DSource, /disposePreviewResources/);
  assert.match(vehicle3DSource, /finishWithFallback[\s\S]{0,500}disposePreviewResources\(\)/);
  assert.match(vehicle3DSource, /forceContextLoss\(\)/);
  assert.match(vehicle3DSource, /if \(!cancelled\) \{\s*clearWrapTexture\(\);/);
});

runTest('tsl skin 3d preview prioritizes reference-quality gltf models and has a stable fallback path', () => {
  assert.match(vehicle3DSource, /MODEL_LOAD_TIMEOUT_MS/);
  assert.match(vehicle3DSource, /PCFShadowMap/);
  assert.match(vehicle3DSource, /loadGltfPreview\(\(\) =>/);
  assert.match(vehicle3DSource, /loadObjPreview\(finishWithFallback\)/);
  assert.match(vehicle3DSource, /if \(modelUrl\)/);
  assert.doesNotMatch(vehicle3DSource, /if \(hasObjPreview && objModelUrl && mtlModelUrl\) \{/);
});

runTest('tsl skin page keeps the download workflow uncluttered', () => {
  assert.match(componentSource, /下载现有皮肤/);
  assert.match(componentSource, /现有皮肤/);
  assert.match(componentSource, /下载当前皮肤/);
  assert.doesNotMatch(componentSource, /价格说明|免费资源站|单张下载|五张打包|自定义设计 30 元|原创商品样张/);
  assert.doesNotMatch(componentSource, /DOWNLOAD_PRICE_TIERS|EXTERNAL_WRAP_SOURCES|SKIN_CATALOG_PRODUCTS|getCatalogProductsForTemplate/);
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
  assert.match(componentSource, /现有皮肤/);
  assert.match(componentSource, /下载现有皮肤/);
  assert.match(componentSource, /自定义上传裁剪/);
  assert.match(componentSource, /点击皮肤打开三维预览/);
  assert.match(componentSource, /上传自己的皮肤/);
  assert.match(componentSource, /不会上传服务器/);
  assert.match(componentSource, /tsl-skin-studio-workbench/);
  assert.match(componentSource, /tsl-skin-wrap-grid/);
  assert.match(componentSource, /TslSkinPreviewDialog/);
  assert.doesNotMatch(componentSource, /skin-detail-dialog/);
  assert.doesNotMatch(componentSource, /双入口工作台|tsl-skin-entry-panel|tsl-skin-model-strip|scrollToWorkbench|车机皮肤工作台/);
  assert.doesNotMatch(componentSource, /排行榜|联盟计划|联系我们|首页 \/ 使用教程|tsl-skin-brand-tutorial|特斯拉车机皮肤下载与[\s\S]*创作平台|landingStats|scrollToTutorial/);
  assert.doesNotMatch(componentSource, /Network（网络）|抓包|爬虫|Python 脚本|BeautifulSoup|批量下载爬虫/);
});

runTest('tsl skin page keeps compact help inside the two workflows', () => {
  assert.match(componentSource, /选择车型/);
  assert.match(componentSource, /先选车型/);
  assert.match(componentSource, /上传图片调整位置/);
  assert.match(componentSource, /下载当前皮肤/);
  assert.match(componentSource, /一比一/);
  assert.doesNotMatch(componentSource, /导出交付包|文件放入 Wraps|exFAT/);
});

runTest('tsl skin download mode exposes a visible skin gallery', () => {
  assert.match(componentSource, /现有皮肤/);
  assert.match(componentSource, /在弹窗中旋转车辆并下载/);
  assert.match(componentSource, /openWrapPreview/);
  assert.match(componentSource, /selectedPreviewWrap/);
  assert.match(componentSource, /filteredGalleryItems\.map/);
  assert.match(componentSource, /getOfficialExampleWrapsForTemplate/);
  assert.match(componentSource, /下载当前皮肤/);
  assert.doesNotMatch(componentSource, /马上预览|tsl-skin-gallery-strip/);
  assert.doesNotMatch(componentSource, /适配车型|立即预览|addOfficialExampleLayer/);
});

runTest('tsl skin download mode reads a local remote-free index without live third-party calls', () => {
  assert.match(componentSource, /\/tsl-skins\/free-wrap-index\.json/);
  assert.match(componentSource, /remoteFreeWraps/);
  assert.match(componentSource, /\/tsl-skins\/local-wraps\//);
  assert.match(componentSource, /本地皮肤库/);
  assert.match(componentSource, /showRiskWraps/);
  assert.match(componentSource, /显示风险素材/);
  assert.match(componentSource, /已隐藏/);
  assert.match(componentSource, /疑似角色\/IP/);
  assert.match(componentSource, /formatRiskTags/);
  assert.doesNotMatch(componentSource, /tesla\.timor419\.com|tesla-wrap\.mrproper\.dev|gwhjdgbjcqbhhdwzrijk|\/api\/wrap/);
  assert.doesNotMatch(componentSource, /远程免费索引|远程免费皮肤|远程免费：/);
});

runTest('tsl skin page removes external source clutter from the UI', () => {
  assert.doesNotMatch(componentSource, /EXTERNAL_WRAP_SOURCES/);
  assert.doesNotMatch(componentSource, /免费资源站/);
  assert.doesNotMatch(componentSource, /去原站下载/);
  assert.doesNotMatch(componentSource, /不在本站镜像素材/);
  assert.doesNotMatch(componentSource, /确认授权后再入库/);
  assert.doesNotMatch(componentSource, /externalSources\.map/);
  assert.doesNotMatch(componentSource, /axios|fetch\(.+tesla-wrap|beautifulsoup|scrapy|playwright.*tesla-wrap/i);
});

runTest('tsl skin page supports direct png export and per-layer crop modes', () => {
  assert.match(componentSource, /buildTslSkinFileName/);
  assert.match(componentSource, /downloadPreviewTarget/);
  assert.match(previewDialogSource, /actions\.download/);
  assert.match(previewDialogSource, /下载当前皮肤/);
  assert.doesNotMatch(componentSource, /buildTslSkinZipFileName/);
  assert.doesNotMatch(componentSource, /buildWrapInstallGuide/);
  assert.doesNotMatch(componentSource, /createStoredZip/);
  assert.doesNotMatch(componentSource, /install-guide\.txt/);
  assert.doesNotMatch(componentSource, /model-info\.json/);
  assert.doesNotMatch(componentSource, /下载压缩包/);
  assert.match(componentSource, /clipMode/);
  assert.match(componentSource, /贴合车身/);
  assert.match(componentSource, /保留完整图案/);
});

runTest('tsl skin page shows an approximate in-car render preview', () => {
  assert.match(previewDialogSource, /TslVehicle3DPreview/);
  assert.match(previewDialogSource, /车漆/);
  assert.match(previewDialogSource, /白色车漆/);
  assert.match(previewDialogSource, /黑色车漆/);
  assert.match(previewDialogSource, /setPaintColor/);
  assert.match(componentSource, /buildPreviewDialogViewModel/);
  assert.match(componentSource, /previewDialogViewModel/);
  assert.match(componentSource, /setPaintColor: setWrapColor/);
  assert.match(componentSource, /customRenderUrl/);
  assert.match(previewDialogSource, /wrapImageUrl=\{viewModel\.wrapImageUrl\}/);
  assert.match(previewDialogSource, /modelUrl=\{viewModel\.model\.previewModelUrl\}/);
  assert.match(previewDialogSource, /vehicleImageUrl=\{viewModel\.model\.vehicleImageUrl\}/);
  assert.match(previewDialogSource, /三维动态预览/);
  assert.match(previewDialogSource, /鼠标拖动旋转/);
  assert.match(previewDialogSource, /滚轮缩放/);
  assert.match(vehicle3DSource, /真实车型模型/);
  assert.match(vehicle3DSource, /prepareVehicleModel/);
  assert.match(vehicle3DSource, /prepareObjVehicleModel/);
  assert.match(vehicle3DSource, /CarPaint/);
  assert.match(vehicle3DSource, /OrbitControls/);
  assert.doesNotMatch(componentSource, /vehiclePreviewCanvasRef|drawVehiclePreview|drawSmartContainedImage|vehicle-reference-panel/);
});

runTest('tsl skin layout keeps gallery cards and custom editor clean', () => {
  assert.match(componentSource, /tsl-skin-shell/);
  assert.match(componentSource, /tsl-skin-wrap-grid/);
  assert.match(componentSource, /tsl-skin-wrap-card/);
  assert.match(componentSource, /tsl-skin-studio-workbench/);
  assert.match(componentSource, /tsl-skin-filter-bar/);
  assert.doesNotMatch(componentSource, /lg:grid-cols-\[minmax\(0,1fr\)_420px\]/);
  assert.match(componentSource, /xl:grid-cols-5/);
  assert.match(componentSource, /2xl:grid-cols-6/);
  assert.match(componentSource, /min-h-screen/);
  assert.doesNotMatch(componentSource, /sticky top-24/);
  assert.match(componentSource, /--app-global-scale/);
  assert.match(componentSource, /裁剪画布/);
  assert.match(componentSource, /下载当前皮肤/);
  assert.match(componentSource, /最新/);
  assert.match(componentSource, /最热/);
  assert.match(componentSource, /全部标签/);
  assert.doesNotMatch(componentSource, /tsl-skin-sidebar/);
  assert.doesNotMatch(componentSource, /错误覆盖|skin-detail-panel|vehicle-reference-panel|drawSmartContainedImage/);
});

runTest('tsl skin page is Chinese-first and includes day mode plus help', () => {
  assert.match(componentSource, /浅色模式/);
  assert.match(componentSource, /深色模式/);
  assert.match(componentSource, /选择车型/);
  assert.match(componentSource, /先选车型/);
  assert.match(componentSource, /上传图片调整位置/);
  assert.match(componentSource, /下载当前皮肤/);
  assert.doesNotMatch(
    componentSource,
    /Tesla Paint Shop|TSL Skin|Body Color|Loading Tesla template|Instant PNG download|Free PNG sample|Race stripe|Tech grid|Satin wave|procedural|Quick Polish|Quote|workspace|Export-ready|Commercial-use|Priority designer|Color match|One uploaded logo|Full Custom|Brand Drop|导出 PNG|下载 ZIP 包|2 元|9\.99 元|30 元|Vercel|WebP/,
  );
  assert.doesNotMatch(appSource, /Loading TSL Skin/);
});
