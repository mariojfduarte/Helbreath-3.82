/**
 * FrameTiming — Frame timing, FPS tracking, and per-stage profiling.
 * Mirrors C++ FrameTiming from Sources/Client/FrameTiming.h/.cpp.
 *
 * Usage:
 *   FrameTiming.initialize();
 *   // In event loop:
 *   FrameTiming.beginFrame();
 *   game.renderFrame();       // calls beginProfile / endProfile internally
 *   FrameTiming.endFrame();
 */

// ── Profile stages (mirrors C++ ProfileStage enum) ────────────────

export enum ProfileStage {
	Update = 0,
	ClearBuffer,
	DrawBackground,
	DrawEffectLights,
	DrawObjects,
	DrawEffects,
	DrawWeather,
	DrawChat,
	DrawDialogs,
	DrawMisc,
	Flip,
	FrameTotal,
	COUNT,
}

const STAGE_NAMES: Record<ProfileStage, string> = {
	[ProfileStage.Update]:           'Update',
	[ProfileStage.ClearBuffer]:      'ClearBuffer',
	[ProfileStage.DrawBackground]:   'DrawBackground',
	[ProfileStage.DrawEffectLights]: 'DrawEffectLights',
	[ProfileStage.DrawObjects]:      'DrawObjects',
	[ProfileStage.DrawEffects]:      'DrawEffects',
	[ProfileStage.DrawWeather]:      'DrawWeather',
	[ProfileStage.DrawChat]:         'DrawChat',
	[ProfileStage.DrawDialogs]:      'DrawDialogs',
	[ProfileStage.DrawMisc]:         'DrawMisc',
	[ProfileStage.Flip]:             'Flip',
	[ProfileStage.FrameTotal]:       'FrameTotal',
	[ProfileStage.COUNT]:            '',
};

// ── FrameTiming singleton (all static) ────────────────────────────

const MAX_DELTA = 0.25; // Clamp to prevent spiral of death (seconds)

export class FrameTiming {
	// Timing
	private static s_lastFrameTime = 0;
	private static s_deltaTime = 0;       // seconds
	private static s_deltaTimeMS = 0;     // milliseconds

	// FPS
	private static s_fps = 0;
	private static s_displayedFrames = 0;
	private static s_fpsAccumulator = 0;
	private static s_fpsFrameCount = 0;
	private static s_totalFrameCount = 0;

	// Profiling
	private static s_profilingEnabled = false;
	private static s_profileStart = new Float64Array(ProfileStage.COUNT);
	private static s_profileTime = new Float64Array(ProfileStage.COUNT);   // current frame (ms)
	private static s_profileAccum = new Float64Array(ProfileStage.COUNT);  // accumulator for averaging
	private static s_profileAvg = new Float64Array(ProfileStage.COUNT);    // averaged (ms)
	private static s_profileFrames = 0;

	// ── Lifecycle ──────────────────────────────────────────────────

	static initialize(): void {
		FrameTiming.s_lastFrameTime = performance.now();
		FrameTiming.s_deltaTime = 0;
		FrameTiming.s_deltaTimeMS = 0;
		FrameTiming.s_fps = 0;
		FrameTiming.s_displayedFrames = 0;
		FrameTiming.s_fpsAccumulator = 0;
		FrameTiming.s_fpsFrameCount = 0;
		FrameTiming.s_totalFrameCount = 0;
		FrameTiming.s_profileFrames = 0;
	}

	/** Call at the start of each frame. Computes delta time. */
	static beginFrame(): void {
		const now = performance.now();
		let dt = (now - FrameTiming.s_lastFrameTime) / 1000; // to seconds
		if (dt > MAX_DELTA) dt = MAX_DELTA;
		FrameTiming.s_deltaTime = dt;
		FrameTiming.s_deltaTimeMS = dt * 1000;
		FrameTiming.s_lastFrameTime = now;

		// Reset per-frame profile times
		if (FrameTiming.s_profilingEnabled) {
			FrameTiming.s_profileTime.fill(0);
		}

		// Start FrameTotal profile
		FrameTiming.beginProfile(ProfileStage.FrameTotal);
	}

