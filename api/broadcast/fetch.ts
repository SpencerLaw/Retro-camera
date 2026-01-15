import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 班级广播获取接口 (授权隔离版)
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    const code = (request.query.code as string)?.toUpperCase();
    const license = request.query.license as string;

    if (!code) {
        return response.status(400).json({ error: '房间码不能为空' });
    }

    try {
        // V2: Try Global Pool First
        let key = `br:v2:room:${code}`;
        let message = await kv.get(key);

        // Fallback for V1 (in case some old sessions are still using it)
        if (!message && license) {
            const licPrefix = license.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
            const oldKey = `br:lic:${licPrefix}:rm:${code}:act`;
            message = await kv.get(oldKey);
        }

        return response.status(200).json({ message: message || null });
    } catch (error: any) {
        console.error('Fetch error:', error);
        return response.status(500).json({ error: '获取失败: ' + error.message });
    }
}
