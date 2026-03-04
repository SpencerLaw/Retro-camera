import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import WebSocket from 'ws';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const url = req.url || '';
    let action = '';
    
    if (url.includes('/fetch')) action = 'fetch';
    else if (url.includes('/send')) action = 'send';
    else if (url.includes('/tts')) action = 'tts';
    else if (url.includes('/activate')) action = 'activate';
    else if (url.includes('/deactivate')) action = 'deactivate';
    else if (url.includes('/cleanup')) action = 'cleanup';

    if (!action) {
        const parts = url.split('?')[0].split('/').filter(Boolean);
        action = parts[parts.length - 1];
    }

    try {
        switch (action) {
            case 'tts': return handleTTS(req, res);
            case 'fetch': return handleFetch(req, res);
            case 'send': return handleSend(req, res);
            case 'activate': return handleActivate(req, res);
            case 'deactivate': return handleDeactivate(req, res);
            case 'cleanup': return handleCleanup(req, res);
            default: return res.status(404).json({ error: 'Unknown action: ' + action });
        }
    } catch (e: any) {
        console.error(`Action ${action} failed:`, e);
        return res.status(500).json({ error: e.message });
    }
}

async function handleTTS(req: VercelRequest, res: VercelResponse) {
    const { text, voice = 'zh-CN-XiaoxiaoNeural', rate = 1.0 } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const audioBuffer = await getEdgeTTS(text, voice, rate);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(audioBuffer);
}

async function handleFetch(req: VercelRequest, res: VercelResponse) {
    const code = (req.query.code as string)?.toUpperCase();
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const message = await kv.get(`br:v2:room:${code}`);
    return res.status(200).json({ message: message || null });
}

async function handleSend(req: VercelRequest, res: VercelResponse) {
    const { code, text, isEmergency, repeatCount, voice } = req.body;
    const messageId = Date.now().toString();
    const data = { id: messageId, text, isEmergency, timestamp: messageId, repeatCount: repeatCount || 1, voice };
    await kv.set(`br:v2:room:${code.toUpperCase()}`, data, { ex: 60 });
    return res.status(200).json({ success: true, messageId });
}

async function handleActivate(req: VercelRequest, res: VercelResponse) {
    const { code } = req.body;
    await kv.set(`br:room_active:${code.toUpperCase()}`, true, { ex: 86400 * 7 });
    return res.status(200).json({ success: true });
}

async function handleDeactivate(req: VercelRequest, res: VercelResponse) {
    const { code } = req.body;
    await kv.del(`br:v2:room:${code.toUpperCase()}`);
    return res.status(200).json({ success: true });
}

async function handleCleanup(req: VercelRequest, res: VercelResponse) {
    return res.status(200).json({ success: true });
}

async function getEdgeTTS(text: string, voice: string, rate: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID().replace(/-/g, '');
        const WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
        const ws = new WebSocket(WS_URL);
        const audioChunks: Buffer[] = [];
        const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 10000);
        ws.on('open', () => {
            const config = JSON.stringify({ context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" }, outputFormat: "audio-24khz-48kbitrate-mono-mp3" } } } });
            ws.send(`X-Timestamp:${new Date().toUTCString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);
            const ratePct = rate >= 1.0 ? `+${Math.round((rate - 1.0) * 100)}%` : `-${Math.round((1.0 - rate) * 100)}%`;
            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'><voice name='${voice}'><prosody rate='${ratePct}'>${text}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        });
        ws.on('message', (data, isBinary) => {
            if (isBinary) {
                const buffer = data as Buffer;
                const headerLen = buffer.readUInt16BE(0);
                if (buffer.slice(2, 2 + headerLen).toString().includes('Path:audio')) audioChunks.push(Buffer.from(buffer.slice(2 + headerLen)));
            } else if (data.toString().includes('Path:turn.end')) {
                clearTimeout(timeout); ws.close(); resolve(Buffer.concat(audioChunks));
            }
        });
        ws.on('error', reject);
    });
}
