import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

/**
 * 清理授权码的所有房间激活记录
 * 当用户退出登录或授权码被禁用时调用
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { license } = req.body;

    if (!license) {
        return res.status(400).json({ error: 'Missing license' });
    }

    try {
        const cleanLicense = license.replace(/[-\s]/g, '').toUpperCase();

        // Delete the entire license's room record
        const key = `br:rooms:${cleanLicense}`;
        await kv.del(key);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ error: 'Failed to cleanup rooms' });
    }
}
