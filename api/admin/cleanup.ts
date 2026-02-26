import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

/**
 * 系统清理 API
 * 用于清理过期的、冗余的数据（如旧版 br:rooms:* 键）
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { adminKey, action } = req.body;

    // 简单密码保护
    if (!adminKey || adminKey.trim() !== 'spencer') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        if (action === 'cleanup_legacy_rooms') {
            // 扫描所有旧版广播房间键 br:rooms:*
            const keys = await kv.keys('br:rooms:*');
            let deletedCount = 0;

            if (keys.length > 0) {
                // 批量删除
                const deleted = await Promise.all(keys.map(key => kv.del(key)));
                deletedCount = deleted.reduce((a, b) => a + b, 0);
            }

            return res.status(200).json({
                success: true,
                message: `成功清理了 ${keys.length} 条旧版房间记录。`,
                count: deletedCount
            });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (error) {
        console.error('System cleanup error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
