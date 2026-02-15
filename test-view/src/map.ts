import {
  Application,
  BaseTexture,
  Texture,
  Sprite,
  Rectangle,
  Graphics,
  Container,
  SCALE_MODES,
  ColorMatrixFilter,
} from "pixi.js";
import {
  parsePak,
  decodeSpriteImage,
  type PakFile,
  type PakSprite,
  type DecodedSprite,
} from "./pak-parser";
import {
  parseMap,
  findSpawnPoint,
  type GameMap,
  type MapTile,
} from "./map-parser";

// ── Constants ─────────────────────────────────────────────────────

const TILE_SIZE = 32;

/** Maps PAK file names → [startID, count] for MakeTileSpr calls */
const TILE_PAK_MAP: [string, number, number][] = [
  ["maptiles1", 0, 32],
  ["Sinside1", 70, 27],
  ["Trees1", 100, 46],
  ["TreeShadows", 150, 46],
  ["objects1", 200, 10],
  ["objects2", 211, 5],
  ["objects3", 216, 4],
  ["objects4", 220, 2],
  ["Tile223-225", 223, 3],
  ["Tile226-229", 226, 4],
  ["objects5", 230, 9],
  ["objects6", 238, 4],
  ["objects7", 242, 7],
  ["maptiles2", 300, 15],
  ["maptiles4", 320, 10],
  ["maptiles5", 330, 19],
  ["maptiles6", 349, 4],
  ["maptiles353-361", 353, 9],
  ["Tile363-366", 363, 4],
  ["Tile367-367", 367, 1],
  ["Tile370-381", 370, 12],
  ["Tile382-387", 382, 6],
  ["Tile388-402", 388, 15],
  ["Tile403-405", 403, 3],
  ["Tile406-421", 406, 16],
  ["Tile422-429", 422, 8],
  ["Tile430-443", 430, 14],
  ["Tile444-444", 444, 1],
  ["Tile445-461", 445, 17],
  ["Tile462-473", 462, 12],
  ["Tile474-478", 474, 5],
  ["Tile479-488", 479, 10],
  ["Tile489-522", 489, 34],
  ["Tile523-530", 523, 8],
  ["Tile531-540", 531, 10],
  ["Tile541-545", 541, 5],
];

/**
 * Special individual tile sprites loaded via Sprites::Create (not MakeTileSpr).
 * Format: [pakName, spriteIndexInPak, tileSpriteID]
 */
// C++ uses "structures1" (lowercase); file on disk may be Structures1.pak — try both for case-sensitive hosts
const SPECIAL_TILE_SPRITES: [string, number, number][] = [
  ["structures1", 1, 51],
  ["structures1", 5, 55],
];
const SPECIAL_TILE_PAK_ALIASES: Record<string, string> = { structures1: "Structures1", Structures1: "structures1" };

// ── Directions ────────────────────────────────────────────────────
// Helbreath directions (from CMisc::cGetNextMoveDir):
//   1=N, 2=NE, 3=E, 4=SE, 5=S, 6=SW, 7=W, 8=NW
// PAK sprite layout (96 sprites per character):
//   Action 0 (idle unarmed):  sprites 0-7   (8 dirs, dir-1 index)
//   Action 1 (idle armed):    sprites 8-15
//   Action 2 (walk unarmed):  sprites 16-23
//   Action 3 (walk armed):    sprites 24-31
//   Actions 4-11:             sprites 32-95 (attack, damage, dying, etc.)
// Sprite index = actionIndex * 8 + (dir - 1)

const DIR_N = 1,
  DIR_NE = 2,
  DIR_E = 3,
  DIR_SE = 4;
const DIR_S = 5,
  DIR_SW = 6,
  DIR_W = 7,
  DIR_NW = 8;

const ACTION_IDLE = 0; // action offset 0 → sprites 0-7
const ACTION_WALK = 2; // action offset 2 → sprites 16-23

// Movement deltas per direction (screen coords: +X=right, +Y=down)
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

// ── Map file list ─────────────────────────────────────────────────

const MAP_FILES = [
  "ARESDEN",
  "ELVINE",
  "middleland",
  "2ndmiddle",
  "arefarm",
  "elvfarm",
  "huntzone1",
  "huntzone2",
  "huntzone3",
  "huntzone4",
  "aresdend1",
  "elvined1",
  "BTField",
  "bisle",
  "GodH",
  "HRampart",
  "DruncnCity",
  "procella",
  "icebound",
  "default",
  "Abaddon",
  "dglv2",
  "dglv3",
  "dglv4",
  "arebrk11",
  "arebrk12",
  "arebrk21",
  "arebrk22",
  "elvbrk11",
  "elvbrk12",
  "elvbrk21",
  "elvbrk22",
  "fightzone1",
  "fightzone2",
  "fightzone3",
  "fightzone4",
  "bsmith_1",
  "bsmith_2",
  "cath_1",
  "cath_2",
  "cityhall_1",
  "cityhall_2",
  "gshop_1",
  "gshop_2",
  "wrhus_1",
  "wrhus_2",
  "wzdtwr_1",
  "wzdtwr_2",
  "Toh1",
  "Toh2",
  "Toh3",
  "Resurr1",
  "Resurr2",
  "inferniaA",
  "inferniaB",
  "maze",
].sort();

// ── State ─────────────────────────────────────────────────────────

let app: Application;
let gameMap: GameMap | null = null;
let zoom = 1;

// Tile textures: tileID → frame data (texture + pivot from PAK)
// Pivots are critical for correct object placement — the DDrawEngine positions
// objects at tileX + pivotX, tileY + pivotY where pivot is from the PAK frame rect.
// width/height match engine TileFrame for correct bounds and Texture.EMPTY handling.
interface TileFrame {
  texture: Texture;
  pivotX: number;
  pivotY: number;
  width: number;
  height: number;
}
const tileTextureCache = new Map<number, TileFrame[]>();
let tilesLoadedCount = 0;

// Fallback tile texture (solid color for missing sprites)
let fallbackTex: Texture;
let blockedFallbackTex: Texture;

// Character
let charPakName = "Wm";
interface CharFrame {
  texture: Texture;
  pivotX: number;
  pivotY: number;
}
let charTextures: Map<number, CharFrame[]> | null = null;
let playerTileX = 0;
let playerTileY = 0;
let playerPixelX = 0;
let playerPixelY = 0;
let playerDir = DIR_S;
let playerAction = ACTION_IDLE;

