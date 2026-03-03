export type TTSEngine = 'native' | 'edge' | 'fish' | 'baidu';

export interface TTSOptions {
    engine: TTSEngine;
    voice?: string;
    rate?: number;
    pitch?: number;
    apiKey?: string;
    fishModelId?: string;
    volume?: number; // 1.0 to 2.5 (gain boost)
    onStart?: () => void;
    onEnd?: () => void;
    onBoundary?: (charIndex: number) => void;
}

class TTSManager {
    private static instance: TTSManager;
    private audio: HTMLAudioElement | null = null;
    private silentAudio: HTMLAudioElement | null = null;
    private isSilentLoopPlaying: boolean = false;
    private currentBlobUrl: string | null = null;
    private metaListener: (() => void) | null = null;
    private blobPool: Set<string> = new Set();

    // Web Audio API for volume boost
    private audioCtx: AudioContext | null = null;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private gainNode: GainNode | null = null;

    private constructor() {
        this.audio = new Audio();
    }

    public static getInstance(): TTSManager {
        if (!TTSManager.instance) {
            TTSManager.instance = new TTSManager();
        }
        return TTSManager.instance;
    }

    public async speak(text: string, options: TTSOptions = {}): Promise<void> {
        this.stop();
        this.startSilentLoop();

        return new Promise<void>(async (resolve) => {
            const extendedOptions = {
                ...options,
                onEnd: () => {
                    if (options.onEnd) options.onEnd();
                    resolve();
                }
            };

            try {
                switch (options.engine) {
                    case 'fish':
                        await this.speakFish(text, extendedOptions);
                        break;
                    case 'edge':
                        await this.speakEdge(text, extendedOptions);
                        break;
                    case 'baidu':
                        await this.speakBaiduPrimary(text, extendedOptions);
                        break;
                    case 'native':
                    default:
                        this.speakNative(text, extendedOptions);
                        break;
                }
            } catch (e) {
                console.error('TTS execution failed, trying native fallback:', e);
                this.speakNative(text, extendedOptions);
            }
        });
    }

    /**
     * Pre-fetches audio and returns a Blob URL.
     * Useful for zero-gap sequencing.
     */
    public async prefetch(text: string, options: TTSOptions): Promise<string | null> {
        if (options.engine === 'native' || options.engine === 'baidu') return null;

        try {
            let blob: Blob | null = null;
            if (options.engine === 'fish') blob = await this.fetchFishBlob(text, options);
            else blob = await this.fetchEdgeBlob(text, options);

            if (!blob) return null;
            const url = URL.createObjectURL(blob);
            this.blobPool.add(url);
            return url;
        } catch (e) {
            console.error('Prefetch failed:', e);
            return null;
        }
    }

    /**
     * Plays a previously prefetched Blob URL.
     */
    public async playBlob(url: string, text: string, options: TTSOptions): Promise<void> {
        this.stop();
        if (!this.audio) return;

        this.audio.onplay = () => {
            if (options.onStart) options.onStart();
            this.simulateBoundaries(text, options, this.audio!);
        };
        this.audio.onended = () => {
            this.clearBoundaryTimer();
            if (options.onEnd) options.onEnd();
        };

        this.currentBlobUrl = url;
        this.audio.src = url;

        // Initialize Web Audio API if a boost is requested
        if (options.volume && options.volume > 1.0) {
            this.setupAudioNodes(options.volume);
        } else if (this.gainNode) {
            // Reset to normal if no boost
            this.gainNode.gain.setTargetAtTime(1.0, this.audioCtx!.currentTime, 0.1);
        }

        await this.audio.play();
    }

