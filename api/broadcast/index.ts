import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import WebSocket from 'ws';
import crypto from 'crypto';

// Assuming FISH_AUDIO_KEY is an environment variable or a constant
const FISH_AUDIO_KEY = process.env.FISH_AUDIO_KEY;

// === 授权码辅助逻辑 (同步自 verify-license) ===

function getEffectiveMaxDevices(code: string): number {
    const cleanCode = code.toUpperCase();
    if (cleanCode.startsWith('XXDK') || cleanCode.startsWith('XM')) return 999999;
    if (cleanCode.startsWith('GB')) return 5;
    return 5;
}

function extractDateFromCode(code: string): Date | null {
    try {
        let cleanCode = code.replace(/[-\s]/g, '').toUpperCase();
        if (cleanCode.startsWith('XXDK')) cleanCode = cleanCode.substring(4);
        else if (cleanCode.startsWith('ZY') || cleanCode.startsWith('DM') || cleanCode.startsWith('ZD') || cleanCode.startsWith('GB') || cleanCode.startsWith('XM')) cleanCode = cleanCode.substring(2);
        let year: number, month: number, day: number;
        if (cleanCode.startsWith('20') && cleanCode.length >= 8) {
            year = parseInt(cleanCode.substring(0, 4));
            month = parseInt(cleanCode.substring(4, 6)) - 1;
            day = parseInt(cleanCode.substring(6, 8));
        } else if (cleanCode.length >= 6) {
            year = 2000 + parseInt(cleanCode.substring(0, 2));
            month = parseInt(cleanCode.substring(2, 4)) - 1;
            day = parseInt(cleanCode.substring(4, 6));
        } else return null;
        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) { return null; }
}

function decompressMetadata(c: any, code: string): any {
    if (!c) return null;
    
    // Check if it's already full metadata (legacy)
    if ('devices' in c) {
        return c;
    }

    const genDate = extractDateFromCode(code) || new Date();
    const expDate = new Date(genDate); expDate.setFullYear(expDate.getFullYear() + 1);

    return {
        code,
        totalDevices: (c.d || []).length,
        maxDevices: c.m || getEffectiveMaxDevices(code),
        generatedDate: genDate.toISOString(),
        expiryDate: expDate.toISOString(),
        firstActivatedAt: new Date(c.f || Date.now()).toISOString(),
        lastUsedTime: new Date(c.l || Date.now()).toISOString(),
        devices: (c.d || []).map((dev: any) => ({ 
            deviceId: dev.i, 
            firstSeen: new Date(dev.f).toISOString(), 
            lastSeen: new Date(dev.l).toISOString(), 
            ua: dev.u 
        })),
        brc: c.brc,
        fu: c.fu,
        a: c.a
    };
}

function compressMetadata(full: any): any {
    return {
        m: full.maxDevices,
        f: new Date(full.firstActivatedAt || full.generatedDate).getTime(),
        l: new Date(full.lastUsedTime).getTime(),
        d: (full.devices || []).map((dev: any) => ({ i: dev.deviceId, f: new Date(dev.firstSeen).getTime(), l: new Date(dev.lastSeen).getTime(), u: dev.ua })),
        brc: full.brc,
        fu: full.fu,
        a: full.a
    };
}

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
    else if (url.includes('/fetch-fish-models')) action = 'fetch-fish-models';
    else if (url.includes('/fish-wallet')) action = 'fish-wallet';

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
            case 'fetch-fish-models': return handleFetchFishModels(req, res);
            case 'fish-wallet': return handleFishWallet(req, res);
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

async function findLicenseByRoom(roomCode: string): Promise<{ license: string, metadata: any } | null> {
    const keys = await kv.keys('license:*');
    if (keys.length === 0) return null;
    
    // Fetch all metadata in batches to find the owner
    const values = await kv.mget<any[]>(...keys);
    for (let i = 0; i < keys.length; i++) {
        const raw = values[i];
        if (!raw) continue;
        const code = keys[i].split(':')[1];
        const meta = decompressMetadata(raw, code);
        if (meta.a === roomCode) {
            return { license: code, metadata: meta };
        }
    }
    return null;
}

async function handleFetch(req: VercelRequest, res: VercelResponse) {
    const code = (req.query.code as string)?.toUpperCase();
    if (!code) return res.status(400).json({ error: 'Missing code' });

    // 1. Find owner via scan/mget
    const match = await findLicenseByRoom(code);
    if (!match) {
        return res.status(200).json({ message: null, notFound: true });
    }

    // 2. Get the current transient message (still ephemeral)
    const message = await kv.get(`br:msg:${code}`);
    return res.status(200).json({ message });
}

