/**
 * Minimap — Overhead map view with player dot.
 * Mirrors the minimap from test-view/src/map.ts.
 *
 * Renders the map to a small canvas (150px max dimension), coloring
 * tiles by type: blocked (dark red), objects (dark green), teleport
 * (dark blue), walkable (earth tone). Player position shown as red dot.
 *
 * Uses an offscreen canvas for the map image, converted to a PixiJS
 * Sprite for display in the bottom-right corner of the screen.
 */

import { BaseTexture, Container, Graphics, SCALE_MODES, Sprite, Texture } from 'pixi.js';
import type { GameMap } from '../assets/map-parser';

const MINIMAP_MAX = 150;
const MINIMAP_MARGIN = 10;

export class Minimap {
	private container: Container;
	private mapSprite: Sprite;
	private dotGfx: Graphics;
	private borderGfx: Graphics;

	// Offscreen canvas for the map image
	private mapCanvas: HTMLCanvasElement;
	private mapCtx: CanvasRenderingContext2D;

	private mapW = 0;
	private mapH = 0;
	private scale = 1;
	private dirty = true;
	private currentMap: GameMap | null = null;

	constructor(parent: Container) {
		this.container = new Container();
		parent.addChild(this.container);

		this.mapCanvas = document.createElement('canvas');
		this.mapCtx = this.mapCanvas.getContext('2d')!;

		this.borderGfx = new Graphics();
		this.container.addChild(this.borderGfx);

		this.mapSprite = new Sprite(Texture.EMPTY);
		this.container.addChild(this.mapSprite);

		this.dotGfx = new Graphics();
		this.container.addChild(this.dotGfx);
	}

	/**
	 * Set the map to display. Triggers a full redraw on next draw().
	 */
	setMap(map: GameMap | null): void {
		this.currentMap = map;
		this.dirty = true;
	}

	/**
	 * Draw the minimap in the bottom-right corner.
	 */
	draw(screenW: number, screenH: number, playerX: number, playerY: number): void {
		if (!this.currentMap) {
			this.container.visible = false;
			return;
		}
		this.container.visible = true;

		const map = this.currentMap;

		// Rebuild map image if needed (only on map change)
		if (this.dirty) {
			this.rebuildMapImage(map);
			this.dirty = false;
		}

		// Position: bottom-right with margin, above HUD
		const mmX = screenW - this.mapW - MINIMAP_MARGIN;
		const mmY = screenH - this.mapH - MINIMAP_MARGIN - 60; // 60px above bottom for HUD
		this.container.x = mmX;
		this.container.y = mmY;

		// Border
		this.borderGfx.clear();
		this.borderGfx.lineStyle(1, 0x533483, 0.8);
		this.borderGfx.drawRect(-1, -1, this.mapW + 2, this.mapH + 2);

		// Player dot
		this.dotGfx.clear();
		const dotX = playerX * this.scale;
		const dotY = playerY * this.scale;
		const dotR = Math.max(2, this.scale * 2);

		this.dotGfx.beginFill(0xe94560);
		this.dotGfx.drawCircle(dotX, dotY, dotR);
		this.dotGfx.endFill();

		// Viewport rectangle
		const vpW = screenW / 32 * this.scale;
		const vpH = screenH / 32 * this.scale;
		this.dotGfx.lineStyle(1, 0xffffff, 0.4);
		this.dotGfx.drawRect(dotX - vpW / 2, dotY - vpH / 2, vpW, vpH);
	}

	/**
	 * Rebuild the offscreen map image from tile data.
	 */
	private rebuildMapImage(map: GameMap): void {
		this.scale = Math.min(MINIMAP_MAX / map.sizeX, MINIMAP_MAX / map.sizeY);
		this.mapW = Math.floor(map.sizeX * this.scale);
		this.mapH = Math.floor(map.sizeY * this.scale);

		this.mapCanvas.width = this.mapW;
		this.mapCanvas.height = this.mapH;

		const imgData = this.mapCtx.createImageData(this.mapW, this.mapH);
		const d = imgData.data;

		for (let py = 0; py < this.mapH; py++) {
			for (let px = 0; px < this.mapW; px++) {
				const tx = Math.floor(px / this.scale);
				const ty = Math.floor(py / this.scale);
				const tile = map.tiles[tx]?.[ty];
				const idx = (py * this.mapW + px) * 4;

				if (!tile) {
					d[idx] = d[idx + 1] = d[idx + 2] = 0;
					d[idx + 3] = 255;
					continue;
				}

				if (!tile.isMoveAllowed) {
					d[idx] = 50;
					d[idx + 1] = 20;
					d[idx + 2] = 20;
				} else if (tile.objectSprite > 0) {
					d[idx] = 30;
					d[idx + 1] = 55;
					d[idx + 2] = 30;
				} else if (tile.isTeleport) {
					d[idx] = 40;
					d[idx + 1] = 40;
					d[idx + 2] = 100;
				} else {
					const tint = 40 + (tile.tileSprite % 10) * 4;
					d[idx] = tint + 20;
					d[idx + 1] = tint + 10;
					d[idx + 2] = tint;
				}
				d[idx + 3] = 255;
			}
		}

		this.mapCtx.putImageData(imgData, 0, 0);

		// Convert canvas to PixiJS texture
		const baseTex = BaseTexture.from(this.mapCanvas, { scaleMode: SCALE_MODES.NEAREST });
		baseTex.update();
		this.mapSprite.texture = new Texture(baseTex);
		this.mapSprite.width = this.mapW;
		this.mapSprite.height = this.mapH;
	}

	setVisible(visible: boolean): void {
		this.container.visible = visible;
	}
}