    private setupAudioNodes(volumeBoost: number): void {
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                this.gainNode = this.audioCtx.createGain();
                this.sourceNode = this.audioCtx.createMediaElementSource(this.audio!);

                this.sourceNode.connect(this.gainNode);
                this.gainNode.connect(this.audioCtx.destination);
            }

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            // Set gain (clamped for safety)
            const gainValue = Math.min(2.5, Math.max(1.0, volumeBoost));
            this.gainNode!.gain.setTargetAtTime(gainValue, this.audioCtx.currentTime, 0.1);
        } catch (e) {
            console.warn('Web Audio API setup failed:', e);
        }
    }

    public stop(): void {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            // Remove lingering metadata listener if any
            if (this.metaListener) {
                this.audio.removeEventListener('loadedmetadata', this.metaListener);
                this.metaListener = null;
            }
        }
        this.clearBoundaryTimer();
        if (this.currentBlobUrl) {
            // We don't revoke immediately in stop() if it's part of the pool
            // but we ensure it's cleared from active playback.
            this.currentBlobUrl = null;
        }
    }

    /**
     * Clear all pooled blobs to free memory.
     */
    public clearPool(): void {
        this.blobPool.forEach(url => URL.revokeObjectURL(url));
        this.blobPool.clear();
    }

    private speakNative(text: string, options: TTSOptions): void {
        if (!window.speechSynthesis) {
            if (options.onEnd) options.onEnd();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;

        if (options.voice) {
            const voices = window.speechSynthesis.getVoices();
            // Try better matching for native voices
            let selectedVoice = voices.find(v => v.name === options.voice || v.name.includes(options.voice));

            // If it's a known male voice name but not found, try searching for any male voice
            if (!selectedVoice && (options.voice.toLowerCase().includes('yunxi') || options.voice.toLowerCase().includes('yunjian') || options.voice.toLowerCase().includes('kangkang'))) {
                selectedVoice = voices.find(v =>
                    (v.lang.startsWith('zh') || v.lang.startsWith('en')) &&
                    (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('kangkang') || v.name.toLowerCase().includes('jiayue'))
                );
            }

            if (selectedVoice) utterance.voice = selectedVoice;
        }

        // Native volume is 0.0 to 1.0, doesn't support boost > 1.0
        // But we set it to max if boost > 1.0
        utterance.volume = options.volume ? Math.min(1.0, options.volume) : 1.0;

        utterance.onstart = () => {
            if (options.onStart) options.onStart();
        };

        utterance.onboundary = (event) => {
            if (options.onBoundary) options.onBoundary(event.charIndex);
        };

        utterance.onend = () => {
            if (options.onEnd) options.onEnd();
        };

        utterance.onerror = () => {
            if (options.onEnd) options.onEnd();
        };

        window.speechSynthesis.speak(utterance);
    }

    private async fetchEdgeBlob(text: string, options: TTSOptions): Promise<Blob | null> {
        const proxies = [
            'https://edge-tts.vercel.app/api/tts',
            'https://tts.cy7.io/api/tts',
            'https://api.tts.me/edge'
        ];

        for (const proxyBase of proxies) {
            try {
                const voice = options.voice || 'zh-CN-XiaoxiaoNeural';
                const rate = options.rate ? `${Math.round((options.rate - 1) * 100)}%` : '0%';
                const url = `${proxyBase}?text=${encodeURIComponent(text)}&voice=${voice}&rate=${rate}`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for each proxy

                const resp = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (resp.ok) {
                    const blob = await resp.blob();
                    if (blob.size > 100) return blob; // Valid audio blob should have some size
                }
            } catch (error) {
                console.warn(`Edge fetch failed via ${proxyBase}`);
            }
        }
        return null;
    }

    private async speakBaiduPrimary(text: string, options: TTSOptions): Promise<void> {
        this.stop();
        if (!this.audio) return;

        const voiceStr = (options.voice || '').toLowerCase();
        const per = voiceStr.includes('yunxi') || voiceStr.includes('male') && !voiceStr.includes('female') ? 1 : 0;
        const url = `https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=5&per=${per}&text=${encodeURIComponent(text)}`;

        this.currentBlobUrl = url;
        this.audio.src = url;

        this.audio.onplay = () => {
            if (options.onStart) options.onStart();
            this.simulateBoundaries(text, options, this.audio!);
        };

        this.audio.onended = () => {
            this.clearBoundaryTimer();
            if (options.onEnd) options.onEnd();
        };

        this.audio.onerror = () => {
            console.error('Baidu TTS direct playback failed, falling back to Native');
            this.speakNative(text, options);
        };

        if (options.volume && options.volume > 1.0) {
            this.setupAudioNodes(options.volume);
        } else if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(1.0, this.audioCtx!.currentTime, 0.1);
        }

        try {
            await this.audio.play();
        } catch (e) {
            console.error('Baidu play error:', e);
            this.speakNative(text, options);
        }
    }

    private async speakEdge(text: string, options: TTSOptions): Promise<void> {
        let blob = await this.fetchEdgeBlob(text, options);

        // Secondary fallback: Baidu (Very stable for default male/female)
        if (!blob && options.voice?.includes('zh-CN')) {
            console.warn('Edge TTS failed, falling back to Baidu via direct Audio element playback');
            await this.speakBaiduPrimary(text, options);
            return;
        }

        if (blob) {
            const url = URL.createObjectURL(blob);
            this.blobPool.add(url);
            await this.playBlob(url, text, options);
        } else {
            console.error('All cloud TTS engines failed, falling back to native');
            this.speakNative(text, options);
        }
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

    private async fetchFishBlob(text: string, options: TTSOptions): Promise<Blob | null> {
        if (!options.apiKey) return null;
        const response = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${options.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                reference_id: options.fishModelId || '7f92f8afb8ec43bf81f5059e09d961ce',
                format: 'mp3',
            }),
        });
        return response.ok ? await response.blob() : null;
    }

    private async speakFish(text: string, options: TTSOptions): Promise<void> {
        const blob = await this.fetchFishBlob(text, options);
        if (blob) {
            const url = URL.createObjectURL(blob);
            this.blobPool.add(url);
            await this.playBlob(url, text, options);
        } else {
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

    // Since Edge/Fish don't provide native boundaries, we sync simulation to the actual audio duration
    private simulateBoundaries(text: string, options: TTSOptions, audioEl?: HTMLAudioElement) {
        if (!options.onBoundary || options.engine === 'native') return;
        this.clearBoundaryTimer();

        const startSimulation = (msPerChar: number) => {
            let charIndex = 0;
            this.boundaryTimer = setInterval(() => {
                if (charIndex >= text.length) {
                    this.clearBoundaryTimer();
                    return;
                }
                charIndex += 1;
                if (options.onBoundary) options.onBoundary(charIndex);
            }, msPerChar);
        };

        const el = audioEl || this.audio;

        // If audio has already loaded its metadata (duration is available), use it directly
        if (el && el.duration && isFinite(el.duration) && el.duration > 0) {
            // Use 92% of duration to ensure we don't outpace the audio
            const msPerChar = (el.duration * 1000 * 0.92) / text.length;
            startSimulation(msPerChar);
        } else if (el) {
            // Remove previous metadata listener if still waiting
            if (this.metaListener) {
                el.removeEventListener('loadedmetadata', this.metaListener);
            }

            // Wait for metadata to load, then compute the rate
            this.metaListener = () => {
                if (this.metaListener) {
                    el.removeEventListener('loadedmetadata', this.metaListener);
                    this.metaListener = null;
                }

                if (el.duration && isFinite(el.duration) && el.duration > 0) {
                    const msPerChar = (el.duration * 1000 * 0.92) / text.length;
                    startSimulation(msPerChar);
                } else {
                    // Fallback: safe conservative estimate (300ms/char ≈ 3.3 chars/sec)
                    const rate = options.rate || 1.0;
                    startSimulation(300 / rate);
                }
            };
            el.addEventListener('loadedmetadata', this.metaListener);
        } else {
            // Last resort fallback
            const rate = options.rate || 1.0;
            startSimulation(300 / rate);
        }
    }
}

export const ttsManager = TTSManager.getInstance();
