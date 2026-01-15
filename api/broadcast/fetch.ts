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
        const cleanCode = code.toUpperCase().trim();

        // 1. Check if room is active/registered
        const activeKey = `br:v2:active:${cleanCode}`;
        const isActive = await kv.exists(activeKey);

        if (!isActive) {
            // Check legacy key just in case
            const legacyKeyPattern = `br:lic:*:rm:${cleanCode}:act`;
            const keys = await kv.keys(legacyKeyPattern);
            if (keys.length === 0) {
                return response.status(404).json({ error: 'Room not found or inactive' });
            }
        }

        // 2. Try Global Pool First
        let key = `br:v2:room:${cleanCode}`;
        let message = await kv.get(key);

        // Fallback for V1 (in case some old sessions are still using it)
        if (!message && license) {
            const licPrefix = license.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
            const oldKey = `br:lic:${licPrefix}:rm:${cleanCode}:act`;
            message = await kv.get(oldKey);
        }

        return response.status(200).json({ message: message || null });
    } catch (error: any) {
        console.error('Fetch error:', error);
        return response.status(500).json({ error: '获取失败: ' + error.message });
    }
}
