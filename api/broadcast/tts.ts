import { VercelRequest, VercelResponse } from '@vercel/node';
import WebSocket from 'ws';
import crypto from 'crypto';

/**
 * Edge TTS Proxy for Vercel Serverless
 * Based on Edge TTS WebSocket protocol
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text, voice = 'zh-CN-XiaoxiaoNeural', rate = 1.0 } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const audioBuffer = await getEdgeTTS(text, voice, rate);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        return res.status(200).send(audioBuffer);
    } catch (error: any) {
        console.error('TTS Error:', error);
        return res.status(500).json({ error: 'TTS Synthesis failed: ' + error.message });
    }
}

async function getEdgeTTS(text: string, voice: string, rate: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const requestId = crypto.randomUUID().replace(/-/g, '');
        const WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
        
        const ws = new WebSocket(WS_URL, {
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
            }
        });

        const audioChunks: Buffer[] = [];
        let isDone = false;

        const timeout = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                ws.close();
                reject(new Error('TTS Timeout'));
            }
        }, 15000);

        ws.on('open', () => {
            // 1. Send Config
            const config = JSON.stringify({
                context: {
                    synthesis: {
                        audio: {
                            metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
                            outputFormat: "audio-24khz-48kbitrate-mono-mp3"
                        }
                    }
                }
            });
            ws.send(`X-Timestamp:${new Date().toUTCString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);

            // 2. Send SSML
            const ratePct = rate >= 1.0 ? `+${Math.round((rate - 1.0) * 100)}%` : `-${Math.round((1.0 - rate) * 100)}%`;
            let lang = 'zh-CN';
            if (voice.startsWith('zh-HK')) lang = 'zh-HK';
            if (voice.startsWith('zh-TW')) lang = 'zh-TW';

            const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${voice}'><prosody rate='${ratePct}'>${text}</prosody></voice></speak>`;
            ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        });

        ws.on('message', (data, isBinary) => {
            if (isBinary) {
                const buffer = data as Buffer;
                const headerLen = buffer.readUInt16BE(0);
                const header = buffer.slice(2, 2 + headerLen).toString();
                if (header.includes('Path:audio')) {
                    audioChunks.push(Buffer.from(buffer.slice(2 + headerLen)));
                }
            } else {
                const message = data.toString();
                if (message.includes('Path:turn.end')) {
                    isDone = true;
                    clearTimeout(timeout);
                    ws.close();
                    if (audioChunks.length > 0) {
                        resolve(Buffer.concat(audioChunks));
                    } else {
                        reject(new Error('No audio data received'));
                    }
                }
            }
        });

        ws.on('error', (err) => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                reject(err);
            }
        });

        ws.on('close', () => {
            if (!isDone) {
                isDone = true;
                clearTimeout(timeout);
                if (audioChunks.length > 0) {
                    resolve(Buffer.concat(audioChunks));
                } else {
                    reject(new Error('WebSocket closed unexpectedly'));
                }
            }
        });
    });
}
