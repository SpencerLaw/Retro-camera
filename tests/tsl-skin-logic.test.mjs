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

await runTest('tsl skin logic no longer exposes price, external source, or zip helpers', async () => {
  const logic = await loadLogicModule();

  assert.equal(logic.DOWNLOAD_PRICE_TIERS, undefined);
  assert.equal(logic.SKIN_CATALOG_PRODUCTS, undefined);
  assert.equal(logic.EXTERNAL_WRAP_SOURCES, undefined);
  assert.equal(logic.buildTslSkinZipFileName, undefined);
  assert.equal(logic.buildWrapInstallGuide, undefined);
  assert.equal(logic.createStoredZip, undefined);
  assert.equal(logic.formatPriceCents, undefined);
  assert.equal(logic.getCatalogProductsForTemplate, undefined);
});
