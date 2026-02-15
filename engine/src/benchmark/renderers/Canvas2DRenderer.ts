/**
 * Canvas2DRenderer — implements IRenderer using the HTML5 Canvas 2D API.
 *
 * Closest to the original C++ approach: direct pixel access via
 * getImageData/putImageData for CPU-side blending, and drawImage
 * for the fast hardware-like path.
 *
 * Strengths: Familiar API, direct pixel manipulation, simple.
 * Weaknesses: No GPU batching, per-pixel loops are slow at scale.
 */

import {
	IRenderer,
	DrawParams,
	SpriteTexture,
	Rect,
	OffscreenSurface,
} from './IRenderer';

export class Canvas2DRenderer implements IRenderer {
	readonly name = 'Canvas2D';

	private canvas!: HTMLCanvasElement;
	private ctx!: CanvasRenderingContext2D;
	private width = 0;
	private height = 0;

	// For drawToSurface redirection
	private activeCtx!: CanvasRenderingContext2D;

	async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
		this.canvas = canvas;
		this.canvas.width = width;
		this.canvas.height = height;
		this.width = width;
		this.height = height;
		this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
		this.activeCtx = this.ctx;
		// Disable image smoothing for pixel-perfect rendering (like DirectDraw)
		this.ctx.imageSmoothingEnabled = false;
	}

	beginFrame(): void {
		this.ctx.clearRect(0, 0, this.width, this.height);
	}

	endFrame(): void {
		// Canvas2D auto-presents, nothing to do
	}

	drawSprite(
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
		params: DrawParams,
	): void {
		const ctx = this.activeCtx;
		const hasTint = params.tintR !== 0 || params.tintG !== 0 || params.tintB !== 0;
		const hasAlpha = params.alpha < 1.0;

		// ── Fast path: opaque blit with color key (most common) ────
		if (!hasTint && !hasAlpha && !params.isShadow && !params.isFade) {
			ctx.drawImage(
				texture.canvas,
				srcRect.x, srcRect.y, srcRect.width, srcRect.height,
				dstX, dstY, srcRect.width, srcRect.height,
			);
			return;
		}

		// ── Shadow effect ──────────────────────────────────────────
		if (params.isShadow) {
			this.drawShadow(ctx, texture, srcRect, dstX, dstY);
			return;
		}

		// ── Fade effect ────────────────────────────────────────────
		if (params.isFade) {
			this.drawFade(ctx, texture, srcRect, dstX, dstY);
			return;
		}

		// ── Alpha-only (no tint) ───────────────────────────────────
		if (hasAlpha && !hasTint) {
			ctx.globalAlpha = params.alpha;
			ctx.drawImage(
				texture.canvas,
				srcRect.x, srcRect.y, srcRect.width, srcRect.height,
				dstX, dstY, srcRect.width, srcRect.height,
			);
			ctx.globalAlpha = 1.0;
			return;
		}

		// ── Tint / Tint+Alpha — CPU per-pixel path ────────────────
		this.drawTinted(ctx, texture, srcRect, dstX, dstY, params);
	}

	/**
	 * Shadow effect: darkens destination where source is non-transparent.
	 * Mirrors DDrawSprite::DrawShadowInternal().
	 * Processes every 3rd row, shifts result left.
	 */
	private drawShadow(
		ctx: CanvasRenderingContext2D,
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
	): void {
		const w = srcRect.width;
		const h = srcRect.height;

		// Read source pixels to know where shadow falls.
		// We use a temporary canvas to avoid tainting the original.
		const tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = w;
		tmpCanvas.height = h;
		const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true })!;
		tmpCtx.drawImage(texture.canvas, srcRect.x, srcRect.y, w, h, 0, 0, w, h);
		const srcData = tmpCtx.getImageData(0, 0, w, h);
		const src = srcData.data;

		// Clamp to canvas bounds
		const drawW = Math.min(w, this.width - dstX);
		const drawH = Math.min(h, this.height - dstY);
		if (drawW <= 0 || drawH <= 0) return;

		// Read destination pixels
		const dstData = ctx.getImageData(dstX, dstY, drawW, drawH);
		const dst = dstData.data;

		// Process every 3rd row (matching C++ shadow behavior)
		for (let y = 0; y < drawH; y += 3) {
			for (let x = 0; x < drawW; x++) {
				const si = (y * w + x) * 4;
				// Only darken where source is non-transparent
				if (src[si + 3] > 0) {
					const di = (y * drawW + x) * 4;
					// Darken: (dst >> 2) — matches (dst & 0xE79C) >> 2 in RGB565
					dst[di] = dst[di] >> 2;
					dst[di + 1] = dst[di + 1] >> 2;
					dst[di + 2] = dst[di + 2] >> 2;
				}
			}
		}

		ctx.putImageData(dstData, dstX, dstY);
	}

	/**
	 * Fade effect: darkens destination where source is non-transparent.
	 * Mirrors DDrawSprite::DrawFadeInternal().
	 * Unlike shadow, processes ALL rows.
	 */
	private drawFade(
		ctx: CanvasRenderingContext2D,
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
	): void {
		const w = srcRect.width;
		const h = srcRect.height;

		const tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = w;
		tmpCanvas.height = h;
		const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true })!;
		tmpCtx.drawImage(texture.canvas, srcRect.x, srcRect.y, w, h, 0, 0, w, h);
		const srcData = tmpCtx.getImageData(0, 0, w, h);
		const src = srcData.data;

		const drawW = Math.min(w, this.width - dstX);
		const drawH = Math.min(h, this.height - dstY);
		if (drawW <= 0 || drawH <= 0) return;

		const dstData = ctx.getImageData(dstX, dstY, drawW, drawH);
		const dst = dstData.data;

		for (let y = 0; y < drawH; y++) {
			for (let x = 0; x < drawW; x++) {
				const si = (y * w + x) * 4;
				if (src[si + 3] > 0) {
					const di = (y * drawW + x) * 4;
					dst[di] = dst[di] >> 2;
					dst[di + 1] = dst[di + 1] >> 2;
					dst[di + 2] = dst[di + 2] >> 2;
				}
			}
		}

		ctx.putImageData(dstData, dstX, dstY);
	}

	/**
	 * Tinted drawing with optional alpha.
	 * Mirrors DDrawSprite::DrawTinted() and DrawTintedTransparent().
	 * Per-pixel: result = clamp(src + tintOffset, 0, 255), then alpha blend with dst.
	 */
	private drawTinted(
		ctx: CanvasRenderingContext2D,
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
		params: DrawParams,
	): void {
		const w = srcRect.width;
		const h = srcRect.height;

		const tmpCanvas = document.createElement('canvas');
		tmpCanvas.width = w;
		tmpCanvas.height = h;
		const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true })!;
		tmpCtx.drawImage(texture.canvas, srcRect.x, srcRect.y, w, h, 0, 0, w, h);
		const srcData = tmpCtx.getImageData(0, 0, w, h);
		const src = srcData.data;

		const drawW = Math.min(w, this.width - dstX);
		const drawH = Math.min(h, this.height - dstY);
		if (drawW <= 0 || drawH <= 0) return;

		const dstData = ctx.getImageData(dstX, dstY, drawW, drawH);
		const dst = dstData.data;

		const alpha = params.alpha;
		const tR = params.tintR;
		const tG = params.tintG;
		const tB = params.tintB;

		for (let y = 0; y < drawH; y++) {
			for (let x = 0; x < drawW; x++) {
				const si = (y * w + x) * 4;
				if (src[si + 3] === 0) continue; // skip transparent

				const di = (y * drawW + x) * 4;

				// Apply tint: clamp(src + offset, 0, 255)
				let r = Math.min(255, Math.max(0, src[si] + tR));
				let g = Math.min(255, Math.max(0, src[si + 1] + tG));
				let b = Math.min(255, Math.max(0, src[si + 2] + tB));

				if (alpha < 1.0) {
					// Additive alpha blend: min(255, src * alpha + dst)
					r = Math.min(255, Math.round(r * alpha) + dst[di]);
					g = Math.min(255, Math.round(g * alpha) + dst[di + 1]);
					b = Math.min(255, Math.round(b * alpha) + dst[di + 2]);
				}

				dst[di] = r;
				dst[di + 1] = g;
				dst[di + 2] = b;
				dst[di + 3] = 255;
			}
		}

		ctx.putImageData(dstData, dstX, dstY);
	}

	createOffscreenSurface(width: number, height: number): OffscreenSurface {
		const c = document.createElement('canvas');
		c.width = width;
		c.height = height;
		const surfCtx = c.getContext('2d', { willReadFrequently: true })!;
		surfCtx.imageSmoothingEnabled = false;
		return { width, height, _handle: { canvas: c, ctx: surfCtx } };
	}

	drawToSurface(surface: OffscreenSurface, callback: () => void): void {
		const handle = surface._handle as { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
		const prevCtx = this.activeCtx;
		this.activeCtx = handle.ctx;
		handle.ctx.clearRect(0, 0, surface.width, surface.height);
		callback();
		this.activeCtx = prevCtx;
	}

	blitSurface(surface: OffscreenSurface, dstX: number, dstY: number): void {
		const handle = surface._handle as { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
		this.activeCtx.drawImage(handle.canvas, dstX, dstY);
	}

	destroy(): void {
		// Nothing to clean up for Canvas2D
	}
}
