/**
 * TileRenderer — Ground tile rendering with background cache.
 * Mirrors C++ CGame::DrawBackground() with m_lpPDBGS cache surface.
 *
 * Manages a sprite pool on a PixiJS Container. When the camera tile
 * position (divX, divY) hasn't changed, skips re-assigning textures
 * (the sprites are already set from the last frame). When it changes,
 * updates the full pool — same optimization as the C++ cached surface.
 */

import { Container, Sprite, Texture } from 'pixi.js';
import { AssetManager } from '../assets/AssetManager';
import type { GameMap } from '../assets/map-parser';

const TILE_SIZE = 32;

export class TileRenderer {
	private layer: Container;
	private pool: Sprite[] = [];
	private poolIdx = 0;

	// Background cache: track last camera tile position
	private lastDivX = -9999;
	private lastDivY = -9999;
	private cacheValid = false;

	constructor(parent: Container) {
		this.layer = new Container();
		parent.addChild(this.layer);

		// Pre-allocate sprite pool
		for (let i = 0; i < 2500; i++) {
			const s = new Sprite(Texture.EMPTY);
			s.visible = false;
			this.layer.addChild(s);
			this.pool.push(s);
		}
	}

	getLayer(): Container {
		return this.layer;
	}

	/**
	 * Render ground tiles for the visible viewport.
	 * Mirrors C++ DrawBackground(sDivX, sModX, sDivY, sModY).
	 */
	render(
		screenW: number,
		screenH: number,
		cameraX: number,
		cameraY: number,
		map: GameMap,
		assets: AssetManager,
	): void {
		const divX = Math.floor(cameraX / TILE_SIZE);
		const divY = Math.floor(cameraY / TILE_SIZE);
		const modX = cameraX % TILE_SIZE;
		const modY = cameraY % TILE_SIZE;

		// Background cache: if camera tile position unchanged, skip texture re-assignment
		if (this.cacheValid && divX === this.lastDivX && divY === this.lastDivY) {
			// Only update sub-tile offset (pixel scrolling)
			const offX = -modX;
			const offY = -modY;
			const tilesX = Math.ceil(screenW / TILE_SIZE) + 2;
			let idx = 0;
			for (let ty = 0; idx < this.poolIdx; ty++) {
				for (let tx = 0; tx < tilesX && idx < this.poolIdx; tx++, idx++) {
					this.pool[idx].x = Math.floor(offX + tx * TILE_SIZE);
					this.pool[idx].y = Math.floor(offY + ty * TILE_SIZE);
				}
			}
			return;
		}

		// Cache miss: rebuild tile pool
		this.lastDivX = divX;
		this.lastDivY = divY;
		this.cacheValid = true;
		this.poolIdx = 0;

		const offX = -modX;
		const offY = -modY;
		const tilesX = Math.ceil(screenW / TILE_SIZE) + 2;
		const tilesY = Math.ceil(screenH / TILE_SIZE) + 2;

		for (let ty = 0; ty < tilesY; ty++) {
			for (let tx = 0; tx < tilesX; tx++) {
				const mx = divX + tx;
				const my = divY + ty;
				if (mx < 0 || mx >= map.sizeX || my < 0 || my >= map.sizeY) continue;

				const tile = map.tiles[mx][my];
				const f = assets.getTileFrame(tile.tileSprite, tile.tileSpriteFrame);
				if (!f) continue;

				const spr = this.getSprite();
				spr.texture = f.texture;
				spr.x = Math.floor(offX + tx * TILE_SIZE);
				spr.y = Math.floor(offY + ty * TILE_SIZE);
				spr.alpha = 1;
				spr.visible = true;
			}
		}

		// Hide unused
		for (let i = this.poolIdx; i < this.pool.length; i++) {
			this.pool[i].visible = false;
		}
	}

	/** Invalidate cache (e.g. on map change). */
	invalidateCache(): void {
		this.cacheValid = false;
		this.lastDivX = -9999;
		this.lastDivY = -9999;
	}

	private getSprite(): Sprite {
		if (this.poolIdx < this.pool.length) return this.pool[this.poolIdx++];
		const s = new Sprite(Texture.EMPTY);
		s.visible = false;
		this.layer.addChild(s);
		this.pool.push(s);
		this.poolIdx++;
		return s;
	}
}
