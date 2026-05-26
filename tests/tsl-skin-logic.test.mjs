import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function loadLogicModule() {
  return import(pathToFileURL('components/tslSkinLogic.js').href);
}

await runTest('tsl skin exposes official Tesla template catalog', async () => {
  const { TESLA_MODEL_TEMPLATES, getTeslaTemplateById } = await loadLogicModule();

  assert.equal(TESLA_MODEL_TEMPLATES.length, 9);
  assert.deepEqual(
    TESLA_MODEL_TEMPLATES.map((template) => template.id),
    [
      'cybertruck',
      'model3',
      'model3-2024-base',
      'model3-2024-performance',
      'modely',
      'modely-2025-base',
      'modely-2025-premium',
      'modely-2025-performance',
      'modely-l',
    ],
  );

  const premium = getTeslaTemplateById('modely-2025-premium');
  assert.equal(premium.label, 'Y 型车 2025 高级版');
  assert.equal(
    premium.templateUrl,
    'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/modely-2025-premium/template.png',
  );
  assert.equal(
    premium.vehicleImageUrl,
    'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/modely-2025-premium/vehicle_image.png',
  );
});

await runTest('tsl skin exposes official GitHub example wraps for galleries', async () => {
  const { getOfficialExampleWrapsForTemplate } = await loadLogicModule();

  const examples = getOfficialExampleWrapsForTemplate('modely-2025-premium');
  assert.equal(examples.length, 21);
  assert.ok(examples.some((item) => item.sourceLabel === '原创可商用样张'));
  assert.ok(examples.some((item) => item.sourceLabel === '特斯拉官方示例'));
  assert.ok(examples.every((item) => item.modelIds.includes('modely-2025-premium')));
  assert.ok(
    examples
      .filter((item) => item.sourceLabel === '特斯拉官方示例')
      .every((item) =>
      item.imageUrl.startsWith(
        'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/modely-2025-premium/example/',
      ),
    ),
  );
  assert.ok(
    examples.some(
      (item) =>
        item.fileName === 'animal-city-patrol-modely-2025.png' &&
        item.title === '动物城市巡游' &&
        item.imageUrl === '/tsl-skins/animal-city-patrol-modely-2025.png',
    ),
  );
  assert.ok(examples.some((item) => item.fileName === 'Sakura.png' && item.title === '樱花粉绘'));

  const cybertruckExamples = getOfficialExampleWrapsForTemplate('cybertruck');
  assert.ok(cybertruckExamples.length > examples.length);
});

await runTest('tsl skin creates centered layers and export filenames', async () => {
  const { buildTslSkinFileName, createSkinLayer } = await loadLogicModule();

  const layer = createSkinLayer('decal_1', { width: 320, height: 180 });
  assert.equal(layer.id, 'decal_1');
  assert.equal(layer.x, 512);
  assert.equal(layer.y, 512);
  assert.equal(layer.scale, 1);
  assert.equal(layer.rotation, 0);
  assert.equal(layer.opacity, 1);
  assert.equal(layer.flipX, false);
  assert.equal(layer.clipMode, 'body');

  assert.equal(
    buildTslSkinFileName('Y 型车 2025 高级版', 1777777777000),
    'tsl-skin-y-2025-1777777777000.png',
  );
});

await runTest('tsl skin exposes Chinese catalog products and simple price tiers', async () => {
  const {
    DOWNLOAD_PRICE_TIERS,
    SKIN_CATALOG_PRODUCTS,
    formatPriceCents,
    getCatalogProductsForTemplate,
  } = await loadLogicModule();

  assert.ok(SKIN_CATALOG_PRODUCTS.length >= 3);
  assert.deepEqual(
    DOWNLOAD_PRICE_TIERS.map((tier) => tier.priceCents),
    [200, 999, 3000],
  );
  assert.deepEqual(
    DOWNLOAD_PRICE_TIERS.map((tier) => tier.title),
    ['单张下载', '五张打包', '自定义设计'],
  );

  const modelYProducts = getCatalogProductsForTemplate('modely-2025-premium');
  assert.ok(modelYProducts.length >= 2);
  assert.ok(modelYProducts.every((product) => product.modelIds.includes('modely-2025-premium')));
  assert.ok(modelYProducts.every((product) => product.assetKind === '原创样张'));
  assert.ok(modelYProducts.every((product) => ['单张', '五张'].includes(product.tier)));
  assert.ok(modelYProducts.every((product) => product.previewLabel && product.previewColors.length >= 2));
  assert.ok(modelYProducts.every((product) => !/[A-Za-z]/.test(product.title + product.deliveryLabel + product.previewLabel + product.description + product.assetKind + product.tier)));
  assert.equal(formatPriceCents(200), '¥2');
  assert.equal(formatPriceCents(999), '¥9.99');
  assert.equal(formatPriceCents(3000), '¥30');
});

await runTest('tsl skin builds local zip download names and install guide text', async () => {
  const { buildTslSkinZipFileName, buildWrapInstallGuide } = await loadLogicModule();

  assert.equal(
    buildTslSkinZipFileName('Y 型车 2025 高级版', 1777777777000),
    'tsl-skin-y-2025-1777777777000.zip',
  );

  const guide = buildWrapInstallGuide({
    modelLabel: 'Y 型车 2025 高级版',
    fileName: 'wrap.png',
  });
  assert.match(guide, /wrap\.png/);
  assert.match(guide, /U盘|U 盘/);
  assert.match(guide, /皮肤文件夹/);
  assert.match(guide, /浏览器本地生成/);
  assert.doesNotMatch(guide, /Install guide|Privacy|USB drive|server/i);
});

await runTest('tsl skin creates a stored zip package without server upload', async () => {
  const { createStoredZip } = await loadLogicModule();

  const zip = createStoredZip([
    { name: 'wrap.png', data: new Uint8Array([1, 2, 3]) },
    { name: 'install-guide.txt', data: 'local only' },
  ]);

  assert.ok(zip instanceof Uint8Array);
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);

  const zipText = new TextDecoder().decode(zip);
  assert.match(zipText, /wrap\.png/);
  assert.match(zipText, /install-guide\.txt/);
  assert.match(zipText, /local only/);
});
