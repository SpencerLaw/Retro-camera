import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TIMOR_WRAP_API_ROOT = 'https://tesla.timor419.com/api/wrap';
const MRPROPER_SUPABASE_ROOT = 'https://gwhjdgbjcqbhhdwzrijk.supabase.co';
const MRPROPER_SUPABASE_KEY = 'sb_publishable_VIeBGELa247GRxB7IVJOxw_Quqw_lbY';
const TESLA_WRAP_COM_SUPABASE_ROOT = 'https://mehvzkfcitccchzpqyfd.supabase.co';
const TESLA_WRAP_COM_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laHZ6a2ZjaXRjY2NoenBxeWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTE1NDAsImV4cCI6MjA4MTY2NzU0MH0.eQHaBvXfve84vrYEvHXaFW2OEbgXvskSYR1y7iylOjE';
const LOCAL_WRAP_PUBLIC_BASE_PATH = '/tsl-skins/local-wraps';

export const SUPPORTED_REMOTE_MODEL_IDS = [
  'model3',
  'model3-2024-base',
  'modely',
  'modely-2025-base',
  'modely-2025-premium',
];

const DEFAULT_TESLA_WRAP_COM_MODEL_IDS = ['modely-2025-premium'];

const MODEL_ID_ALIASES = {
  model3: 'model3',
  'model3-2024-base': 'model3-2024-base',
  modely: 'modely',
  'modely-2025-base': 'modely-2025-base',
  'modely-2025-prem': 'modely-2025-premium',
  'modely-2025-premium': 'modely-2025-premium',
};

const CHARACTER_OR_IP_KEYWORDS = [
  'zootopia',
  '疯狂动物城',
  'pikachu',
  '皮卡丘',
  'pokemon',
  'pokémon',
  'hello kitty',
  'hellokitty',
  'labubu',
  '拉布布',
  '泡泡玛特',
  'pop mart',
  'spider',
  '蜘蛛侠',
  'iron man',
  '钢铁侠',
  'mcqueen',
  'lightning mcqueen',
  '乌萨奇',
  'usagi',
];

const BRAND_KEYWORDS = [
  'red bull',
  'red_bull',
  '麦当劳',
  'mcdonald',
  'lego',
  '乐高',
  '五月天',
  'mayday',
];

function cleanText(value) {
  return String(value || '').trim();
}

function normaliseModelId(modelId) {
  return MODEL_ID_ALIASES[cleanText(modelId).toLowerCase()] || null;
}

function isSupportedModelId(modelId) {
  return SUPPORTED_REMOTE_MODEL_IDS.includes(modelId);
}

function isHttpsImageUrl(value) {
  return /^https:\/\/.+\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(cleanText(value));
}

function buildSearchText(title, tags = []) {
  return [title, ...(Array.isArray(tags) ? tags : [])].join(' ').toLowerCase();
}

export function detectRiskTags(title, tags = []) {
  const searchText = buildSearchText(title, tags);
  const riskTags = [];

  if (CHARACTER_OR_IP_KEYWORDS.some((keyword) => searchText.includes(keyword.toLowerCase()))) {
    riskTags.push('疑似角色/IP');
  }

  if (BRAND_KEYWORDS.some((keyword) => searchText.includes(keyword.toLowerCase()))) {
    riskTags.push('疑似品牌/商标');
  }

  return riskTags;
}

export function buildRemoteWrapFileName(title, fallback = 'remote-wrap') {
  const baseName = cleanText(title)
    .replace(/\.png$/i, '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 46);

  return `${baseName || fallback}.png`;
}

function compactTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map(cleanText).filter(Boolean))].slice(0, 12);
}

function buildBaseRemoteWrap(rawItem, sourceConfig) {
  const title = cleanText(sourceConfig.title) || '未命名皮肤';
  const modelId = normaliseModelId(sourceConfig.modelId);
  if (!modelId || !isSupportedModelId(modelId)) {
    return null;
  }

  const imageUrl = cleanText(sourceConfig.imageUrl);
  const downloadUrl = cleanText(sourceConfig.downloadUrl) || imageUrl;
  if (!isHttpsImageUrl(imageUrl) || !isHttpsImageUrl(downloadUrl)) {
    return null;
  }

  const tags = compactTags(sourceConfig.tags);
  const riskTags = detectRiskTags(title, tags);

  return {
    id: `${sourceConfig.sourceId}-${sourceConfig.rawId}`,
    title,
    fileName: buildRemoteWrapFileName(title, `${sourceConfig.sourceId}-${sourceConfig.rawId}`),
    imageUrl,
    downloadUrl,
    modelIds: [modelId],
    sourceLabel: sourceConfig.sourceLabel,
    sourceName: sourceConfig.sourceName,
    sourcePageUrl: sourceConfig.sourcePageUrl,
    isRemote: true,
    isLocal: false,
    riskTags,
    tags,
    downloads: Number(sourceConfig.downloads || 0),
    likes: Number(sourceConfig.likes || 0),
    fileSize: Number(sourceConfig.fileSize || 0),
    author: cleanText(sourceConfig.author),
    createdAt: cleanText(sourceConfig.createdAt),
  };
}