// Movement animation
let isMoving = false;
let moveStartTime = 0;
let moveFromX = 0;
let moveFromY = 0;
let moveToX = 0;
let moveToY = 0;
let moveSpeedMs = MOVE_DURATION_MS;

// Click-to-move target
let hasTarget = false;
let targetTileX = 0;
let targetTileY = 0;

// Camera
let cameraX = 0;
let cameraY = 0;

// Input
const keysDown = new Set<string>();

// PixiJS layers: ground (tiles only), world (entities + objects, Y-sorted via zIndex)
let groundLayer: Container;
let worldLayer: Container;
let overlayGraphics: Graphics;
let charSprite: Sprite;

// Player screen/world rect for object transparency (C++ CalculateBounds / GetBoundRect)
let playerBounds = { left: 0, top: 0, right: 0, bottom: 0 };

// Pools
let tilePool: Sprite[] = [];
let objectPool: Sprite[] = [];
let tilePoolIdx = 0;
let objectPoolIdx = 0;

// FPS
let frameCount = 0;
let lastFpsTime = 0;
let currentFps = 0;

// Animation
let charFrameTimer = 0;
let charFrame = 0;

// ── DrawParams effects (mirrors DDrawEngine SpriteTypes.h) ────────

interface MapDrawParams {
  alpha: number; // 0.0–1.0
  tintR: number; // -255..+255
  tintG: number;
  tintB: number;
  alphaDegree: number; // 1–13, time-of-day tinting
  showBlocked: boolean;
  showTeleports: boolean;
  showGrid: boolean;
}

function defaultMapDrawParams(): MapDrawParams {
  return {
    alpha: 1.0,
    tintR: 0,
    tintG: 0,
    tintB: 0,
    alphaDegree: 1,
    showBlocked: false,
    showTeleports: false,
    showGrid: false,
  };
}

let mapDrawParams: MapDrawParams = defaultMapDrawParams();

/**
 * Alpha-degree tint table — matches DDrawSprite::ApplyAlphaDegree().
 * Each entry is [R, G, B] offset applied to all sprite pixels.
 * Degree 1 = normal daylight, higher = darker/tinted (dusk/night).
 */
const ALPHA_DEGREE_TINTS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-4, -4, -4],
  3: [-8, -8, -8],
  4: [-12, -12, -12],
  5: [-16, -16, -16],
  6: [-20, -20, -20],
  7: [-24, -24, -24],
  8: [-28, -28, -28],
  9: [-32, -32, -32],
  10: [-36, -36, -36],
  11: [-40, -40, -40],
  12: [-44, -44, -44],
  13: [-20, -20, -6], // Night: bluish tint
};

// Cached filter instance (reused each frame to avoid allocations)
let sceneFilter: ColorMatrixFilter | null = null;

// ── DOM ───────────────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const mapSelect = $<HTMLSelectElement>("map-select");
const loadBtn = $<HTMLButtonElement>("load-btn");
const charSelect = $<HTMLSelectElement>("char-select");
const statusEl = $("status");
const canvasContainer = $("canvas-container");
const loadingOverlay = $("loading-overlay");
const loadingText = $("loading-text");
const loadingFill = $("loading-fill");
const minimapCanvas = $<HTMLCanvasElement>("minimap");
const infoMap = $("info-map");
const infoSize = $("info-size");
const infoPos = $("info-pos");
const infoTile = $("info-tile");
const infoLoaded = $("info-loaded");
const infoFps = $("info-fps");
const infoEffect = $("info-effect");

// Effects panel elements
const alphaDegreeSlider = $<HTMLInputElement>("alpha-degree");
const alphaDegreeVal = $("alpha-degree-val");
const alphaSlider = $<HTMLInputElement>("alpha-slider");
const alphaVal = $("alpha-val");
const alpha100Btn = $<HTMLButtonElement>("alpha-100");
const alpha70Btn = $<HTMLButtonElement>("alpha-70");
const alpha50Btn = $<HTMLButtonElement>("alpha-50");
const tintRSlider = $<HTMLInputElement>("tint-r");
const tintGSlider = $<HTMLInputElement>("tint-g");
const tintBSlider = $<HTMLInputElement>("tint-b");
const tintRVal = $("tint-r-val");
const tintGVal = $("tint-g-val");
const tintBVal = $("tint-b-val");
const tintSwatch = $("tint-swatch");
const showBlockedCb = $<HTMLInputElement>("show-blocked");
const showTeleportsCb = $<HTMLInputElement>("show-teleports");
const showGridCb = $<HTMLInputElement>("show-grid");
const resetEffectsBtn = $<HTMLButtonElement>("reset-effects");

// ── Direction Logic (matches CMisc::cGetNextMoveDir) ──────────────

/**
 * Matches CMisc::cGetNextMoveDir exactly.
 * absX = sX - dX, absY = sY - dY (source minus destination).
 */
function getNextMoveDir(
  sx: number,
  sy: number,
  dx: number,
  dy: number
): number {
  const absX = sx - dx;
  const absY = sy - dy;

  if (absX === 0 && absY === 0) return 0;

  if (absX === 0) {
    return absY > 0 ? 1 : 5;
  } // 1=N, 5=S
  if (absY === 0) {
    return absX > 0 ? 7 : 3;
  } // 7=W, 3=E

  if (absX > 0 && absY > 0) return 8; // NW
  if (absX < 0 && absY > 0) return 2; // NE
  if (absX > 0 && absY < 0) return 6; // SW
  if (absX < 0 && absY < 0) return 4; // SE

  return 0;
}

/**
 * Try preferred direction first; if blocked, try the two adjacent directions.
 */
function getNextMoveDirWithAvoidance(
  sx: number,
  sy: number,
  dx: number,
  dy: number
): number {
  if (!gameMap) return 0;
  const preferred = getNextMoveDir(sx, sy, dx, dy);
  if (preferred === 0) return 0;

  // Try preferred
  if (canWalkTo(sx + DIR_DX[preferred], sy + DIR_DY[preferred])) {
    return preferred;
  }

  // Try clockwise neighbor
  const cw = preferred === 8 ? 1 : preferred + 1;
  if (canWalkTo(sx + DIR_DX[cw], sy + DIR_DY[cw])) {
    return cw;
  }

  // Try counter-clockwise neighbor
  const ccw = preferred === 1 ? 8 : preferred - 1;
  if (canWalkTo(sx + DIR_DX[ccw], sy + DIR_DY[ccw])) {
    return ccw;
  }

  return 0; // stuck
}

