import { kv } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 激活/报备房间号 API
 * 教师端调用，证明该房间号存在且活跃。
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
        // Key format: br:v2:active:{CODE}
        // Value: License prefix (owner)
        // Expiration: 30 days (teacher just needs to open the app once a month to keep it alive)
        const key = `br:v2:active:${cleanCode}`;

        await kv.set(key, {
            license: license.substring(0, 8),
            updatedAt: Date.now()
        }, { ex: 60 * 60 * 24 * 30 });

        return response.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Activate error:', error);
        return response.status(500).json({ error: error.message });
    }
}