export function normaliseTimorWrap(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const modelId = normaliseModelId(rawItem.vehicleModel);
  return buildBaseRemoteWrap(rawItem, {
    sourceId: 'timor',
    rawId: rawItem.id,
    title: rawItem.title,
    modelId,
    imageUrl: rawItem.previewUrl || rawItem.fileUrl || rawItem.imageUrl,
    downloadUrl: rawItem.fileUrl || rawItem.previewUrl || rawItem.imageUrl,
    tags: rawItem.tags,
    downloads: rawItem.downloadCount,
    fileSize: rawItem.fileSize,
    sourceLabel: '远程免费：贾维斯',
    sourceName: '贾维斯的TESLA',
    sourcePageUrl: modelId
      ? `https://tesla.timor419.com/wrap?model=${encodeURIComponent(modelId)}`
      : 'https://tesla.timor419.com/wrap',
  });
}

export function normaliseMrproperWrap(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const modelId = normaliseModelId(rawItem.car_model_id);
  return buildBaseRemoteWrap(rawItem, {
    sourceId: 'mrproper',
    rawId: rawItem.id,
    title: rawItem.title,
    modelId,
    imageUrl: rawItem.image_url,
    downloadUrl: rawItem.image_url,
    tags: rawItem.tags,
    downloads: rawItem.downloads,
    likes: rawItem.likes,
    author: rawItem.author,
    createdAt: rawItem.created_at,
    sourceLabel: '远程免费：社区画廊',
    sourceName: 'Tesla Wrap Studio',
    sourcePageUrl: 'https://tesla-wrap.mrproper.dev/gallery',
  });
}

export function normaliseTeslaWrapComWrap(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') {
    return null;
  }

  const modelId = normaliseModelId(rawItem.model_id);
  return buildBaseRemoteWrap(rawItem, {
    sourceId: 'teslawrap',
    rawId: rawItem.id,
    title: rawItem.title,
    modelId,
    imageUrl: rawItem.preview_image_url,
    downloadUrl: rawItem.preview_image_url,
    tags: [rawItem.description].filter(Boolean),
    downloads: rawItem.download_count,
    likes: rawItem.like_count,
    createdAt: rawItem.created_at,
    sourceLabel: '公开图库：特斯拉贴纸',
    sourceName: 'Tesla Wrap',
    sourcePageUrl: modelId
      ? `https://www.tesla-wrap.com/?model=${encodeURIComponent(modelId)}&sort=newest`
      : 'https://www.tesla-wrap.com/',
  });
}

export function buildFreeWrapIndexPayload({
  generatedAt = new Date().toISOString(),
  timorItems = [],
  mrproperItems = [],
  teslaWrapComItems = [],
}) {
  const seenUrls = new Set();
  const items = [...timorItems, ...mrproperItems, ...teslaWrapComItems]
    .filter(Boolean)
    .filter((item) => {
      const key = item.imageUrl.toLowerCase();
      if (seenUrls.has(key)) {
        return false;
      }
      seenUrls.add(key);
      return true;
    })
    .sort((a, b) => {
      const riskDelta = Number(a.riskTags.length > 0) - Number(b.riskTags.length > 0);
      if (riskDelta !== 0) {
        return riskDelta;
      }

      return (b.downloads + b.likes) - (a.downloads + a.likes);
    });

  return {
    generatedAt,
    sources: [
      {
        id: 'timor',
        label: '贾维斯的TESLA',
        url: 'https://tesla.timor419.com/wrap',
        mode: 'remote-index',
      },
      {
        id: 'mrproper',
        label: 'Tesla Wrap Studio',
        url: 'https://tesla-wrap.mrproper.dev/gallery',
        mode: 'remote-index',
      },
      {
        id: 'teslawrap',
        label: 'Tesla Wrap',
        url: 'https://www.tesla-wrap.com/',
        mode: 'remote-index',
      },
    ],
    supportedModelIds: SUPPORTED_REMOTE_MODEL_IDS,
    items,
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': 'RetroCamera TSL Skin index sync',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }

  return response.json();
}

export async function fetchTimorWraps({ pageSize = 100, maxPages = 20 } = {}) {
  const items = [];
  let totalPages = 1;

  for (let page = 1; page <= Math.min(totalPages, maxPages); page += 1) {
    const url = new URL(TIMOR_WRAP_API_ROOT);
    url.searchParams.set('sort', 'popular');
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));

    const payload = await fetchJson(url);
    items.push(...(payload.data || []).map(normaliseTimorWrap).filter(Boolean));
    totalPages = Number(payload.pagination?.totalPages || 1);
  }

  return items;
}