function canWalkTo(x: number, y: number): boolean {
  if (!gameMap) return false;
  if (x < 0 || x >= gameMap.sizeX || y < 0 || y >= gameMap.sizeY) return false;
  return gameMap.tiles[x][y].isMoveAllowed;
}

// ── Init ──────────────────────────────────────────────────────────

async function init() {
  for (const name of MAP_FILES) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    mapSelect.appendChild(opt);
  }

  app = new Application({
    resizeTo: canvasContainer,
    backgroundColor: 0x111111,
    antialias: false,
    resolution: 1,
  });
  BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
  canvasContainer.appendChild(app.view as HTMLCanvasElement);

  // Create fallback textures for missing tile sprites
  fallbackTex = createSolidTexture(0x2a2520); // dark brown
  blockedFallbackTex = createSolidTexture(0x1a1a1a); // very dark gray

  groundLayer = new Container();
  worldLayer = new Container();
  worldLayer.sortableChildren = true;
  overlayGraphics = new Graphics();

  app.stage.addChild(groundLayer);
  app.stage.addChild(worldLayer);
  app.stage.addChild(overlayGraphics);

  charSprite = new Sprite(Texture.EMPTY);
  charSprite.visible = false;
  worldLayer.addChild(charSprite);

  // Tile pool: ground only
  for (let i = 0; i < 2000; i++) {
    const ts = new Sprite(Texture.EMPTY);
    ts.visible = false;
    groundLayer.addChild(ts);
    tilePool.push(ts);
  }

  // Object pool: worldLayer (Y-sorted with character)
  for (let i = 0; i < 2000; i++) {
    const os = new Sprite(Texture.EMPTY);
    os.visible = false;
    worldLayer.addChild(os);
    objectPool.push(os);
  }

  // ── Events ──

  loadBtn.addEventListener("click", onLoad);
  charSelect.addEventListener("change", onCharChange);

  // Mouse click-to-move
  const canvas = app.view as HTMLCanvasElement;
  canvas.addEventListener("mousedown", onCanvasClick);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ── Effects panel listeners ──

  alphaDegreeSlider.addEventListener("input", () => {
    mapDrawParams.alphaDegree = parseInt(alphaDegreeSlider.value);
    syncEffectsUI();
    applySceneFilter();
  });

  // Alpha presets (match DDrawEngine AlphaPreset)
  const alphaPresetBtns = [alpha100Btn, alpha70Btn, alpha50Btn];
  const alphaPresetVals = [100, 70, 50];
  alphaPresetBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      mapDrawParams.alpha = alphaPresetVals[i] / 100;
      alphaSlider.value = String(alphaPresetVals[i]);
      syncEffectsUI();
      applySceneFilter();
    });
  });

  alphaSlider.addEventListener("input", () => {
    mapDrawParams.alpha = parseInt(alphaSlider.value) / 100;
    syncEffectsUI();
    applySceneFilter();
  });

  tintRSlider.addEventListener("input", () => {
    mapDrawParams.tintR = parseInt(tintRSlider.value);
    syncEffectsUI();
    applySceneFilter();
  });
  tintGSlider.addEventListener("input", () => {
    mapDrawParams.tintG = parseInt(tintGSlider.value);
    syncEffectsUI();
    applySceneFilter();
  });
  tintBSlider.addEventListener("input", () => {
    mapDrawParams.tintB = parseInt(tintBSlider.value);
    syncEffectsUI();
    applySceneFilter();
  });

  showBlockedCb.addEventListener("change", () => {
    mapDrawParams.showBlocked = showBlockedCb.checked;
  });
  showTeleportsCb.addEventListener("change", () => {
    mapDrawParams.showTeleports = showTeleportsCb.checked;
  });
  showGridCb.addEventListener("change", () => {
    mapDrawParams.showGrid = showGridCb.checked;
  });

  resetEffectsBtn.addEventListener("click", () => {
    mapDrawParams = defaultMapDrawParams();
    alphaDegreeSlider.value = "1";
    alphaSlider.value = "100";
    tintRSlider.value = "0";
    tintGSlider.value = "0";
    tintBSlider.value = "0";
    showBlockedCb.checked = false;
    showTeleportsCb.checked = false;
    showGridCb.checked = false;
    syncEffectsUI();
    applySceneFilter();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;

    keysDown.add(e.key);
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
    ) {
      e.preventDefault();
    }
    if (e.key === "+" || e.key === "=") setZoom(zoom + 1);
    if (e.key === "-") setZoom(zoom - 1);
  });
  document.addEventListener("keyup", (e) => {
    keysDown.delete(e.key);
  });

  app.ticker.add(gameLoop);
  syncEffectsUI();
  setStatus("Select a map to begin.");
}

function createSolidTexture(color: number): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  return Texture.from(canvas);
}

// ── Mouse Click Handler ───────────────────────────────────────────

function onCanvasClick(e: MouseEvent) {
  if (!gameMap) return;

  const canvas = app.view as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  // Convert screen position to world tile coordinates
  const worldX = screenX / zoom + cameraX;
  const worldY = screenY / zoom + cameraY;
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);

  // Bounds check
  if (
    tileX < 0 ||
    tileX >= gameMap.sizeX ||
    tileY < 0 ||
    tileY >= gameMap.sizeY
  )
    return;

  // Set target
  targetTileX = tileX;
  targetTileY = tileY;
  hasTarget = true;

  // Right click = run
  moveSpeedMs = e.button === 2 ? RUN_DURATION_MS : MOVE_DURATION_MS;
}

// ── Loading ───────────────────────────────────────────────────────

function showLoading(text: string, progress: number) {
  loadingOverlay.classList.remove("hidden");
  loadingText.textContent = text;
  loadingFill.style.width = `${Math.round(progress * 100)}%`;
}

function hideLoading() {
  loadingOverlay.classList.add("hidden");
}