async function handleSend(req: VercelRequest, res: VercelResponse) {
    const { code, text, isEmergency, repeatCount, voice, channelName, license } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license context' });
    
    const cleanLicense = license.toUpperCase();
    const uppercaseCode = code.toUpperCase();
    const messageId = Date.now().toString();
    
    const messageData = {
        id: messageId,
        text,
        isEmergency,
        timestamp: messageId,
        repeatCount: repeatCount || 1,
        voice,
        channelName: channelName || '',
        license: cleanLicense
    };

    // Save transient message
    await kv.set(`br:msg:${uppercaseCode}`, messageData, { ex: 3600 }); // 1h TTL for messages
    
    return res.status(200).json({ success: true, messageId });
}

async function handleActivate(req: VercelRequest, res: VercelResponse) {
    const { code, license, brc } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license context' });
    
    const cleanLicense = license.toUpperCase();
    const uppercaseCode = code.toUpperCase();
    const redisKey = `license:${cleanLicense}`;

    // 1. Collision Prevention (串台保护)
    const existing = await findLicenseByRoom(uppercaseCode);
    if (existing && existing.license !== cleanLicense) {
        return res.status(409).json({ error: '该房间号已被其他授权码占用，请尝试其他号码' });
    }

    // 2. Sync to License Metadata
    const rawData = await kv.get(redisKey);
    if (rawData) {
        const metadata = decompressMetadata(rawData, cleanLicense);
        metadata.a = uppercaseCode; // Active room
        if (brc) metadata.brc = brc; // Update channels if provided
        await kv.set(redisKey, compressMetadata(metadata));
    }

    return res.status(200).json({ success: true });
}

async function handleDeactivate(req: VercelRequest, res: VercelResponse) {
    const { code, license } = req.body;
    const uppercaseCode = code?.toUpperCase();
    if (uppercaseCode) {
        // Only transient message is a separate key now
        await kv.del(`br:msg:${uppercaseCode}`);
        
        // Also clear from license metadata
        if (license) {
            const cleanLicense = license.toUpperCase();
            const redisKey = `license:${cleanLicense}`;
            const rawData = await kv.get(redisKey);
            if (rawData) {
                const metadata = decompressMetadata(rawData, cleanLicense);
                if (metadata.a === uppercaseCode) {
                    delete metadata.a;
                    await kv.set(redisKey, compressMetadata(metadata));
                }
            }
        }
    }
    return res.status(200).json({ success: true });
}

async function handleCleanup(req: VercelRequest, res: VercelResponse) {
    const { codes, license } = req.body;
    if (Array.isArray(codes) && codes.length > 0) {
        const uppercaseCodes = codes.map(c => c.toUpperCase());
        // Clean up transient messages
        await Promise.all(uppercaseCodes.map(c => kv.del(`br:msg:${c}`)));

        if (license) {
            const cleanLicense = license.toUpperCase();
            const redisKey = `license:${cleanLicense}`;
            const rawData = await kv.get(redisKey);
            if (rawData) {
                const metadata = decompressMetadata(rawData, cleanLicense);
                if (metadata.a && uppercaseCodes.includes(metadata.a)) {
                    delete metadata.a;
                    await kv.set(redisKey, compressMetadata(metadata));
                }
            }
        }
    }
    return res.status(200).json({ success: true });
}

async function handleGetChannels(req: VercelRequest, res: VercelResponse) {
    // Channels are now stored locally in the browser's localStorage
    return res.status(200).json({ channels: [] });
}

async function handleSaveChannels(req: VercelRequest, res: VercelResponse) {
    // We no longer sync channels to the cloud to save space
    return res.status(200).json({ success: true });
}

async function handleCheckCode(req: VercelRequest, res: VercelResponse) {
    const code = (req.query.code as string)?.toUpperCase();
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const match = await findLicenseByRoom(code);
    return res.status(200).json({ inUse: !!match });
}

async function handleClearLicenseData(req: VercelRequest, res: VercelResponse) {
    // Channels are already local, so we just return success
    return res.status(200).json({ success: true });
}

