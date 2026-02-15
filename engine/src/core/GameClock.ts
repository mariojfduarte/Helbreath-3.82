/**
 * GameClock — Cross-platform timing utility.
 * Mirrors C++ GameClock from Sources/Client/CommonTypes.h.
 *
 * Uses performance.now() (sub-millisecond precision) instead of
 * the C++ std::chrono::steady_clock / timeGetTime().
 * Returns milliseconds since initialization as uint32 (wraps after ~49.7 days).
 */

export class GameClock {
	private static s_startTime = 0;
	private static s_initialized = false;

	/** Call once at startup (auto-called by getTimeMS if forgotten). */
	static initialize(): void {
		GameClock.s_startTime = performance.now();
		GameClock.s_initialized = true;
	}

	/** Milliseconds since initialization, truncated to uint32. */
	static getTimeMS(): number {
		if (!GameClock.s_initialized) {
			GameClock.initialize();
		}
		return Math.floor(performance.now() - GameClock.s_startTime) >>> 0;
	}
}
