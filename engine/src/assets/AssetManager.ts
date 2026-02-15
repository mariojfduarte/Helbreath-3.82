/**
 * AssetManager — Central asset registry and loader.
 * Mirrors C++ CGame sprite loading (MakeTileSpr, MakeSprite, Sprites::Create)
 * and map loading. Provides async loading with progress callbacks.
 *
 * Extracted from the proven loading logic in engine/src/benchmark/manual.ts.
 */

import {
	BaseTexture, Texture, Rectangle, SCALE_MODES,
} from 'pixi.js';
import { parsePak, decodeSpriteImage, type PakSprite } from './pak-parser';
import { parseMap, findSpawnPoint, type GameMap } from './map-parser';
import { TILE_PAK_MAP, SPECIAL_TILE_SPRITES } from './SpriteDefs';
import { ACTION_TO_SPRITE_OFFSET } from '../core/ActionID';

// ── Types ────────────────────────────────────────────────────────

export interface SpriteFrame {
	texture: Texture;
	pivotX: number;
	pivotY: number;
	width: number;
	height: number;
}

export type ProgressCallback = (message: string, progress: number) => void;

// ── AssetManager singleton ───────────────────────────────────────

export class AssetManager {
	private static s_instance: AssetManager | null = null;

	static get(): AssetManager {
		if (!AssetManager.s_instance) {
			AssetManager.s_instance = new AssetManager();
		}
		return AssetManager.s_instance;
	}

	// ── Caches ────────────────────────────────────────────────────

	/** tileID → SpriteFrame[] */
	private tileCache = new Map<number, SpriteFrame[]>();

	/** spriteIndex → SpriteFrame[] (character sprites) */
	private charCache = new Map<number, SpriteFrame[]>();

	/** Loaded map */
	private currentMap: GameMap | null = null;

	// ── Stats ─────────────────────────────────────────────────────

	private tilesLoaded = 0;

	// ── Accessors ─────────────────────────────────────────────────

	getTileFrames(id: number): SpriteFrame[] | undefined {
		return this.tileCache.get(id);
	}

	getTileFrame(spriteId: number, frame: number): SpriteFrame | null {
		const frames = this.tileCache.get(spriteId);
		if (!frames || frames.length === 0) return null;
		return frames[frame % frames.length] ?? frames[0];
	}

	getCharFrames(spriteIndex: number): SpriteFrame[] | undefined {
		return this.charCache.get(spriteIndex);
	}

	getCharFrame(action: number, dir: number, frame: number): SpriteFrame | null {
		// Map DEF_OBJECT* action ID to PAK sprite action offset
		const offset = ACTION_TO_SPRITE_OFFSET[action] ?? action;
		const sprIdx = offset * 8 + (dir - 1);
		const frames = this.charCache.get(sprIdx);
		if (!frames || frames.length === 0) return null;
		return frames[frame % frames.length] ?? frames[0];
	}

	getMap(): GameMap | null {
		return this.currentMap;
	}

	getTilesLoadedCount(): number {
		return this.tilesLoaded;
	}

	// ── Loading: tiles ────────────────────────────────────────────

	/**
	 * Load all tile sprites (batch PAKs + special sprites).
	 * Mirrors C++ loading cases 4, 8, 12 in UpdateScreen_OnLoading.
	 */
	async loadTileSprites(onProgress?: ProgressCallback): Promise<void> {
		this.tileCache.clear();
		this.tilesLoaded = 0;

		const totalPaks = TILE_PAK_MAP.length;
		let loaded = 0;

		// Batch PAKs
		for (const [pakName, startID, count] of TILE_PAK_MAP) {
			try {
				onProgress?.(`Loading ${pakName}.pak...`, 0.1 + 0.6 * (loaded / totalPaks));
				const resp = await fetch(`/sprites/${pakName}.pak`);
				if (!resp.ok) { loaded++; continue; }
				const pak = parsePak(await resp.arrayBuffer());

				for (let i = 0; i < Math.min(count, pak.sprites.length); i++) {
					const frames = await this.decodeSpriteToFrames(pak.sprites[i]);
					if (frames) {
						this.tileCache.set(startID + i, frames);
						this.tilesLoaded++;
					}
				}
			} catch {
				// Skip failed PAKs
			}
			loaded++;
		}

		// Special single-sprite entries (Structures1 etc.)
		onProgress?.('Loading special tiles...', 0.75);
		await this.loadSpecialTileSprites();
	}

