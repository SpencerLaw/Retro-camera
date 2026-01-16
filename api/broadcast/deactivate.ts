import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

/**
 * 停用房间号 API
 * 当老师删除班级时调用，从该授权码的房间列表中移除对应房间号
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, license } = req.body;

    if (!code || !license) {
        return res.status(400).json({ error: 'Missing code or license' });
    }

    try {
        const cleanCode = code.toUpperCase().trim();
        const cleanLicense = license.replace(/[-\s]/g, '').toUpperCase();

        // Key format: br:rooms:{LICENSE}
        const key = `br:rooms:${cleanLicense}`;

        // Get existing data
        const existing = await kv.get<{ rooms: string[], updatedAt: number }>(key);

        if (!existing || !existing.rooms) {
            // No data found, nothing to delete
            return res.status(200).json({ success: true, message: 'Room not found in active list' });
        }

        // Remove the room code from the array
        const updatedRooms = existing.rooms.filter(r => r !== cleanCode);

        if (updatedRooms.length === 0) {
            // If no rooms left, delete the entire key
            await kv.del(key);
        } else {
            // Update with remaining rooms
            await kv.set(key, {
                rooms: updatedRooms,
                updatedAt: Date.now()
            }, { ex: 60 * 60 * 24 * 30 });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Deactivate error:', error);
        return res.status(500).json({ error: 'Failed to deactivate room' });
    }
}
