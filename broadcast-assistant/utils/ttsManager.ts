export type TTSEngine = 'native' | 'edge';

export interface TTSOptions {
    engine?: TTSEngine;
    voice?: string;
    rate?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
}

class TTSManager {
    private static instance: TTSManager;
    private audio: HTMLAudioElement | null = null;
    private audioCtx: AudioContext | null = null;
    private gainNode: GainNode | null = null;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private activePlaybackId: number = 0;

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
        if (!this.audioCtx && this.audio) {
            try {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                this.gainNode = this.audioCtx.createGain();
                this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
                this.sourceNode.connect(this.gainNode);
                this.gainNode.connect(this.audioCtx.destination);
            } catch (e) {
                console.warn('AudioContext init failed:', e);
            }
        }
    }

    public async speak(text: string, options: TTSOptions = {}): Promise<void> {
        this.stop(false); // Stop current but don't increment playback ID
        const playbackId = this.activePlaybackId;

        return new Promise(async (resolve) => {
            const onEnd = () => {
                if (options.onEnd) options.onEnd();
                resolve();
            };

            if (options.engine === 'edge') {
                try {
                    const blob = await this.fetchEdge(text, options);
                    if (blob && this.activePlaybackId === playbackId) {
                        const url = URL.createObjectURL(blob);
                        await this.playUrl(url, options, playbackId);
                        resolve();
                    } else {
                        resolve();
                    }
                } catch (e) {
                    if (this.activePlaybackId === playbackId) {
                        await this.speakNative(text, options);
                    }
                    resolve();
                }
            } else {
                await this.speakNative(text, options);
                resolve();
            }
        });
    }

    private async fetchEdge(text: string, options: TTSOptions): Promise<Blob | null> {
        const resp = await fetch('/api/broadcast/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: options.voice, rate: options.rate })
        });
        if (resp.ok) return await resp.blob();
        throw new Error('TTS Fetch Failed');
    }

    private playUrl(url: string, options: TTSOptions, playbackId: number): Promise<void> {
        return new Promise((resolve) => {
            if (!this.audio) return resolve();

            this.initAudioCtx();
            if (this.gainNode && options.volume) {
                this.gainNode.gain.setTargetAtTime(options.volume, this.audioCtx!.currentTime, 0.1);
            }

            const cleanup = () => {
                if (this.audio) {
                    this.audio.onended = null;
                    this.audio.onerror = null;
                }
                URL.revokeObjectURL(url);
                resolve();
            };

            this.audio.onended = cleanup;
            this.audio.onerror = cleanup;
            this.audio.src = url;
            this.audio.play().catch(cleanup);
        });
    }

    private speakNative(text: string, options: TTSOptions): Promise<void> {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) return resolve();
            window.speechSynthesis.cancel();

            const ut = new SpeechSynthesisUtterance(text);
            ut.rate = options.rate || 1;

            let timer: any = null;
            const cleanup = () => {
                if (timer) clearTimeout(timer);
                resolve();
            };

            ut.onend = cleanup;
            ut.onerror = cleanup;

            window.speechSynthesis.speak(ut);

            // 增加安全超时：基础 60s + 每个字符 200ms
            // 确保长句子（如100字+）有充足时间读完（通常约 30-40s）
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
        if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
    }
}

export const ttsManager = TTSManager.getInstance();
