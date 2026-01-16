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

        // === SECURITY: Validate license before activation ===
        // 1. Check if license is in whitelist
        const validCodes = (process.env.LICENSE_CODES || '').split(',')
            .map(c => c.replace(/[-\s]/g, '').toUpperCase())
            .filter(c => c.length > 0);

        if (!validCodes.includes(cleanLicense)) {
            return response.status(401).json({
                error: 'Invalid or revoked license. Please contact administrator.'
            });
        }

        // 2. Check if license is expired
        const dateStr = cleanLicense.substring(2, 10); // Remove prefix (GB/ZY/etc)
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const generatedDate = new Date(year, month, day);

        if (isNaN(generatedDate.getTime())) {
            return response.status(401).json({ error: 'Invalid license format' });
        }

        const expiryDate = new Date(generatedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        if (new Date() > expiryDate) {
            return response.status(401).json({
                error: `License expired on ${expiryDate.toLocaleDateString()}`
            });
        }

        // === License is valid, proceed with activation ===
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
