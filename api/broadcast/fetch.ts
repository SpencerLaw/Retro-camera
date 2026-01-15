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

    if (!license) {
        return response.status(401).json({ error: '权限不足' });
    }

    if (!code) {
        return response.status(400).json({ error: '房间码不能为空' });
    }

    try {
        const licPrefix = license.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
        const key = `br:lic:${licPrefix}:rm:${code}:act`;

        const message = await kv.get(key);

        return response.status(200).json({ message: message || null });
    } catch (error: any) {
        console.error('Fetch error:', error);
        return response.status(500).json({ error: '获取失败: ' + error.message });
    }
}
