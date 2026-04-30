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
      return response.status(200).json({ success: true, data: entry });
    }

    if (!requireAdmin(adminToken)) {
      return response.status(401).json({ success: false, message: '管理员密码不正确' });
    }

    if (action === 'create' || action === 'update') {
      const index = await readIndex();
      const entryId = String(data?.id || '').trim();
      const existing = entryId ? await kv.get(promptGalleryEntryKey(entryId)) : null;
      const now = new Date().toISOString();
      const entry = normalizePromptGalleryEntry({
        ...(existing || {}),
        ...(data || {}),
        createdAt: data?.createdAt || (existing as any)?.createdAt || now,
        updatedAt: now,
      });

      if (!entry.prompt.trim()) {
        return response.status(400).json({ success: false, message: '提示词不能为空' });
      }

      assertPromptGalleryEntryWithinLimits(entry);

      const summary = summarizePromptGalleryEntry(entry);
      const nextIndex = sortPromptGallerySummaries(
        index.some(item => item.id === entry.id)
          ? index.map(item => item.id === entry.id ? summary : item)
          : [summary, ...index]
      );

      await kv.set(promptGalleryEntryKey(entry.id), entry);
      await writeIndex(nextIndex);
      return response.status(200).json({ success: true, data: { entry, list: nextIndex } });
    }

    if (action === 'delete') {
      const entryId = String(data?.id || '').trim();
      if (!entryId) {
        return response.status(400).json({ success: false, message: '提示词 ID 不能为空' });
      }
      const index = await readIndex();
      const nextIndex = index.filter(item => item.id !== entryId);
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
