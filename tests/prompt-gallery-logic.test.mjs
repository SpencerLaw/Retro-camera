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
  return import(pathToFileURL('components/promptGalleryLogic.js').href);
}

const sampleImage = (id = 'img_1', repeat = 48) => ({
  id,
  name: `${id}.webp`,
  dataUrl: `data:image/webp;base64,${'a'.repeat(repeat)}`,
  width: 640,
  height: 480,
  size: repeat,
});

await runTest('prompt gallery normalizes text fields tags and max five images', async () => {
  const {
    normalizePromptGalleryEntry,
    PROMPT_GALLERY_MAX_IMAGES,
  } = await loadLogicModule();

  const entry = normalizePromptGalleryEntry({
    title: '  复古相机广告  ',
    model: '  GPT Image 2 ',
    category: '  广告创意 ',
    prompt: '  cinematic product shot  ',
    negativePrompt: '  blurry  ',
    note: '  私藏模板  ',
    sourceUrl: '  https://example.com/case  ',
    tags: '复古，广告 product',
    images: Array.from({ length: 8 }, (_, index) => sampleImage(`img_${index + 1}`)),
  });

  assert.match(entry.id, /^prompt_/);
  assert.equal(entry.title, '复古相机广告');
  assert.equal(entry.model, 'GPT Image 2');
  assert.equal(entry.category, '广告创意');
  assert.equal(entry.prompt, 'cinematic product shot');
  assert.equal(entry.negativePrompt, 'blurry');
  assert.equal(entry.note, '私藏模板');
  assert.equal(entry.sourceUrl, 'https://example.com/case');
  assert.deepEqual(entry.tags, ['复古', '广告', 'product']);
  assert.equal(entry.images.length, PROMPT_GALLERY_MAX_IMAGES);
  assert.ok(entry.createdAt);
  assert.ok(entry.updatedAt);
});

await runTest('prompt gallery rejects invalid image data urls and oversized payloads', async () => {
  const {
    assertPromptGalleryEntryWithinLimits,
    normalizePromptGalleryEntry,
    PROMPT_GALLERY_MAX_TOTAL_IMAGE_BYTES,
  } = await loadLogicModule();

  const entry = normalizePromptGalleryEntry({
    title: '材质参考',
    prompt: 'macro product texture',
    images: [
      sampleImage('valid'),
      { ...sampleImage('svg'), dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
      { ...sampleImage('text'), dataUrl: 'hello' },
    ],
  });

  assert.equal(entry.images.length, 1);
  assert.doesNotThrow(() => assertPromptGalleryEntryWithinLimits(entry));

  const oversized = normalizePromptGalleryEntry({
    title: '超大图',
    prompt: 'large image set',
    images: [sampleImage('large', PROMPT_GALLERY_MAX_TOTAL_IMAGE_BYTES + 10)],
  });

  assert.throws(
    () => assertPromptGalleryEntryWithinLimits(oversized),
    /图片总体积过大/
  );
});

await runTest('prompt gallery summaries omit detail images but keep searchable metadata', async () => {
  const {
    buildPromptGallerySearchText,
    normalizePromptGalleryEntry,
    summarizePromptGalleryEntry,
  } = await loadLogicModule();

  const entry = normalizePromptGalleryEntry({
    title: '电影感海报',
    model: 'Nano Banana Pro',
    category: '海报',
    prompt: 'dramatic poster with warm rim light',
    negativePrompt: 'low quality',
    tags: ['电影感', 'poster'],
    coverImage: sampleImage('cover', 24).dataUrl,
    images: [sampleImage()],
  });
  const summary = summarizePromptGalleryEntry(entry);

  assert.equal(summary.id, entry.id);
  assert.equal(summary.title, '电影感海报');
  assert.equal(summary.imageCount, 1);
  assert.equal(summary.coverImage, entry.coverImage);
  assert.equal(summary.images, undefined);
  assert.equal(summary.prompt, undefined);
  assert.match(summary.promptPreview, /dramatic poster/);
  assert.match(buildPromptGallerySearchText(entry), /nano banana pro/);
  assert.match(buildPromptGallerySearchText(entry), /电影感/);
});

await runTest('prompt gallery filters paginates and sorts summaries by update time', async () => {
  const {
    filterPromptGallerySummaries,
    paginatePromptGallerySummaries,
    summarizePromptGalleryEntry,
  } = await loadLogicModule();

  const older = summarizePromptGalleryEntry({
    id: 'prompt_old',
    title: '旧广告',
    model: 'GPT Image 2',
    category: '广告',
    tags: ['product'],
    prompt: 'old product ad',
    negativePrompt: '',
    note: '',
    sourceUrl: '',
    coverImage: '',
    images: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  });
  const newer = summarizePromptGalleryEntry({
    id: 'prompt_new',
    title: '新海报',
    model: 'Nano Banana Pro',
    category: '海报',
    tags: ['poster'],
    prompt: 'fresh poster design',
    negativePrompt: '',
    note: '',
    sourceUrl: '',
    coverImage: '',
    images: [],
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-03T00:00:00.000Z',
  });

  const filtered = filterPromptGallerySummaries([older, newer], { query: 'poster', tag: 'poster' });
  assert.deepEqual(filtered.map(item => item.id), ['prompt_new']);

  const page = paginatePromptGallerySummaries([older, newer], { offset: 0, limit: 1 });
  assert.equal(page.total, 2);
  assert.equal(page.hasMore, true);
  assert.deepEqual(page.items.map(item => item.id), ['prompt_new']);
});