async function onLoad() {
  const mapName = mapSelect.value;
  if (!mapName) return;

  try {
    showLoading(`Loading ${mapName}.amd...`, 0);

    const mapBuf = await fetch(`/mapdata/${mapName}.amd`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
    gameMap = parseMap(mapBuf, mapName);

    showLoading("Loading tile sprites...", 0.1);

    // Scan used tile IDs (>= 0 to include sprite 0) and all object sprites the map needs
    const usedTileIds = new Set<number>();
    for (let x = 0; x < gameMap.sizeX; x++) {
      for (let y = 0; y < gameMap.sizeY; y++) {
        const t = gameMap.tiles[x][y];
        usedTileIds.add(t.tileSprite);
        if (t.objectSprite > 0) {
          usedTileIds.add(t.objectSprite);
          // Tree shadows: objects 100–199 use shadow sprites at ID+50 (TreeShadows PAK)
          if (t.objectSprite >= 100 && t.objectSprite < 200) {
            usedTileIds.add(t.objectSprite + 50);
          }
        }
      }
    }

    // Determine which PAKs are needed
    const neededPaks = TILE_PAK_MAP.filter(([, startId, count]) => {
      for (let i = startId; i < startId + count; i++) {
        if (usedTileIds.has(i)) return true;
      }
      return false;
    });

    // Load PAKs in parallel batches
    tilesLoadedCount = 0;
    const totalPaks = neededPaks.length;
    let loaded = 0;

    for (let batch = 0; batch < neededPaks.length; batch += 6) {
      const batchItems = neededPaks.slice(batch, batch + 6);
      await Promise.all(
        batchItems.map(async ([pakName, startId, count]) => {
          try {
            await loadTilePak(pakName, startId, count);
          } catch (e) {
            console.warn(`Failed to load ${pakName}.pak:`, e);
          }
          loaded++;
          showLoading(
            `Loading tiles: ${loaded}/${totalPaks} PAKs...`,
            0.1 + 0.6 * (loaded / totalPaks)
          );
        })
      );
    }

    // Load special tile sprites (Structures1 etc.)
    showLoading("Loading special tiles...", 0.75);
    await loadSpecialTileSprites();

    // Load character
    showLoading("Loading character...", 0.85);
    await loadCharacter(charPakName);

    // Set spawn point
    const spawn = findSpawnPoint(gameMap);
    playerTileX = spawn.x;
    playerTileY = spawn.y;
    playerPixelX = spawn.x * TILE_SIZE;
    playerPixelY = spawn.y * TILE_SIZE;
    playerDir = DIR_S;
    playerAction = ACTION_IDLE;
    isMoving = false;
    hasTarget = false;

    updateCamera(true);
    drawMinimap();
    hideLoading();
    updateInfo();
    setStatus(
      `${mapName}: ${gameMap.sizeX}x${gameMap.sizeY}, ${tilesLoadedCount} tile textures`
    );
  } catch (err: unknown) {
    hideLoading();
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
    console.error(err);
  }
}

async function onCharChange() {
  charPakName = charSelect.value;
  if (gameMap) {
    await loadCharacter(charPakName);
  }
}

// ── Tile Sprite Loading ───────────────────────────────────────────

async function loadTilePak(pakName: string, startId: number, count: number) {
  const response = await fetch(`/sprites/${pakName}.pak`);
  if (!response.ok)
    throw new Error(`HTTP ${response.status} for ${pakName}.pak`);
  const buffer = await response.arrayBuffer();
  const pak = parsePak(buffer);

  const toLoad = Math.min(count, pak.spriteCount);
  for (let i = 0; i < toLoad; i++) {
    const sprite = pak.sprites[i];
    if (!sprite || sprite.imageData.length === 0) continue;

    const decoded = await decodeSpriteImage(sprite);
    if (!decoded) continue;

    const baseTex = BaseTexture.from(decoded.canvas, {
      scaleMode: SCALE_MODES.NEAREST,
    });
    const frames: TileFrame[] = [];
    for (const frame of sprite.frames) {
      if (frame.width === 0 || frame.height === 0) continue;
      frames.push({
        texture: new Texture(
          baseTex,
          new Rectangle(frame.x, frame.y, frame.width, frame.height)
        ),
        pivotX: frame.pivotX,
        pivotY: frame.pivotY,
        width: frame.width,
        height: frame.height,
      });
    }
    if (frames.length > 0) {
      tileTextureCache.set(startId + i, frames);
      tilesLoadedCount++;
    }
  }
}

/** Load special tile sprites (e.g. Structures1 for 51, 55). Unconditional like engine; one TileFrame per sprite frame, Texture.EMPTY for zero-size. */
async function loadSpecialTileSprites() {
  // Group by PAK name — load all SPECIAL_TILE_SPRITES unconditionally (no usedTileIds filter)
  const byPak = new Map<string, [number, number][]>();
  for (const [pakName, pakIdx, tileId] of SPECIAL_TILE_SPRITES) {
    if (!byPak.has(pakName)) byPak.set(pakName, []);
    byPak.get(pakName)!.push([pakIdx, tileId]);
  }

  for (const [pakName, entries] of byPak) {
    try {
      let response = await fetch(`/sprites/${pakName}.pak`);
      let buffer: ArrayBuffer;
      if (!response.ok && SPECIAL_TILE_PAK_ALIASES[pakName]) {
        const alt = SPECIAL_TILE_PAK_ALIASES[pakName];
        response = await fetch(`/sprites/${alt}.pak`);
        if (!response.ok) {
          console.warn(`[special tiles] ${pakName}.pak and ${alt}.pak: HTTP ${response.status}`);
          continue;
        }
        buffer = await response.arrayBuffer();
      } else if (!response.ok) {
        console.warn(`[special tiles] ${pakName}.pak: HTTP ${response.status}`);
        continue;
      } else {
        buffer = await response.arrayBuffer();
      }
      const pak = parsePak(buffer);

      for (const [pakIdx, tileId] of entries) {
        if (pakIdx >= pak.spriteCount) {
          console.warn(`[special tiles] ${pakName}.pak: sprite index ${pakIdx} out of range (count ${pak.spriteCount}), tileId ${tileId}`);
          continue;
        }
        const sprite = pak.sprites[pakIdx];
        if (!sprite || sprite.imageData.length === 0) {
          console.warn(`[special tiles] ${pakName}.pak: sprite ${pakIdx} (tileId ${tileId}) has no image data`);
          continue;
        }

        const decoded = await decodeSpriteImage(sprite);
        if (!decoded) {
          console.warn(`[special tiles] ${pakName}.pak: failed to decode sprite ${pakIdx} (tileId ${tileId})`);
          continue;
        }

        const baseTex = BaseTexture.from(decoded.canvas, {
          scaleMode: SCALE_MODES.NEAREST,
        });
        const texW = decoded.width;
        const texH = decoded.height;
        // One TileFrame per sprite frame (match engine decodeSpriteToFrames); zero-size → Texture.EMPTY
        const frames: TileFrame[] = [];
        for (const frame of sprite.frames) {
          const cx = Math.min(frame.x, texW);
          const cy = Math.min(frame.y, texH);
          const cw = Math.min(frame.width, texW - cx);
          const ch = Math.min(frame.height, texH - cy);
          if (cw > 0 && ch > 0) {
            frames.push({
              texture: new Texture(baseTex, new Rectangle(cx, cy, cw, ch)),
              pivotX: frame.pivotX,
              pivotY: frame.pivotY,
              width: cw,
              height: ch,
            });
          } else {
            frames.push({
              texture: Texture.EMPTY,
              pivotX: frame.pivotX,
              pivotY: frame.pivotY,
              width: 0,
              height: 0,
            });
          }
        }
        if (frames.length > 0) {
          tileTextureCache.set(tileId, frames);
          tilesLoadedCount++;
        }
      }
    } catch (e) {
      console.warn(`[special tiles] Failed to load ${pakName}.pak (buildings/tileId 51,55):`, e);
    }
  }
}

function getTileFrame(spriteId: number, frame: number): TileFrame | null {
  const frames = tileTextureCache.get(spriteId);
  if (!frames || frames.length === 0) return null;
  return frames[frame % frames.length] ?? frames[0];
}

// ── Character Loading ─────────────────────────────────────────────

async function loadCharacter(pakName: string) {
  const response = await fetch(`/sprites/${pakName}.pak`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const pak = parsePak(buffer);

  charTextures = new Map();
  // Load all character sprites (idle, walk, attack, etc.)
  for (let si = 0; si < pak.spriteCount; si++) {
    const sprite = pak.sprites[si];
    if (!sprite || sprite.imageData.length === 0) continue;

    const decoded = await decodeSpriteImage(sprite);
    if (!decoded) continue;

    const baseTex = BaseTexture.from(decoded.canvas, {
      scaleMode: SCALE_MODES.NEAREST,
    });
    const frames: CharFrame[] = [];
    for (const fr of sprite.frames) {
      if (fr.width === 0 || fr.height === 0) continue;
      frames.push({
        texture: new Texture(
          baseTex,
          new Rectangle(fr.x, fr.y, fr.width, fr.height)
        ),
        pivotX: fr.pivotX,
        pivotY: fr.pivotY,
      });
    }
    if (frames.length > 0) {
      charTextures.set(si, frames);
    }
  }
}

function getCharFrame(
  action: number,
  dir: number,
  frame: number
): CharFrame | null {
  if (!charTextures) return null;
  const spriteIdx = action * 8 + (dir - 1);
  const frames = charTextures.get(spriteIdx);
  if (!frames || frames.length === 0) return null;
  return frames[frame % frames.length] ?? null;
}

// ── Movement ──────────────────────────────────────────────────────

function tryMove(dir: number): boolean {
  if (!gameMap || dir === 0) return false;

  const nx = playerTileX + DIR_DX[dir];
  const ny = playerTileY + DIR_DY[dir];

  if (!canWalkTo(nx, ny)) return false;

  isMoving = true;
  moveFromX = playerTileX * TILE_SIZE;
  moveFromY = playerTileY * TILE_SIZE;
  moveToX = nx * TILE_SIZE;
  moveToY = ny * TILE_SIZE;
  playerTileX = nx;
  playerTileY = ny;
  playerDir = dir;
  playerAction = ACTION_WALK;
  moveStartTime = performance.now();
  // Don't reset charFrame on chained moves - keeps walk cycle continuous
  charFrameTimer = 0;

  return true;
}

function getDirectionFromKeys(): number {
  const up = keysDown.has("ArrowUp");
  const down = keysDown.has("ArrowDown");
  const left = keysDown.has("ArrowLeft");
  const right = keysDown.has("ArrowRight");

  // Map arrow keys to Helbreath directions (1=N,2=NE,3=E,4=SE,5=S,6=SW,7=W,8=NW)
  if (up && left) return DIR_NW; // 8
  if (up && right) return DIR_NE; // 2
  if (down && left) return DIR_SW; // 6
  if (down && right) return DIR_SE; // 4
  if (up) return DIR_N; // 1
  if (down) return DIR_S; // 5
  if (left) return DIR_W; // 7
  if (right) return DIR_E; // 3
  return 0;
}

function updateMovement(dt: number) {
  // Check keyboard - overrides mouse target
  const keyDir = getDirectionFromKeys();
  if (keyDir > 0) {
    hasTarget = false; // cancel mouse target
    moveSpeedMs = keysDown.has("Shift") ? RUN_DURATION_MS : MOVE_DURATION_MS;
  }

  if (isMoving) {
    // Animate current movement
    const elapsed = performance.now() - moveStartTime;
    const t = Math.min(1, elapsed / moveSpeedMs);

    // Linear interpolation for pixel position (original game uses linear, not ease)
    playerPixelX = moveFromX + (moveToX - moveFromX) * t;
    playerPixelY = moveFromY + (moveToY - moveFromY) * t;

    // Walk animation: 8 frames, time-based (original: ~4 pixels per frame, 32px / 8 frames)
    charFrameTimer += dt;
    const frameMs = moveSpeedMs / 8; // one anim frame per 1/8 of the movement
    if (charFrameTimer >= frameMs) {
      charFrameTimer -= frameMs;
      charFrame = (charFrame + 1) % 8;
    }

    if (t >= 1) {
      playerPixelX = moveToX;
      playerPixelY = moveToY;
      isMoving = false;

      // Continue movement?
      if (keyDir > 0) {
        // Keyboard has priority: move in key direction
        if (!tryMove(keyDir)) {
          playerDir = keyDir;
          playerAction = ACTION_IDLE;
          charFrame = 0;
        }
      } else if (
        hasTarget &&
        (playerTileX !== targetTileX || playerTileY !== targetTileY)
      ) {
        // Continue toward mouse target
        const dir = getNextMoveDirWithAvoidance(
          playerTileX,
          playerTileY,
          targetTileX,
          targetTileY
        );
        if (dir > 0) {
          tryMove(dir);
        } else {
          hasTarget = false;
          playerAction = ACTION_IDLE;
          charFrame = 0;
        }
      } else {
        hasTarget = false;
        playerAction = ACTION_IDLE;
        charFrame = 0;
      }
    }
  } else {
    // Not currently moving
    if (keyDir > 0) {
      playerDir = keyDir;
      if (!tryMove(keyDir)) {
        playerAction = ACTION_IDLE;
      }
    } else if (
      hasTarget &&
      (playerTileX !== targetTileX || playerTileY !== targetTileY)
    ) {
      const dir = getNextMoveDirWithAvoidance(
        playerTileX,
        playerTileY,
        targetTileX,
        targetTileY
      );
      if (dir > 0) {
        tryMove(dir);
      } else {
        hasTarget = false;
        playerAction = ACTION_IDLE;
        charFrame = 0;
      }
    }

    // Animate idle (original: 15 raw frames at 32ms each, displayed as frame/2)
    if (playerAction === ACTION_IDLE) {
      charFrameTimer += dt;
      if (charFrameTimer > 64) {
        // 32ms * 2 since frame is halved
        charFrameTimer = 0;
        charFrame++;
      }
    }
  }
}

// ── Camera ────────────────────────────────────────────────────────

function updateCamera(snap = false) {
  const targetX = playerPixelX - app.screen.width / (2 * zoom) + TILE_SIZE / 2;
  const targetY = playerPixelY - app.screen.height / (2 * zoom) + TILE_SIZE / 2;

  if (snap) {
    cameraX = targetX;
    cameraY = targetY;
  } else {
    cameraX += (targetX - cameraX) * 0.12;
    cameraY += (targetY - cameraY) * 0.12;
  }
}

function setZoom(z: number) {
  zoom = Math.max(1, Math.min(4, z));
}

// ── Effects UI sync ───────────────────────────────────────────────

function syncEffectsUI() {
  // Alpha degree label
  const deg = mapDrawParams.alphaDegree;
  const timeLabels: Record<number, string> = {
    1: "Day",
    2: "Day-",
    3: "Dusk 1",
    4: "Dusk 2",
    5: "Dusk 3",
    6: "Eve 1",
    7: "Eve 2",
    8: "Eve 3",
    9: "Night 1",
    10: "Night 2",
    11: "Night 3",
    12: "Night 4",
    13: "Night",
  };
  alphaDegreeVal.textContent = timeLabels[deg] ?? String(deg);

  // Alpha
  const pct = Math.round(mapDrawParams.alpha * 100);
  alphaVal.textContent = `${pct}%`;
  const presetBtns = [alpha100Btn, alpha70Btn, alpha50Btn];
  const presetVals = [100, 70, 50];
  presetBtns.forEach((btn, i) => {
    btn.classList.toggle("active", pct === presetVals[i]);
  });

  // Tint
  tintRVal.textContent = String(mapDrawParams.tintR);
  tintGVal.textContent = String(mapDrawParams.tintG);
  tintBVal.textContent = String(mapDrawParams.tintB);
  const sr = Math.max(0, Math.min(255, 128 + mapDrawParams.tintR));
  const sg = Math.max(0, Math.min(255, 128 + mapDrawParams.tintG));
  const sb = Math.max(0, Math.min(255, 128 + mapDrawParams.tintB));
  tintSwatch.style.background = `rgb(${sr},${sg},${sb})`;

  // Info bar effect label
  const parts: string[] = [];
  if (deg > 1) parts.push(timeLabels[deg] ?? `Deg ${deg}`);
  if (pct < 100) parts.push(`Alpha ${pct}%`);
  if (mapDrawParams.tintR || mapDrawParams.tintG || mapDrawParams.tintB) {
    parts.push(
      `Tint(${mapDrawParams.tintR},${mapDrawParams.tintG},${mapDrawParams.tintB})`
    );
  }
  infoEffect.textContent = parts.length > 0 ? parts.join(" + ") : "Day";
}

/**
 * Build and apply a ColorMatrixFilter to all scene layers, simulating the
 * DDrawEngine's alpha-degree (time-of-day) tinting and RGB tint offsets.
 *
 * In the real engine, DDrawSprite::ApplyAlphaDegree modifies sprite pixel data
 * directly using per-degree RGB offsets. We approximate this as a global
 * scene filter applied to the PixiJS stage.
 */
function applySceneFilter() {
  const p = mapDrawParams;
  const hasAlphaDegree = p.alphaDegree > 1;
  const hasTint = p.tintR !== 0 || p.tintG !== 0 || p.tintB !== 0;

  if (!hasAlphaDegree && !hasTint) {
    // No filter needed — remove it
    app.stage.filters = [];
    sceneFilter = null;
    return;
  }

  if (!sceneFilter) {
    sceneFilter = new ColorMatrixFilter();
  }

  // Reset to identity
  sceneFilter.matrix[0] = 1;
  sceneFilter.matrix[1] = 0;
  sceneFilter.matrix[2] = 0;
  sceneFilter.matrix[3] = 0;
  sceneFilter.matrix[4] = 0;
  sceneFilter.matrix[5] = 0;
  sceneFilter.matrix[6] = 1;
  sceneFilter.matrix[7] = 0;
  sceneFilter.matrix[8] = 0;
  sceneFilter.matrix[9] = 0;
  sceneFilter.matrix[10] = 0;
  sceneFilter.matrix[11] = 0;
  sceneFilter.matrix[12] = 1;
  sceneFilter.matrix[13] = 0;
  sceneFilter.matrix[14] = 0;
  sceneFilter.matrix[15] = 0;
  sceneFilter.matrix[16] = 0;
  sceneFilter.matrix[17] = 0;
  sceneFilter.matrix[18] = 1;
  sceneFilter.matrix[19] = 0;

  let totalR = 0,
    totalG = 0,
    totalB = 0;

  if (hasAlphaDegree) {
    const tint = ALPHA_DEGREE_TINTS[p.alphaDegree] ?? [0, 0, 0];
    totalR += tint[0];
    totalG += tint[1];
    totalB += tint[2];
  }

  totalR += p.tintR;
  totalG += p.tintG;
  totalB += p.tintB;

  // Apply offsets (ColorMatrix offsets are 0..1 range)
  sceneFilter.matrix[4] = totalR / 255;
  sceneFilter.matrix[9] = totalG / 255;
  sceneFilter.matrix[14] = totalB / 255;

  app.stage.filters = [sceneFilter];
}

/**
 * Check if two rectangles overlap (any intersection).
 * Used for object transparency when the player is behind buildings/trees.
 */
function boundsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// ── Rendering ─────────────────────────────────────────────────────

function render() {
  if (!gameMap) return;

  const screenW = app.screen.width;
  const screenH = app.screen.height;
  const viewW = screenW / zoom;
  const viewH = screenH / zoom;

  const startTX = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
  const startTY = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
  const endTX = Math.min(
    gameMap.sizeX - 1,
    Math.ceil((cameraX + viewW) / TILE_SIZE) + 1
  );
  const endTY = Math.min(
    gameMap.sizeY - 1,
    Math.ceil((cameraY + viewH) / TILE_SIZE) + 1
  );

  // Set layer transforms
  const offsetX = -cameraX;
  const offsetY = -cameraY;
  groundLayer.scale.set(zoom);
  worldLayer.scale.set(zoom);
  overlayGraphics.scale.set(zoom);
  groundLayer.position.set(offsetX * zoom, offsetY * zoom);
  worldLayer.position.set(offsetX * zoom, offsetY * zoom);
  overlayGraphics.position.set(offsetX * zoom, offsetY * zoom);

  // Apply alpha from DrawParams to scene layers
  groundLayer.alpha = mapDrawParams.alpha;
  worldLayer.alpha = mapDrawParams.alpha;

  tilePoolIdx = 0;
  objectPoolIdx = 0;

  // Player bounds for object transparency (set before object loop)
  const cfForBounds = getCharFrame(playerAction, playerDir, charFrame);
  if (cfForBounds) {
    playerBounds = {
      left: playerPixelX + cfForBounds.pivotX,
      top: playerPixelY + cfForBounds.pivotY,
      right: playerPixelX + cfForBounds.pivotX + cfForBounds.texture.width,
      bottom: playerPixelY + cfForBounds.pivotY + cfForBounds.texture.height,
    };
  }

  // Draw ground tiles + objects
  // The DDrawEngine renders objects using pivot offsets from the PAK frame data:
  //   drawX = tileScreenX + pivotX
  //   drawY = tileScreenY + pivotY
  // This correctly positions trees, structures, etc. relative to their tile.
  for (let ty = startTY; ty <= endTY; ty++) {
    for (let tx = startTX; tx <= endTX; tx++) {
      const tile = gameMap.tiles[tx]?.[ty];
      if (!tile) continue;

      // Ground tile (>= 0: sprite 0 is valid)
      if (tilePoolIdx < tilePool.length) {
        const tf = getTileFrame(tile.tileSprite, tile.tileSpriteFrame);
        const s = tilePool[tilePoolIdx++];

        if (tf) {
          s.texture = tf.texture;
          s.width = TILE_SIZE;
          s.height = TILE_SIZE;
        } else {
          // Fallback colored tile instead of black
          s.texture = tile.isMoveAllowed ? fallbackTex : blockedFallbackTex;
          s.width = TILE_SIZE;
          s.height = TILE_SIZE;
        }
        s.x = tx * TILE_SIZE;
        s.y = ty * TILE_SIZE;
        s.visible = true;
      }

      // Object sprite — C++ draws at (ix - 16, iy - 16) + frame pivot for all object sprites
      // Y-sort: zIndex = ty + 0.5 so objects on same/south row draw above character
      if (tile.objectSprite > 0 && objectPoolIdx < objectPool.length) {
        const objFrame = getTileFrame(
          tile.objectSprite,
          tile.objectSpriteFrame
        );
        const hasVisibleFrame = objFrame && objFrame.texture !== Texture.EMPTY && objFrame.width > 0 && objFrame.height > 0;
        if (hasVisibleFrame && objFrame) {
          const s = objectPool[objectPoolIdx++];
          s.texture = objFrame.texture;
          s.width = objFrame.width;
          s.height = objFrame.height;
          // Match C++: base position is tile center (tile*32 - 16), then + pivot
          const ox = tx * TILE_SIZE - 16 + objFrame.pivotX;
          const oy = ty * TILE_SIZE - 16 + objFrame.pivotY;
          s.x = ox;
          s.y = oy;
          s.zIndex = ty + 0.5;
          const objRect = {
            left: ox,
            top: oy,
            right: ox + objFrame.width,
            bottom: oy + objFrame.height,
          };
          s.alpha = boundsOverlap(objRect, playerBounds) ? 0.25 : 1;
          s.visible = true;
        } else {
          // Missing or empty texture (e.g. Structures1 not loaded): draw placeholder so building tiles are visible
          const s = objectPool[objectPoolIdx++];
          s.texture = blockedFallbackTex;
          s.width = TILE_SIZE;
          s.height = TILE_SIZE;
          s.x = tx * TILE_SIZE - 16;
          s.y = ty * TILE_SIZE - 16;
          s.zIndex = ty + 0.5;
          s.alpha = 1;
          s.visible = true;
        }
      }
    }
  }

  // Hide unused pool sprites
  for (let i = tilePoolIdx; i < tilePool.length; i++)
    tilePool[i].visible = false;
  for (let i = objectPoolIdx; i < objectPool.length; i++)
    objectPool[i].visible = false;

  // Draw character using PAK pivot points (pivotX/Y are the draw offset from the tile position)
  const cf = getCharFrame(playerAction, playerDir, charFrame);
  if (frameCount % 30 === 0) {
    const sprIdx = playerAction * 8 + (playerDir - 1);
    const hasSprite = charTextures?.has(sprIdx);
    const fLen = charTextures?.get(sprIdx)?.length ?? 0;
    console.log(
      `[char] action=${playerAction} dir=${playerDir} sprIdx=${sprIdx} frame=${charFrame} hasSprite=${hasSprite} fLen=${fLen} cf=${!!cf} isMoving=${isMoving}`
    );
  }
  if (cf) {
    charSprite.zIndex = Math.round(playerPixelY / TILE_SIZE);
    charSprite.texture = cf.texture;
    charSprite.visible = true;
    charSprite.width = cf.texture.width;
    charSprite.height = cf.texture.height;
    // The original draws at: screenTileX + pivotX, screenTileY + pivotY
    // pivotX/Y are negative offsets (e.g., -14, -56 centers feet at tile center)
    charSprite.x = playerPixelX + cf.pivotX;
    charSprite.y = playerPixelY + cf.pivotY;
  } else {
    charSprite.visible = false;
  }

  // Draw overlays
  overlayGraphics.clear();

  // Tile debug overlays: blocked, teleport, grid
  if (
    mapDrawParams.showBlocked ||
    mapDrawParams.showTeleports ||
    mapDrawParams.showGrid
  ) {
    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        const tile = gameMap.tiles[tx]?.[ty];
        if (!tile) continue;

        const tileX = tx * TILE_SIZE;
        const tileY = ty * TILE_SIZE;

        // Grid lines
        if (mapDrawParams.showGrid) {
          overlayGraphics.lineStyle(0.5, 0x444444, 0.3);
          overlayGraphics.drawRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        }

        // Blocked tile overlay (red tint)
        if (mapDrawParams.showBlocked && !tile.isMoveAllowed) {
          overlayGraphics.lineStyle(0);
          overlayGraphics.beginFill(0xff2020, 0.25);
          overlayGraphics.drawRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
          overlayGraphics.endFill();
        }

        // Teleport tile overlay (blue pulse)
        if (mapDrawParams.showTeleports && tile.isTeleport) {
          overlayGraphics.lineStyle(1, 0x4488ff, 0.7);
          overlayGraphics.beginFill(0x4488ff, 0.2);
          overlayGraphics.drawRect(
            tileX + 1,
            tileY + 1,
            TILE_SIZE - 2,
            TILE_SIZE - 2
          );
          overlayGraphics.endFill();
        }
      }
    }
  }

  // Click destination marker
  if (hasTarget && gameMap) {
    overlayGraphics.lineStyle(1.5, 0xe94560, 0.7);
    overlayGraphics.drawRect(
      targetTileX * TILE_SIZE + 2,
      targetTileY * TILE_SIZE + 2,
      TILE_SIZE - 4,
      TILE_SIZE - 4
    );
    // X marker
    const cx = targetTileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = targetTileY * TILE_SIZE + TILE_SIZE / 2;
    overlayGraphics.moveTo(cx - 5, cy - 5);
    overlayGraphics.lineTo(cx + 5, cy + 5);
    overlayGraphics.moveTo(cx + 5, cy - 5);
    overlayGraphics.lineTo(cx - 5, cy + 5);
  }

  // Fallback character indicator if no sprite
  if (!charSprite.visible) {
    overlayGraphics.beginFill(0xe94560, 0.8);
    overlayGraphics.drawCircle(
      playerPixelX + TILE_SIZE / 2,
      playerPixelY + TILE_SIZE / 2,
      8
    );
    overlayGraphics.endFill();
  }
}

