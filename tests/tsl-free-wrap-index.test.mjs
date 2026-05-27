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

async function loadSyncModule() {
  return import(pathToFileURL('scripts/sync-tsl-free-wraps.mjs').href);
}

await runTest('free wrap sync only supports stable Model 3 and Model Y ids', async () => {
  const { SUPPORTED_REMOTE_MODEL_IDS } = await loadSyncModule();

  assert.deepEqual(SUPPORTED_REMOTE_MODEL_IDS, [
    'model3',
    'model3-2024-base',
    'modely',
    'modely-2025-base',
    'modely-2025-premium',
  ]);
});

await runTest('free wrap sync normalizes timor public wraps without mirroring png files', async () => {
  const { normaliseTimorWrap } = await loadSyncModule();

  const item = normaliseTimorWrap({
    id: 268,
    title: 'zootopia',
    vehicleModel: 'modely-2025-base',
    previewUrl: 'https://oss.timor419.com/jarvis/wrap/modely-2025-base/example.png',
    fileUrl: 'https://oss.timor419.com/jarvis/wrap/modely-2025-base/example.png',
    fileSize: 376843,
    downloadCount: 251,
    tags: ['疯狂动物城'],
  });

  assert.equal(item.id, 'timor-268');
  assert.equal(item.title, 'zootopia');
  assert.equal(item.fileName, 'zootopia.png');
  assert.equal(item.imageUrl, 'https://oss.timor419.com/jarvis/wrap/modely-2025-base/example.png');
  assert.equal(item.downloadUrl, item.imageUrl);
  assert.deepEqual(item.modelIds, ['modely-2025-base']);
  assert.equal(item.sourceLabel, '远程免费：贾维斯');
  assert.equal(item.isRemote, true);
  assert.ok(item.riskTags.includes('疑似角色/IP'));
  assert.ok(!item.imageUrl.startsWith('/tsl-skins/'));

  assert.equal(normaliseTimorWrap({ ...item, vehicleModel: 'modely-2025-performance' }), null);
});

await runTest('free wrap sync normalizes community gallery rows and model aliases', async () => {
  const { normaliseMrproperWrap } = await loadSyncModule();

  const item = normaliseMrproperWrap({
    id: 'b0da0602-cfd3-480a-b55c-e62310d4121d',
    title: 'Oeteldonk',
    author: 'GardenSnakes',
    car_model_id: 'modely-2025-prem',
    image_url: 'https://gwhjdgbjcqbhhdwzrijk.supabase.co/storage/v1/object/public/wrap-images/example.png',
    downloads: 12,
    likes: 3,
    tags: ['carnaval'],
    created_at: '2025-12-26T23:09:33.304147+08:00',
  });

  assert.equal(item.id, 'mrproper-b0da0602-cfd3-480a-b55c-e62310d4121d');
  assert.equal(item.fileName, 'Oeteldonk.png');
  assert.equal(item.author, 'GardenSnakes');
  assert.deepEqual(item.modelIds, ['modely-2025-premium']);
  assert.equal(item.sourceLabel, '远程免费：社区画廊');
  assert.equal(item.riskTags.length, 0);
});

await runTest('free wrap index payload deduplicates remote urls and records source metadata', async () => {
  const { buildFreeWrapIndexPayload, normaliseTimorWrap, normaliseMrproperWrap } = await loadSyncModule();
  const sharedUrl = 'https://cdn.example.com/wrap.png';

  const payload = buildFreeWrapIndexPayload({
    generatedAt: '2026-05-27T00:00:00.000Z',
    timorItems: [
      normaliseTimorWrap({
        id: 1,
        title: 'Police',
        vehicleModel: 'modely',
        previewUrl: sharedUrl,
        fileUrl: sharedUrl,
        downloadCount: 8,
        tags: ['警车'],
      }),
    ],
    mrproperItems: [
      normaliseMrproperWrap({
        id: 'dup',
        title: 'Police duplicate',
        car_model_id: 'modely',
        image_url: sharedUrl,
        downloads: 4,
        likes: 1,
        tags: [],
      }),
    ],
  });

  assert.equal(payload.generatedAt, '2026-05-27T00:00:00.000Z');
  assert.equal(payload.sources.length, 2);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].imageUrl, sharedUrl);
  assert.ok(payload.items.every((item) => item.isRemote));
});

await runTest('generated free wrap index is small metadata json, not mirrored images', async () => {
  const indexPath = 'public/tsl-skins/free-wrap-index.json';
  assert.equal(fs.existsSync(indexPath), true);

  const payload = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assert.ok(Array.isArray(payload.items));
  assert.ok(payload.items.length > 0);
  assert.ok(payload.items.every((item) => /^https:\/\//.test(item.imageUrl)));
  assert.ok(payload.items.every((item) => item.isRemote === true));
});
