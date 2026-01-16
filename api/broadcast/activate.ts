import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 激活/报备房间号 API
 * 教师端调用，证明该房间号存在且活跃。
 * 
 * 数据结构：
 * 键：br:rooms:{LICENSE_CODE}
 * 值：{ rooms: ["0001", "0002"], updatedAt: timestamp }
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { code, license } = request.body;

    if (!code || !license) {
        return response.status(400).json({ error: 'Missing code or license' });
    }

    try {
        const cleanCode = code.toUpperCase().trim();
        const cleanLicense = license.replace(/[-\s]/g, '').toUpperCase();

        // Key format: br:rooms:{LICENSE}
        const key = `br:rooms:${cleanLicense}`;

        // Get existing data
        const existing = await kv.get<{ rooms: string[], updatedAt: number }>(key);

        let rooms: string[] = [];
        if (existing && existing.rooms) {
            rooms = existing.rooms;
        }

        // Add room code if not already present
        if (!rooms.includes(cleanCode)) {
            rooms.push(cleanCode);
        }

        // Save with 30-day expiration
        await kv.set(key, {
            rooms: rooms,
            updatedAt: Date.now()
        }, { ex: 60 * 60 * 24 * 30 });

        return response.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Activate error:', error);
        return response.status(500).json({ error: error.message });
    }
}
