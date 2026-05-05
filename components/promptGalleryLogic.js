export const PROMPT_GALLERY_ADMIN_PASSWORD_HASH = '17d3fc231a5c679f6904650d4cf0770e615106147f2de1c74b5ce9dd38e9c9ac';

export const PROMPT_GALLERY_MAX_IMAGES = 5;
export const PROMPT_GALLERY_MAX_IMAGE_BYTES = 950_000;
export const PROMPT_GALLERY_MAX_COVER_BYTES = 320_000;
export const PROMPT_GALLERY_MAX_TOTAL_IMAGE_BYTES = 6_500_000;
export const PROMPT_GALLERY_DEFAULT_LIMIT = 18;
export const PROMPT_GALLERY_MAX_LIMIT = 24;

const IMAGE_DATA_URL_PATTERN = /^data:image\/(webp|jpeg|jpg|png);base64,[a-z0-9+/=\s]+$/i;
const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;

export const emptyPromptGalleryEntry = {
  id: '',
  title: '',
  model: '',
  prompt: '',
  tags: [],
  coverImage: '',
  images: [],
  createdAt: '',
  updatedAt: '',
};

export const getDataUrlByteSize = (value = '') => (
  new TextEncoder().encode(String(value || '')).length
);

export const isAllowedPromptGalleryImage = (value = '') => (
  IMAGE_DATA_URL_PATTERN.test(String(value || '').trim())
  || IMAGE_URL_PATTERN.test(String(value || '').trim())
);

const isPromptGalleryDataUrl = (value = '') => (
  IMAGE_DATA_URL_PATTERN.test(String(value || '').trim())
);

const normalizeTags = (tags = []) => {
  const rawTags = Array.isArray(tags)
    ? tags
    : String(tags || '').split(/[，,\s]+/);

  return [...new Set(
    rawTags
      .map(tag => String(tag || '').trim())
      .filter(Boolean)
  )].slice(0, 12);
};

const normalizeImage = (image = {}, index = 0) => {
  const dataUrl = String(image.dataUrl || '').trim();
  const url = String(image.url || '').trim();
  if (!isAllowedPromptGalleryImage(dataUrl) && !isAllowedPromptGalleryImage(url)) return null;
  const thumbnail = String(image.thumbnail || '').trim();
  const thumbnailUrl = String(image.thumbnailUrl || '').trim();

  return {
    id: String(image.id || `image_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`),
    name: String(image.name || `image-${index + 1}.webp`).trim(),
    dataUrl: isPromptGalleryDataUrl(dataUrl) ? dataUrl : '',
    url: isAllowedPromptGalleryImage(url) ? url : '',
    thumbnail: isPromptGalleryDataUrl(thumbnail) ? thumbnail : '',
    thumbnailUrl: isAllowedPromptGalleryImage(thumbnailUrl) ? thumbnailUrl : '',
    width: Math.max(0, Number(image.width) || 0),
    height: Math.max(0, Number(image.height) || 0),
    size: Math.max(Number(image.size) || 0, isPromptGalleryDataUrl(dataUrl) ? getDataUrlByteSize(dataUrl) : 0),
    originalSize: Math.max(0, Number(image.originalSize) || 0),
  };
};

