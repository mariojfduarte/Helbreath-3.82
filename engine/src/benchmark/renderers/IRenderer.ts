/**
 * IRenderer — Abstract renderer interface.
 * Mirrors Sources/Client/Renderer/IRenderer.h from the C++ client.
 *
 * Each renderer backend (Canvas2D, PixiJS, WebGL) implements this
 * so we can benchmark them against the same workload.
 */

// ── Shared Types ───────────────────────────────────────────────────

/** Source rectangle within a sprite sheet (in pixels). */
export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * DrawParams — mirrors SpriteLib::DrawParams from DDrawSprite.cpp.
 *
 * Controls how a sprite is blitted to the back buffer:
 * - Opaque (default): color-key transparency only
 * - Alpha: additive blend min(max, src*alpha + dst)
 * - Tint: additive RGB offset clamp(src + offset, 0, max)
 * - Shadow: darken destination (dst & 0xE79C) >> 2, every 3rd row
 * - Fade: darken where source is non-transparent
 */
export interface DrawParams {
	alpha: number;        // 0.0 - 1.0 (1.0 = fully opaque)
	tintR: number;        // -255 .. +255 additive red offset
	tintG: number;        // -255 .. +255 additive green offset
	tintB: number;        // -255 .. +255 additive blue offset
	useColorKey: boolean; // true = transparent pixels are skipped
	isShadow: boolean;    // shadow darkening effect
	isFade: boolean;      // fade darkening effect
}

/** Preset factory functions matching C++ DrawParams static methods. */
export const DrawParamsPresets = {
	/** Full opacity, color key enabled. Most common draw mode. */
	Opaque(): DrawParams {
		return { alpha: 1.0, tintR: 0, tintG: 0, tintB: 0, useColorKey: true, isShadow: false, isFade: false };
	},

	/** No color key — used for opaque background tiles. */
	NoColorKey(): DrawParams {
		return { alpha: 1.0, tintR: 0, tintG: 0, tintB: 0, useColorKey: false, isShadow: false, isFade: false };
	},

	/** Alpha blending at given opacity (0.0-1.0). */
	Alpha(a: number): DrawParams {
		return { alpha: a, tintR: 0, tintG: 0, tintB: 0, useColorKey: true, isShadow: false, isFade: false };
	},

	/** Additive color tint. */
	Tint(r: number, g: number, b: number): DrawParams {
		return { alpha: 1.0, tintR: r, tintG: g, tintB: b, useColorKey: true, isShadow: false, isFade: false };
	},

	/** Tinted + alpha blended. */
	TintedAlpha(r: number, g: number, b: number, a: number): DrawParams {
		return { alpha: a, tintR: r, tintG: g, tintB: b, useColorKey: true, isShadow: false, isFade: false };
	},

	/** Shadow projection effect. */
	Shadow(): DrawParams {
		return { alpha: 1.0, tintR: 0, tintG: 0, tintB: 0, useColorKey: true, isShadow: true, isFade: false };
	},

	/** Fade effect. */
	Fade(): DrawParams {
		return { alpha: 1.0, tintR: 0, tintG: 0, tintB: 0, useColorKey: true, isShadow: false, isFade: true };
	},
} as const;

/**
 * SpriteTexture — a decoded sprite image ready for rendering.
 * Created from decoded PAK sprite BMP data.
 * The renderer-specific implementation may wrap this differently.
 */
export interface SpriteTexture {
	/** Source image (Canvas with color-key transparency pre-applied) */
	canvas: HTMLCanvasElement;
	width: number;
	height: number;
}

/**
 * OffscreenSurface — renderer-specific offscreen buffer.
 * Mirrors DirectDraw's m_lpPDBGS (pre-drawn background surface).
 * Used for caching the background tile layer.
 */
export interface OffscreenSurface {
	width: number;
	height: number;
	/** Opaque handle — renderer-specific data */
	_handle: unknown;
}

// ── Renderer Interface ─────────────────────────────────────────────

export interface IRenderer {
	/** Human-readable name (e.g., "Canvas2D", "PixiJS", "WebGL") */
	readonly name: string;

	/**
	 * Initialize the renderer with a canvas element.
	 * Mirrors DDrawRenderer::Init().
	 */
	init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void>;

	/**
	 * Begin a new frame. Clears the back buffer.
	 * Mirrors IRenderer::BeginFrame().
	 */
	beginFrame(): void;

	/**
	 * End the current frame. Presents to screen.
	 * Mirrors IRenderer::EndFrameCheckLostSurface().
	 */
	endFrame(): void;

	/**
	 * Draw a sprite frame to the back buffer.
	 * Mirrors DDrawSprite::Draw() and its blend variants.
	 *
	 * @param texture   Decoded sprite image
	 * @param srcRect   Region of the sprite sheet to draw
	 * @param dstX      Destination X on back buffer
	 * @param dstY      Destination Y on back buffer
	 * @param params    Blend mode parameters
	 */
	drawSprite(
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
		params: DrawParams,
	): void;

	/**
	 * Create an offscreen surface for caching (e.g., background tiles).
	 * Mirrors pCreateOffScreenSurface().
	 */
	createOffscreenSurface(width: number, height: number): OffscreenSurface;

	/**
	 * Draw into an offscreen surface. All drawSprite() calls within
	 * the callback target the surface instead of the back buffer.
	 */
	drawToSurface(surface: OffscreenSurface, callback: () => void): void;

	/**
	 * Blit an offscreen surface to the back buffer.
	 * Mirrors BltBackBufferFromPDBGS().
	 */
	blitSurface(surface: OffscreenSurface, dstX: number, dstY: number): void;

	/**
	 * Release all GPU/rendering resources.
	 */
	destroy(): void;
}
