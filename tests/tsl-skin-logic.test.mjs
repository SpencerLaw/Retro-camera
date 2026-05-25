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
  assert.equal(premium.label, 'Model Y 2025 Premium');
  assert.equal(
    premium.templateUrl,
    'https://raw.githubusercontent.com/teslamotors/custom-wraps/master/modely-2025-premium/template.png',
  );
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
    buildTslSkinFileName('Model Y 2025 Premium', 1777777777000),
    'tsl-skin-model-y-2025-premium-1777777777000.png',
  );
});

await runTest('tsl skin exposes a commercial catalog and custom packages', async () => {
  const {
    CUSTOM_WRAP_PACKAGES,
    SKIN_CATALOG_PRODUCTS,
    formatPriceCents,
    getCatalogProductsForTemplate,
  } = await loadLogicModule();

  assert.ok(SKIN_CATALOG_PRODUCTS.length >= 3);
  assert.ok(CUSTOM_WRAP_PACKAGES.length >= 3);

  const modelYProducts = getCatalogProductsForTemplate('modely-2025-premium');
  assert.ok(modelYProducts.length >= 2);
  assert.ok(modelYProducts.every((product) => product.modelIds.includes('modely-2025-premium')));
  assert.ok(modelYProducts.every((product) => product.assetKind === 'procedural'));
  assert.ok(modelYProducts.every((product) => ['free', 'premium'].includes(product.tier)));
  assert.ok(modelYProducts.every((product) => product.previewLabel && product.previewColors.length >= 2));
  assert.ok(CUSTOM_WRAP_PACKAGES.every((item) => item.tier === 'custom'));
  assert.equal(formatPriceCents(4900), '¥49');
  assert.equal(formatPriceCents(19900), '¥199');
});

await runTest('tsl skin calculates custom order quotes from package and rush options', async () => {
  const { calculateCustomOrderQuote } = await loadLogicModule();

  assert.deepEqual(
    calculateCustomOrderQuote({
      packageId: 'full-custom',
      extraRevisionCount: 2,
      rush: true,
    }),
    {
      packageId: 'full-custom',
      basePriceCents: 29900,
      extraRevisionCents: 6000,
      rushCents: 8000,
      totalCents: 43900,
    },
  );
});

await runTest('tsl skin builds local zip download names and install guide text', async () => {
  const { buildTslSkinZipFileName, buildWrapInstallGuide } = await loadLogicModule();

  assert.equal(
    buildTslSkinZipFileName('Model Y 2025 Premium', 1777777777000),
    'tsl-skin-model-y-2025-premium-1777777777000.zip',
  );

  const guide = buildWrapInstallGuide({
    modelLabel: 'Model Y 2025 Premium',
    fileName: 'wrap.png',
  });
  assert.match(guide, /Model Y 2025 Premium/);
  assert.match(guide, /wrap\.png/);
  assert.match(guide, /U盘|U 盘/);
  assert.match(guide, /Wraps/);
  assert.match(guide, /浏览器本地生成/);
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
