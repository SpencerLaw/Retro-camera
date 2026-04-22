import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  JUZIMI_ADMIN_PASSWORD_HASH,
  normalizeJuzimiSentence,
  sanitizeJuzimiSentences,
} from '../components/juzimiLogic.js';

const JUZIMI_SENTENCES_KEY = 'juzimi:sentences';

const requireAdmin = (adminToken?: string) => (
  adminToken === (process.env.JUZIMI_ADMIN_HASH || JUZIMI_ADMIN_PASSWORD_HASH)
);

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { action, adminToken, data } = request.body || {};

  try {
    const current = sanitizeJuzimiSentences((await kv.get(JUZIMI_SENTENCES_KEY)) || []);

    if (action === 'list') {
      return response.status(200).json({ success: true, data: current });
    }

    if (!requireAdmin(adminToken)) {
      return response.status(401).json({ success: false, message: '管理员密码不正确' });
    }

    if (action === 'create') {
      const sentence = normalizeJuzimiSentence(data);
      if (!sentence.text) {
        return response.status(400).json({ success: false, message: '句子不能为空' });
      }
      const next = sanitizeJuzimiSentences([sentence, ...current]);
      await kv.set(JUZIMI_SENTENCES_KEY, next);
      return response.status(200).json({ success: true, data: next });
    }

    if (action === 'update') {
      const sentence = normalizeJuzimiSentence(data);
      if (!sentence.id || !sentence.text) {
        return response.status(400).json({ success: false, message: '句子内容不完整' });
      }
      const exists = current.some(item => item.id === sentence.id);
      const next = sanitizeJuzimiSentences(
        exists
          ? current.map(item => item.id === sentence.id ? { ...item, ...sentence } : item)
          : [sentence, ...current]
      );
      await kv.set(JUZIMI_SENTENCES_KEY, next);
      return response.status(200).json({ success: true, data: next });
    }

    if (action === 'delete') {
      const sentenceId = String(data?.id || '');
      const next = current.filter(item => item.id !== sentenceId);
      await kv.set(JUZIMI_SENTENCES_KEY, next);
      return response.status(200).json({ success: true, data: next });
    }

    return response.status(400).json({ success: false, message: '无效操作' });
  } catch (error: any) {
    console.error('Juzimi API Error:', error);
    return response.status(500).json({ success: false, message: '句子迷服务暂时不可用' });
  }
}