export async function fetchMrproperWraps({ limit = 1000 } = {}) {
  const url = new URL(`${MRPROPER_SUPABASE_ROOT}/rest/v1/wraps`);
  url.searchParams.set('select', 'id,title,author,car_model_id,image_url,likes,downloads,tags,created_at');
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', String(limit));

  const payload = await fetchJson(url, {
    headers: {
      apikey: MRPROPER_SUPABASE_KEY,
      Authorization: `Bearer ${MRPROPER_SUPABASE_KEY}`,
    },
  });

  return (Array.isArray(payload) ? payload : []).map(normaliseMrproperWrap).filter(Boolean);
}

export async function fetchTeslaWrapComWraps({
  modelIds = DEFAULT_TESLA_WRAP_COM_MODEL_IDS,
  pageSize = 1000,
  maxItemsPerModel = 5000,
} = {}) {
  const supportedModelIds = modelIds
    .map(normaliseModelId)
    .filter((modelId) => modelId && isSupportedModelId(modelId));
  const items = [];

  for (const modelId of supportedModelIds) {
    for (let offset = 0; offset < maxItemsPerModel; offset += pageSize) {
      const url = new URL(`${TESLA_WRAP_COM_SUPABASE_ROOT}/rest/v1/designs`);
      url.searchParams.set(
        'select',
        'id,title,description,model_id,preview_image_url,preview_thumbnail_url,like_count,download_count,created_at',
      );
      url.searchParams.set('published', 'eq.true');
      url.searchParams.set('visibility', 'eq.public');
      url.searchParams.set('model_id', `eq.${modelId}`);
      url.searchParams.set('order', 'created_at.desc');
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('offset', String(offset));

      const payload = await fetchJson(url, {
        headers: {
          apikey: TESLA_WRAP_COM_SUPABASE_KEY,
          Authorization: `Bearer ${TESLA_WRAP_COM_SUPABASE_KEY}`,
        },
      });
      const rows = Array.isArray(payload) ? payload : [];
      items.push(...rows.map(normaliseTeslaWrapComWrap).filter(Boolean));

      if (rows.length < pageSize) {
        break;
      }
    }
  }

  return items;
}

function getSourceIdFromWrap(item) {
  return cleanText(item.id).split('-')[0] || 'source';
}

function safePathSegment(value, fallback = 'asset') {
  const segment = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return segment || fallback;
}

