/**
 * Weather — Time-of-day tinting and weather effects.
 * Mirrors C++ alpha-degree tinting system (G_cSpriteAlphaDegree)
 * and weather effects (rain, snow, fog) from Game.cpp.
 *
 * Alpha degree 1 = daylight, 2 = night (special tint), 3-13 = increasingly dark.
 * The tint is applied as a PixiJS ColorMatrixFilter on the scene.
 */

// ── Alpha-degree tint table (matches C++ DDrawSprite::ApplyAlphaDegree) ──

/**
 * Each entry is [R, G, B] additive offset applied to all scene pixels.
 * Degree 1 = normal daylight (no tint), higher = darker/tinted.
 */
export const ALPHA_DEGREE_TINTS: Record<number, [number, number, number]> = {
	1:  [0, 0, 0],
	2:  [-20, -20, -6],     // Night: bluish tint
	3:  [-4, -4, -4],
	4:  [-8, -8, -8],
	5:  [-12, -12, -12],
	6:  [-16, -16, -16],
	7:  [-20, -20, -20],
	8:  [-24, -24, -24],
	9:  [-28, -28, -28],
	10: [-32, -32, -32],
	11: [-36, -36, -36],
	12: [-40, -40, -40],
	13: [-44, -44, -44],
};

// ── Weather types ────────────────────────────────────────────────

export enum WeatherType {
	None = 0,
	Rain = 1,
	Snow = 2,
	Fog  = 3,
}

// ── Weather state ────────────────────────────────────────────────

export class Weather {
	private alphaDegree = 1;
	private weatherType: WeatherType = WeatherType.None;
	private weatherIntensity = 0;

	// ── Alpha degree (time of day) ───────────────────────────────

	getAlphaDegree(): number {
		return this.alphaDegree;
	}

	setAlphaDegree(degree: number): void {
		this.alphaDegree = Math.max(1, Math.min(13, degree));
	}

	/**
	 * Get the RGB tint offset for the current alpha degree.
	 * Returns [r, g, b] in range -255..0.
	 */
	getTint(): [number, number, number] {
		return ALPHA_DEGREE_TINTS[this.alphaDegree] ?? [0, 0, 0];
	}

	isNight(): boolean {
		return this.alphaDegree === 2;
	}

	// ── Weather effects ──────────────────────────────────────────

	getWeatherType(): WeatherType {
		return this.weatherType;
	}

	setWeather(type: WeatherType, intensity = 100): void {
		this.weatherType = type;
		this.weatherIntensity = intensity;
	}

	getIntensity(): number {
		return this.weatherIntensity;
	}

	/**
	 * Draw weather particles.
	 * Phase 8 stub: will render rain drops, snow flakes, or fog overlay.
	 */
	draw(_screenW: number, _screenH: number): void {
		// Stub: implemented per weather type in later work
	}

	/**
	 * Update weather animation (particle positions, etc.).
	 */
	update(_dtMS: number): void {
		// Stub
	}
}
