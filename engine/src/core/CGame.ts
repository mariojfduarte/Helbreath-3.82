/**
 * CGame — Central game coordinator.
 * Mirrors C++ CGame from Sources/Client/Game.h/.cpp.
 *
 * Phase 3: Rendering delegated to TileRenderer, ObjectRenderer, EntityRenderer.
 * CGame owns player state, movement, input, and the PixiJS application.
 * drawScreen_OnGame() calls subsystems in the same order as C++ DrawScreen_OnGame:
 *   1. DrawBackground  → TileRenderer
 *   2. DrawEffectLights → stub (Phase 8)
 *   3. DrawObjects      → EntityRenderer + ObjectRenderer
 *   4. DrawEffects      → stub (Phase 8)
 *   5. DrawWeather      → stub (Phase 8)
 *   6. DrawChat/UI      → HUD overlay
 */

import {
  Application,
  BaseTexture,
  SCALE_MODES,
  Container,
  Sprite,
  Graphics,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";
// Graphics, Text, TextStyle used for loading overlay
import { DEF_GAMEMODE_ONLOADING, DEF_GAMEMODE_ONMAINGAME } from "./GameModes";
import { GameClock } from "./GameClock";
import { FrameTiming, ProfileStage } from "./FrameTiming";
import { InputManager } from "./InputManager";
import { Camera } from "./Camera";
import { SceneManager } from "./SceneManager";
import { AssetManager } from "../assets/AssetManager";
import type { GameMap } from "../assets/map-parser";
import { DEFAULT_MAP, DEFAULT_CHAR_PAK } from "../assets/SpriteDefs";
import { TileRenderer } from "../rendering/TileRenderer";
import { ObjectRenderer, type Bounds } from "../rendering/ObjectRenderer";
import { EntityRenderer, defaultEquipment, type EntityEquipment } from "../rendering/EntityRenderer";
import { AnimationController } from "./AnimationController";
import { DEF_OBJECTSTOP, DEF_OBJECTMOVE, DEF_OBJECTRUN, ACTION_TO_SPRITE_OFFSET } from "./ActionID";
import {
  type EquipSlot,
  getEquipBaseIndex,
  getSlotBase,
  WEAPON_STRIDE,
} from "../assets/EquipmentDefs";
import { HUD } from "../ui/HUD";
import { Minimap } from "../ui/Minimap";

// ── Constants ────────────────────────────────────────────────────

const TILE_SIZE = 32;

const DIR_N = 1,
  DIR_NE = 2,
  DIR_E = 3,
  DIR_SE = 4;
const DIR_S = 5,
  DIR_SW = 6,
  DIR_W = 7,
  DIR_NW = 8;
const DIR_DX: Record<number, number> = {
  [DIR_N]: 0,
  [DIR_NE]: 1,
  [DIR_E]: 1,
  [DIR_SE]: 1,
  [DIR_S]: 0,
  [DIR_SW]: -1,
  [DIR_W]: -1,
  [DIR_NW]: -1,
};
const DIR_DY: Record<number, number> = {
  [DIR_N]: -1,
  [DIR_NE]: -1,
  [DIR_E]: 0,
  [DIR_SE]: 1,
  [DIR_S]: 1,
  [DIR_SW]: 1,
  [DIR_W]: 0,
  [DIR_NW]: -1,
};
const MOVE_DURATION_MS = 260;
const RUN_DURATION_MS = 150;

// ── CGame ────────────────────────────────────────────────────────

export class CGame {
  // ── Public state ──────────────────────────────────────────────

  get m_cGameMode(): number {
    return this.sceneManager.getGameMode();
  }
  m_bIsProgramActive = true;
  m_bSkipFrame = false;
  G_dwGlobalTime = 0;

  // ── PixiJS ───────────────────────────────────────────────────

  app!: Application;
  private worldLayer!: Container;
  private hudLayer!: Container;

  // ── Rendering subsystems ─────────────────────────────────────

	private tileRenderer!: TileRenderer;
	private objectRenderer!: ObjectRenderer;
	private entityRenderer!: EntityRenderer;
	private hud!: HUD;
	private minimap!: Minimap;
	private overlayGfx!: Graphics;
	private cursorSprite!: Sprite;
	private cursorFrames: Array<{ texture: Texture; pivotX: number; pivotY: number }> = [];
	private cursorLoaded = false;

	// ── Debug overlay flags (set from UI checkboxes) ─────────────

	showBlocked = false;
	showTeleports = false;
	showGrid = false;

  // ── Spawned monsters ────────────────────────────────────────

  private spawnedMonsters: Array<{
    pakName: string;
    ownerType: number;
    x: number;
    y: number;
    dir: number;
    anim: AnimationController;
    sprite: Sprite;
    shadowSprite: Sprite;
  }> = [];

  // ── Core subsystems ──────────────────────────────────────────

  private sceneManager = new SceneManager();

  // ── Player state ─────────────────────────────────────────────

  private playerX = 0;
  private playerY = 0;
  private playerDir = DIR_S;
  private playerAnim = new AnimationController(1); // ownerType 1 = player character
  private playerBounds: Bounds = { left: 0, top: 0, right: 0, bottom: 0 };

  /**
   * Per-slot equipment: maps slot → { group, pakName } for equipped items.
   * When non-empty, drawEntity is used instead of drawPlayer.
   */
  private playerEquipSlots = new Map<EquipSlot, { group: number; pakName: string }>();

  /** True if current character body is female (Bw/Ww/Yw). */
  private isFemaleChar = false;

  // ── Movement ─────────────────────────────────────────────────

  private isMoving = false;
  private moveStartTime = 0;
  private moveFromX = 0;
  private moveFromY = 0;
  private moveToX = 0;
  private moveToY = 0;
  private moveDuration = MOVE_DURATION_MS;

  // ── Camera ───────────────────────────────────────────────────

  private cameraX = 0;
  private cameraY = 0;

  // ── Loading ──────────────────────────────────────────────────

  private loadingStarted = false;
  private loadingDone = false;
  private loadProgress = 0;
  private loadMessage = "";
  private loadGfx!: Graphics;
  private loadText!: Text;

  // ── Initialization ───────────────────────────────────────────

  async bInit(container: HTMLElement): Promise<boolean> {
    GameClock.initialize();
    FrameTiming.initialize();

    this.app = new Application({
      resizeTo: container,
      backgroundColor: 0x111111,
      antialias: false,
      resolution: 1,
    });
    BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
    container.appendChild(this.app.view as HTMLCanvasElement);

    InputManager.get().initialize(document);

    Camera.get().initialize();
    Camera.get().setTileSize(TILE_SIZE, TILE_SIZE);

    this.app.ticker.stop();

    // ── Rendering layers ─────────────────────────────────────
    this.worldLayer = new Container();
    this.worldLayer.sortableChildren = true;

    // TileRenderer owns its own groundLayer, added to stage first
    this.tileRenderer = new TileRenderer(this.app.stage);

    // worldLayer on top of ground for Y-sorted entities + objects
    this.app.stage.addChild(this.worldLayer);

    // EntityRenderer and ObjectRenderer share the worldLayer
    this.entityRenderer = new EntityRenderer(this.worldLayer);
    this.objectRenderer = new ObjectRenderer(this.worldLayer);

    // Debug overlay (between world and HUD)
    this.overlayGfx = new Graphics();
    this.app.stage.addChild(this.overlayGfx);

    // HUD layer on top of everything
    this.hudLayer = new Container();
    this.app.stage.addChild(this.hudLayer);
		this.hud = new HUD(this.hudLayer);
		this.minimap = new Minimap(this.hudLayer);

		// Cursor sprite (topmost, follows mouse)
		this.cursorSprite = new Sprite(Texture.EMPTY);
		this.cursorSprite.visible = false;
		this.cursorSprite.zIndex = 99999;
		this.app.stage.addChild(this.cursorSprite);

		// Hide the default CSS cursor (also set in CSS, belt+suspenders)
		(this.app.view as HTMLCanvasElement).style.cursor = 'none';
		document.body.style.cursor = 'none';

		// Load cursor sprite asynchronously
		this.loadCursorSprite();

		// Loading overlay (also on hudLayer, hidden during gameplay)
    this.loadGfx = new Graphics();
    this.hudLayer.addChild(this.loadGfx);
    const loadStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: "#aaaaaa",
    });
    this.loadText = new Text("", loadStyle);
    this.hudLayer.addChild(this.loadText);

    this.sceneManager.changeGameMode(DEF_GAMEMODE_ONLOADING);
    return true;
  }

  // ── Frame loop ───────────────────────────────────────────────

  renderFrame(): void {
    this.m_bSkipFrame = false;
    const dt = FrameTiming.getDeltaTime();
    Camera.get().update(dt);

    FrameTiming.beginProfile(ProfileStage.Update);
    this.updateScreen();
    FrameTiming.endProfile(ProfileStage.Update);

    if (this.m_bSkipFrame) return;

    this.drawScreen();

    FrameTiming.beginProfile(ProfileStage.Flip);
    this.app.render();
    FrameTiming.endProfile(ProfileStage.Flip);

    FrameTiming.countDisplayedFrame();
  }

  private updateScreen(): void {
    this.G_dwGlobalTime = GameClock.getTimeMS();
    this.sceneManager.updateScreen(this);
  }

  private drawScreen(): void {
    this.sceneManager.drawScreen(this);
  }

  changeGameMode(mode: number): void {
    this.sceneManager.changeGameMode(mode);
  }

  quit(): void {
    this.m_bIsProgramActive = false;
  }

  /**
   * Spawn a monster near the player. Loads its PAK if not already loaded.
   */
  async spawnMonster(pakName: string, ownerType: number): Promise<void> {
    const assets = AssetManager.get();

    // Load monster sprites if needed
    if (!assets.isMonsterLoaded(pakName)) {
      console.log(`[CGame] Loading monster ${pakName}.pak...`);
      const cache = await assets.loadMonster(pakName);
      if (!cache) {
        console.warn(`[CGame] Failed to load ${pakName}.pak`);
        return;
      }
    }

    // Pick a random walkable position near the player
    const map = assets.getMap();
    if (!map) return;

    let mx = Math.round(this.playerX) + Math.floor(Math.random() * 6) - 3;
    let my = Math.round(this.playerY) + Math.floor(Math.random() * 6) - 3;
    mx = Math.max(1, Math.min(map.sizeX - 2, mx));
    my = Math.max(1, Math.min(map.sizeY - 2, my));

    // Find walkable tile near target
    for (let tries = 0; tries < 20; tries++) {
      if (map.tiles[mx]?.[my]?.isMoveAllowed) break;
      mx = Math.round(this.playerX) + Math.floor(Math.random() * 10) - 5;
      my = Math.round(this.playerY) + Math.floor(Math.random() * 10) - 5;
      mx = Math.max(1, Math.min(map.sizeX - 2, mx));
      my = Math.max(1, Math.min(map.sizeY - 2, my));
    }

    const dir = Math.floor(Math.random() * 8) + 1; // 1-8

    // Create sprites on worldLayer
    const shadowSprite = new Sprite(Texture.EMPTY);
    shadowSprite.tint = 0x000000;
    shadowSprite.alpha = 0.3;
    shadowSprite.visible = false;
    this.worldLayer.addChild(shadowSprite);

    const sprite = new Sprite(Texture.EMPTY);
    sprite.visible = false;
    this.worldLayer.addChild(sprite);

    const anim = new AnimationController(ownerType);

    this.spawnedMonsters.push({
      pakName, ownerType, x: mx, y: my, dir, anim, sprite, shadowSprite,
    });

    console.log(`[CGame] Spawned ${pakName} (type ${ownerType}) at ${mx},${my}`);
  }

  // ── Equipment management ─────────────────────────────────────

  /**
   * Equip an item: load the PAK and register the slot.
   * The PAK is loaded additively into charCache at the correct sprite index.
   */
  async equipItem(slot: EquipSlot, pakName: string, group: number): Promise<void> {
    const assets = AssetManager.get();
    const baseIndex = getEquipBaseIndex(slot, group, this.isFemaleChar);

    console.log(`[CGame] Equipping ${pakName} → slot=${slot} group=${group} baseIdx=${baseIndex}`);
    const ok = await assets.loadEquipmentPak(pakName, baseIndex);
    if (!ok) {
      console.warn(`[CGame] Failed to load equipment ${pakName}`);
      return;
    }

    this.playerEquipSlots.set(slot, { group, pakName });
  }

  /** Unequip a slot. */
  unequipSlot(slot: EquipSlot): void {
    this.playerEquipSlots.delete(slot);
  }

  /**
   * Compute EntityEquipment indices for the current frame.
   * Maps persistent slot state + current action/dir → per-frame sprite indices.
   */
  private computePlayerEquipment(): EntityEquipment {
    const equip = defaultEquipment();
    const action = this.playerAnim.getAction();
    const actionOffset = ACTION_TO_SPRITE_OFFSET[action] ?? 0;
    const dir = this.playerDir;

    // Body — 0-based in charCache (from loadCharacter)
    equip.bodyIndex = actionOffset * 8;

    // Equipment layers
    for (const [slot, info] of this.playerEquipSlots) {
      const base = getEquipBaseIndex(slot, info.group, this.isFemaleChar);

      if (slot === 'weapon') {
        // Weapon: sprIndex = base + actionOffset * 8 + (dir - 1)
        // But drawEntity does NOT add dir for weapons (it uses frame directly).
        // C++: iWeaponIndex = DEF_SPRID_WEAPON_M + weaponType*64 + 8*actionOffset + (dir-1)
        // drawEntity: charCache[weaponIndex], frame = animFrame
        equip.weaponIndex = base + actionOffset * 8 + (dir - 1);
      } else if (slot === 'shield') {
        // Shield: sprIndex = base + actionOffset
        // C++: iShieldIndex = DEF_SPRID_SHIELD_M + shieldType*8 + actionOffset
        // drawEntity: charCache[shieldIndex], frame = (dir-1)*8 + animFrame
        equip.shieldIndex = base + actionOffset;
      } else {
        // All other equipment: sprIndex = base + actionOffset
        // C++: iXxxIndex = DEF_SPRID_XXX_M + type*15 + actionOffset
        // drawEntity: charCache[xxxIndex], frame = (dir-1)*8 + animFrame
        const idx = base + actionOffset;
        switch (slot) {
          case 'bodyArmor': equip.bodyArmorIndex = idx; break;
          case 'armArmor':  equip.armArmorIndex = idx; break;
          case 'leggings':  equip.leggingsIndex = idx; break;
          case 'boots':     equip.bootsIndex = idx; break;
          case 'mantle':    equip.mantleIndex = idx; break;
          case 'helm':      equip.helmIndex = idx; break;
        }
      }
    }

    return equip;
  }

  /**
   * Switch to a different map (and optionally character PAK).
   * Reloads assets and resets player to spawn point.
   */
  async switchMap(mapName: string, charPak?: string): Promise<void> {
    const assets = AssetManager.get();

    // Load new map
    const map = await assets.loadMap(mapName, (msg, progress) => {
      this.loadMessage = msg;
      this.loadProgress = progress;
    });
    if (!map) {
      console.error(`[CGame] Failed to load map: ${mapName}`);
      return;
    }

    // Reload tiles (needed for new map's tile set)
    await assets.loadTileSprites((msg, progress) => {
      this.loadMessage = msg;
      this.loadProgress = progress;
    });

    // Optionally switch character
    if (charPak) {
      await assets.loadCharacter(charPak, (msg, progress) => {
        this.loadMessage = msg;
        this.loadProgress = progress;
      });
      // Track gender for equipment PAK selection (Bw/Ww/Yw = female)
      this.isFemaleChar = charPak.endsWith('w');
      // Clear equipment when switching character (different gender PAKs)
      this.playerEquipSlots.clear();
    }

    // Reset player to spawn
    const spawn = assets.getSpawnPoint();
    this.playerX = spawn.x;
    this.playerY = spawn.y;
    this.playerDir = DIR_S;
    this.playerAnim.reset();
    this.isMoving = false;

    // Reset camera
    this.cameraX = this.playerX * TILE_SIZE - this.app.screen.width / 2 + TILE_SIZE / 2;
    this.cameraY = this.playerY * TILE_SIZE - this.app.screen.height / 2 + TILE_SIZE / 2;
    Camera.get().setWorldBounds(0, 0, map.sizeX, map.sizeY);

    // Invalidate caches
    this.tileRenderer.invalidateCache();
    this.minimap.setMap(map);

    console.log(`[CGame] Switched to ${map.name} (${map.sizeX}x${map.sizeY}), spawn: ${spawn.x},${spawn.y}`);
  }

  // ══════════════════════════════════════════════════════════════
  // ── LOADING SCREEN ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  updateScreen_OnLoading(): void {
    if (!this.loadingStarted) {
      this.loadingStarted = true;
      this.startAssetLoad();
    }
    if (this.loadingDone) {
      this.changeGameMode(DEF_GAMEMODE_ONMAINGAME);
    }
  }

  private async loadCursorSprite(): Promise<void> {
    try {
      // Cursor = interface.pak sprite 0 (DEF_SPRID_MOUSECURSOR)
      let resp = await fetch('/sprites/interface.pak');
      if (!resp.ok) resp = await fetch('/sprites/Interface.pak');
      if (!resp.ok) return;

      const { parsePak, decodeSpriteImage } = await import('../assets/pak-parser');
      const pak = parsePak(await resp.arrayBuffer());
      if (pak.sprites.length === 0) return;

      const sprite = pak.sprites[0];
      const decoded = await decodeSpriteImage(sprite);
      if (!decoded) return;

      const { BaseTexture: BT, Texture: TX, Rectangle: Rect, SCALE_MODES: SM } = await import('pixi.js');
      const baseTex = BT.from(decoded.canvas, { scaleMode: SM.NEAREST });
      const texW = decoded.width;
      const texH = decoded.height;

      this.cursorFrames = sprite.frames.map(f => {
        const cx = Math.min(f.x, texW);
        const cy = Math.min(f.y, texH);
        const cw = Math.min(f.width, texW - cx);
        const ch = Math.min(f.height, texH - cy);
        return {
          texture: (cw > 0 && ch > 0) ? new TX(baseTex, new Rect(cx, cy, cw, ch)) : TX.EMPTY,
          pivotX: f.pivotX,
          pivotY: f.pivotY,
        };
      });

      this.cursorLoaded = this.cursorFrames.length > 0;
      if (this.cursorLoaded) {
        this.cursorSprite.texture = this.cursorFrames[0].texture;
        this.cursorSprite.visible = true;
        console.log(`[CGame] Cursor loaded: ${this.cursorFrames.length} frames`);
      }
    } catch (e) {
      console.warn('[CGame] Failed to load cursor sprite:', e);
    }
  }

  private async startAssetLoad(): Promise<void> {
    const assets = AssetManager.get();
    const ok = await assets.loadAll(
      DEFAULT_MAP,
      DEFAULT_CHAR_PAK,
      (msg, progress) => {
        this.loadMessage = msg;
        this.loadProgress = progress;
      }
    );

    if (ok) {
      const map = assets.getMap()!;
      const spawn = assets.getSpawnPoint();
      this.playerX = spawn.x;
      this.playerY = spawn.y;
      this.playerDir = DIR_S;
      this.playerAnim.reset();

      this.cameraX =
        this.playerX * TILE_SIZE - this.app.screen.width / 2 + TILE_SIZE / 2;
      this.cameraY =
        this.playerY * TILE_SIZE - this.app.screen.height / 2 + TILE_SIZE / 2;
      Camera.get().setWorldBounds(0, 0, map.sizeX, map.sizeY);
      this.tileRenderer.invalidateCache();
      this.minimap.setMap(map);

      console.log(
        `[CGame] Loaded ${map.name} (${map.sizeX}x${map.sizeY}), spawn: ${
          spawn.x
        },${spawn.y}, ${assets.getTilesLoadedCount()} tiles`
      );
    }
    this.loadingDone = true;
  }

  drawScreen_OnLoading(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.loadGfx.clear();
    this.loadGfx.visible = true;
    this.loadText.visible = true;
    this.hud.setVisible(false);
    this.minimap.setVisible(false);

    // Dark background
    this.loadGfx.beginFill(0x16213e);
    this.loadGfx.drawRect(0, 0, w, h);
    this.loadGfx.endFill();

    // Loading bar centered
    const barW = 400;
    const barH = 8;
    const barX = Math.floor((w - barW) / 2);
    const barY = Math.floor(h / 2);

    this.loadGfx.beginFill(0x0f3460);
    this.loadGfx.drawRect(barX, barY, barW, barH);
    this.loadGfx.endFill();
    this.loadGfx.beginFill(0xe94560);
    this.loadGfx.drawRect(barX, barY, barW * this.loadProgress, barH);
    this.loadGfx.endFill();

    this.loadText.text = this.loadMessage || "Loading...";
    this.loadText.x = barX;
    this.loadText.y = barY - 24;

    this.tileRenderer.getLayer().visible = false;
    this.worldLayer.visible = false;

    this.drawCursor();
  }

  // ══════════════════════════════════════════════════════════════
  // ── MAIN GAME ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  updateScreen_OnGame(): void {
    const dt = FrameTiming.getDeltaTimeMS();
    const now = performance.now();
    const map = AssetManager.get().getMap();
    if (!map) return;

    // Movement animation
    if (this.isMoving) {
      const t = Math.min(1, (now - this.moveStartTime) / this.moveDuration);
      this.playerX = this.moveFromX + (this.moveToX - this.moveFromX) * t;
      this.playerY = this.moveFromY + (this.moveToY - this.moveFromY) * t;

      // Advance walk/run animation using AnimationController
      this.playerAnim.update(dt);

      if (t >= 1) {
        this.playerX = this.moveToX;
        this.playerY = this.moveToY;
        this.isMoving = false;
        this.playerAnim.setAction(DEF_OBJECTSTOP);
      }
    }

    // Input → movement
    if (!this.isMoving) {
      const dir = this.getInputDirection();
      if (dir !== 0) {
        const nx = Math.round(this.playerX) + DIR_DX[dir];
        const ny = Math.round(this.playerY) + DIR_DY[dir];
        this.playerDir = dir;

        if (
          nx >= 0 &&
          nx < map.sizeX &&
          ny >= 0 &&
          ny < map.sizeY &&
          map.tiles[nx][ny].isMoveAllowed
        ) {
          this.isMoving = true;
          this.moveStartTime = now;
          this.moveFromX = Math.round(this.playerX);
          this.moveFromY = Math.round(this.playerY);
          this.moveToX = nx;
          this.moveToY = ny;
          const isRunning = InputManager.get().isShiftDown();
          this.moveDuration = isRunning ? RUN_DURATION_MS : MOVE_DURATION_MS;
          this.playerAnim.setAction(isRunning ? DEF_OBJECTRUN : DEF_OBJECTMOVE);
        }
      } else {
        // Idle animation — advance via AnimationController
        this.playerAnim.setAction(DEF_OBJECTSTOP);
        this.playerAnim.update(dt);
      }
    }

    // Update spawned monster animations
    for (const mon of this.spawnedMonsters) {
      mon.anim.update(dt);
    }

    // Smooth camera follow
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const tcx = this.playerX * TILE_SIZE - w / 2 + TILE_SIZE / 2;
    const tcy = this.playerY * TILE_SIZE - h / 2 + TILE_SIZE / 2;
    this.cameraX += (tcx - this.cameraX) * 0.15;
    this.cameraY += (tcy - this.cameraY) * 0.15;
    const map2 = AssetManager.get().getMap()!;
    this.cameraX = Math.max(
      0,
      Math.min(map2.sizeX * TILE_SIZE - w, this.cameraX)
    );
    this.cameraY = Math.max(
      0,
      Math.min(map2.sizeY * TILE_SIZE - h, this.cameraY)
    );
  }

  /**
   * Mirrors C++ CGame::DrawScreen_OnGame() draw order:
   *   1. DrawBackground       → tileRenderer
   *   2. DrawEffectLights     → Phase 8 stub
   *   3. DrawObjects (entities + map objects) → entityRenderer + objectRenderer
   *   4. DrawEffects          → Phase 8 stub
   *   5. DrawWeather          → Phase 8 stub
   *   6. DrawChat/HUD         → hudText
   */
  drawScreen_OnGame(): void {
    const map = AssetManager.get().getMap();
    const assets = AssetManager.get();
    if (!map) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    // Show game layers, hide loading overlay
    Camera.get().setViewportSize(w, h);
    this.tileRenderer.getLayer().visible = true;
    this.worldLayer.visible = true;
    this.loadGfx.visible = false;
    this.loadText.visible = false;
    this.hud.setVisible(true);
    this.minimap.setVisible(true);

    // 1. DrawBackground — cached ground tiles
    FrameTiming.beginProfile(ProfileStage.DrawBackground);
    this.tileRenderer.render(w, h, this.cameraX, this.cameraY, map, assets);
    FrameTiming.endProfile(ProfileStage.DrawBackground);

    // 2. DrawEffectLights — Phase 8 stub
    FrameTiming.beginProfile(ProfileStage.DrawEffectLights);
    FrameTiming.endProfile(ProfileStage.DrawEffectLights);

    // 3. DrawObjects — entities then map objects (Y-sorted in worldLayer)
    FrameTiming.beginProfile(ProfileStage.DrawObjects);

    // 3a. Player entity (action/frame from AnimationController)
    if (this.playerEquipSlots.size > 0) {
      // Full equipment layer rendering via drawEntity
      const screenX = this.playerX * TILE_SIZE - this.cameraX;
      const screenY = this.playerY * TILE_SIZE - this.cameraY;
      const zIdx = Math.round(this.playerY);
      const equip = this.computePlayerEquipment();
      this.playerBounds = this.entityRenderer.drawEntity(
        screenX, screenY,
        this.playerDir,
        this.playerAnim.getFrame(),
        zIdx,
        equip,
        assets,
      );
    } else {
      // Phase 3 fallback: body + shadow only
      this.playerBounds = this.entityRenderer.drawPlayer(
        this.playerX,
        this.playerY,
        this.playerDir,
        this.playerAnim.getAction(),
        this.playerAnim.getFrame(),
        this.cameraX,
        this.cameraY,
        assets,
      );
    }

    // 3b. Spawned monsters
    this.drawMonsters();

    // 3c. Map objects (trees, buildings, lamps — with transparency)
    this.objectRenderer.render(
      w,
      h,
      this.cameraX,
      this.cameraY,
      map,
      assets,
      this.playerBounds
    );

    FrameTiming.endProfile(ProfileStage.DrawObjects);

    // 4. DrawEffects — Phase 8 stub
    FrameTiming.beginProfile(ProfileStage.DrawEffects);
    FrameTiming.endProfile(ProfileStage.DrawEffects);

    // 5. DrawWeather — Phase 8 stub
    FrameTiming.beginProfile(ProfileStage.DrawWeather);
    FrameTiming.endProfile(ProfileStage.DrawWeather);

    // 6. HUD overlay
    FrameTiming.beginProfile(ProfileStage.DrawMisc);
    this.drawOverlays(w, h, map);
    this.drawHUD(map);
    this.minimap.draw(w, h, this.playerX, this.playerY);

    // Cursor (always drawn last, on top of everything)
    this.drawCursor();
    FrameTiming.endProfile(ProfileStage.DrawMisc);
  }

  // ── HUD ──────────────────────────────────────────────────────

  // ── Debug overlays (blocked, teleports, grid) ──────────────────

  private drawMonsters(): void {
    const assets = AssetManager.get();
    const TILE = 32; // TILE_SIZE

    for (const mon of this.spawnedMonsters) {
      const f = assets.getMonsterFrame(mon.pakName, mon.anim.getAction(), mon.dir, mon.anim.getFrame());
      if (!f) {
        mon.sprite.visible = false;
        mon.shadowSprite.visible = false;
        continue;
      }

      const sx = Math.floor(mon.x * TILE - this.cameraX + f.pivotX);
      const sy = Math.floor(mon.y * TILE - this.cameraY + f.pivotY);
      const tileY = Math.round(mon.y);

      // Shadow
      mon.shadowSprite.texture = f.texture;
      mon.shadowSprite.x = sx + 2;
      mon.shadowSprite.y = sy + 4;
      mon.shadowSprite.zIndex = tileY - 0.1;
      mon.shadowSprite.visible = true;

      // Body
      mon.sprite.texture = f.texture;
      mon.sprite.x = sx;
      mon.sprite.y = sy;
      mon.sprite.zIndex = tileY;
      mon.sprite.visible = true;
    }
  }

  private drawOverlays(screenW: number, screenH: number, map: GameMap): void {
    this.overlayGfx.clear();

    if (!this.showBlocked && !this.showTeleports && !this.showGrid) return;

    const startTX = Math.floor(this.cameraX / TILE_SIZE);
    const startTY = Math.floor(this.cameraY / TILE_SIZE);
    const offX = -(this.cameraX % TILE_SIZE);
    const offY = -(this.cameraY % TILE_SIZE);
    const tilesX = Math.ceil(screenW / TILE_SIZE) + 2;
    const tilesY = Math.ceil(screenH / TILE_SIZE) + 2;

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const mx = startTX + tx;
        const my = startTY + ty;
        if (mx < 0 || mx >= map.sizeX || my < 0 || my >= map.sizeY) continue;

        const tile = map.tiles[mx][my];
        const tileX = Math.floor(offX + tx * TILE_SIZE);
        const tileY = Math.floor(offY + ty * TILE_SIZE);

        // Grid lines
        if (this.showGrid) {
          this.overlayGfx.lineStyle(1, 0x888888, 0.25);
          this.overlayGfx.moveTo(tileX, tileY);
          this.overlayGfx.lineTo(tileX + TILE_SIZE, tileY);
          this.overlayGfx.moveTo(tileX, tileY);
          this.overlayGfx.lineTo(tileX, tileY + TILE_SIZE);
        }

        // Blocked tile (red tint)
        if (this.showBlocked && !tile.isMoveAllowed) {
          this.overlayGfx.lineStyle(0);
          this.overlayGfx.beginFill(0xff2020, 0.3);
          this.overlayGfx.drawRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
          this.overlayGfx.endFill();
        }

        // Teleport tile (blue tint)
        if (this.showTeleports && tile.isTeleport) {
          this.overlayGfx.lineStyle(1, 0x4488ff, 0.8);
          this.overlayGfx.beginFill(0x4488ff, 0.25);
          this.overlayGfx.drawRect(tileX + 1, tileY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          this.overlayGfx.endFill();
        }
      }
    }
  }

  private drawHUD(map: { name: string; sizeX: number; sizeY: number }): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.hud.setWidthPercent(50);

    this.hud.setStats({
      mapName: map.name,
      posX: this.playerX,
      posY: this.playerY,
    });
    this.hud.draw(w, h);
  }

  // ── Input ────────────────────────────────────────────────────

  private drawCursor(): void {
    if (!this.cursorLoaded) return;
    const input = InputManager.get();
    const mx = input.getMouseX();
    const my = input.getMouseY();

    // Frame 0 = normal, frame 8 = attack mode (if available)
    const frameIdx = 0;
    const frame = this.cursorFrames[frameIdx];
    if (!frame || frame.texture === Texture.EMPTY) return;

    this.cursorSprite.texture = frame.texture;
    this.cursorSprite.x = mx;
    this.cursorSprite.y = my;
    this.cursorSprite.visible = true;
  }

  private getInputDirection(): number {
    const input = InputManager.get();
    const u = input.isKeyDown("arrowup") || input.isKeyDown("w");
    const d = input.isKeyDown("arrowdown") || input.isKeyDown("s");
    const l = input.isKeyDown("arrowleft") || input.isKeyDown("a");
    const r = input.isKeyDown("arrowright") || input.isKeyDown("d");
    if (u && r) return DIR_NE;
    if (u && l) return DIR_NW;
    if (d && r) return DIR_SE;
    if (d && l) return DIR_SW;
    if (u) return DIR_N;
    if (d) return DIR_S;
    if (l) return DIR_W;
    if (r) return DIR_E;
    return 0;
  }
}