	/** Call at the end of each frame. Updates FPS counter. */
	static endFrame(): void {
		// End FrameTotal profile
		FrameTiming.endProfile(ProfileStage.FrameTotal);

		// Accumulate profile times for averaging
		if (FrameTiming.s_profilingEnabled) {
			for (let i = 0; i < ProfileStage.COUNT; i++) {
				FrameTiming.s_profileAccum[i] += FrameTiming.s_profileTime[i];
			}
			FrameTiming.s_profileFrames++;
		}

		// FPS: update every second
		FrameTiming.s_fpsAccumulator += FrameTiming.s_deltaTime;
		if (FrameTiming.s_fpsAccumulator >= 1.0) {
			FrameTiming.s_fps = FrameTiming.s_fpsFrameCount;
			FrameTiming.s_fpsFrameCount = 0;
			FrameTiming.s_fpsAccumulator -= 1.0;

			// Compute profile averages
			if (FrameTiming.s_profilingEnabled && FrameTiming.s_profileFrames > 0) {
				for (let i = 0; i < ProfileStage.COUNT; i++) {
					FrameTiming.s_profileAvg[i] =
						FrameTiming.s_profileAccum[i] / FrameTiming.s_profileFrames;
				}
				FrameTiming.s_profileAccum.fill(0);
				FrameTiming.s_profileFrames = 0;
			}
		}
	}

	/** Call only when a frame is actually displayed (after flip). */
	static countDisplayedFrame(): void {
		FrameTiming.s_totalFrameCount++;
		FrameTiming.s_fpsFrameCount++;
	}

	// ── Accessors ──────────────────────────────────────────────────

	/** Seconds since last frame (clamped to MAX_DELTA). */
	static getDeltaTime(): number {
		return FrameTiming.s_deltaTime;
	}

	/** Milliseconds since last frame. */
	static getDeltaTimeMS(): number {
		return FrameTiming.s_deltaTimeMS;
	}

	/** Displayed frames per second (updated once per second). */
	static getFPS(): number {
		return FrameTiming.s_fps;
	}

	/** Total displayed frames since initialization. */
	static getFrameCount(): number {
		return FrameTiming.s_totalFrameCount;
	}

	// ── Profiling ──────────────────────────────────────────────────

	static setProfilingEnabled(enabled: boolean): void {
		FrameTiming.s_profilingEnabled = enabled;
		if (enabled) {
			FrameTiming.s_profileTime.fill(0);
			FrameTiming.s_profileAccum.fill(0);
			FrameTiming.s_profileAvg.fill(0);
			FrameTiming.s_profileFrames = 0;
		}
	}

	static isProfilingEnabled(): boolean {
		return FrameTiming.s_profilingEnabled;
	}

	static beginProfile(stage: ProfileStage): void {
		if (!FrameTiming.s_profilingEnabled && stage !== ProfileStage.FrameTotal) return;
		FrameTiming.s_profileStart[stage] = performance.now();
	}

	static endProfile(stage: ProfileStage): void {
		if (!FrameTiming.s_profilingEnabled && stage !== ProfileStage.FrameTotal) return;
		FrameTiming.s_profileTime[stage] += performance.now() - FrameTiming.s_profileStart[stage];
	}

	/** Current frame time for a stage (ms). */
	static getProfileTimeMS(stage: ProfileStage): number {
		return FrameTiming.s_profileTime[stage];
	}

	/** Averaged time for a stage over ~1 second (ms). */
	static getProfileAvgTimeMS(stage: ProfileStage): number {
		return FrameTiming.s_profileAvg[stage];
	}

	static getStageName(stage: ProfileStage): string {
		return STAGE_NAMES[stage] ?? '';
	}
}
