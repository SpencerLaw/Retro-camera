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

        // Key format: license:{LICENSE}
        const licenseKey = `license:${cleanLicense}`;
        const data: any = await kv.get(licenseKey);

        if (!data) {
            return res.status(200).json({ success: true, message: 'License record not found' });
        }

        const getRooms = (licData: any) => {
            if (licData.r) return licData.r;
            if (licData.rooms) return licData.rooms;
            return [];
        };

        let rooms = getRooms(data);
        const updatedRooms = rooms.filter((r: string) => r !== cleanCode);

        // Update the license object
        if (data.d) {
            data.r = updatedRooms;
        } else {
            data.rooms = updatedRooms;
        }

        await kv.set(licenseKey, data);

        // CLEANUP: If old separate key exists, remove it
        await kv.del(`br:rooms:${cleanLicense}`);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Deactivate error:', error);
        return res.status(500).json({ error: 'Failed to deactivate room' });
    }
}
