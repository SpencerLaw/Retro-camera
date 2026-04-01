import { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';
import WebSocket from 'ws';
import crypto from 'crypto';
import {
    buildLicenseKey,
    buildRoomIndexMigrationStateKey,
    buildRoomMessageKey,
    buildRoomOwnerKey,
    buildRoomOwnerMissKey,
    collectRoomIndexEntries,
    createRoomIndexEntry,
    createRoomIndexTransition,
    extractActiveRoomCode,
    getConfiguredLicenseCodes,
    normalizeLicenseCode,
    normalizeRoomCode
} from '../shared/kv-keys.js';

// Assuming FISH_AUDIO_KEY is an environment variable or a constant
const FISH_AUDIO_KEY = process.env.FISH_AUDIO_KEY || 'b3a18f1fd0724399b73f1861d31bef03';
const ROOM_INDEX_MIGRATION_VERSION = 'v1';
const ROOM_INDEX_MIGRATION_CHECK_MS = 5 * 60 * 1000;

let roomIndexMigrationReady = false;
let roomIndexMigrationPromise: Promise<void> | null = null;
let roomIndexMigrationLastCheckAt = 0;

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

function buildRoomIndexMigrationState(configuredCodes: string[], stats: { migrated: number; skipped: number }) {
    return {
        version: ROOM_INDEX_MIGRATION_VERSION,
        configuredCodesSignature: configuredCodes.join(','),
        scanned: configuredCodes.length,
        migrated: stats.migrated,
        skipped: stats.skipped,
        migratedAt: new Date().toISOString()
    };
}

async function migrateConfiguredRoomIndexes(): Promise<{ scanned: number; migrated: number; skipped: number }> {
    const configuredCodes = getConfiguredLicenseCodes(process.env.LICENSE_CODES || '');
    const migrationStateKey = buildRoomIndexMigrationStateKey(ROOM_INDEX_MIGRATION_VERSION);

    if (configuredCodes.length === 0) {
        const state = buildRoomIndexMigrationState(configuredCodes, { migrated: 0, skipped: 0 });
        await kv.set(migrationStateKey, state);
        return { scanned: 0, migrated: 0, skipped: 0 };
    }

    const values = await kv.mget<any[]>(...configuredCodes.map(code => buildLicenseKey(code)));
    const records: Array<{ license: string; metadata: any }> = [];
    let skipped = 0;

    for (let index = 0; index < configuredCodes.length; index++) {
        const raw = values[index];
        if (!raw) {
            skipped++;
            continue;
        }

        records.push({
            license: configuredCodes[index],
            metadata: decompressMetadata(raw, configuredCodes[index])
        });
    }

    const entryResult = collectRoomIndexEntries(records);
    skipped += entryResult.skipped;

    await Promise.all(entryResult.entries.flatMap(entry => ([
        kv.set(entry.ownerKey, entry.license),
        kv.del(entry.missKey)
    ])));

    const state = buildRoomIndexMigrationState(configuredCodes, {
        migrated: entryResult.entries.length,
        skipped
    });
    await kv.set(migrationStateKey, state);

    return {
        scanned: configuredCodes.length,
        migrated: entryResult.entries.length,
        skipped
    };
}

async function ensureRoomIndexesMigrated() {
    if (roomIndexMigrationReady) return;
    if (roomIndexMigrationPromise) {
        await roomIndexMigrationPromise;
        return;
    }

    const now = Date.now();
    if (roomIndexMigrationLastCheckAt && now - roomIndexMigrationLastCheckAt < ROOM_INDEX_MIGRATION_CHECK_MS) {
        return;
    }

    roomIndexMigrationLastCheckAt = now;
    const configuredCodes = getConfiguredLicenseCodes(process.env.LICENSE_CODES || '');
    const expectedSignature = configuredCodes.join(',');
    const migrationStateKey = buildRoomIndexMigrationStateKey(ROOM_INDEX_MIGRATION_VERSION);

    roomIndexMigrationPromise = (async () => {
        try {
            const existingState = await kv.get<any>(migrationStateKey);
            if (existingState?.configuredCodesSignature === expectedSignature) {
                roomIndexMigrationReady = true;
                return;
            }

            await migrateConfiguredRoomIndexes();
            roomIndexMigrationReady = true;
        } finally {
            roomIndexMigrationPromise = null;
        }
    })();

    await roomIndexMigrationPromise;
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
    else if (url.includes('/migrate-room-indexes')) action = 'migrate-room-indexes';

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
            case 'migrate-room-indexes': return handleMigrateRoomIndexes(req, res);
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

async function findLegacyLicenseByRoom(roomCode: string): Promise<{ license: string, metadata: any } | null> {
    const keys = await kv.keys('license:*');
    if (keys.length === 0) return null;

    const values = await kv.mget<any>(...keys);
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

async function hydrateRoomOwner(roomCode: string, license: string) {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return;

    await Promise.all([
        kv.set(buildRoomOwnerKey(normalizedRoomCode), normalizeLicenseCode(license)),
        kv.del(buildRoomOwnerMissKey(normalizedRoomCode))
    ]);
}

async function clearRoomIndex(roomCode: string) {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return;

    await Promise.all([
        kv.del(buildRoomOwnerKey(normalizedRoomCode)),
        kv.del(buildRoomOwnerMissKey(normalizedRoomCode))
    ]);
}

async function markRoomOwnerMiss(roomCode: string) {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return;

    await kv.set(buildRoomOwnerMissKey(normalizedRoomCode), '1', { ex: 60 });
}

async function readIndexedRoomLookup(roomCode: string): Promise<{ roomCode: string; owner: string | null; knownMiss: boolean }> {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return { roomCode: '', owner: null, knownMiss: false };

    const values = await kv.mget<any[]>(
        buildRoomOwnerKey(normalizedRoomCode),
        buildRoomOwnerMissKey(normalizedRoomCode)
    );
    const [ownerRaw, missRaw] = values as [string | null, string | null];

    return {
        roomCode: normalizedRoomCode,
        owner: ownerRaw ? normalizeLicenseCode(ownerRaw) : null,
        knownMiss: !!missRaw
    };
}

async function readIndexedRoomState(roomCode: string): Promise<{ roomCode: string; owner: string | null; knownMiss: boolean; message: any | null }> {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return { roomCode: '', owner: null, knownMiss: false, message: null };

    const values = await kv.mget<any[]>(
        buildRoomOwnerKey(normalizedRoomCode),
        buildRoomOwnerMissKey(normalizedRoomCode),
        buildRoomMessageKey(normalizedRoomCode)
    );
    const [ownerRaw, missRaw, message] = values as [string | null, string | null, any | null];

    return {
        roomCode: normalizedRoomCode,
        owner: ownerRaw ? normalizeLicenseCode(ownerRaw) : null,
        knownMiss: !!missRaw,
        message: message ?? null
    };
}

async function backfillRoomOwnerFromLegacy(roomCode: string): Promise<string | null> {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!normalizedRoomCode) return null;

    const legacyMatch = await findLegacyLicenseByRoom(normalizedRoomCode);
    if (legacyMatch) {
        await hydrateRoomOwner(normalizedRoomCode, legacyMatch.license);
        return normalizeLicenseCode(legacyMatch.license);
    }

    await markRoomOwnerMiss(normalizedRoomCode);
    return null;
}

async function findRoomOwner(roomCode: string): Promise<string | null> {
    await ensureRoomIndexesMigrated();

    const lookup = await readIndexedRoomLookup(roomCode);
    if (lookup.owner) return lookup.owner;
    if (lookup.knownMiss) return null;
    return backfillRoomOwnerFromLegacy(lookup.roomCode || roomCode);
}

async function resolveRoomState(roomCode: string): Promise<{ roomCode: string; owner: string | null; knownMiss: boolean; message: any | null }> {
    await ensureRoomIndexesMigrated();

    const state = await readIndexedRoomState(roomCode);
    if (state.owner || state.knownMiss) return state;

    const owner = await backfillRoomOwnerFromLegacy(state.roomCode || roomCode);
    return {
        ...state,
        owner,
        knownMiss: !owner
    };
}

async function handleFetch(req: VercelRequest, res: VercelResponse) {
    const code = normalizeRoomCode((req.query.code as string) || '');
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const state = await resolveRoomState(code);
    if (!state.owner) {
        return res.status(200).json({ message: null, notFound: true });
    }

    return res.status(200).json({ message: state.message });
}

async function handleSend(req: VercelRequest, res: VercelResponse) {
    const { code, text, isEmergency, repeatCount, voice, channelName, license } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license context' });

    const cleanLicense = normalizeLicenseCode(license);
    const uppercaseCode = normalizeRoomCode(code);
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
    await kv.set(buildRoomMessageKey(uppercaseCode), messageData, { ex: 3600 }); // 1h TTL for messages

    return res.status(200).json({ success: true, messageId });
}

async function handleActivate(req: VercelRequest, res: VercelResponse) {
    const { code, license, brc } = req.body;
    if (!license) return res.status(400).json({ error: 'Missing license context' });

    const cleanLicense = normalizeLicenseCode(license);
    const uppercaseCode = normalizeRoomCode(code);
    const redisKey = buildLicenseKey(cleanLicense);

    const existingOwner = await findRoomOwner(uppercaseCode);
    if (existingOwner && existingOwner !== cleanLicense) {
        return res.status(409).json({ error: '该房间号已被其他授权码占用，请尝试其他号码' });
    }

    const rawData = await kv.get(redisKey);
    if (rawData) {
        const metadata = decompressMetadata(rawData, cleanLicense);
        const previousRoomCode = extractActiveRoomCode(metadata);
        metadata.a = uppercaseCode;
        if (brc) metadata.brc = brc;

        const transition = createRoomIndexTransition({
            license: cleanLicense,
            previousRoomCode,
            nextRoomCode: uppercaseCode
        });

        await kv.set(redisKey, compressMetadata(metadata));
        if (transition.cleanupOwnerKeys.length > 0) {
            await Promise.all(transition.cleanupOwnerKeys.map(key => kv.del(key)));
        }
        await Promise.all([
            kv.set(transition.ownerKey, cleanLicense),
            kv.del(transition.missKey)
        ]);
    }

    return res.status(200).json({ success: true });
}

async function handleDeactivate(req: VercelRequest, res: VercelResponse) {
    const { code, license } = req.body;
    const uppercaseCode = normalizeRoomCode(code || '');
    if (uppercaseCode) {
        await kv.del(buildRoomMessageKey(uppercaseCode));
        await clearRoomIndex(uppercaseCode);

        if (license) {
            const cleanLicense = normalizeLicenseCode(license);
            const redisKey = buildLicenseKey(cleanLicense);
            const rawData = await kv.get(redisKey);
            if (rawData) {
                const metadata = decompressMetadata(rawData, cleanLicense);
                if (extractActiveRoomCode(metadata) === uppercaseCode) {
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
        const uppercaseCodes = codes.map(c => normalizeRoomCode(c)).filter(Boolean);
        await Promise.all([
            ...uppercaseCodes.map(c => kv.del(buildRoomMessageKey(c))),
            ...uppercaseCodes.map(c => clearRoomIndex(c))
        ]);

        if (license) {
            const cleanLicense = normalizeLicenseCode(license);
            const redisKey = buildLicenseKey(cleanLicense);
            const rawData = await kv.get(redisKey);
            if (rawData) {
                const metadata = decompressMetadata(rawData, cleanLicense);
                const activeRoomCode = extractActiveRoomCode(metadata);
                if (activeRoomCode && uppercaseCodes.includes(activeRoomCode)) {
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
    const code = normalizeRoomCode((req.query.code as string) || '');
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const owner = await findRoomOwner(code);
    return res.status(200).json({ inUse: !!owner });
}

async function handleMigrateRoomIndexes(req: VercelRequest, res: VercelResponse) {
    const { adminKey } = req.body || {};
    if (!adminKey || adminKey.trim() !== 'spencer') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await migrateConfiguredRoomIndexes();
    roomIndexMigrationReady = true;
    roomIndexMigrationLastCheckAt = Date.now();

    return res.status(200).json({
        success: true,
        ...result
    });
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
        const cleanLicense = normalizeLicenseCode(license);
        redisKey = buildLicenseKey(cleanLicense);
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
