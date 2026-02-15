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

import { Container, Sprite, Texture } from "pixi.js";
import { AssetManager, type SpriteFrame } from "../assets/AssetManager";
import type { Bounds } from "./ObjectRenderer";

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
  bodyIndex: number; // Base sprite index for body
  weaponIndex: number; // -1 if no weapon
  shieldIndex: number; // -1 if no shield
  mantleIndex: number; // -1 if no mantle
  undiesIndex: number; // -1 if no undies
  bodyArmorIndex: number; // -1 if no body armor
  armArmorIndex: number; // -1 if no arm armor
  leggingsIndex: number; // -1 if no leggings
  bootsIndex: number; // -1 if no boots
  helmIndex: number; // -1 if no helm
  hairIndex: number; // -1 if no hair (or wearing helm)

  // Color indices for tinting (0 = no tint)
  weaponColor: number;
  shieldColor: number;
  armorColor: number;
  mantleColor: number;
  armColor: number;
  pantsColor: number;
  bootsColor: number;
  helmColor: number;

  isInvisible: boolean; // bInv flag — draw at alpha 0.5
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

  // Equipment layer sprite pool for drawEntity (Phase 5).
  // Pool size: body + weapon + shield + mantle + undies + bodyArmor +
  //            armArmor + leggings + boots + helm + hair + spare = 12
  private static readonly ENTITY_POOL_SIZE = 12;
  private entityPool: Sprite[] = [];
  private entityShadow: Sprite;

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

    // Entity equipment sprite pool
    this.entityShadow = new Sprite(Texture.EMPTY);
    this.entityShadow.visible = false;
    this.entityShadow.tint = 0x000000;
    this.entityShadow.alpha = 0.3;
    worldLayer.addChild(this.entityShadow);

    for (let i = 0; i < EntityRenderer.ENTITY_POOL_SIZE; i++) {
      const s = new Sprite(Texture.EMPTY);
      s.visible = false;
      worldLayer.addChild(s);
      this.entityPool.push(s);
    }
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
    assets: AssetManager
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
   * Draw a full entity with equipment layers.
   * Faithfully mirrors C++ DrawObject_OnStop / DrawObject_OnMove
   * equipment layer ordering from Sources/Client/Game.cpp.
   *
   * Sprite index conventions (matching C++):
   *   - Body:    charCache[bodyIndex + (dir-1)],  frame = animFrame
   *   - Weapon:  charCache[weaponIndex],           frame = animFrame
   *   - Others:  charCache[equipIndex],            frame = (dir-1)*8 + animFrame
   *
   * @param screenX  Base screen X (worldX * TILE_SIZE - cameraX)
   * @param screenY  Base screen Y (worldY * TILE_SIZE - cameraY)
   * @param dir      Direction 1-8
   * @param frame    Animation frame index
   * @param zIndex   Base Z index for Y-sorting (typically Math.round(worldY))
   * @param equip    Equipment data with sprite indices
   * @param assets   AssetManager for sprite lookups
   * @returns        Screen bounds of the body sprite for transparency checks
   */
  drawEntity(
    screenX: number,
    screenY: number,
    dir: number,
    frame: number,
    zIndex: number,
    equip: EntityEquipment,
    assets: AssetManager
  ): Bounds {
    const emptyBounds: Bounds = { left: 0, top: 0, right: 0, bottom: 0 };

    // ── Reset pool ───────────────────────────────────────────
    for (const s of this.entityPool) s.visible = false;
    this.entityShadow.visible = false;

    // ── Pool allocator + z-order counter ─────────────────────
    let poolIdx = 0;
    let layerN = 0;
    const Z_STEP = 0.0001;
    const baseZ = zIndex;

    // Alpha values: invisible entities use reduced alpha
    const bodyAlpha = equip.isInvisible ? 0.5 : 1.0;
    const equipAlpha = equip.isInvisible ? 0.25 : 1.0;

    // ── Frame index helpers ──────────────────────────────────
    // Equipment layers: (dir-1)*8 + frame  (direction baked into frame)
    // Weapon / Body:   frame directly       (direction via sprite index)
    const equipFrame = (dir - 1) * 8 + frame;
    const bodySprIdx = equip.bodyIndex + (dir - 1);

    // ── Helper: get frame from charCache ─────────────────────
    const getFrame = (sprIdx: number, fIdx: number): SpriteFrame | null => {
      const frames = assets.getCharFrames(sprIdx);
      if (!frames || frames.length === 0) return null;
      return frames[fIdx % frames.length] ?? frames[0];
    };

    // ── Helper: draw a single layer from the pool ────────────
    const drawLayer = (
      sprIdx: number,
      fIdx: number,
      alpha: number
    ): SpriteFrame | null => {
      if (sprIdx < 0 || poolIdx >= this.entityPool.length) return null;
      const f = getFrame(sprIdx, fIdx);
      if (!f) return null;

      const s = this.entityPool[poolIdx++];
      s.texture = f.texture;
      s.x = Math.floor(screenX + f.pivotX);
      s.y = Math.floor(screenY + f.pivotY);
      s.zIndex = baseZ + layerN++ * Z_STEP;
      s.alpha = alpha;
      s.tint = 0xffffff;
      s.visible = true;
      return f;
    };

    // ── Body frame (needed for shadow + bounds) ──────────────
    const bodyFrame = getFrame(bodySprIdx, frame);
    if (!bodyFrame) return emptyBounds;

    // ── Direction-dependent draw order flags ──────────────────
    const weaponFirst = DRAWING_ORDER[dir] === 1;
    const mantleOrder = MANTLE_DRAWING_ORDER[dir]; // 0, 1, or 2

    // ==========================================================
    // Equipment layer draw order (C++ Game.cpp DrawObject_OnStop)
    // ==========================================================

    // 1. Weapon — first when facing away (dirs N, NE, NW)
    if (weaponFirst && equip.weaponIndex >= 0) {
      drawLayer(equip.weaponIndex, frame, equipAlpha);
    }

    // 2. Shadow — drawn before body at slight offset
    if (!equip.isInvisible) {
      this.entityShadow.texture = bodyFrame.texture;
      this.entityShadow.x = Math.floor(screenX + bodyFrame.pivotX) + 2;
      this.entityShadow.y = Math.floor(screenY + bodyFrame.pivotY) + 4;
      this.entityShadow.zIndex = baseZ + layerN++ * Z_STEP;
      this.entityShadow.visible = true;
    }

    // 3. Body
    drawLayer(bodySprIdx, frame, bodyAlpha);

    // 4. Mantle (position 0: behind body equipment)
    if (equip.mantleIndex >= 0 && mantleOrder === 0) {
      drawLayer(equip.mantleIndex, equipFrame, equipAlpha);
    }

    // 5. Undies
    if (equip.undiesIndex >= 0) {
      drawLayer(equip.undiesIndex, equipFrame, equipAlpha);
    }

    // 6. Hair (only drawn when no helm equipped)
    if (equip.hairIndex >= 0 && equip.helmIndex < 0) {
      // Hair always uses tint for color (no invisibility alpha override)
      drawLayer(equip.hairIndex, equipFrame, 1.0);
    }

    // 7. Leggings
    if (equip.leggingsIndex >= 0) {
      drawLayer(equip.leggingsIndex, equipFrame, equipAlpha);
    }

    // 8. Arm Armor
    if (equip.armArmorIndex >= 0) {
      drawLayer(equip.armArmorIndex, equipFrame, equipAlpha);
    }

    // 9. Boots
    if (equip.bootsIndex >= 0) {
      drawLayer(equip.bootsIndex, equipFrame, equipAlpha);
    }

    // 10. Body Armor
    if (equip.bodyArmorIndex >= 0) {
      drawLayer(equip.bodyArmorIndex, equipFrame, equipAlpha);
    }

    // 11. Helm
    if (equip.helmIndex >= 0) {
      drawLayer(equip.helmIndex, equipFrame, equipAlpha);
    }

    // 12. Mantle (position 2: between helm and shield)
    if (equip.mantleIndex >= 0 && mantleOrder === 2) {
      drawLayer(equip.mantleIndex, equipFrame, equipAlpha);
    }

    // 13. Shield
    if (equip.shieldIndex >= 0) {
      drawLayer(equip.shieldIndex, equipFrame, equipAlpha);
    }

    // 14. Mantle (position 1: after shield, on top)
    if (equip.mantleIndex >= 0 && mantleOrder === 1) {
      drawLayer(equip.mantleIndex, equipFrame, equipAlpha);
    }

    // 15. Weapon — last when facing toward camera (dirs S, SE, SW, E, W)
    if (!weaponFirst && equip.weaponIndex >= 0) {
      drawLayer(equip.weaponIndex, frame, equipAlpha);
    }

    // ── Return body bounds for transparency checks ───────────
    const bx = Math.floor(screenX + bodyFrame.pivotX);
    const by = Math.floor(screenY + bodyFrame.pivotY);
    return {
      left: bx,
      top: by,
      right: bx + bodyFrame.width,
      bottom: by + bodyFrame.height,
    };
  }
}
