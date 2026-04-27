export type TTSEngine = 'native' | 'edge' | 'fish';

export interface TTSOptions {
    engine?: TTSEngine;
    voice?: string;
    rate?: number;
    volume?: number;
    license?: string;
    model?: string;
    onStart?: () => void;
    onEnd?: () => void;
}

class TTSManager {
    private static instance: TTSManager;
    private audio: HTMLAudioElement | null = null;
    private audioCtx: AudioContext | null = null;
    private activePlaybackId: number = 0;
    private activeUtterance: SpeechSynthesisUtterance | null = null;
    private audioUnlocked = false;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.audio = new Audio();
            this.audio.crossOrigin = "anonymous";
        }
    }

    public static getInstance(): TTSManager {
        if (!TTSManager.instance) TTSManager.instance = new TTSManager();
        return TTSManager.instance;
    }

    private initAudioCtx() {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.warn('AudioContext init failed:', e);
            }
        }
    }

    private createPlaybackBlockedError() {
        const error = new Error('Audio playback blocked by browser autoplay policy');
        (error as any).code = 'AUDIO_PLAYBACK_BLOCKED';
        return error;
    }

    public isPlaybackBlockedError(error: unknown) {
        return !!error && typeof error === 'object' && (error as any).code === 'AUDIO_PLAYBACK_BLOCKED';
    }

    public async unlockAudio(): Promise<boolean> {
        if (!this.audio) return false;
        this.initAudioCtx();

        try {
            if (this.audioCtx?.state === 'suspended') {
                await this.audioCtx.resume();
            }

            this.audio.muted = true;
            this.audio.volume = 0;
            this.audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==';
            await this.audio.play();
            this.audio.pause();
            this.audio.currentTime = 0;
            this.audio.muted = false;
            this.audio.volume = 1;
            this.audioUnlocked = true;
            return true;
        } catch (error) {
            this.audioUnlocked = false;
            return false;
        }
    }

    public async speak(text: string, options: TTSOptions = {}): Promise<void> {
        this.stop(false);
        const playbackId = this.activePlaybackId;

        if (options.engine === 'edge') {
            try {
                const blob = await this.fetchEdge(text, options);
                if (blob && this.activePlaybackId === playbackId) {
                    const url = URL.createObjectURL(blob);
                    await this.playUrl(url, options, playbackId);
                    options.onEnd?.();
                }
            } catch (error) {
                if (this.isPlaybackBlockedError(error)) throw error;
                if (this.activePlaybackId === playbackId) {
                    await this.speakNative(text, options);
                    options.onEnd?.();
                }
            }
            return;
        }

        if (options.engine === 'fish') {
            try {
                const blob = await this.fetchFish(text, options);
                if (blob && this.activePlaybackId === playbackId) {
                    const url = URL.createObjectURL(blob);
                    await this.playUrl(url, options, playbackId);
                    options.onEnd?.();
                }
            } catch (error) {
                if (this.isPlaybackBlockedError(error)) throw error;
                if (this.activePlaybackId === playbackId) {
                    await this.speakNative(text, options);
                    options.onEnd?.();
                }
            }
            return;
        }

        await this.speakNative(text, options);
        options.onEnd?.();
    }

    private async fetchEdge(text: string, options: TTSOptions): Promise<Blob | null> {
        const resp = await fetch('/api/broadcast/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: options.voice, rate: options.rate })
        });
        if (resp.ok) {
            const blob = await resp.blob();
            if (blob.size > 256) return blob;
        }
        throw new Error('TTS Fetch Failed');
    }

    private async fetchFish(text: string, options: TTSOptions): Promise<Blob | null> {
        // Voice is expected to be "fish:VoiceID" or just "VoiceID" here
        const voiceId = options.voice?.startsWith('fish:') ? options.voice.split(':')[1] : options.voice;
        const resp = await fetch('/api/broadcast/fish-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                reference_id: voiceId,
                format: 'mp3',
                model: options.model, // Let backend decide default if not provided
                license: options.license
            })
        });
        if (resp.ok) return await resp.blob();
        throw new Error('Fish TTS Fetch Failed');
    }

    private playUrl(url: string, options: TTSOptions, playbackId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.audio) return resolve();

            this.initAudioCtx();

            const cleanup = () => {
                if (this.audio) {
                    this.audio.onended = null;
                    this.audio.onerror = null;
                }
                URL.revokeObjectURL(url);
            };

            const finish = () => {
                cleanup();
                resolve();
            };

            this.audio.onended = finish;
            this.audio.onerror = () => finish();
            this.audio.src = url;
            this.audio.muted = false;
            this.audio.volume = typeof options.volume === 'number' ? options.volume : 1;
            this.audio.load();
            this.audio.play().catch((error) => {
                cleanup();
                if ((error as any)?.name === 'NotAllowedError' || !this.audioUnlocked) {
                    reject(this.createPlaybackBlockedError());
                    return;
                }
                reject(error);
            });
        });
    }

    private speakNative(text: string, options: TTSOptions): Promise<void> {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) return resolve();
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();

            const ut = new SpeechSynthesisUtterance(text);
            this.activeUtterance = ut; // Prevents garbage collection while playing
            ut.rate = options.rate || 1;
            ut.volume = typeof options.volume === 'number' ? options.volume : 1;

            let timer: any = null;
            let resumeInterval: any = null;

            const cleanup = () => {
                if (timer) clearTimeout(timer);
                if (resumeInterval) clearInterval(resumeInterval);
                if (this.activeUtterance === ut) this.activeUtterance = null;
                resolve();
            };

            ut.onend = cleanup;
            ut.onerror = (e) => {
                console.warn('Native TTS Error:', e);
                cleanup();
            };

            window.speechSynthesis.speak(ut);

            // 解决 Chrome/Edge 的 15 秒静音 bug：每 10 秒微调一下 pause/resume
            resumeInterval = setInterval(() => {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 10000);

            // 增加安全超时
            const timeout = Math.max(60000, 10000 + text.length * 200);
            timer = setTimeout(cleanup, timeout);
        });
    }

    public stop(incrementId: boolean = true) {
        if (incrementId) this.activePlaybackId++;
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    public cancelAll() {
        this.stop(true);
    }

    public getActivePlaybackId() { return this.activePlaybackId; }

    public startSilentLoop() {
        this.initAudioCtx();
        if (this.audioCtx?.state === 'suspended') {
            this.audioCtx.resume();
        }
    }
}

export const ttsManager = TTSManager.getInstance();
