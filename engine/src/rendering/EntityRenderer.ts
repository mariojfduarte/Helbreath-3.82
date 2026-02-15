/**
 * EntityRenderer — Character/entity rendering with equipment layer system.
 * Mirrors C++ DrawObject_OnStop / DrawObject_OnMove from Sources/Client/Game.cpp.
 *
 * Equipment layer draw order depends on direction:
 *   _cDrawingOrder[dir]:       0 = weapon last, 1 = weapon first
 *   _cMantleDrawingOrder[dir]: 0 = before body, 1 = after shield, 2 = after helm
 *
 * Phase 3: draws body + shadow for the player. Full equipment layering
 * (weapon, armor, helm, shield, mantle, boots, leggings) will be wired
 * when Phase 5 entity data provides the equipment indices.
 */

import { Container, Sprite, Texture } from 'pixi.js';
import { AssetManager, type SpriteFrame } from '../assets/AssetManager';
import type { Bounds } from './ObjectRenderer';

const TILE_SIZE = 32;

// ── Direction-dependent drawing order tables (from C++ Game.cpp) ──

/**
 * Index by direction (1-8). Value 1 = draw weapon BEFORE body.
 * Dirs N(1), NW(8), NE(2) → weapon first (facing away from camera).
 */
export const DRAWING_ORDER = [0, 1, 0, 0, 0, 0, 0, 1, 1]; // index 0 unused

/**
 * Index by direction (1-8). Controls when mantle is drawn relative to body:
 *   0 = before body (mantle behind)
 *   1 = after shield (mantle on top)
 *   2 = after helm (mantle between helm and shield)
 */
export const MANTLE_DRAWING_ORDER = [0, 1, 1, 1, 0, 0, 0, 2, 2];

/**
 * Mantle order variant used during running animation.
 */
export const MANTLE_DRAWING_ORDER_RUN = [0, 1, 1, 1, 1, 1, 1, 1, 1];

// ── Equipment layer indices (C++ sprite ID offsets) ──────────────

/** Equipment layer identifiers for future Phase 5 entity data. */
export enum EquipLayer {
	Body = 0,
	Weapon,
	Shield,
	Mantle,
	Undies,
	BodyArmor,
	ArmArmor,
	Leggings,
	Boots,
	Helm,
	Hair,
}

/**
 * Equipment data for a single entity. Phase 3 uses only body.
 * Phase 5 will populate all fields from server entity data.
 */
export interface EntityEquipment {
	bodyIndex: number;        // Base sprite index for body
	weaponIndex: number;      // -1 if no weapon
	shieldIndex: number;      // -1 if no shield
	mantleIndex: number;      // -1 if no mantle
	undiesIndex: number;      // -1 if no undies
	bodyArmorIndex: number;   // -1 if no body armor
	armArmorIndex: number;    // -1 if no arm armor
	leggingsIndex: number;    // -1 if no leggings
	bootsIndex: number;       // -1 if no boots
	helmIndex: number;        // -1 if no helm
	hairIndex: number;        // -1 if no hair (or wearing helm)

	// Color indices for tinting (0 = no tint)
	weaponColor: number;
	shieldColor: number;
	armorColor: number;
	mantleColor: number;
	armColor: number;
	pantsColor: number;
	bootsColor: number;
	helmColor: number;

	isInvisible: boolean;     // bInv flag — draw at alpha 0.5
}

/** Create default equipment (body only, no gear). */
export function defaultEquipment(): EntityEquipment {
	return {
		bodyIndex: 0,
		weaponIndex: -1,
		shieldIndex: -1,
		mantleIndex: -1,
		undiesIndex: -1,
		bodyArmorIndex: -1,
		armArmorIndex: -1,
		leggingsIndex: -1,
		bootsIndex: -1,
		helmIndex: -1,
		hairIndex: -1,
		weaponColor: 0,
		shieldColor: 0,
		armorColor: 0,
		mantleColor: 0,
		armColor: 0,
		pantsColor: 0,
		bootsColor: 0,
		helmColor: 0,
		isInvisible: false,
	};
}

// ── EntityRenderer ───────────────────────────────────────────────

export class EntityRenderer {
	private worldLayer: Container;

	// Player sprites (Phase 3: body + shadow only)
	private charSprite: Sprite;
	private charShadowSprite: Sprite;

	constructor(worldLayer: Container) {
		this.worldLayer = worldLayer;

		this.charShadowSprite = new Sprite(Texture.EMPTY);
		this.charShadowSprite.visible = false;
		this.charShadowSprite.tint = 0x000000;
		this.charShadowSprite.alpha = 0.3;
		worldLayer.addChild(this.charShadowSprite);

		this.charSprite = new Sprite(Texture.EMPTY);
		this.charSprite.visible = false;
		worldLayer.addChild(this.charSprite);
	}

	/**
	 * Draw the player character.
	 * Phase 3: body + shadow. Phase 5 will add full equipment layers.
	 *
	 * @returns Player screen bounds for object transparency checks.
	 */
	drawPlayer(
		playerX: number,
		playerY: number,
		playerDir: number,
		playerAction: number,
		playerFrame: number,
		cameraX: number,
		cameraY: number,
		assets: AssetManager,
	): Bounds {
		const emptyBounds: Bounds = { left: 0, top: 0, right: 0, bottom: 0 };

		// Get character frame from AssetManager
		const f = assets.getCharFrame(playerAction, playerDir, playerFrame);
		if (!f) {
			this.charSprite.visible = false;
			this.charShadowSprite.visible = false;
			return emptyBounds;
		}

		const sx = Math.floor(playerX * TILE_SIZE - cameraX + f.pivotX);
		const sy = Math.floor(playerY * TILE_SIZE - cameraY + f.pivotY);
		const playerTileY = Math.round(playerY);

		// Shadow (slightly offset, drawn below body)
		this.charShadowSprite.zIndex = playerTileY - 0.1;
		this.charShadowSprite.texture = f.texture;
		this.charShadowSprite.x = sx + 2;
		this.charShadowSprite.y = sy + 4;
		this.charShadowSprite.visible = true;

		// Body
		this.charSprite.zIndex = playerTileY;
		this.charSprite.texture = f.texture;
		this.charSprite.x = sx;
		this.charSprite.y = sy;
		this.charSprite.visible = true;

		return {
			left: sx,
			top: sy,
			right: sx + f.width,
			bottom: sy + f.height,
		};
	}

	/**
	 * Draw a full entity with equipment layers (Phase 5 stub).
	 * For now this is the same as drawPlayer but with the equipment
	 * data structure ready for future use.
	 */
	drawEntity(
		_screenX: number,
		_screenY: number,
		_dir: number,
		_frame: number,
		_zIndex: number,
		_equip: EntityEquipment,
		_assets: AssetManager,
	): void {
		// Phase 5: full equipment layer rendering with DRAWING_ORDER
		// and MANTLE_DRAWING_ORDER direction-dependent draw order.
		//
		// Draw order when DRAWING_ORDER[dir] == 1 (weapon first):
		//   1. Weapon
		//   2. Shadow
		//   3. Body
		//   4. Mantle (if mantleOrder == 0)
		//   5. Undies
		//   6. Leggings
		//   7. ArmArmor
		//   8. Boots
		//   9. BodyArmor
		//  10. Helm
		//  11. Mantle (if mantleOrder == 2)
		//  12. Shield
		//  13. Mantle (if mantleOrder == 1)
		//
		// Draw order when DRAWING_ORDER[dir] == 0 (weapon last):
		//   Same as above but Weapon moves to last position.
	}
}
