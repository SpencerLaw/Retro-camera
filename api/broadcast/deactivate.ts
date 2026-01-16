import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, license } = req.body;

    if (!code || !license) {
        return res.status(400).json({ error: 'Missing code or license' });
    }

    try {
        // The code is already the room identifier (e.g., "0001", "0002")
        // We don't need to combine it with license
        const cleanCode = code.toUpperCase().trim();

        // Delete the v2 active key
        const activeKey = `br:v2:active:${cleanCode}`;
        await kv.del(activeKey);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Deactivate error:', error);
        return res.status(500).json({ error: 'Failed to deactivate room' });
    }
}