	private async loadSpecialTileSprites(): Promise<void> {
		const byPak = new Map<string, [number, number][]>();
		for (const [pakName, pakIdx, tileId] of SPECIAL_TILE_SPRITES) {
			if (!byPak.has(pakName)) byPak.set(pakName, []);
			byPak.get(pakName)!.push([pakIdx, tileId]);
		}

		for (const [pakName, entries] of byPak) {
			try {
				// Try original case, then lowercase fallback
				let resp = await fetch(`/sprites/${pakName}.pak`);
				if (!resp.ok) {
					resp = await fetch(`/sprites/${pakName.toLowerCase()}.pak`);
					if (!resp.ok) continue;
				}
				const pak = parsePak(await resp.arrayBuffer());

				for (const [pakIdx, tileId] of entries) {
					if (pakIdx >= pak.spriteCount) continue;
					const sprite = pak.sprites[pakIdx];
					if (!sprite || sprite.imageData.length === 0) continue;

					const frames = await this.decodeSpriteToFrames(sprite);
					if (frames) {
						this.tileCache.set(tileId, frames);
						this.tilesLoaded++;
					}
				}
			} catch {
				// Skip
			}
		}
	}

	// ── Loading: character ────────────────────────────────────────

	/**
	 * Load character sprites from a PAK file (e.g. "Wm", "Bm").
	 */
	async loadCharacter(pakName: string, onProgress?: ProgressCallback): Promise<void> {
		this.charCache.clear();
		onProgress?.(`Loading ${pakName}.pak...`, 0.85);

		try {
			const resp = await fetch(`/sprites/${pakName}.pak`);
			if (!resp.ok) return;
			const pak = parsePak(await resp.arrayBuffer());

			for (let si = 0; si < pak.sprites.length; si++) {
				const sprite = pak.sprites[si];
				const decoded = await decodeSpriteImage(sprite);
				if (!decoded) continue;

				const baseTex = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });
				const frames: SpriteFrame[] = sprite.frames.map(f => ({
					texture: new Texture(baseTex, new Rectangle(f.x, f.y, f.width, f.height)),
					pivotX: f.pivotX,
					pivotY: f.pivotY,
					width: f.width,
					height: f.height,
				}));

				this.charCache.set(si, frames);
			}
		} catch (e) {
			console.error(`[AssetManager] Failed to load ${pakName}:`, e);
		}
	}

	// ── Loading: map ──────────────────────────────────────────────

	/**
	 * Load a .amd map file.
	 */
	async loadMap(mapName: string, onProgress?: ProgressCallback): Promise<GameMap | null> {
		onProgress?.(`Loading ${mapName}.amd...`, 0);

		try {
			const resp = await fetch(`/mapdata/${mapName}.amd`);
			if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
			const buf = await resp.arrayBuffer();
			this.currentMap = parseMap(buf, mapName);
			return this.currentMap;
		} catch (e) {
			console.error(`[AssetManager] Failed to load map ${mapName}:`, e);
			return null;
		}
	}

	/**
	 * Get the spawn point for the current map.
	 */
	getSpawnPoint(): { x: number; y: number } {
		if (!this.currentMap) return { x: 0, y: 0 };
		return findSpawnPoint(this.currentMap);
	}

	// ── Full load sequence ────────────────────────────────────────

	/**
	 * Load everything needed to display a map: map data, tiles, character.
	 */
	async loadAll(mapName: string, charPak: string, onProgress?: ProgressCallback): Promise<boolean> {
		// 1. Map
		const map = await this.loadMap(mapName, onProgress);
		if (!map) return false;

		// 2. Tile sprites
		await this.loadTileSprites(onProgress);

		// 3. Character
		await this.loadCharacter(charPak, onProgress);

		onProgress?.('Ready', 1.0);
		return true;
	}

	// ── Decode helper ─────────────────────────────────────────────

	/**
	 * Decode a PAK sprite into SpriteFrame[]. One frame per entry;
	 * zero-size clamped rects become Texture.EMPTY.
	 */
	private async decodeSpriteToFrames(sprite: PakSprite): Promise<SpriteFrame[] | null> {
		const decoded = await decodeSpriteImage(sprite);
		if (!decoded) return null;

		const baseTex = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });
		const texW = decoded.width;
		const texH = decoded.height;

		return sprite.frames.map(f => {
			const cx = Math.min(f.x, texW);
			const cy = Math.min(f.y, texH);
			const cw = Math.min(f.width, texW - cx);
			const ch = Math.min(f.height, texH - cy);

			return {
				texture: (cw > 0 && ch > 0)
					? new Texture(baseTex, new Rectangle(cx, cy, cw, ch))
					: Texture.EMPTY,
				pivotX: f.pivotX,
				pivotY: f.pivotY,
				width: cw > 0 ? cw : 0,
				height: ch > 0 ? ch : 0,
			};
		});
	}
}
