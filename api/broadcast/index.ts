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
    else if (url.includes('/get-channels')) action = 'get-channels';
    else if (url.includes('/save-channels')) action = 'save-channels';
    else if (url.includes('/check-code')) action = 'check-code';
    else if (url.includes('/clear-license-data')) action = 'clear-license-data';
    else if (url.includes('/fish-tts')) action = 'fish-tts';

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
            case 'get-channels': return handleGetChannels(req, res);
            case 'save-channels': return handleSaveChannels(req, res);
            case 'check-code': return handleCheckCode(req, res);
            case 'clear-license-data': return handleClearLicenseData(req, res);
            case 'fish-tts': return handleFishTTS(req, res);
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

    // 检查房间是否处于活跃状态 (教师端 activate 才会创建此标记，cleanup 会清除)
    const isActive = await kv.get(`br:room_active:${code}`);
    if (!isActive) {
        return res.status(200).json({ message: null, notFound: true });
    }

    const message = await kv.get(`br:v2:room:${code}`);
    return res.status(200).json({ message: message || null });
}

async function handleSend(req: VercelRequest, res: VercelResponse) {
    const { code, text, isEmergency, repeatCount, voice, channelName } = req.body;
    const messageId = Date.now().toString();
    const data = {
        id: messageId,
        text,
        isEmergency,
        timestamp: messageId,
        repeatCount: repeatCount || 1,
        voice,
        channelName: channelName || ''
    };
    await kv.set(`br:v2:room:${code.toUpperCase()}`, data, { ex: 300 });
    return res.status(200).json({ success: true, messageId });
}

async function handleActivate(req: VercelRequest, res: VercelResponse) {
    const { code } = req.body;
    await kv.set(`br:room_active:${code.toUpperCase()}`, true, { ex: 86400 * 7 });
    return res.status(200).json({ success: true });
}

async function handleDeactivate(req: VercelRequest, res: VercelResponse) {
    const { code } = req.body;
    if (code) {
        const uppercaseCode = code.toUpperCase();
        await kv.del(`br:v2:room:${uppercaseCode}`);
        await kv.del(`br:room_active:${uppercaseCode}`);
    }
    return res.status(200).json({ success: true });
}

async function handleCleanup(req: VercelRequest, res: VercelResponse) {
    try {
        const { codes } = req.body;
        // 如果传入了具体需要清理的 roomCodes（数组），只清理它们；
        // 否则不执行全局扫描（避免删掉其他用户的房间），依靠 Redis 默认的 TTL（7天）自动回收垃圾
        let deleted = 0;
        if (Array.isArray(codes) && codes.length > 0) {
            const keysToDelete = codes.flatMap(c => [`br:room_active:${c.toUpperCase()}`, `br:v2:room:${c.toUpperCase()}`]);
            await Promise.all(keysToDelete.map(k => kv.del(k)));
            deleted = keysToDelete.length;
        }

        return res.status(200).json({ success: true, deleted });
    } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
    }
}

async function handleGetChannels(req: VercelRequest, res: VercelResponse) {
    const license = req.query.license as string;
    if (!license) return res.status(400).json({ error: 'Missing license' });
    const channels = await kv.get(`br:sync:channels:${license}`);
    return res.status(200).json({ channels: channels || [] });
}

async function handleSaveChannels(req: VercelRequest, res: VercelResponse) {
    const { license, channels } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license' });
    await kv.set(`br:sync:channels:${license}`, channels, { ex: 86400 * 30 }); // 30 days
    return res.status(200).json({ success: true });
}

async function handleCheckCode(req: VercelRequest, res: VercelResponse) {
    const code = (req.query.code as string)?.toUpperCase();
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const isActive = await kv.get(`br:room_active:${code}`);
    return res.status(200).json({ inUse: !!isActive });
}

async function handleClearLicenseData(req: VercelRequest, res: VercelResponse) {
    const { license } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license' });

    // 1. Get current channels to know which rooms to clean up
    const channels = await kv.get(`br:sync:channels:${license}`) as any[];
    if (channels && Array.isArray(channels)) {
        const keysToDelete = channels.flatMap(c => [
            `br:room_active:${c.code.toUpperCase()}`,
            `br:v2:room:${c.code.toUpperCase()}`
        ]);
        if (keysToDelete.length > 0) {
            await Promise.all(keysToDelete.map(k => kv.del(k)));
        }
    }

    // 2. Delete the sync list itself
    await kv.del(`br:sync:channels:${license}`);

    return res.status(200).json({ success: true });
}

async function handleFishTTS(req: VercelRequest, res: VercelResponse) {
    const { text, reference_id, model = 's1', format = 'mp3' } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    try {
        const response = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer b3a18f1fd0724399b73f1861d31bef03',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                reference_id,
                format,
                model
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: errorData.message || 'Fish Audio API Error' });
        }

        const audioBuffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.status(200).send(Buffer.from(audioBuffer));
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
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
