export type TTSEngine = 'native' | 'edge' | 'fish';

export interface TTSOptions {
    engine: TTSEngine;
    voice?: string;
    rate?: number;
    pitch?: number;
    apiKey?: string;
    fishModelId?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onBoundary?: (charIndex: number) => void;
}

class TTSManager {
    private static instance: TTSManager;
    private audio: HTMLAudioElement | null = null;
    private silentAudio: HTMLAudioElement | null = null;
    private isSilentLoopPlaying: boolean = false;

    private constructor() {
        this.audio = new Audio();
    }

    public static getInstance(): TTSManager {
        if (!TTSManager.instance) {
            TTSManager.instance = new TTSManager();
        }
        return TTSManager.instance;
    }

    public async speak(text: string, options: TTSOptions): Promise<void> {
        // Stop current audio or speech
        this.stop();

        if (this.audio) {
            this.audio.onplay = () => {
                if (options.onStart) options.onStart();
                this.simulateBoundaries(text, options);
            };
            this.audio.onended = () => {
                this.clearBoundaryTimer();
                if (options.onEnd) options.onEnd();
            };
        }

        switch (options.engine) {
            case 'fish':
                await this.speakFish(text, options);
                break;
            case 'edge':
                await this.speakEdge(text, options);
                break;
            case 'native':
            default:
                this.speakNative(text, options);
                break;
        }
    }

    public stop(): void {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
    }

    private speakNative(text: string, options: TTSOptions): void {
        if (!window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;

        if (options.voice) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === options.voice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            if (options.onStart) options.onStart();
        };

        if (options.onBoundary) {
            utterance.onboundary = (event) => {
                if (options.onBoundary) options.onBoundary(event.charIndex);
            };
        }

        if (options.onEnd) {
            utterance.onend = () => {
                if (options.onEnd) options.onEnd();
            };
        }

        window.speechSynthesis.speak(utterance);
    }

    private async speakEdge(text: string, options: TTSOptions): Promise<void> {
        const proxies = [
            'https://edge-tts.vercel.app/api/tts',
            'https://tts.cy7.io/api/tts' // Potential fallback proxy
        ];

        let lastError: any = null;

        for (const proxyBase of proxies) {
            try {
                const voice = options.voice || 'zh-CN-YunxiNeural';
                const rate = options.rate ? `${Math.round((options.rate - 1) * 100)}%` : '0%';
                const url = `${proxyBase}?text=${encodeURIComponent(text)}&voice=${voice}&rate=${rate}`;

                if (this.audio) {
                    this.audio.src = url;
                    await this.audio.play();
                    return; // Success!
                }
            } catch (error) {
                lastError = error;
                console.warn(`Edge TTS proxy ${proxyBase} failed, trying next...`);
                continue;
            }
        }

        console.error('All Edge TTS proxies failed:', lastError);
        this.speakNative(text, options);
    }

    // Silent audio to keep the browser tab "audible" and prevent background suspension
    public startSilentLoop(): void {
        if (this.isSilentLoopPlaying) return;

        if (!this.silentAudio) {
            this.silentAudio = new Audio();
            // Tiny silent wav (1 pixel worth of silence)
            this.silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
            this.silentAudio.loop = true;
            this.silentAudio.volume = 0.01; // Extremely quiet but not zero
        }

        this.silentAudio.play().then(() => {
            this.isSilentLoopPlaying = true;
            console.log('Silent keep-alive loop started.');
        }).catch(err => {
            console.warn('Silent loop block by browser policy, will retry on next user interaction.', err);
        });
    }

    public stopSilentLoop(): void {
        if (this.silentAudio) {
            this.silentAudio.pause();
            this.isSilentLoopPlaying = false;
        }
    }

    private async speakFish(text: string, options: TTSOptions): Promise<void> {
        if (!options.apiKey) {
            console.error('Fish Audio API Key is missing');
            this.speakNative(text, options);
            return;
        }

        try {
            const response = await fetch('https://api.fish.audio/v1/tts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${options.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    reference_id: options.fishModelId || '7f92f8afb8ec43bf81f5059e09d961ce', // Default Fish voice
                    format: 'mp3',
                }),
            });

            if (!response.ok) throw new Error('Fish Audio API request failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (this.audio) {
                this.audio.src = url;
                await this.audio.play();
            }
        } catch (error) {
            console.error('Fish Audio failed, falling back to native:', error);
            this.speakNative(text, options);
        }
    }

    private boundaryTimer: NodeJS.Timeout | null = null;
    private clearBoundaryTimer() {
        if (this.boundaryTimer) {
            clearInterval(this.boundaryTimer);
            this.boundaryTimer = null;
        }
    }

    // Since Edge/Fish don't provide boundaries, we estimate for the "Lyrics" effect
    private simulateBoundaries(text: string, options: TTSOptions) {
        if (!options.onBoundary || options.engine === 'native') return;
        this.clearBoundaryTimer();

        let charIndex = 0;
        const rate = options.rate || 1.0;
        // Average Chinese reading speed is roughly 4-6 chars per second
        const msPerChar = 220 / rate;

        this.boundaryTimer = setInterval(() => {
            if (charIndex >= text.length) {
                this.clearBoundaryTimer();
                return;
            }
            // Update every word-ish or punctuation (simplified simulation)
            charIndex += 1;
            if (options.onBoundary) options.onBoundary(charIndex);
        }, msPerChar);
    }
}

export const ttsManager = TTSManager.getInstance();
