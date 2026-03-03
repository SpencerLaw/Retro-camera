import { VercelRequest, VercelResponse } from '@vercel/node';
import WebSocket from 'ws';

/**
 * Server-side Edge TTS proxy.
 * The browser cannot connect to speech.platform.bing.com directly (blocked in China).
 * This endpoint accepts text + voice params, forwards to Microsoft Edge TTS via WebSocket,
 * collects the MP3 audio, and returns it to the client.
 */
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { text, voice, rate } = request.body as { text: string; voice?: string; rate?: number };

    if (!text || text.trim().length === 0) {
        return response.status(400).json({ error: 'text is required' });
    }

    const voiceName = voice || 'zh-CN-XiaoxiaoNeural';
    const rateNum = typeof rate === 'number' ? rate : 1.0;
    const rateStr = rateNum === 1.0 ? '+0%' : `${rateNum > 1 ? '+' : ''}${Math.round((rateNum - 1) * 100)}%`;

    // Determine xml:lang from voice locale prefix
    let lang = 'zh-CN';
    if (voiceName.startsWith('zh-HK')) lang = 'zh-HK';
    else if (voiceName.startsWith('zh-TW')) lang = 'zh-TW';

    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${voiceName}'><prosody rate='${rateStr}'>${text}</prosody></voice></speak>`;

    const WS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';

    try {
        const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
            const ws = new WebSocket(WS_URL);
            const chunks: Buffer[] = [];
            let settled = false;
            let timer: ReturnType<typeof setTimeout>;

            const finish = (err?: Error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                ws.terminate();
                if (err) reject(err);
                else if (chunks.length === 0) reject(new Error('No audio data received'));
                else resolve(Buffer.concat(chunks));
            };

            timer = setTimeout(() => {
                finish(chunks.length > 0 ? undefined : new Error('Edge TTS timeout'));
                if (chunks.length > 0 && !settled) {
                    settled = true;
                    clearTimeout(timer);
                    ws.terminate();
                    resolve(Buffer.concat(chunks));
                }
            }, 10000);

            ws.on('open', () => {
                const timestamp = new Date().toUTCString();
                const reqId = Date.now().toString(16);

                const config = JSON.stringify({
                    context: {
                        synthesis: {
                            audio: {
                                metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                                outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                            }
                        }
                    }
                });

                ws.send(`X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);
                ws.send(`X-RequestId:${reqId}\r\nX-Timestamp:${timestamp}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
            });

            ws.on('message', (data: Buffer, isBinary: boolean) => {
                if (!isBinary) {
                    // Text message
                    const text = data.toString('utf8');
                    if (text.includes('Path:turn.end')) {
                        finish();
                    }
                } else {
                    // Binary audio chunk
                    if (data.length < 2) return;
                    const headerLen = data.readUInt16BE(0);
                    if (data.length < 2 + headerLen) return;
                    const header = data.slice(2, 2 + headerLen).toString('utf8');
                    if (header.includes('Path:audio')) {
                        const audioData = data.slice(2 + headerLen);
                        if (audioData.length > 0) {
                            chunks.push(audioData);
                        }
                    }
                }
            });

            ws.on('error', (err) => finish(err));
            ws.on('close', () => {
                if (!settled) finish(chunks.length > 0 ? undefined : new Error('WebSocket closed without audio'));
            });
        });

        response.setHeader('Content-Type', 'audio/mpeg');
        response.setHeader('Content-Length', audioBuffer.length);
        response.setHeader('Cache-Control', 'no-store');
        return response.status(200).send(audioBuffer);

    } catch (err: any) {
        console.error('TTS proxy error:', err.message);
        return response.status(502).json({ error: 'Failed to synthesize speech', details: err.message });
    }
}