async function handleFishTTS(req: VercelRequest, res: VercelResponse) {
    const { text, reference_id, model, format = 'mp3', latency = 'balanced', license } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    // Quota Enforcement
    let metadata: any = null;
    let redisKey: string = '';
    if (license) {
        const cleanLicense = license.toUpperCase();
        redisKey = `license:${cleanLicense}`;
        if (cleanLicense.startsWith('GB')) {
            const rawData = await kv.get(redisKey);
            if (rawData) {
                metadata = decompressMetadata(rawData, cleanLicense);
                if ((metadata.fu || 0) >= 20) {
                    return res.status(403).json({
                        error: '鱼声配额已用完，请找管理员！',
                        quotaExceeded: true
                    });
                }
            }
        }
    }

    const FISH_KEYS = [
        'b3a18f1fd0724399b73f1861d31bef03', // Primary
        '975c5540684a4712bae3c6e4d91f22ac'  // Backup
    ];

    let lastError = null;

    for (const key of FISH_KEYS) {
        try {
            // Fish Audio V3 API typically uses /v1/tts and supports model names like "v3-turbo", "s1", etc.
            // If model is not provided, we can either default to "v1" or "v3-turbo"
            const requestModel = model || 'v3-turbo'; 
            
            const response = await fetch('https://api.fish.audio/v1/tts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    reference_id,
                    format,
                    model: requestModel,
                    latency
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // If it's a credit issue (402) or unauthorized (401), try next key
                if (response.status === 402 || response.status === 401) {
                    console.warn(`Fish Audio Key ${key.substring(0, 5)}... failed with ${response.status}. Trying next...`);
                    lastError = errorData.message || `HTTP ${response.status}`;
                    continue;
                }
                return res.status(response.status).json({ error: errorData.message || 'Fish Audio API Error' });
            }

            const audioBuffer = await response.arrayBuffer();

            // 成功后更新配额记录
            if (metadata && redisKey) {
                metadata.fu = (metadata.fu || 0) + 1;
                await kv.set(redisKey, compressMetadata(metadata));
            }

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.status(200).send(Buffer.from(audioBuffer));
        } catch (e: any) {
            lastError = e.message;
            continue;
        }
    }

    return res.status(500).json({ error: `All Fish Audio keys failed. Last error: ${lastError}` });
}

async function handleFetchFishModels(req: VercelRequest, res: VercelResponse) {
    const { tags, query, page_size = 20, page_number = 1 } = req.query;
    const url = new URL('https://api.fish.audio/model');
    if (tags) url.searchParams.append('tags', tags as string);
    if (query) url.searchParams.append('query', query as string);
    url.searchParams.append('page_size', String(page_size));
    url.searchParams.append('page_number', String(page_number));
    url.searchParams.append('sort_by', 'score');

    const FISH_KEYS = [
        'b3a18f1fd0724399b73f1861d31bef03',
        '975c5540684a4712bae3c6e4d91f22ac'
    ];

    for (const key of FISH_KEYS) {
        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${key}`,
                }
            });

            if (response.ok) {
                const data = await response.json();
                return res.status(200).json(data);
            }
        } catch (e) {
            console.error('Failed to fetch models for key', key.substring(0, 5));
        }
    }

    return res.status(500).json({ error: 'Failed to fetch models from all Fish Audio keys' });
}

async function handleFishWallet(req: VercelRequest, res: VercelResponse) {
    const FISH_KEYS = [
        'b3a18f1fd0724399b73f1861d31bef03',
        '975c5540684a4712bae3c6e4d91f22ac'
    ];

    let totalCredit = 0;
    let hasSuccess = false;

    // Summating balance or just trying to find one valid? 
    // Usually user wants to know if there's *any* money left. 
    // Let's just return the first one with money, or sum them if possible.
    // The fish API returns individual credit. Let's just try to find the first one that works
    // and maybe show a combined view for the debug tool.

    for (const key of FISH_KEYS) {
        try {
            const response = await fetch('https://api.fish.audio/wallet/self/api-credit', {
                headers: {
                    'Authorization': `Bearer ${key}`,
                }
            });

            if (response.ok) {
                const data = await response.json();
                totalCredit += (Number(data.credit) || 0);
                hasSuccess = true;
            }
        } catch (e) {
            console.error(`Failed to fetch wallet for key ${key.substring(0, 5)}...`, e);
        }
    }

    if (hasSuccess) {
        return res.status(200).json({ credit: totalCredit });
    } else {
        return res.status(500).json({ error: 'Failed to fetch wallet balance from all keys' });
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
