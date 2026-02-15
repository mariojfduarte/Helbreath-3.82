/**
 * Camera — Viewport camera singleton.
 * Mirrors C++ Camera from Sources/Client/Camera.h/.cpp.
 *
 * Manages the view position (in tile coordinates), smooth following,
 * screen shake, coordinate conversion, and world bounds clamping.
 */

// ── CameraMode enum ──────────────────────────────────────────────

export enum CameraMode {
	FollowPlayer = 0,
	FollowEntity,
	FreeCamera,
	Fixed,
}

// ── Camera class ─────────────────────────────────────────────────

export class Camera {
	private static s_instance: Camera | null = null;

	static get(): Camera {
		if (!Camera.s_instance) {
			Camera.s_instance = new Camera();
		}
		return Camera.s_instance;
	}

	// ── Mode ──────────────────────────────────────────────────────

	private m_mode: CameraMode = CameraMode.FollowPlayer;
	private m_attachedEntityId = 0;

	// ── Position (in tiles) ───────────────────────────────────────

	private m_viewX = 0;   // top-left tile X
	private m_viewY = 0;   // top-left tile Y
	private m_exactX = 0;  // smooth sub-tile X
	private m_exactY = 0;  // smooth sub-tile Y
	private m_targetX = 0;
	private m_targetY = 0;

	// ── Viewport dimensions ───────────────────────────────────────

	private m_viewWidth = 640;
	private m_viewHeight = 480;
	private m_tileWidth = 32;
	private m_tileHeight = 32;
	private m_viewWidthTiles = 20;
	private m_viewHeightTiles = 15;

	// ── Smooth follow ─────────────────────────────────────────────

	private m_bSmoothFollow = true;
	private m_followSpeed = 8.0;

	// ── Shake ─────────────────────────────────────────────────────

	private m_bShaking = false;
	private m_shakeDegree = 0;
	private m_shakeDuration = 0;
	private m_shakeTimer = 0;
	private m_shakeOffsetX = 0;
	private m_shakeOffsetY = 0;

	// ── World bounds ──────────────────────────────────────────────

	private m_worldMinX = 0;
	private m_worldMinY = 0;
	private m_worldMaxX = 0;
	private m_worldMaxY = 0;
	private m_bClampToBounds = false;

	// ── Lifecycle ─────────────────────────────────────────────────

	initialize(): void {
		this.m_mode = CameraMode.FollowPlayer;
		this.m_viewX = 0;
		this.m_viewY = 0;
		this.m_exactX = 0;
		this.m_exactY = 0;
		this.m_bShaking = false;
	}

	shutdown(): void {
		// Nothing to release in TS
	}

	// ── Viewport setup ────────────────────────────────────────────

	setViewportSize(width: number, height: number): void {
		this.m_viewWidth = width;
		this.m_viewHeight = height;
		this.m_viewWidthTiles = Math.ceil(width / this.m_tileWidth);
		this.m_viewHeightTiles = Math.ceil(height / this.m_tileHeight);
	}

	setTileSize(tileWidth: number, tileHeight: number): void {
		this.m_tileWidth = tileWidth;
		this.m_tileHeight = tileHeight;
		this.m_viewWidthTiles = Math.ceil(this.m_viewWidth / tileWidth);
		this.m_viewHeightTiles = Math.ceil(this.m_viewHeight / tileHeight);
	}

	// ── Attachment ────────────────────────────────────────────────

	attachToPlayer(): void {
		this.m_mode = CameraMode.FollowPlayer;
		this.m_attachedEntityId = 0;
	}

	attachToEntity(id: number): void {
		this.m_mode = CameraMode.FollowEntity;
		this.m_attachedEntityId = id;
	}

	detach(): void {
		this.m_mode = CameraMode.FreeCamera;
		this.m_attachedEntityId = 0;
	}

	setFixedPosition(worldX: number, worldY: number): void {
		this.m_mode = CameraMode.Fixed;
		this.m_targetX = worldX;
		this.m_targetY = worldY;
		this.m_exactX = worldX;
		this.m_exactY = worldY;
	}

	getMode(): CameraMode { return this.m_mode; }
	getAttachedEntityId(): number { return this.m_attachedEntityId; }
	isAttachedToPlayer(): boolean { return this.m_mode === CameraMode.FollowPlayer; }

	// ── Position accessors ────────────────────────────────────────

	/** Top-left tile X of the viewport. */
	getViewX(): number { return this.m_viewX; }
	/** Top-left tile Y of the viewport. */
	getViewY(): number { return this.m_viewY; }
	/** Center tile X of the viewport. */
	getCenterX(): number { return this.m_viewX + Math.floor(this.m_viewWidthTiles / 2); }
	/** Center tile Y of the viewport. */
	getCenterY(): number { return this.m_viewY + Math.floor(this.m_viewHeightTiles / 2); }

	getViewPosition(): [number, number] { return [this.m_viewX, this.m_viewY]; }

	/** Set the target position for the camera (in tiles). */
	setPosition(tileX: number, tileY: number): void {
		this.m_targetX = tileX;
		this.m_targetY = tileY;
		if (!this.m_bSmoothFollow) {
			this.m_exactX = tileX;
			this.m_exactY = tileY;
		}
	}

	/** Move target by delta tiles. */
	move(dx: number, dy: number): void {
		this.m_targetX += dx;
		this.m_targetY += dy;
	}

