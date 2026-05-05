import { del, put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  PROMPT_GALLERY_ADMIN_PASSWORD_HASH,
  assertPromptGalleryEntryWithinLimits,
  filterPromptGallerySummaries,
  normalizePromptGalleryEntry,
  paginatePromptGallerySummaries,
  sortPromptGallerySummaries,
  summarizePromptGalleryEntry,
} from '../components/promptGalleryLogic.js';

const PROMPT_GALLERY_INDEX_KEY = 'prompt-gallery:index';

const promptGalleryEntryKey = (entryId: string) => `prompt-gallery:entry:${entryId}`;

const requireAdmin = (adminToken?: string) => (
  adminToken === (process.env.PROMPT_GALLERY_ADMIN_HASH || PROMPT_GALLERY_ADMIN_PASSWORD_HASH)
);

const readIndex = async () => {
  const raw = await kv.get(PROMPT_GALLERY_INDEX_KEY);
  if (!Array.isArray(raw)) return [];
  return sortPromptGallerySummaries(
    raw
      .map(item => summarizePromptGalleryEntry(item || {}))
      .filter(item => item.id)
  );
};

const writeIndex = async (summaries: any[]) => {
  await kv.set(PROMPT_GALLERY_INDEX_KEY, sortPromptGallerySummaries(summaries));
};

const buildTags = (summaries: any[]) => (
  [...new Set(summaries.flatMap(summary => Array.isArray(summary.tags) ? summary.tags : []))]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'))
);

const buildModels = (summaries: any[]) => (
  [...new Set(summaries.map(summary => String(summary.model || '').trim()))]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'))
);

const dataUrlToBlobPayload = (dataUrl = '') => {
  const match = /^data:(image\/(?:webp|jpeg|jpg|png));base64,([\s\S]+)$/i.exec(String(dataUrl || '').trim());
  if (!match) return null;
  return {
    contentType: match[1].replace('image/jpg', 'image/jpeg'),
    body: Buffer.from(match[2].replace(/\s/g, ''), 'base64'),
  };
};

const blobExtensionFromContentType = (contentType = 'image/webp') => (
  contentType.includes('png') ? 'png' : contentType.includes('jpeg') ? 'jpg' : 'webp'
);

const persistPromptGalleryImages = async (entry: any) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return entry;

  const images = await Promise.all((entry.images || []).map(async (image: any, index: number) => {
    const detailPayload = dataUrlToBlobPayload(image.dataUrl);
    const thumbnailPayload = dataUrlToBlobPayload(image.thumbnail);
    const basePath = `prompt-gallery/${entry.id}/${Date.now()}-${index}`;
    const detailBlob = detailPayload
      ? await put(`${basePath}.${blobExtensionFromContentType(detailPayload.contentType)}`, detailPayload.body, {
        access: 'public',
        addRandomSuffix: true,
        contentType: detailPayload.contentType,
      })
      : null;
    const thumbnailBlob = thumbnailPayload
      ? await put(`${basePath}-thumb.${blobExtensionFromContentType(thumbnailPayload.contentType)}`, thumbnailPayload.body, {
        access: 'public',
        addRandomSuffix: true,
        contentType: thumbnailPayload.contentType,
      })
      : null;

    return {
      ...image,
      url: detailBlob?.url || image.url || '',
      thumbnailUrl: thumbnailBlob?.url || image.thumbnailUrl || '',
      dataUrl: detailBlob ? '' : image.dataUrl,
      thumbnail: thumbnailBlob ? '' : image.thumbnail,
    };
  }));

  return {
    ...entry,
    images,
    coverImage: images[0]?.thumbnailUrl || images[0]?.url || entry.coverImage,
  };
};

const deletePromptGalleryBlobs = async (entry: any) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const urls = (entry?.images || [])
    .flatMap((image: any) => [image.url, image.thumbnailUrl])
    .filter(Boolean);
  if (urls.length > 0) {
    await del(urls);
  }
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { action, adminToken, data } = request.body || {};

  try {
    if (action === 'list') {
      const index = await readIndex();
      const filtered = filterPromptGallerySummaries(index, {
        query: data?.query,
        tag: data?.tag,
        model: data?.model,
      });
      const page = paginatePromptGallerySummaries(filtered, {
        offset: data?.offset,
        limit: data?.limit,
      });
      return response.status(200).json({
        success: true,
        data: {
          ...page,
          tags: buildTags(index),
          models: buildModels(index),
        },
      });
    }

    if (action === 'detail') {
      const entryId = String(data?.id || '').trim();
      if (!entryId) {
        return response.status(400).json({ success: false, message: '提示词 ID 不能为空' });
      }
      const entry = await kv.get(promptGalleryEntryKey(entryId));
      if (!entry) {
        return response.status(404).json({ success: false, message: '没有找到这个提示词' });
      }
      return response.status(200).json({ success: true, data: normalizePromptGalleryEntry(entry) });
    }

    if (!requireAdmin(adminToken)) {
      return response.status(401).json({ success: false, message: '管理员密码不正确' });
    }

    if (action === 'create' || action === 'update') {
      const index = await readIndex();
      const entryId = String(data?.id || '').trim();
      const existing = entryId ? await kv.get(promptGalleryEntryKey(entryId)) : null;
      const existingEntry = existing && typeof existing === 'object' ? existing as Record<string, any> : {};
      const now = new Date().toISOString();
      const entry = normalizePromptGalleryEntry({
        ...existingEntry,
        ...(data || {}),
        createdAt: data?.createdAt || existingEntry.createdAt || now,
        updatedAt: now,
      });

      if (!entry.prompt.trim()) {
        return response.status(400).json({ success: false, message: '提示词不能为空' });
      }

      assertPromptGalleryEntryWithinLimits(entry);

      const persistedEntry = await persistPromptGalleryImages(entry);
      const summary = summarizePromptGalleryEntry(persistedEntry);
      const nextIndex = sortPromptGallerySummaries(
        index.some(item => item.id === persistedEntry.id)
          ? index.map(item => item.id === persistedEntry.id ? summary : item)
          : [summary, ...index]
      );

      await kv.set(promptGalleryEntryKey(entry.id), persistedEntry);
      await writeIndex(nextIndex);
      return response.status(200).json({ success: true, data: { entry: persistedEntry, list: nextIndex } });
    }

    if (action === 'delete') {
      const entryId = String(data?.id || '').trim();
      if (!entryId) {
        return response.status(400).json({ success: false, message: '提示词 ID 不能为空' });
      }
      const index = await readIndex();
      const existing = await kv.get(promptGalleryEntryKey(entryId));
      const nextIndex = index.filter(item => item.id !== entryId);
      await deletePromptGalleryBlobs(existing);
      await kv.del(promptGalleryEntryKey(entryId));
      await writeIndex(nextIndex);
      return response.status(200).json({ success: true, data: { list: nextIndex } });
    }

    return response.status(400).json({ success: false, message: '无效操作' });
  } catch (error: any) {
    console.error('Prompt Gallery API Error:', error);
    return response.status(500).json({ success: false, message: error.message || '提示词图库服务暂时不可用' });
  }
}