export const normalizePromptGalleryEntry = (entry = {}) => {
  const now = new Date().toISOString();
  const prompt = String(entry.prompt || '').trim();
  const titleInput = String(entry.title || '').trim();
  const title = titleInput || prompt.slice(0, 28).trim() || '未命名提示词';
  const images = (Array.isArray(entry.images) ? entry.images : [])
    .map(normalizeImage)
    .filter(Boolean)
    .slice(0, PROMPT_GALLERY_MAX_IMAGES);
  const coverImage = String(entry.coverImage || '').trim();

  return {
    ...emptyPromptGalleryEntry,
    id: String(entry.id || `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    title,
    model: String(entry.model || '').trim(),
    prompt,
    tags: normalizeTags(entry.tags),
    coverImage: isAllowedPromptGalleryImage(coverImage) ? coverImage : '',
    images,
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now,
  };
};

export const getPromptGalleryImageTotalBytes = (entry = {}) => (
  (entry.images || []).reduce((total, image) => (
    total
    + (isPromptGalleryDataUrl(image.dataUrl) ? getDataUrlByteSize(image.dataUrl) : 0)
    + (isPromptGalleryDataUrl(image.thumbnail) ? getDataUrlByteSize(image.thumbnail) : 0)
  ), 0)
);

export const assertPromptGalleryEntryWithinLimits = (entry = {}) => {
  const images = Array.isArray(entry.images) ? entry.images : [];
  if (images.length > PROMPT_GALLERY_MAX_IMAGES) {
    throw new Error(`最多只能上传 ${PROMPT_GALLERY_MAX_IMAGES} 张图片`);
  }

  const totalBytes = getPromptGalleryImageTotalBytes(entry);
  if (totalBytes > PROMPT_GALLERY_MAX_TOTAL_IMAGE_BYTES) {
    throw new Error('图片总体积过大，请降低图片尺寸或质量后再保存');
  }

  const oversizedImage = images.find(image => getDataUrlByteSize(image.dataUrl) > PROMPT_GALLERY_MAX_IMAGE_BYTES);
  if (oversizedImage) {
    throw new Error('单张图片过大，请重新压缩后再保存');
  }

  if (entry.coverImage && getDataUrlByteSize(entry.coverImage) > PROMPT_GALLERY_MAX_COVER_BYTES) {
    throw new Error('封面缩略图过大，请重新压缩后再保存');
  }
};

export const buildPromptGallerySearchText = (entry = {}) => (
  [
    entry.title,
    entry.model,
    entry.prompt,
    ...(entry.tags || []),
  ].join(' ').toLowerCase()
);

export const summarizePromptGalleryEntry = (entry = {}) => {
  const prompt = String(entry.prompt || '');
  return {
    id: String(entry.id || ''),
    title: String(entry.title || '未命名提示词'),
    model: String(entry.model || ''),
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    coverImage: String(entry.coverImage || ''),
    imageCount: Array.isArray(entry.images) ? entry.images.length : Number(entry.imageCount || 0),
    promptPreview: prompt.length > 120 ? `${prompt.slice(0, 120).trimEnd()}...` : prompt,
    searchText: entry.searchText || buildPromptGallerySearchText(entry),
    createdAt: entry.createdAt || '',
    updatedAt: entry.updatedAt || entry.createdAt || '',
  };
};

export const sortPromptGallerySummaries = (summaries = []) => (
  [...summaries].sort((a, b) => (
    new Date(b.updatedAt || b.createdAt || 0).getTime()
    - new Date(a.updatedAt || a.createdAt || 0).getTime()
  ))
);

export const filterPromptGallerySummaries = (summaries = [], options = {}) => {
  const query = String(options.query || '').trim().toLowerCase();
  const tag = String(options.tag || '').trim().toLowerCase();
  const model = String(options.model || '').trim().toLowerCase();

  return sortPromptGallerySummaries(summaries).filter(summary => {
    const matchesQuery = !query || String(summary.searchText || '').toLowerCase().includes(query);
    const matchesTag = !tag || (summary.tags || []).some(item => String(item).toLowerCase() === tag);
    const matchesModel = !model || String(summary.model || '').toLowerCase() === model;
    return matchesQuery && matchesTag && matchesModel;
  });
};

export const paginatePromptGallerySummaries = (summaries = [], options = {}) => {
  const offset = Math.max(0, Number(options.offset) || 0);
  const limit = Math.min(
    PROMPT_GALLERY_MAX_LIMIT,
    Math.max(1, Number(options.limit) || PROMPT_GALLERY_DEFAULT_LIMIT)
  );
  const sorted = sortPromptGallerySummaries(summaries);
  const items = sorted.slice(offset, offset + limit);

  return {
    items,
    total: sorted.length,
    offset,
    limit,
    hasMore: offset + items.length < sorted.length,
  };
};

export const sanitizePromptGalleryEntries = (entries = []) => (
  sortPromptGallerySummaries(
    entries
      .map(normalizePromptGalleryEntry)
      .filter(entry => entry.prompt.length > 0 || entry.images.length > 0)
  )
);
