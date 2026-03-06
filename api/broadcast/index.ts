import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import WebSocket from 'ws';
import crypto from 'crypto';

// Assuming FISH_AUDIO_KEY is an environment variable or a constant
const FISH_AUDIO_KEY = process.env.FISH_AUDIO_KEY || 'b3a18f1fd0724399b73f1861d31bef03'; // Fallback to the key used in handleFishTTS if not set

// === 授权码辅助逻辑 (同步自 verify-license) ===

function getEffectiveMaxDevices(code: string): number {
    const cleanCode = code.toUpperCase();
    if (cleanCode.startsWith('XXDK') || cleanCode.startsWith('XM') || cleanCode.startsWith('GB')) return 999999;
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
    if (!c || 'devices' in c) return c;
    const genDate = extractDateFromCode(code) || new Date();
    const expDate = new Date(genDate); expDate.setFullYear(expDate.getFullYear() + 1);
    return {
        code,
        totalDevices: c.d.length,
        maxDevices: getEffectiveMaxDevices(code),
        generatedDate: genDate.toISOString(),
        expiryDate: expDate.toISOString(),
        firstActivatedAt: new Date(c.f).toISOString(),
        lastUsedTime: c.l ? new Date(c.l).toISOString() : new Date().toISOString(),
        devices: c.d.map((dev: any) => ({ deviceId: dev.i, firstSeen: new Date(dev.f).toISOString(), lastSeen: new Date(dev.l).toISOString(), ua: dev.u })),
        brChannels: c.brc || [],
        fishUsage: c.fu || 0
    };
}

function compressMetadata(full: any): any {
    return {
        m: full.maxDevices,
        f: new Date(full.firstActivatedAt || full.generatedDate).getTime(),
        l: new Date(full.lastUsedTime).getTime(),
        d: full.devices.map((dev: any) => ({ i: dev.deviceId, f: new Date(dev.firstSeen).getTime(), l: new Date(dev.lastSeen).getTime(), u: dev.ua })),
        brc: full.brChannels,
        fu: full.fishUsage
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
    const license = (req.query.license as string)?.toUpperCase();
    if (!license) return res.status(400).json({ error: 'Missing license' });

    // 从主授权记录读取频道建议
    const data = await kv.get(`license:${license}`);
    if (!data) return res.status(200).json({ channels: [] });

    const meta = decompressMetadata(data, license);
    return res.status(200).json({ channels: meta.brChannels || [] });
}

async function handleSaveChannels(req: VercelRequest, res: VercelResponse) {
    const { license, channels } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license' });
    const cleanLicense = license.toUpperCase();

    // 合并存储到主记录
    const data = await kv.get(`license:${cleanLicense}`);
    if (!data) return res.status(404).json({ error: 'License not found' });

    const meta = decompressMetadata(data, cleanLicense);
    meta.brChannels = channels;
    await kv.set(`license:${cleanLicense}`, compressMetadata(meta));

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
    const cleanLicense = license.toUpperCase();

    // 1. Get current metadata to know which rooms to clean up
    const data = await kv.get(`license:${cleanLicense}`);
    if (data) {
        const meta = decompressMetadata(data, cleanLicense);
        if (meta.brChannels && Array.isArray(meta.brChannels)) {
            const keysToDelete = meta.brChannels.flatMap((c: any) => [
                `br:room_active:${c.code.toUpperCase()}`,
                `br:v2:room:${c.code.toUpperCase()}`
            ]);
            if (keysToDelete.length > 0) {
                await Promise.all(keysToDelete.map(k => kv.del(k)));
            }
        }
        // 清空频道列表
        meta.brChannels = [];
        await kv.set(`license:${cleanLicense}`, compressMetadata(meta));
    }

    return res.status(200).json({ success: true });
}

async function handleFishTTS(req: VercelRequest, res: VercelResponse) {
    const { text, reference_id, model = 's1', format = 'mp3', license } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    // Quota Enforcement
    let currentMeta: any = null;
    if (license) {
        const cleanLicense = license.toUpperCase();
        if (cleanLicense.startsWith('GB')) {
            const data = await kv.get(`license:${cleanLicense}`);
            if (data) {
                currentMeta = decompressMetadata(data, cleanLicense);
                const usage = currentMeta.fishUsage || 0;

                if (usage >= 20) {
                    return res.status(403).json({
                        error: '鱼声配额已用完，请找管理员！',
                        quotaExceeded: true
                    });
                }
                // 后续如果成功则在下面更新
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
                    model
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

            // 成功后更新配额记录到 License 主键
            if (currentMeta) {
                currentMeta.fishUsage = (currentMeta.fishUsage || 0) + 1;
                await kv.set(`license:${license.toUpperCase()}`, compressMetadata(currentMeta));
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
