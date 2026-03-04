export type TTSEngine = 'native' | 'edge' | 'fish';

export interface TTSOptions {
    engine?: TTSEngine;
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
    private blobPool: Map<string, string> = new Map(); // Map sentence to URL for better cleanup

    // Web Audio API for volume boost
    private audioCtx: AudioContext | null = null;
    private sourceNode: MediaElementAudioSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private activePlaybackId: number = 0;



    private constructor() {
        this.audio = new Audio();
    }

    public static getInstance(): TTSManager {
        if (!TTSManager.instance) {
            TTSManager.instance = new TTSManager();
        }
        return TTSManager.instance;
    }

    public async speak(text: string, options: Partial<TTSOptions> = {}): Promise<void> {
        console.log(`[BROADCAST-DEBUG] TTS speak start: "${text.substring(0, 30)}..."`, { engine: options.engine, playbackId: this.activePlaybackId });
        this.stop(false); 
        this.startSilentLoop();

        const playbackId = this.activePlaybackId;

        return new Promise<void>(async (resolve) => {
            let settled = false;
            const settle = () => {
                if (settled) return;
                settled = true;
                resolve();
            };

            // Safety timeout
            const timeout = setTimeout(() => {
                console.warn('TTS speak timeout for:', text.substring(0, 20));
                settle();
            }, 15000);

            const extendedOptions = {
                ...options,
                onEnd: () => {
                    clearTimeout(timeout);
                    if (options.onEnd) options.onEnd();
                    settle();
                }
            };

            try {
                if (this.activePlaybackId !== playbackId) { settle(); return; }

                switch (options.engine) {
                    case 'fish':
                        await this.speakFish(text, extendedOptions);
                        break;
                    case 'edge':
                        await this.speakEdge(text, extendedOptions, playbackId);
                        break;
                    case 'native':
                    default:
                        this.speakNative(text, extendedOptions);
                        break;
                }
            } catch (e) {
                console.error('TTS execution failed:', e);
                // On failure, wait a bit before settling to prevent rapid retry loops if the caller is in a loop
                setTimeout(() => {
                    if (this.activePlaybackId === playbackId) {
                        this.speakNative(text, extendedOptions);
                    } else {
                        settle();
                    }
                }, 500);
            }
        });
    }

    /**
     * Pre-fetches audio and returns a Blob URL.
     * Useful for zero-gap sequencing.
     */
    public async prefetch(text: string, options: TTSOptions, playbackId?: number): Promise<string | null> {
        if (options.engine === 'native') return null;
        
        // If prefetch is for a stale playback, abort immediately
        if (playbackId !== undefined && playbackId !== this.activePlaybackId) return null;

        try {
            let blob: Blob | null = null;
            if (options.engine === 'fish') blob = await this.fetchFishBlob(text, options);
            else blob = await this.fetchEdgeBlob(text, options);

            if (!blob) return null;
            
            // Final check before creating URL
            if (playbackId !== undefined && playbackId !== this.activePlaybackId) return null;

            const url = URL.createObjectURL(blob);
            this.blobPool.set(text, url);
            return url;
        } catch (e) {
            if ((e as any).name === 'AbortError') {
                console.log('Prefetch aborted');
            } else {
                console.error('Prefetch failed:', e);
            }
            return null;
        }
    }

    /**
     * Plays a previously prefetched Blob URL.
     */
    public playBlob(url: string, text: string, options: TTSOptions, playbackId?: number): Promise<void> {
        console.log(`[BROADCAST-DEBUG] PlayBlob start: "${text.substring(0, 20)}..."`, { url, playbackId });
        this.stop(false); 
        if (!this.audio) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const onEnded = () => {
                console.log(`[BROADCAST-DEBUG] Audio ended/stopped: "${text.substring(0, 20)}..."`);
                this.clearBoundaryTimer();
                // Automatically clean up blob memory to prevent leaks
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                    // Find and remove from pool by value
                    for (let [key, val] of this.blobPool.entries()) {
                        if (val === url) {
                            this.blobPool.delete(key);
                            break;
                        }
                    }
                    if (this.currentBlobUrl === url) this.currentBlobUrl = null;
                }
                if (options.onEnd) options.onEnd();
                resolve();
            };

            this.audio!.onplay = () => {
                if (options.onStart) options.onStart();
                this.simulateBoundaries(text, options, this.audio!);
            };
            this.audio!.onended = onEnded;
            this.audio!.onerror = (e) => {
                console.error('Audio element error:', e);
                onEnded();
            };

            this.currentBlobUrl = url;
            this.audio!.src = url;

            // Initialize Web Audio API if a boost is requested
            if (options.volume && options.volume > 1.0) {
                this.setupAudioNodes(options.volume);
            } else if (this.gainNode) {
                // Reset to normal if no boost
                this.gainNode.gain.setTargetAtTime(1.0, this.audioCtx!.currentTime, 0.1);
            }

            if (playbackId !== undefined && playbackId !== this.activePlaybackId) {
                onEnded();
                return;
            }