	/** Snap the view directly (bypassing smooth follow). */
	setViewPosition(tileX: number, tileY: number): void {
		this.m_exactX = tileX;
		this.m_exactY = tileY;
		this.m_targetX = tileX;
		this.m_targetY = tileY;
	}

	// ── Smooth follow ─────────────────────────────────────────────

	setSmoothFollow(enabled: boolean): void { this.m_bSmoothFollow = enabled; }
	setFollowSpeed(speed: number): void { this.m_followSpeed = speed; }
	isSmoothFollow(): boolean { return this.m_bSmoothFollow; }

	// ── Shake ─────────────────────────────────────────────────────

	shake(intensity: number, duration: number): void {
		this.m_bShaking = true;
		this.m_shakeDegree = intensity;
		this.m_shakeDuration = duration;
		this.m_shakeTimer = 0;
	}

	stopShake(): void {
		this.m_bShaking = false;
		this.m_shakeOffsetX = 0;
		this.m_shakeOffsetY = 0;
	}

	isShaking(): boolean { return this.m_bShaking; }
	getShakeOffsetX(): number { return this.m_shakeOffsetX; }
	getShakeOffsetY(): number { return this.m_shakeOffsetY; }
	getShakeDegree(): number { return this.m_shakeDegree; }

	// ── Coordinate conversion ─────────────────────────────────────

	/** Convert world pixel coordinates to screen coordinates. */
	worldToScreen(worldX: number, worldY: number): [number, number] {
		return [
			worldX - this.m_viewX * this.m_tileWidth + this.m_shakeOffsetX,
			worldY - this.m_viewY * this.m_tileHeight + this.m_shakeOffsetY,
		];
	}

	/** Convert screen coordinates to world pixel coordinates. */
	screenToWorld(screenX: number, screenY: number): [number, number] {
		return [
			screenX + this.m_viewX * this.m_tileWidth - this.m_shakeOffsetX,
			screenY + this.m_viewY * this.m_tileHeight - this.m_shakeOffsetY,
		];
	}

	// ── Visibility testing ────────────────────────────────────────

	isWorldPosVisible(worldX: number, worldY: number): boolean {
		const [sx, sy] = this.worldToScreen(worldX, worldY);
		return sx >= 0 && sx < this.m_viewWidth && sy >= 0 && sy < this.m_viewHeight;
	}

	isTileVisible(tileX: number, tileY: number): boolean {
		return tileX >= this.m_viewX && tileX < this.m_viewX + this.m_viewWidthTiles
			&& tileY >= this.m_viewY && tileY < this.m_viewY + this.m_viewHeightTiles;
	}

	getVisibleTileBounds(): { left: number; top: number; right: number; bottom: number } {
		return {
			left: this.m_viewX,
			top: this.m_viewY,
			right: this.m_viewX + this.m_viewWidthTiles,
			bottom: this.m_viewY + this.m_viewHeightTiles,
		};
	}

	// ── Viewport dimensions ───────────────────────────────────────

	getViewWidth(): number { return this.m_viewWidth; }
	getViewHeight(): number { return this.m_viewHeight; }
	getViewWidthTiles(): number { return this.m_viewWidthTiles; }
	getViewHeightTiles(): number { return this.m_viewHeightTiles; }
	getTileWidth(): number { return this.m_tileWidth; }
	getTileHeight(): number { return this.m_tileHeight; }

	// ── World bounds ──────────────────────────────────────────────

	setWorldBounds(minX: number, minY: number, maxX: number, maxY: number): void {
		this.m_worldMinX = minX;
		this.m_worldMinY = minY;
		this.m_worldMaxX = maxX;
		this.m_worldMaxY = maxY;
		this.m_bClampToBounds = true;
	}

	clearWorldBounds(): void {
		this.m_bClampToBounds = false;
	}

	// ── Per-frame update ──────────────────────────────────────────

	update(deltaTime: number): void {
		// Smooth follow towards target
		if (this.m_bSmoothFollow) {
			const speed = this.m_followSpeed * deltaTime;
			this.m_exactX += (this.m_targetX - this.m_exactX) * Math.min(1, speed);
			this.m_exactY += (this.m_targetY - this.m_exactY) * Math.min(1, speed);
		} else {
			this.m_exactX = this.m_targetX;
			this.m_exactY = this.m_targetY;
		}

		// Clamp to world bounds
		if (this.m_bClampToBounds) {
			this.m_exactX = Math.max(this.m_worldMinX, Math.min(this.m_worldMaxX - this.m_viewWidthTiles, this.m_exactX));
			this.m_exactY = Math.max(this.m_worldMinY, Math.min(this.m_worldMaxY - this.m_viewHeightTiles, this.m_exactY));
		}

		// Integer view position for rendering
		this.m_viewX = Math.floor(this.m_exactX);
		this.m_viewY = Math.floor(this.m_exactY);

		// Shake
		if (this.m_bShaking) {
			this.m_shakeTimer += deltaTime;
			if (this.m_shakeTimer >= this.m_shakeDuration) {
				this.stopShake();
			} else {
				const fade = 1.0 - this.m_shakeTimer / this.m_shakeDuration;
				const amp = this.m_shakeDegree * fade;
				this.m_shakeOffsetX = Math.round((Math.random() * 2 - 1) * amp);
				this.m_shakeOffsetY = Math.round((Math.random() * 2 - 1) * amp);
			}
		}
	}
}
