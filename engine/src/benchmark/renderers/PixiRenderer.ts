/**
 * PixiRenderer — implements IRenderer using PixiJS 7.
 *
 * Leverages PixiJS's automatic sprite batching and WebGL acceleration.
 * Custom blend modes are achieved via ColorMatrixFilter for tint, and
 * approximated overlays for shadow/fade (which need destination reads).
 *
 * Strengths: Batched draws, GPU acceleration, texture atlas support.
 * Weaknesses: Less control over exact blend formulas; shadow/fade are
 *             approximated since they need destination pixel reads.
 */

import * as PIXI from 'pixi.js';
import {
	IRenderer,
	DrawParams,
	SpriteTexture,
	Rect,
	OffscreenSurface,
} from './IRenderer';

export class PixiRenderer implements IRenderer {
	readonly name = 'PixiJS';

	private app!: PIXI.Application;
	private stage!: PIXI.Container;
	private width = 0;
	private height = 0;

	// Cache PIXI base textures from SpriteTexture canvases
	private baseTextureCache = new Map<HTMLCanvasElement, PIXI.BaseTexture>();

	async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
		this.width = width;
		this.height = height;

		this.app = new PIXI.Application({
			view: canvas,
			width,
			height,
			backgroundColor: 0x000000,
			antialias: false,
			resolution: 1,
			autoDensity: false,
			clearBeforeRender: true,
			autoStart: false,
		});

		// Use NEAREST for pixel-perfect rendering (like DirectDraw)
		PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

		this.stage = this.app.stage;
	}

	beginFrame(): void {
		// Remove all children from stage for fresh frame
		this.stage.removeChildren();
	}

	endFrame(): void {
		// Force render
		this.app.renderer.render(this.stage);
	}

	drawSprite(
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
		params: DrawParams,
	): void {
		// Shadow and Fade: approximate since we can't read destination in WebGL
		if (params.isShadow) {
			this.drawShadowApprox(texture, srcRect, dstX, dstY);
			return;
		}

		if (params.isFade) {
			this.drawFadeApprox(texture, srcRect, dstX, dstY);
			return;
		}

		// Get or create PIXI base texture
		const baseTex = this.getBaseTexture(texture.canvas);

		// Clamp frame rect to base texture dimensions (some PAK frames exceed bounds)
		const clampedX = Math.min(srcRect.x, texture.width);
		const clampedY = Math.min(srcRect.y, texture.height);
		const clampedW = Math.min(srcRect.width, texture.width - clampedX);
		const clampedH = Math.min(srcRect.height, texture.height - clampedY);

		if (clampedW <= 0 || clampedH <= 0) return;

		const frame = new PIXI.Rectangle(clampedX, clampedY, clampedW, clampedH);
		const frameTexture = new PIXI.Texture(baseTex, frame);

		const sprite = new PIXI.Sprite(frameTexture);
		sprite.x = dstX;
		sprite.y = dstY;

		// Apply alpha
		sprite.alpha = params.alpha;

		// Apply tint if any
		const hasTint = params.tintR !== 0 || params.tintG !== 0 || params.tintB !== 0;
		if (hasTint) {
			// PixiJS tint is multiplicative, but C++ uses additive.
			// We approximate via ColorMatrixFilter for additive offset.
			const filter = new PIXI.ColorMatrixFilter();
			const m = filter.matrix;
			// Additive offset in the 5th column of each color row
			m[4] = params.tintR / 255;    // R offset
			m[9] = params.tintG / 255;    // G offset
			m[14] = params.tintB / 255;   // B offset
			sprite.filters = [filter];
		}

		// Standard alpha blending — NORMAL blend with reduced alpha.
		// The C++ original uses additive blend (src*alpha + dst), but for
		// transparency effects like see-through trees/buildings, NORMAL
		// blend with alpha looks correct in a WebGL/PixiJS context.
		// (ADD would make transparent sprites brighter, not see-through.)

		this.stage.addChild(sprite);
	}

	/**
	 * Shadow approximation for PixiJS: draw sprite shape as dark overlay.
	 * Not pixel-perfect like C++ (which reads destination), but visually close.
	 */
	private drawShadowApprox(
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
	): void {
		const baseTex = this.getBaseTexture(texture.canvas);
		const cx = Math.min(srcRect.x, texture.width);
		const cy = Math.min(srcRect.y, texture.height);
		const cw = Math.min(srcRect.width, texture.width - cx);
		const ch = Math.min(srcRect.height, texture.height - cy);
		if (cw <= 0 || ch <= 0) return;
		const frame = new PIXI.Rectangle(cx, cy, cw, ch);
		const frameTexture = new PIXI.Texture(baseTex, frame);

		const sprite = new PIXI.Sprite(frameTexture);
		sprite.x = dstX;
		sprite.y = dstY;
		sprite.alpha = 0.25;
		sprite.tint = 0x000000;
		this.stage.addChild(sprite);
	}

	/**
	 * Fade approximation: same as shadow but stronger darkening.
	 */
	private drawFadeApprox(
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
	): void {
		const baseTex = this.getBaseTexture(texture.canvas);
		const cx = Math.min(srcRect.x, texture.width);
		const cy = Math.min(srcRect.y, texture.height);
		const cw = Math.min(srcRect.width, texture.width - cx);
		const ch = Math.min(srcRect.height, texture.height - cy);
		if (cw <= 0 || ch <= 0) return;
		const frame = new PIXI.Rectangle(cx, cy, cw, ch);
		const frameTexture = new PIXI.Texture(baseTex, frame);

		const sprite = new PIXI.Sprite(frameTexture);
		sprite.x = dstX;
		sprite.y = dstY;
		sprite.alpha = 0.75;
		sprite.tint = 0x000000;
		this.stage.addChild(sprite);
	}

	private getBaseTexture(canvas: HTMLCanvasElement): PIXI.BaseTexture {
		let baseTex = this.baseTextureCache.get(canvas);
		if (!baseTex) {
			baseTex = PIXI.BaseTexture.from(canvas, {
				scaleMode: PIXI.SCALE_MODES.NEAREST,
			});
			this.baseTextureCache.set(canvas, baseTex);
		}
		return baseTex;
	}

	createOffscreenSurface(width: number, height: number): OffscreenSurface {
		const renderTexture = PIXI.RenderTexture.create({ width, height });
		const container = new PIXI.Container();
		return { width, height, _handle: { renderTexture, container } };
	}

	drawToSurface(surface: OffscreenSurface, callback: () => void): void {
		const handle = surface._handle as {
			renderTexture: PIXI.RenderTexture;
			container: PIXI.Container;
		};

		// Redirect stage
		const prevStage = this.stage;
		this.stage = handle.container;
		handle.container.removeChildren();

		callback();

		// Render to texture
		this.app.renderer.render(handle.container, { renderTexture: handle.renderTexture });

		this.stage = prevStage;
	}

	blitSurface(surface: OffscreenSurface, dstX: number, dstY: number): void {
		const handle = surface._handle as {
			renderTexture: PIXI.RenderTexture;
			container: PIXI.Container;
		};
		const sprite = new PIXI.Sprite(handle.renderTexture);
		sprite.x = dstX;
		sprite.y = dstY;
		this.stage.addChild(sprite);
	}

	destroy(): void {
		for (const baseTex of this.baseTextureCache.values()) {
			baseTex.destroy();
		}
		this.baseTextureCache.clear();
		this.app.destroy();
	}
}