// ── Minimap ───────────────────────────────────────────────────────

function drawMinimap() {
  if (!gameMap) return;

  const ctx = minimapCanvas.getContext("2d")!;
  const scale = Math.min(150 / gameMap.sizeX, 150 / gameMap.sizeY);
  const drawW = Math.floor(gameMap.sizeX * scale);
  const drawH = Math.floor(gameMap.sizeY * scale);

  minimapCanvas.width = drawW;
  minimapCanvas.height = drawH;

  const imgData = ctx.createImageData(drawW, drawH);
  const d = imgData.data;

  for (let py = 0; py < drawH; py++) {
    for (let px = 0; px < drawW; px++) {
      const tx = Math.floor(px / scale);
      const ty = Math.floor(py / scale);
      const tile = gameMap.tiles[tx]?.[ty];
      const idx = (py * drawW + px) * 4;

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
  ctx.putImageData(imgData, 0, 0);
}

function updateMinimapDot() {
  if (!gameMap) return;
  const ctx = minimapCanvas.getContext("2d")!;
  const scale = minimapCanvas.width / gameMap.sizeX;

  drawMinimap();

  // Player dot
  ctx.fillStyle = "#e94560";
  ctx.beginPath();
  ctx.arc(
    playerTileX * scale,
    playerTileY * scale,
    Math.max(2, scale * 2),
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Target dot
  if (hasTarget) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(
      targetTileX * scale,
      targetTileY * scale,
      Math.max(1.5, scale * 1.5),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Viewport rectangle
  const viewW = (app.screen.width / zoom / TILE_SIZE) * scale;
  const viewH = (app.screen.height / zoom / TILE_SIZE) * scale;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    (cameraX / TILE_SIZE) * scale,
    (cameraY / TILE_SIZE) * scale,
    viewW,
    viewH
  );
}

// ── Info ──────────────────────────────────────────────────────────

function updateInfo() {
  if (!gameMap) return;
  infoMap.textContent = gameMap.name;
  infoSize.textContent = `${gameMap.sizeX} x ${gameMap.sizeY}`;
  infoPos.textContent = `(${playerTileX}, ${playerTileY})`;

  const tile = gameMap.tiles[playerTileX]?.[playerTileY];
  if (tile) {
    const parts = [`ground:${tile.tileSprite}:${tile.tileSpriteFrame}`];
    if (tile.objectSprite > 0)
      parts.push(`obj:${tile.objectSprite}:${tile.objectSpriteFrame}`);
    if (!tile.isMoveAllowed) parts.push("BLOCKED");
    if (tile.isTeleport) parts.push("TELEPORT");
    infoTile.textContent = parts.join(" | ");
  }
  infoLoaded.textContent = String(tilesLoadedCount);
  infoFps.textContent = String(currentFps);
}

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

// ── Game Loop ─────────────────────────────────────────────────────

function gameLoop() {
  const dt = app.ticker.deltaMS;

  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime > 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = now;
  }

  if (!gameMap) return;

  updateMovement(dt);
  updateCamera();
  render();

  if (frameCount % 10 === 0) {
    updateInfo();
    updateMinimapDot();
  }
}

// ── Start ─────────────────────────────────────────────────────────

init().catch(console.error);
