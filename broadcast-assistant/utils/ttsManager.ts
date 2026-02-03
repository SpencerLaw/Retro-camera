export type TTSEngine = 'native' | 'edge' | 'fish';

export interface TTSOptions {
    engine: TTSEngine;
    voice?: string;
    rate?: number;
    pitch?: number;
    apiKey?: string;
    fishModelId?: string;
}

class TTSManager {
    private static instance: TTSManager;
    private audio: HTMLAudioElement | null = null;

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

        window.speechSynthesis.speak(utterance);
    }

    private async speakEdge(text: string, options: TTSOptions): Promise<void> {
        try {
            // Using a common public Edge TTS proxy (Vercel based)
            // You can replace this with your own deployment for more stability
            const voice = options.voice || 'zh-CN-XiaoxiaoNeural';
            const rate = options.rate ? `${Math.round((options.rate - 1) * 100)}%` : '0%';

            // Note: This is a widely used community endpoint pattern. 
            // In a production app, the user might want to provide their own proxy URL in settings.
            const url = `https://edge-tts.vercel.app/api/tts?text=${encodeURIComponent(text)}&voice=${voice}&rate=${rate}`;

            if (this.audio) {
                this.audio.src = url;
                await this.audio.play();
            }
        } catch (error) {
            console.error('Edge TTS failed, falling back to native:', error);
            this.speakNative(text, options);
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
}

export const ttsManager = TTSManager.getInstance();
