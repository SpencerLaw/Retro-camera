import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TIMOR_WRAP_API_ROOT = 'https://tesla.timor419.com/api/wrap';
const MRPROPER_SUPABASE_ROOT = 'https://gwhjdgbjcqbhhdwzrijk.supabase.co';
const MRPROPER_SUPABASE_KEY = 'sb_publishable_VIeBGELa247GRxB7IVJOxw_Quqw_lbY';

export const SUPPORTED_REMOTE_MODEL_IDS = [
  'model3',
  'model3-2024-base',
  'modely',
  'modely-2025-base',
  'modely-2025-premium',
];

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

export function buildFreeWrapIndexPayload({ generatedAt = new Date().toISOString(), timorItems = [], mrproperItems = [] }) {
  const seenUrls = new Set();
  const items = [...timorItems, ...mrproperItems]
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

export async function syncFreeWrapIndex({
  outputPath = 'public/tsl-skins/free-wrap-index.json',
  generatedAt = new Date().toISOString(),
} = {}) {
  const [timorItems, mrproperItems] = await Promise.all([
    fetchTimorWraps(),
    fetchMrproperWraps(),
  ]);
  const payload = buildFreeWrapIndexPayload({ generatedAt, timorItems, mrproperItems });
  const absoluteOutputPath = path.resolve(outputPath);

  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(absoluteOutputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    outputPath: absoluteOutputPath,
    totalItems: payload.items.length,
    riskItems: payload.items.filter((item) => item.riskTags.length > 0).length,
    sources: payload.sources.map((source) => source.id),
  };
}

async function main() {
  const result = await syncFreeWrapIndex();
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
