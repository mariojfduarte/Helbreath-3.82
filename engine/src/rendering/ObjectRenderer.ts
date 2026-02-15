/**
 * ObjectRenderer — Map object sprite rendering with Y-sort and transparency.
 * Mirrors the object drawing portion of C++ CGame::DrawObjects().
 *
 * Manages a sprite pool on a shared worldLayer (Container with sortableChildren).
 * Objects are drawn with zIndex = tileY + 0.5 so they sort correctly with entities.
 * When an object's screen rect overlaps the player, it becomes semi-transparent.
 * Tree shadows (objectSprite 100-199) are drawn using the shadow sprite at ID+50.
 */

import { Container, Sprite, Texture } from 'pixi.js';
import { AssetManager } from '../assets/AssetManager';
import type { GameMap } from '../assets/map-parser';

const TILE_SIZE = 32;

export interface Bounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export class ObjectRenderer {
	private pool: Sprite[] = [];
	private poolIdx = 0;
	private worldLayer: Container;

	constructor(worldLayer: Container) {
		this.worldLayer = worldLayer;

		// Pre-allocate object sprite pool
		for (let i = 0; i < 2000; i++) {
			const s = new Sprite(Texture.EMPTY);
			s.visible = false;
			worldLayer.addChild(s);
			this.pool.push(s);
		}
	}

	/**
	 * Render all visible map objects.
	 * Call after TileRenderer and EntityRenderer so zIndex sorting works.
	 */
	render(
		screenW: number,
		screenH: number,
		cameraX: number,
		cameraY: number,
		map: GameMap,
		assets: AssetManager,
		playerBounds: Bounds,
	): void {
		this.poolIdx = 0;

		const startTX = Math.floor(cameraX / TILE_SIZE);
		const startTY = Math.floor(cameraY / TILE_SIZE);
		const offX = -(cameraX % TILE_SIZE);
		const offY = -(cameraY % TILE_SIZE);
		const tilesX = Math.ceil(screenW / TILE_SIZE) + 2;
		const tilesY = Math.ceil(screenH / TILE_SIZE) + 2;

		// Extended range: objects can be tall, so check beyond the visible area
		for (let ty = -7; ty < tilesY + 4; ty++) {
			for (let tx = -4; tx < tilesX + 4; tx++) {
				const mx = startTX + tx;
				const my = startTY + ty;
				if (mx < 0 || mx >= map.sizeX || my < 0 || my >= map.sizeY) continue;

				const tile = map.tiles[mx][my];
				if (tile.objectSprite <= 0) continue;

				const f = assets.getTileFrame(tile.objectSprite, tile.objectSpriteFrame);
				if (!f || f.texture === Texture.EMPTY || f.width <= 0) continue;

				const baseX = Math.floor(offX + tx * TILE_SIZE);
				const baseY = Math.floor(offY + ty * TILE_SIZE);
				const drawX = baseX - 16 + f.pivotX;
				const drawY = baseY - 16 + f.pivotY;

				// Transparency: C++-style CalculateBounds — object screen rect vs player rect
				const objRect: Bounds = {
					left: drawX,
					top: drawY,
					right: drawX + f.width,
					bottom: drawY + f.height,
				};
				const overlaps = boundsOverlap(objRect, playerBounds);

				// Tree shadows (ID+50) for sprites 100-199
				if (tile.objectSprite >= 100 && tile.objectSprite < 200) {
					const shadowFrames = assets.getTileFrames(tile.objectSprite + 50);
					if (shadowFrames && tile.objectSpriteFrame < shadowFrames.length) {
						const sf = shadowFrames[tile.objectSpriteFrame];
						const ss = this.getSprite();
						ss.texture = sf.texture;
						ss.x = baseX;
						ss.y = baseY;
						ss.zIndex = my + 0.4;
						ss.alpha = overlaps ? 0.15 : 1;
						ss.tint = overlaps ? 0x000000 : 0xFFFFFF;
						ss.visible = true;
					}
				}

				// Main object sprite
				const spr = this.getSprite();
				spr.texture = f.texture;
				spr.x = drawX;
				spr.y = drawY;
				spr.zIndex = my + 0.5;
				spr.tint = 0xFFFFFF;
				spr.alpha = overlaps ? 0.25 : 1;
				spr.visible = true;
			}
		}

		// Hide unused pool sprites
		for (let i = this.poolIdx; i < this.pool.length; i++) {
			this.pool[i].visible = false;
		}
	}

	private getSprite(): Sprite {
		if (this.poolIdx < this.pool.length) return this.pool[this.poolIdx++];
		const s = new Sprite(Texture.EMPTY);
		s.visible = false;
		this.worldLayer.addChild(s);
		this.pool.push(s);
		this.poolIdx++;
		return s;
	}
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
