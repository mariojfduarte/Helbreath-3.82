/**
 * AudioManager — Web Audio API wrapper for BGM, SFX, and positional audio.
 * Replaces C++ DirectSound (Sources/Client/Audio/).
 *
 * Manages three audio channels:
 *   - BGM: Background music (looping, crossfade between tracks)
 *   - SFX: Sound effects (pooled, one-shot)
 *   - Ambient: Environmental loops (wind, water, crowd)
 *
 * Supports positional audio: SFX volume/pan based on distance from camera.
 */

export class AudioManager {
	private static s_instance: AudioManager | null = null;

	static get(): AudioManager {
		if (!AudioManager.s_instance) {
			AudioManager.s_instance = new AudioManager();
		}
		return AudioManager.s_instance;
	}

	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private bgmGain: GainNode | null = null;
	private sfxGain: GainNode | null = null;

	private bgmSource: AudioBufferSourceNode | null = null;
	private bgmBuffer: AudioBuffer | null = null;
	private currentBgmTrack = '';

	private muted = false;
	private masterVolume = 1.0;
	private bgmVolume = 0.5;
	private sfxVolume = 0.8;

	// ── Initialization ───────────────────────────────────────────

	/**
	 * Initialize the Web Audio context. Must be called after a user gesture.
	 */
	initialize(): void {
		if (this.ctx) return;

		this.ctx = new AudioContext();
		this.masterGain = this.ctx.createGain();
		this.masterGain.connect(this.ctx.destination);

		this.bgmGain = this.ctx.createGain();
		this.bgmGain.gain.value = this.bgmVolume;
		this.bgmGain.connect(this.masterGain);

		this.sfxGain = this.ctx.createGain();
		this.sfxGain.gain.value = this.sfxVolume;
		this.sfxGain.connect(this.masterGain);
	}

	/**
	 * Resume the audio context (required after user gesture on some browsers).
	 */
	async resume(): Promise<void> {
		if (this.ctx?.state === 'suspended') {
			await this.ctx.resume();
		}
	}

	// ── Per-frame update ─────────────────────────────────────────

	update(_deltaTime: number): void {
		// Future: crossfade BGM, update positional audio, ambient volume
	}

	// ── BGM ──────────────────────────────────────────────────────

	/**
	 * Play background music from a URL (loops).
	 */
	async playBGM(url: string): Promise<void> {
		if (!this.ctx || !this.bgmGain) return;
		if (url === this.currentBgmTrack && this.bgmSource) return;

		this.stopBGM();
		this.currentBgmTrack = url;

		try {
			const resp = await fetch(url);
			if (!resp.ok) return;
			const arrayBuf = await resp.arrayBuffer();
			this.bgmBuffer = await this.ctx.decodeAudioData(arrayBuf);

			this.bgmSource = this.ctx.createBufferSource();
			this.bgmSource.buffer = this.bgmBuffer;
			this.bgmSource.loop = true;
			this.bgmSource.connect(this.bgmGain);
			this.bgmSource.start();
		} catch (e) {
			console.warn('[AudioManager] Failed to load BGM:', url, e);
		}
	}

	stopBGM(): void {
		if (this.bgmSource) {
			try { this.bgmSource.stop(); } catch { /* already stopped */ }
			this.bgmSource.disconnect();
			this.bgmSource = null;
		}
		this.currentBgmTrack = '';
	}

	// ── SFX ──────────────────────────────────────────────────────

	/**
	 * Play a one-shot sound effect.
	 * @param buffer Pre-decoded AudioBuffer.
	 * @param volume 0.0-1.0
	 * @param pan -1.0 (left) to 1.0 (right)
	 */
	playSFX(buffer: AudioBuffer, volume = 1.0, pan = 0): void {
		if (!this.ctx || !this.sfxGain) return;

		const source = this.ctx.createBufferSource();
		source.buffer = buffer;

		const gainNode = this.ctx.createGain();
		gainNode.gain.value = volume;

		if (pan !== 0) {
			const panner = this.ctx.createStereoPanner();
			panner.pan.value = pan;
			source.connect(gainNode);
			gainNode.connect(panner);
			panner.connect(this.sfxGain);
		} else {
			source.connect(gainNode);
			gainNode.connect(this.sfxGain);
		}

		source.start();
	}

	/**
	 * Play a positional sound effect based on distance from camera.
	 * @param buffer Pre-decoded AudioBuffer.
	 * @param dist Distance in tiles (0 = loudest).
	 * @param pan Stereo pan (-1.0 to 1.0).
	 */
	playPositionalSFX(buffer: AudioBuffer, dist: number, pan = 0): void {
		const maxDist = 20;
		if (dist > maxDist) return;
		const volume = Math.max(0, 1.0 - dist / maxDist);
		this.playSFX(buffer, volume, pan);
	}

	// ── Volume controls ──────────────────────────────────────────

	setMasterVolume(v: number): void {
		this.masterVolume = Math.max(0, Math.min(1, v));
		if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
	}

	setBGMVolume(v: number): void {
		this.bgmVolume = Math.max(0, Math.min(1, v));
		if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume;
	}

	setSFXVolume(v: number): void {
		this.sfxVolume = Math.max(0, Math.min(1, v));
		if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
	}

	toggleMute(): void {
		this.muted = !this.muted;
		if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
	}

	isMuted(): boolean { return this.muted; }

	// ── Utility ──────────────────────────────────────────────────

	/**
	 * Decode an audio file buffer for later playback.
	 */
	async decodeAudio(data: ArrayBuffer): Promise<AudioBuffer | null> {
		if (!this.ctx) return null;
		try {
			return await this.ctx.decodeAudioData(data);
		} catch {
			return null;
		}
	}

	getContext(): AudioContext | null {
		return this.ctx;
	}
}
