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

  assert.equal(TESLA_MODEL_TEMPLATES.length, 12);
  assert.deepEqual(
    TESLA_MODEL_TEMPLATES.map((template) => template.id),
    [
      'cybertruck',
      'model3',
      'model3-2024-base',
      'model3-2024-performance',
      'models-2021',
      'models-2025-plaid',
      'modelx-2021',
      'modely',
      'modely-2025-base',
      'modely-2025-premium',
      'modely-2025-performance',
      'modely-l',
    ],
  );
  assert.deepEqual(
    TESLA_MODEL_TEMPLATES.map((template) => template.label),
    [
      'Cybertruck',
      'Model 3（2024前）',
      'Model 3（2024+）标准/长续航',
      'Model 3（2024+）性能版',
      'Model S（2021以后）',
      'Model S Plaid（2025以后）',
      'Model X（2021以后）',
      'Model Y（2025前）',
      'Model Y（2025+）标准版',
      'Model Y（2025+）长续航',
      'Model Y（2025+）性能版',
      'Model Y L（中国）',
    ],
  );

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

  const modelS = getTeslaTemplateById('models-2021');
  assert.equal(modelS.label, 'Model S（2021以后）');
  assert.equal(
    modelS.templateUrl,
    'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/models-2021/template.png',
  );
  assert.equal(modelS.previewModelUrl, 'https://teslawrapgallery.com/tesla_3d_models/ModelS_2021.glb');
  assert.equal(modelS.previewObjUrl, null);
  assert.equal(modelS.previewMtlUrl, null);
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
  assert.equal(examples[0].fileName, 'Cosmic_Burst.png');

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
