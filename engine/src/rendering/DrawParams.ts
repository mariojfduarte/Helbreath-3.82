/**
 * DrawParams — Sprite draw parameters and preset factory.
 * Mirrors C++ SpriteLib::DrawParams from Sources/Client/Renderer/SpriteTypes.h.
 *
 * Every sprite draw call in the C++ client uses one of these presets:
 *   Opaque, Alpha, Tint, TintedAlpha, Shadow, Fade, NoColorKey.
 *
 * PixiJS mapping:
 *   alpha   → sprite.alpha
 *   tintR/G/B → ColorMatrixFilter offset (phase 8, for now stored as data)
 *   isShadow  → tint 0x000000 + alpha 0.25 + skip rows (approximated)
 *   isFade    → tint 0x000000 + alpha 0.5 (darkens non-transparent pixels)
 */

export interface DrawParams {
	alpha: number;       // 0.0–1.0
	tintR: number;       // -255..+255 additive red offset
	tintG: number;       // -255..+255 additive green offset
	tintB: number;       // -255..+255 additive blue offset
	isShadow: boolean;
	isFade: boolean;
	useColorKey: boolean; // true = normal color-keyed blit; false = opaque
}

const DEFAULTS: DrawParams = {
	alpha: 1,
	tintR: 0,
	tintG: 0,
	tintB: 0,
	isShadow: false,
	isFade: false,
	useColorKey: true,
};

/**
 * DrawPresets — static factory methods matching C++ SpriteLib::DrawParams presets.
 */
export const DrawPresets = {
	/** Normal color-keyed blit (most common). */
	Opaque(): DrawParams {
		return { ...DEFAULTS };
	},

	/** Alpha blending: min(max, src * alpha + dst). */
	Alpha(a: number): DrawParams {
		return { ...DEFAULTS, alpha: a };
	},

	/** Additive RGB tint offset: clamp(src + offset, 0, 255). */
	Tint(r: number, g: number, b: number): DrawParams {
		return { ...DEFAULTS, tintR: r, tintG: g, tintB: b };
	},

	/** Combined tint + alpha in one pass. */
	TintedAlpha(r: number, g: number, b: number, a: number): DrawParams {
		return { ...DEFAULTS, alpha: a, tintR: r, tintG: g, tintB: b };
	},

	/** Shadow: darkens destination where source is non-transparent. */
	Shadow(): DrawParams {
		return { ...DEFAULTS, isShadow: true };
	},

	/** Fade: darkens destination pixels under non-transparent source. */
	Fade(): DrawParams {
		return { ...DEFAULTS, isFade: true };
	},

	/** Opaque blit without color-key transparency (used for background tiles). */
	NoColorKey(): DrawParams {
		return { ...DEFAULTS, useColorKey: false };
	},
};
