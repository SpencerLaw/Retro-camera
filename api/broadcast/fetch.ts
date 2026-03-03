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

        // 1. Efficient Room Validation (Unified)
        let isValidRoom = false;

        // Optimized lookup if license is provided
        if (license) {
            const licPrefix = license.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
            const licenseData: any = await kv.get(`license:${licPrefix}`);
            if (licenseData) {
                const rooms = licenseData.r || licenseData.rooms || [];
                if (rooms.includes(cleanCode)) {
                    isValidRoom = true;
                }
            }
        }

        // Broad scan fallback only if not yet found (limited scope)
        if (!isValidRoom) {
            // Check legacy active room keys directly instead of scanning all licenses
            const legacyActiveKey = `br:lic:*:rm:${cleanCode}:act`;
            const keys = await kv.keys(legacyActiveKey);
            if (keys.length > 0) {
                isValidRoom = true;
            }
        }

        // Final safety fallback: check room index if it exists
        if (!isValidRoom) {
            const roomMeta: any = await kv.get(`br:room:${cleanCode}:meta`);
            if (roomMeta) isValidRoom = true;
        }

        if (!isValidRoom) {
            return response.status(404).json({ error: 'Room not found or inactive' });
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
