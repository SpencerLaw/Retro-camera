import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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
  assert.equal(item.isLocal, false);
  assert.ok(item.riskTags.includes('疑似角色/IP'));
  assert.ok(!item.imageUrl.startsWith('/tsl-skins/'));

  assert.equal(normaliseTimorWrap({ ...item, vehicleModel: 'modely-2025-performance' }), null);
});

await runTest('free wrap sync normalizes tesla-wrap public gallery rows', async () => {
  const { normaliseTeslaWrapComWrap } = await loadSyncModule();

  const item = normaliseTeslaWrapComWrap({
    id: '2dc97015-4f6b-4594-bb5e-f7a0bedea32c',
    title: 'Umbreon',
    description: 'dark blue sample',
    model_id: 'modely-2025-premium',
    preview_image_url: 'https://mehvzkfcitccchzpqyfd.supabase.co/storage/v1/object/public/designs/preview/example.png',
    preview_thumbnail_url: 'https://mehvzkfcitccchzpqyfd.supabase.co/storage/v1/object/public/designs/thumbnail/example.webp',
    download_count: 7,
    like_count: 2,
    created_at: '2026-05-25T18:13:45.8448+00:00',
  });

  assert.equal(item.id, 'teslawrap-2dc97015-4f6b-4594-bb5e-f7a0bedea32c');
  assert.equal(item.title, 'Umbreon');
  assert.equal(item.fileName, 'Umbreon.png');
  assert.equal(item.imageUrl, 'https://mehvzkfcitccchzpqyfd.supabase.co/storage/v1/object/public/designs/preview/example.png');
  assert.deepEqual(item.modelIds, ['modely-2025-premium']);
  assert.equal(item.sourceLabel, '公开图库：特斯拉贴纸');
  assert.equal(item.sourceName, 'Tesla Wrap');
  assert.equal(item.downloads, 7);
  assert.equal(item.likes, 2);
  assert.equal(item.createdAt, '2026-05-25T18:13:45.8448+00:00');

  assert.equal(normaliseTeslaWrapComWrap({ ...item, model_id: 'modely-2025-performance' }), null);
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

await runTest('free wrap mirror rewrites png urls to local public assets and keeps source urls', async () => {
  const { mirrorWrapAssetsForPayload, normaliseTimorWrap } = await loadSyncModule();
  const writes = new Map();
  const sourceUrl = 'https://oss.timor419.com/jarvis/wrap/modely-2025-base/example.png';

  const payload = {
    generatedAt: '2026-05-28T00:00:00.000Z',
    sources: [],
    supportedModelIds: ['modely-2025-base'],
    items: [
      normaliseTimorWrap({
        id: 268,
        title: 'Zootopia',
        vehicleModel: 'modely-2025-base',
        previewUrl: sourceUrl,
        fileUrl: sourceUrl,
        fileSize: 376843,
        downloadCount: 251,
        tags: ['疯狂动物城'],
      }),
    ],
  };

  const mirrored = await mirrorWrapAssetsForPayload(payload, {
    publicRoot: 'mock-public',
    generatedAt: '2026-05-28T01:02:03.000Z',
    fetchImpl: async (url) => {
      assert.equal(url, sourceUrl);
      return {
        ok: true,
        headers: new Map([['content-type', 'image/png']]),
        arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
      };
    },
    fileExists: async () => false,
    writeFile: async (filePath, bytes) => {
      writes.set(filePath, Array.from(bytes));
    },
    makeDirectory: async () => {},
  });

  assert.equal(mirrored.items.length, 1);
  assert.equal(mirrored.items[0].imageUrl, '/tsl-skins/local-wraps/timor/modely-2025-base/timor-268.png');
  assert.equal(mirrored.items[0].downloadUrl, mirrored.items[0].imageUrl);
  assert.equal(mirrored.items[0].originalImageUrl, sourceUrl);
  assert.equal(mirrored.items[0].originalDownloadUrl, sourceUrl);
  assert.equal(mirrored.items[0].isRemote, false);
  assert.equal(mirrored.items[0].isLocal, true);
  assert.equal(mirrored.items[0].mirroredAt, '2026-05-28T01:02:03.000Z');
  assert.equal(writes.size, 1);
  assert.deepEqual([...writes.values()][0], [137, 80, 78, 71]);
});

await runTest('free wrap mirror keeps one local item for identical image bytes', async () => {
  const { mirrorWrapAssetsForPayload, normaliseTeslaWrapComWrap, normaliseTimorWrap } = await loadSyncModule();
  const removedFiles = [];
  const payload = {
    generatedAt: '2026-05-28T00:00:00.000Z',
    sources: [],
    supportedModelIds: ['modely', 'modely-2025-premium'],
    items: [
      normaliseTimorWrap({
        id: 1,
        title: 'Shared wrap',
        vehicleModel: 'modely',
        previewUrl: 'https://cdn.example.com/timor.png',
        fileUrl: 'https://cdn.example.com/timor.png',
        tags: ['popular'],
      }),
      normaliseTeslaWrapComWrap({
        id: 'shared',
        title: 'Shared wrap copy',
        model_id: 'modely-2025-premium',
        preview_image_url: 'https://cdn.example.com/teslawrap.png',
        description: 'premium',
      }),
    ],
  };

  const mirrored = await mirrorWrapAssetsForPayload(payload, {
    fetchImpl: async () => ({
      ok: true,
      headers: new Map([['content-type', 'image/png']]),
      arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
    }),
    fileExists: async () => false,
    writeFile: async () => {},
    makeDirectory: async () => {},
    removeFile: async (filePath) => removedFiles.push(filePath),
  });

  assert.equal(mirrored.items.length, 1);
  assert.deepEqual(mirrored.items[0].modelIds, ['modely', 'modely-2025-premium']);
  assert.deepEqual(mirrored.items[0].tags, ['popular', 'premium']);
  assert.equal(removedFiles.length, 1);
});

await runTest('free wrap mirror skips failed image downloads and records mirror errors', async () => {
  const { mirrorWrapAssetsForPayload, normaliseTimorWrap } = await loadSyncModule();

  const goodUrl = 'https://oss.timor419.com/jarvis/wrap/modely/good.png';
  const badUrl = 'https://oss.timor419.com/jarvis/wrap/modely/bad.png';
  const payload = {
    generatedAt: '2026-05-28T00:00:00.000Z',
    sources: [],
    supportedModelIds: ['modely'],
    items: [
      normaliseTimorWrap({
        id: 1,
        title: 'Good',
        vehicleModel: 'modely',
        previewUrl: goodUrl,
        fileUrl: goodUrl,
      }),
      normaliseTimorWrap({
        id: 2,
        title: 'Bad',
        vehicleModel: 'modely',
        previewUrl: badUrl,
        fileUrl: badUrl,
      }),
    ],
  };

  const mirrored = await mirrorWrapAssetsForPayload(payload, {
    fetchImpl: async (url) => {
      if (url === badUrl) {
        return {
          ok: false,
          status: 502,
          headers: new Map([['content-type', 'text/plain']]),
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }

      return {
        ok: true,
        headers: new Map([['content-type', 'image/png']]),
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      };
    },
    fileExists: async () => false,
    writeFile: async () => {},
    makeDirectory: async () => {},
    maxDownloadAttempts: 1,
  });

  assert.equal(mirrored.items.length, 1);
  assert.equal(mirrored.items[0].id, 'timor-1');
  assert.equal(mirrored.mirrorErrors.length, 1);
  assert.equal(mirrored.mirrorErrors[0].id, 'timor-2');
  assert.match(mirrored.mirrorErrors[0].message, /502/);
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
  assert.equal(payload.sources.length, 3);
  assert.equal(payload.items.length, 1);
  assert.equal(payload.items[0].imageUrl, sharedUrl);
  assert.ok(payload.items.every((item) => item.isRemote));
});

await runTest('free wrap index excludes the confirmed visual duplicate', async () => {
  const { buildFreeWrapIndexPayload, normaliseTeslaWrapComWrap } = await loadSyncModule();
  const makeWrap = (id, title) => normaliseTeslaWrapComWrap({
    id,
    title,
    model_id: 'modely-2025-premium',
    preview_image_url: `https://cdn.example.com/${id}.png`,
  });
  const payload = buildFreeWrapIndexPayload({
    teslaWrapComItems: [
      makeWrap('b132d355-037d-4663-9fb2-d158f05e8ecc', 'Panda Black Top'),
      makeWrap('17e988e2-b6c4-47e8-9d8b-28ac168b2269', 'Panda The black top'),
    ],
  });

  assert.deepEqual(payload.items.map((item) => item.id), [
    'teslawrap-b132d355-037d-4663-9fb2-d158f05e8ecc',
  ]);
});

await runTest('generated free wrap index points to mirrored local images with original url metadata', async () => {
  const indexPath = 'public/tsl-skins/free-wrap-index.json';
  assert.equal(fs.existsSync(indexPath), true);

  const payload = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assert.ok(Array.isArray(payload.items));
  assert.ok(payload.items.length > 0);
  assert.ok(payload.items.every((item) => item.imageUrl.startsWith('/tsl-skins/local-wraps/')));
  assert.ok(payload.items.every((item) => item.downloadUrl === item.imageUrl));
  assert.ok(payload.items.every((item) => /^https:\/\//.test(item.originalImageUrl)));
  assert.ok(payload.items.every((item) => item.isRemote === false));
  assert.ok(payload.items.every((item) => item.isLocal === true));
});

await runTest('generated free wrap index references one unique local png per item', async () => {
  const indexPath = 'public/tsl-skins/free-wrap-index.json';
  const localWrapRoot = 'public/tsl-skins/local-wraps';
  const payload = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const seenHashes = new Map();

  payload.items.forEach((item) => {
    const filePath = path.join('public', item.imageUrl.replace(/^\//, ''));
    assert.equal(fs.existsSync(filePath), true, `${item.id} references missing ${item.imageUrl}`);
    const contentHash = createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    assert.equal(
      seenHashes.has(contentHash),
      false,
      `${item.id} duplicates ${seenHashes.get(contentHash)}`,
    );
    seenHashes.set(contentHash, item.id);
  });

  const localPngFiles = fs.readdirSync(localWrapRoot, { recursive: true })
    .filter((fileName) => fileName.toLowerCase().endsWith('.png'));
  assert.equal(localPngFiles.length, payload.items.length);
});

await runTest('pwa build does not precache mirrored wrap png library', async () => {
  const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');

  assert.match(viteConfig, /globIgnores/);
  assert.match(viteConfig, /tsl-skins\/local-wraps/);
});
