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

        const licenseKey = `license:${cleanLicense}`;
        const data: any = await kv.get(licenseKey);

        if (data) {
            let rooms = data.r || data.rooms || [];

            // Delete active status and queued messages for all those rooms
            for (const roomCode of rooms) {
                const cleanCode = roomCode.toUpperCase().trim();
                await kv.del(`br:room_active:${cleanCode}`);
                await kv.del(`br:v2:room:${cleanCode}`);
            }

            if (data.d) {
                delete data.r;
            } else {
                delete data.rooms;
            }
            await kv.set(licenseKey, data);
        }

        // Delete the legacy separate rooms record
        await kv.del(`br:rooms:${cleanLicense}`);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ error: 'Failed to cleanup rooms' });
    }
}
