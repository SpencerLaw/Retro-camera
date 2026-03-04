import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import WebSocket from 'ws';
import crypto from 'crypto';

/**
 * Unified Broadcast API Handler
 * Consolidates multiple functions to bypass Vercel Hobby limits (max 12 functions)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Determine action from URL path or query
    // Vercel rewrites /api/broadcast/:path* to /api/broadcast/index.ts
    const pathParts = req.url?.split('?')[0].split('/').filter(Boolean) || [];
    const action = pathParts[pathParts.length - 1];

    switch (action) {
        case 'tts':
            return handleTTS(req, res);
        case 'fetch':
            return handleFetch(req, res);
        case 'send':
            return handleSend(req, res);
        case 'activate':
            return handleActivate(req, res);
        case 'deactivate':
            return handleDeactivate(req, res);
        case 'cleanup':
            return handleCleanup(req, res);
        default:
            return res.status(404).json({ error: 'Action not found: ' + action });
    }
}

// --- Action Handlers ---

async function handleTTS(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { text, voice = 'zh-CN-XiaoxiaoNeural', rate = 1.0 } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    try {
        const audioBuffer = await getEdgeTTS(text, voice, rate);
        
        // Cache for 1 day to reduce load and prevent rapid re-fetching
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('Accept-Ranges', 'bytes');
        
        return res.status(200).send(audioBuffer);
    } catch (error: any) {
        console.error('TTS Synthesis failed:', error.message);
        return res.status(500).json({ error: 'TTS Synthesis failed: ' + error.message });
    }
}

async function handleFetch(req: VercelRequest, res: VercelResponse) {
    const code = (req.query.code as string)?.toUpperCase();
    const license = req.query.license as string;
    if (!code) return res.status(400).json({ error: '房间码不能为空' });

    try {
        const cleanCode = code.toUpperCase().trim();
        let isValidRoom = false;
        const isActive = await kv.get(`br:room_active:${cleanCode}`);
        if (isActive) isValidRoom = true;

        if (!isValidRoom && license) {
            const licPrefix = license.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
            const licenseData: any = await kv.get(`license:${licPrefix}`);
            if (licenseData && (licenseData.r || licenseData.rooms || []).includes(cleanCode)) {
                isValidRoom = true;
            }
        }

        if (!isValidRoom) {
            const keys = await kv.keys(`br:lic:*:rm:${cleanCode}:act`);
            if (keys.length > 0) isValidRoom = true;
        }

        if (!isValidRoom && await kv.get(`br:room:${cleanCode}:meta`)) isValidRoom = true;
        if (!isValidRoom) return res.status(404).json({ error: 'Room not found or inactive' });

        let key = `br:v2:room:${cleanCode}`;
        let message = await kv.get(key);
        if (!message && license) {
            const licPrefix = license.replace(/[-\s]/g, '').substring(0, 8).toUpperCase();
            message = await kv.get(`br:lic:${licPrefix}:rm:${cleanCode}:act`);
        }
        return res.status(200).json({ message: message || null });
    } catch (error: any) {
        return res.status(500).json({ error: '获取失败: ' + error.message });
    }
}

async function handleSend(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { code, text, isEmergency, license, repeatCount, channelName, voice } = req.body;
    if (!license) return res.status(401).json({ error: '未提供有效的授权码' });
    if (!code || (!text && !channelName)) return res.status(400).json({ error: '房间码和消息内容不能为空' });

    try {
        const messageId = Date.now().toString();
        const messageData = { id: messageId, text, isEmergency: !!isEmergency, timestamp: messageId, repeatCount: repeatCount ?? 1, channelName: channelName || '', voice: voice || null };
        const key = `br:v2:room:${code.toUpperCase().trim()}`;
        await kv.set(key, messageData, { ex: 60 });
        await kv.set(`br:room_active:${code.toUpperCase().trim()}`, true, { ex: 86400 * 7 });
        return res.status(200).json({ success: true, messageId });
    } catch (error: any) {
        return res.status(500).json({ error: '发送失败: ' + error.message });
    }
}

async function handleActivate(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { code, license } = req.body;
    if (!code || !license) return res.status(400).json({ error: 'Missing code or license' });

    try {
        const cleanCode = code.toUpperCase().trim();
        const cleanLicense = license.replace(/[-\s]/g, '').toUpperCase();
        const validCodes = (process.env.LICENSE_CODES || '').split(',').map(c => c.replace(/[-\s]/g, '').toUpperCase()).filter(c => c.length > 0);
        if (!validCodes.includes(cleanLicense)) return res.status(401).json({ error: 'Invalid or revoked license.' });

        const dateStr = cleanLicense.substring(2, 10);
        const generatedDate = new Date(parseInt(dateStr.substring(0, 4)), parseInt(dateStr.substring(4, 6)) - 1, parseInt(dateStr.substring(6, 8)));
        const expiryDate = new Date(generatedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        if (new Date() > expiryDate) return res.status(401).json({ error: `License expired on ${expiryDate.toLocaleDateString()}` });

        const licenseKey = `license:${cleanLicense}`;
        const data: any = await kv.get(licenseKey);
        if (!data) return res.status(404).json({ error: 'License data not found' });

        let rooms = data.r || data.rooms || [];
        if (!rooms.includes(cleanCode)) rooms.push(cleanCode);
        if (data.d) data.r = rooms; else data.rooms = rooms;
        data.l = Date.now();
        await kv.set(licenseKey, data);
        await kv.set(`br:room_active:${cleanCode}`, true, { ex: 86400 * 7 });
        await kv.del(`br:rooms:${cleanLicense}`);
        return res.status(200).json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}

async function handleDeactivate(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { code, license } = req.body;
    if (!code || !license) return res.status(400).json({ error: 'Missing code or license' });

    try {
        const cleanCode = code.toUpperCase().trim();
        const cleanLicense = license.replace(/[-\s]/g, '').toUpperCase();
        const licenseKey = `license:${cleanLicense}`;
        const data: any = await kv.get(licenseKey);
        if (!data) return res.status(200).json({ success: true });

        let rooms = data.r || data.rooms || [];
        const updatedRooms = rooms.filter((r: string) => r !== cleanCode);
        if (data.d) data.r = updatedRooms; else data.rooms = updatedRooms;
        await kv.set(licenseKey, data);
        await kv.del(`br:rooms:${cleanLicense}`);
        return res.status(200).json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to deactivate room' });
    }
}

async function handleCleanup(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { license } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license' });

    try {
        const cleanLicense = license.replace(/[-\s]/g, '').toUpperCase();
        const licenseKey = `license:${cleanLicense}`;
        const data: any = await kv.get(licenseKey);
        if (data) {
            let rooms = data.r || data.rooms || [];
            for (const roomCode of rooms) {
                const cleanCode = roomCode.toUpperCase().trim();
                await kv.del(`br:room_active:${cleanCode}`);
                await kv.del(`br:v2:room:${cleanCode}`);
            }
            if (data.d) delete data.r; else delete data.rooms;
            await kv.set(licenseKey, data);
        }
        await kv.del(`br:rooms:${cleanLicense}`);
        return res.status(200).json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to cleanup rooms' });
    }
}

// --- Utils ---

async function getEdgeTTS(text: string, voice: string, rate: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID().replace(/-/g, '');
        const WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
        const ws = new WebSocket(WS_URL, { headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' } });
        const audioChunks: Buffer[] = [];
        let isDone = false;
        const timeout = setTimeout(() => { if (!isDone) { isDone = true; ws.close(); reject(new Error('TTS Timeout')); } }, 15000);
        ws.on('open', () => {
            const config = JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" }, outputFormat: "audio-24khz-48kbitrate-mono-mp3" } } } });
            ws.send(`X-Timestamp:${new Date().toUTCString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);
            const ratePct = rate >= 1.0 ? `+${Math.round((rate - 1.0) * 100)}%` : `-${Math.round((1.0 - rate) * 100)}%`;
            let lang = voice.startsWith('zh-HK') ? 'zh-HK' : voice.startsWith('zh-TW') ? 'zh-TW' : 'zh-CN';
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${voice}'><prosody rate='${ratePct}'>${text}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        });
        ws.on('message', (data, isBinary) => {
            if (isBinary) {
                const buffer = data as Buffer;
                const headerLen = buffer.readUInt16BE(0);
                if (buffer.slice(2, 2 + headerLen).toString().includes('Path:audio')) audioChunks.push(Buffer.from(buffer.slice(2 + headerLen)));
            } else if (data.toString().includes('Path:turn.end')) {
                isDone = true; clearTimeout(timeout); ws.close();
                if (audioChunks.length > 0) resolve(Buffer.concat(audioChunks)); else reject(new Error('No audio data'));
            }
        });
        ws.on('error', (err) => { if (!isDone) { isDone = true; clearTimeout(timeout); reject(err); } });
        ws.on('close', () => { if (!isDone) { isDone = true; clearTimeout(timeout); if (audioChunks.length > 0) resolve(Buffer.concat(audioChunks)); else reject(new Error('WebSocket closed')); } });
    });
}
