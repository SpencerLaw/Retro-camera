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
    private blobPool: Map<string, string> = new Map();

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
        this.stop();
        const playbackId = this.activePlaybackId;
        
        if (options.engine === 'edge') {
            try {
                const blob = await this.fetchEdge(text, options);
                if (blob && this.activePlaybackId === playbackId) {
                    const url = URL.createObjectURL(blob);
                    await this.playUrl(url, options, playbackId);
                }
            } catch (e) {
                if (this.activePlaybackId === playbackId) this.speakNative(text, options);
            }
        } else {
            this.speakNative(text, options);
        }
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

    private speakNative(text: string, options: TTSOptions) {
        if (!window.speechSynthesis) return options.onEnd?.();
        const ut = new SpeechSynthesisUtterance(text);
        ut.rate = options.rate || 1;
        ut.onend = () => options.onEnd?.();
        ut.onerror = () => options.onEnd?.();
        window.speechSynthesis.speak(ut);
    }

    public stop() {
        this.activePlaybackId++;
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    public cancelAll() {
        this.stop();
        this.blobPool.forEach(url => URL.revokeObjectURL(url));
        this.blobPool.clear();
    }

    public getActivePlaybackId() { return this.activePlaybackId; }

    public startSilentLoop() {
        // Reduced to minimal to prevent CPU spike
        if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
    }
}

export const ttsManager = TTSManager.getInstance();
