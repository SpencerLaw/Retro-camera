import assert from 'node:assert/strict';
import fs from 'node:fs';
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

  assert.equal(TESLA_MODEL_TEMPLATES.length, 5);
  assert.deepEqual(
    TESLA_MODEL_TEMPLATES.map((template) => template.id),
    [
      'model3',
      'model3-2024-base',
      'modely',
      'modely-2025-base',
      'modely-2025-premium',
    ],
  );
  assert.deepEqual(
    TESLA_MODEL_TEMPLATES.map((template) => template.label),
    [
      'Model 3（2024前）',
      'Model 3（2024+）标准/长续航',
      'Model Y（2025前）',
      'Model Y（2025+）标准版',
      'Model Y（2025+）长续航',
    ],
  );
  assert.ok(TESLA_MODEL_TEMPLATES.every((template) => /^model[3y]/.test(template.id)));
  assert.ok(!TESLA_MODEL_TEMPLATES.some((template) => /cybertruck|models|modelx/i.test(template.id)));

  const premium = getTeslaTemplateById('modely-2025-premium');
  assert.equal(premium.label, 'Model Y（2025+）长续航');
  assert.equal(
    premium.templateUrl,
    'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/modely-2025-premium/template.png',
  );
  assert.equal(
    premium.vehicleImageUrl,
    'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/modely-2025-premium/vehicle_image.png',
  );
  assert.equal(premium.previewModelUrl, 'https://teslawrapgallery.com/tesla_3d_models/Bayberry.gltf');
  assert.equal(
    premium.previewObjUrl,
    'https://raw.githubusercontent.com/GewoonJaap/custom-tesla-wraps/master/modely-2025-premium/vehicle.obj',
  );
  assert.equal(
    premium.previewMtlUrl,
    'https://raw.githubusercontent.com/GewoonJaap/custom-tesla-wraps/master/modely-2025-premium/vehicle.mtl',
  );

  const oldModel3 = getTeslaTemplateById('model3');
  assert.equal(oldModel3.label, 'Model 3（2024前）');
  assert.equal(
    oldModel3.templateUrl,
    'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/model3/template.png',
  );
  assert.equal(oldModel3.previewModelUrl, 'https://teslawrapgallery.com/tesla_3d_models/Model3_High.gltf');
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
  assert.equal(examples[0].sourceLabel, '特斯拉官方示例');
  assert.equal(examples[0].fileName, 'Acid_Drip.png');

  const model3Examples = getOfficialExampleWrapsForTemplate('model3');
  assert.equal(model3Examples.length, 20);
  assert.ok(model3Examples.every((item) => item.modelIds.length === 1 && item.modelIds[0] === 'model3'));
  assert.ok(
    model3Examples.every((item) =>
      item.imageUrl.startsWith('https://raw.githubusercontent.com/teslamotors/custom-wraps/master/model3/example/'),
    ),
  );

  const legacyUnsupportedExamples = getOfficialExampleWrapsForTemplate('cybertruck');
  assert.ok(legacyUnsupportedExamples.every((item) => item.modelIds.includes('model3')));
});

await runTest('tsl skin logic keeps examples mapped per supported model only', async () => {
  const logicSource = fs.readFileSync('components/tslSkinLogic.js', 'utf8');

  assert.match(logicSource, /OFFICIAL_EXAMPLE_FILES_BY_TEMPLATE/);
  assert.doesNotMatch(logicSource, /COMMON_OFFICIAL_EXAMPLE_FILES|CYBERTRUCK_OFFICIAL_EXAMPLE_FILES/);
  assert.doesNotMatch(logicSource, /Cybertruck|models-2021|models-2025-plaid|modelx-2021|ModelS_|ModelX_/);
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
    buildTslSkinFileName('Model Y（2025+）长续航', 1777777777000),
    'tsl-skin-model-y-2025-1777777777000.png',
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