            this.audio!.play().catch((e) => {
                console.warn('Audio play blocked/failed:', e);
                onEnded();
            });
        });
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

    /**
     * Cancel all current and pending sequences.
     * Increments activePlaybackId to invalidate any running async loops.
     */
    public cancelAll(): void {
        console.log(`[BROADCAST-DEBUG] CANCEL ALL called. Incrementing ID to: ${this.activePlaybackId + 1}`);
        this.activePlaybackId++;
        this.stop(true);
    }

    public stop(clearPool: boolean = false): void {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (this.audio) {
            this.audio.onended = null;
            this.audio.onerror = null;
            this.audio.pause();
            const prevSrc = this.audio.src;
            this.audio.src = '';

            // Immediate revocation if requested or if it's a transient blob
            if (prevSrc && prevSrc.startsWith('blob:')) {
                // We only revoke if we're sure it's not needed by other pending sentences
                // or if clearPool is true
                if (clearPool) {
                    URL.revokeObjectURL(prevSrc);
                    for (let [key, val] of this.blobPool.entries()) {
                        if (val === prevSrc) {
                            this.blobPool.delete(key);
                            break;
                        }
                    }
                }
            }

            if (this.metaListener) {
                this.audio.removeEventListener('loadedmetadata', this.metaListener);
                this.metaListener = null;
            }
        }
        this.clearBoundaryTimer();
        if (this.currentBlobUrl && clearPool) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }
        if (clearPool) {
            this.clearPool();
        }
    }

    public getActivePlaybackId(): number {
        return this.activePlaybackId;
    }

    /**
     * Clear all pooled blobs to free memory.
     */
    public clearPool(): void {
        this.blobPool.forEach(url => {
            try { URL.revokeObjectURL(url); } catch (e) { }
        });
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
            // Try specific matches first
            let selectedVoice = voices.find(v => v.name === options.voice || v.name.includes(options.voice));

            // Fallback: If it's a known Chinese voice request, find any Chinese voice
            if (!selectedVoice && (options.voice.toLowerCase().includes('xiaoxiao') || options.voice.toLowerCase().includes('yunxi') || utterance.lang.startsWith('zh'))) {
                selectedVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
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
        const voice = options.voice || 'zh-CN-XiaoxiaoNeural';
        const rate = options.rate ?? 1.0;
        console.log(`[BROADCAST-DEBUG] Fetching Edge TTS: "${text.substring(0, 20)}..."`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const startTime = Date.now();
            const resp = await fetch('/api/broadcast/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, rate }),
                signal: controller.signal,
            });

            console.log(`[BROADCAST-DEBUG] TTS API Response: ${resp.status} (${Date.now() - startTime}ms)`);
            clearTimeout(timeoutId);
            if (resp.ok) {
                const blob = await resp.blob();
                console.log(`[BROADCAST-DEBUG] Blob received: ${blob.size} bytes`);
                if (blob.size > 100) return blob;
            } else {
                const errText = await resp.text();
                console.error(`[BROADCAST-DEBUG] TTS API Error Details:`, errText);
            }
        } catch (e) {
            console.error(`[BROADCAST-DEBUG] TTS Fetch Exception:`, e);
        } finally {
            clearTimeout(timeoutId);
        }

        return null;
    }

    private async speakEdge(text: string, options: TTSOptions, playbackId?: number): Promise<void> {
        let blob = await this.fetchEdgeBlob(text, options);

        if (blob) {
            if (playbackId !== undefined && playbackId !== this.activePlaybackId) return;
            const url = URL.createObjectURL(blob);
            this.blobPool.set(text, url);
            await this.playBlob(url, text, options, playbackId);
        } else {
            if (playbackId !== undefined && playbackId !== this.activePlaybackId) return;
            console.error('All cloud TTS engines failed, falling back to native');
            this.speakNative(text, options);
        }
    }

    private isSilentLoopPending: boolean = false;

    // Silent audio to keep the browser tab "audible" and prevent background suspension
    public startSilentLoop(): void {
        if (this.isSilentLoopPlaying || this.isSilentLoopPending) return;

        if (!this.silentAudio) {
            this.silentAudio = new Audio();
            // Tiny silent wav (1 pixel worth of silence)
            this.silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
            this.silentAudio.loop = true;
            this.silentAudio.volume = 0.01; // Extremely quiet but not zero
        }

        this.isSilentLoopPending = true;
        this.silentAudio.play().then(() => {
            this.isSilentLoopPlaying = true;
            this.isSilentLoopPending = false;
            console.log('Silent keep-alive loop started.');
        }).catch(err => {
            this.isSilentLoopPending = false;
            console.warn('Silent loop block by browser policy, will retry on next user interaction.', err);
        });
    }

    public stopSilentLoop(): void {
        if (this.silentAudio) {
            this.silentAudio.pause();
            this.isSilentLoopPlaying = false;
            this.isSilentLoopPending = false;
        }
    }

    private async fetchFishBlob(text: string, options: TTSOptions): Promise<Blob | null> {
        if (!options.apiKey) return null;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
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
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok ? await response.blob() : null;
        } catch (e) {
            clearTimeout(timeoutId);
            return null;
        }
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
        if (!options.onBoundary || options.engine === 'native' || !text) return;
        this.clearBoundaryTimer();

        const startSimulation = (msPerChar: number) => {
            let charIndex = 0;
            // Cap speed to avoid CPU spike from zero or near-zero msPerChar
            const safeInterval = Math.max(20, msPerChar);
            this.boundaryTimer = setInterval(() => {
                if (charIndex >= text.length) {
                    this.clearBoundaryTimer();
                    return;
                }
                charIndex += 1;
                if (options.onBoundary) options.onBoundary(charIndex);
            }, safeInterval);
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

            // Define a local reference to the listener function
            const listener = () => {
                // Ensure we only remove the listener if it's the current one
                if (this.metaListener === listener) {
                    el.removeEventListener('loadedmetadata', listener);
                    this.metaListener = null;
                }

                if (el.duration && isFinite(el.duration) && el.duration > 0) {
                    const msPerChar = (el.duration * 1000 * 0.92) / text.length;
                    startSimulation(msPerChar);
                } else {
                    const rate = options.rate || 1.0;
                    startSimulation(300 / rate);
                }
            };

            this.metaListener = listener;
            el.addEventListener('loadedmetadata', listener);
        } else {
            const rate = options.rate || 1.0;
            startSimulation(300 / rate);
        }
    }
}

export const ttsManager = TTSManager.getInstance();