export function buildLocalWrapAssetTarget(item, {
  publicRoot = 'public',
  publicBasePath = LOCAL_WRAP_PUBLIC_BASE_PATH,
} = {}) {
  const sourceId = safePathSegment(getSourceIdFromWrap(item), 'source');
  const modelId = safePathSegment(item.modelIds?.[0], 'unknown-model');
  const fileStem = safePathSegment(item.id, 'wrap');
  const publicPath = `${publicBasePath}/${sourceId}/${modelId}/${fileStem}.png`;
  const filePath = path.resolve(publicRoot, publicPath.replace(/^\//, '').split('/').join(path.sep));

  return { publicPath, filePath };
}

async function defaultFileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function getHeader(headers, name) {
  return typeof headers?.get === 'function' ? headers.get(name) : null;
}

async function mirrorSingleWrapAsset(item, {
  publicRoot,
  publicBasePath,
  generatedAt,
  fetchImpl,
  fileExists,
  writeFile,
  makeDirectory,
}) {
  const sourceUrl = item.downloadUrl || item.imageUrl;
  const { publicPath, filePath } = buildLocalWrapAssetTarget(item, { publicRoot, publicBasePath });

  if (!(await fileExists(filePath))) {
    const response = await fetchImpl(sourceUrl, {
      headers: {
        'User-Agent': 'RetroCamera TSL Skin asset mirror',
        Accept: 'image/png,image/*;q=0.8,*/*;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Image download failed ${response.status || ''}: ${sourceUrl}`);
    }

    const contentType = getHeader(response.headers, 'content-type') || '';
    if (contentType && !contentType.toLowerCase().startsWith('image/')) {
      throw new Error(`Not an image response: ${sourceUrl}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new Error(`Empty image response: ${sourceUrl}`);
    }

    await makeDirectory(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
  }

  return {
    ...item,
    originalImageUrl: item.originalImageUrl || item.imageUrl,
    originalDownloadUrl: item.originalDownloadUrl || item.downloadUrl || item.imageUrl,
    imageUrl: publicPath,
    downloadUrl: publicPath,
    isRemote: false,
    isLocal: true,
    mirroredAt: generatedAt,
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, items.length || 1));
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function mirrorSingleWrapAssetWithRetry(item, options) {
  const attempts = Math.max(1, Number(options.maxDownloadAttempts) || 1);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await mirrorSingleWrapAsset(item, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts && options.retryDelayMs > 0) {
        await sleep(options.retryDelayMs * attempt);
      }
    }
  }

  throw lastError;
}

export async function mirrorWrapAssetsForPayload(payload, {
  publicRoot = 'public',
  publicBasePath = LOCAL_WRAP_PUBLIC_BASE_PATH,
  generatedAt = new Date().toISOString(),
  concurrency = 5,
  maxDownloadAttempts = 3,
  retryDelayMs = 300,
  fetchImpl = fetch,
  fileExists = defaultFileExists,
  writeFile = fs.writeFile,
  makeDirectory = fs.mkdir,
} = {}) {
  const mirrorResults = await mapWithConcurrency(payload.items || [], concurrency, async (item) => {
    try {
      const mirroredItem = await mirrorSingleWrapAssetWithRetry(item, {
        publicRoot,
        publicBasePath,
        generatedAt,
        fetchImpl,
        fileExists,
        writeFile,
        makeDirectory,
        maxDownloadAttempts,
        retryDelayMs,
      });

      return { item: mirroredItem, error: null };
    } catch (error) {
      return {
        item: null,
        error: {
          id: item.id,
          title: item.title,
          sourceUrl: item.downloadUrl || item.imageUrl,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });
  const mirroredItems = mirrorResults.map((result) => result.item).filter(Boolean);
  const mirrorErrors = mirrorResults.map((result) => result.error).filter(Boolean);

  return {
    ...payload,
    mirroredAt: generatedAt,
    mirrorErrors,
    sources: (payload.sources || []).map((source) => ({ ...source, mode: 'local-mirror' })),
    items: mirroredItems,
  };
}

export async function syncFreeWrapIndex({
  outputPath = 'public/tsl-skins/free-wrap-index.json',
  generatedAt = new Date().toISOString(),
  mirrorAssets = true,
  mirrorConcurrency = 5,
  teslaWrapComModelIds = DEFAULT_TESLA_WRAP_COM_MODEL_IDS,
} = {}) {
  const [timorItems, mrproperItems, teslaWrapComItems] = await Promise.all([
    fetchTimorWraps(),
    fetchMrproperWraps(),
    fetchTeslaWrapComWraps({ modelIds: teslaWrapComModelIds }),
  ]);
  const remotePayload = buildFreeWrapIndexPayload({ generatedAt, timorItems, mrproperItems, teslaWrapComItems });
  const payload = mirrorAssets
    ? await mirrorWrapAssetsForPayload(remotePayload, {
      publicRoot: path.dirname(path.dirname(outputPath)),
      generatedAt,
      concurrency: mirrorConcurrency,
    })
    : remotePayload;
  const absoluteOutputPath = path.resolve(outputPath);

  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(absoluteOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    outputPath: absoluteOutputPath,
    totalItems: payload.items.length,
    riskItems: payload.items.filter((item) => item.riskTags.length > 0).length,
    mirroredItems: payload.items.filter((item) => item.isLocal === true).length,
    mirrorErrors: payload.mirrorErrors?.length || 0,
    sources: payload.sources.map((source) => source.id),
  };
}

function parseCliOptions(argv) {
  const options = {};

  argv.forEach((arg) => {
    if (arg === '--index-only') {
      options.mirrorAssets = false;
    } else if (arg === '--mirror') {
      options.mirrorAssets = true;
    } else if (arg.startsWith('--tesla-wrap-models=')) {
      const value = arg.split('=').slice(1).join('=');
      options.teslaWrapComModelIds = value === 'all'
        ? SUPPORTED_REMOTE_MODEL_IDS
        : value.split(',').map(cleanText).filter(Boolean);
    } else if (arg.startsWith('--concurrency=')) {
      options.mirrorConcurrency = Number(arg.split('=').at(-1)) || 5;
    }
  });

  return options;
}

async function main() {
  const result = await syncFreeWrapIndex(parseCliOptions(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(path.resolve(process.argv[1])).href) : '';
if (currentFile === invokedFile) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
