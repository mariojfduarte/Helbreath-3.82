import {
  Application,
  BaseTexture,
  Texture,
  Sprite,
  Rectangle,
  Graphics,
  Container,
  SCALE_MODES,
} from 'pixi.js';
import { parsePak, decodeSpriteImage, type PakFile, type PakSprite, type DecodedSprite } from './pak-parser';
import { parseMap, findSpawnPoint, type GameMap, type MapTile } from './map-parser';

// ── Constants ─────────────────────────────────────────────────────

const TILE_SIZE = 32;

/** Maps PAK file names → [startID, count] for MakeTileSpr calls */
const TILE_PAK_MAP: [string, number, number][] = [
  ['maptiles1', 0, 32],
  ['Sinside1', 70, 27],
  ['Trees1', 100, 46],
  ['TreeShadows', 150, 46],
  ['objects1', 200, 10],
  ['objects2', 211, 5],
  ['objects3', 216, 4],
  ['objects4', 220, 2],
  ['Tile223-225', 223, 3],
  ['Tile226-229', 226, 4],
  ['objects5', 230, 9],
  ['objects6', 238, 4],
  ['objects7', 242, 7],
  ['maptiles2', 300, 15],
  ['maptiles4', 320, 10],
  ['maptiles5', 330, 19],
  ['maptiles6', 349, 4],
  ['maptiles353-361', 353, 9],
  ['Tile363-366', 363, 4],
  ['Tile367-367', 367, 1],
  ['Tile370-381', 370, 12],
  ['Tile382-387', 382, 6],
  ['Tile388-402', 388, 15],
  ['Tile403-405', 403, 3],
  ['Tile406-421', 406, 16],
  ['Tile422-429', 422, 8],
  ['Tile430-443', 430, 14],
  ['Tile444-444', 444, 1],
  ['Tile445-461', 445, 17],
  ['Tile462-473', 462, 12],
  ['Tile474-478', 474, 5],
  ['Tile479-488', 479, 10],
  ['Tile489-522', 489, 34],
  ['Tile523-530', 523, 8],
  ['Tile531-540', 531, 10],
  ['Tile541-545', 541, 5],
];

/**
 * Special individual tile sprites loaded via Sprites::Create (not MakeTileSpr).
 * Format: [pakName, spriteIndexInPak, tileSpriteID]
 */
const SPECIAL_TILE_SPRITES: [string, number, number][] = [
  ['Structures1', 1, 51],
  ['Structures1', 5, 55],
];

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

const DIR_N = 1, DIR_NE = 2, DIR_E = 3, DIR_SE = 4;
const DIR_S = 5, DIR_SW = 6, DIR_W = 7, DIR_NW = 8;

const ACTION_IDLE = 0;    // action offset 0 → sprites 0-7
const ACTION_WALK = 2;    // action offset 2 → sprites 16-23

// Movement deltas per direction (screen coords: +X=right, +Y=down)
const DIR_DX: Record<number, number> = {
  [DIR_N]: 0,  [DIR_NE]: 1,  [DIR_E]: 1,  [DIR_SE]: 1,
  [DIR_S]: 0,  [DIR_SW]: -1, [DIR_W]: -1, [DIR_NW]: -1,
};
const DIR_DY: Record<number, number> = {
  [DIR_N]: -1, [DIR_NE]: -1, [DIR_E]: 0,  [DIR_SE]: 1,
  [DIR_S]: 1,  [DIR_SW]: 1,  [DIR_W]: 0,  [DIR_NW]: -1,
};

const MOVE_DURATION_MS = 260;
const RUN_DURATION_MS = 150;

// ── Map file list ─────────────────────────────────────────────────

const MAP_FILES = [
  'ARESDEN', 'ELVINE', 'middleland', '2ndmiddle', 'arefarm', 'elvfarm',
  'huntzone1', 'huntzone2', 'huntzone3', 'huntzone4',
  'aresdend1', 'elvined1', 'BTField', 'bisle', 'GodH', 'HRampart',
  'DruncnCity', 'procella', 'icebound',
  'default', 'Abaddon', 'dglv2', 'dglv3', 'dglv4',
  'arebrk11', 'arebrk12', 'arebrk21', 'arebrk22',
  'elvbrk11', 'elvbrk12', 'elvbrk21', 'elvbrk22',
  'fightzone1', 'fightzone2', 'fightzone3', 'fightzone4',
  'bsmith_1', 'bsmith_2', 'cath_1', 'cath_2',
  'cityhall_1', 'cityhall_2', 'gshop_1', 'gshop_2',
  'wrhus_1', 'wrhus_2', 'wzdtwr_1', 'wzdtwr_2',
  'Toh1', 'Toh2', 'Toh3', 'Resurr1', 'Resurr2',
  'inferniaA', 'inferniaB', 'maze',
].sort();

// ── State ─────────────────────────────────────────────────────────

let app: Application;
let gameMap: GameMap | null = null;
let zoom = 1;

// Tile textures: tileID → Texture[]
const tileTextureCache = new Map<number, Texture[]>();
let tilesLoadedCount = 0;

// Fallback tile texture (solid color for missing sprites)
let fallbackTex: Texture;
let blockedFallbackTex: Texture;

// Character
let charPakName = 'Wm';
interface CharFrame { texture: Texture; pivotX: number; pivotY: number; }
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

// PixiJS layers
let tileLayer: Container;
let objectLayer: Container;
let entityLayer: Container;
let overlayGraphics: Graphics;
let charSprite: Sprite;

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

// ── DOM ───────────────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const mapSelect = $<HTMLSelectElement>('map-select');
const loadBtn = $<HTMLButtonElement>('load-btn');
const charSelect = $<HTMLSelectElement>('char-select');
const statusEl = $('status');
const canvasContainer = $('canvas-container');
const loadingOverlay = $('loading-overlay');
const loadingText = $('loading-text');
const loadingFill = $('loading-fill');
const minimapCanvas = $<HTMLCanvasElement>('minimap');
const infoMap = $('info-map');
const infoSize = $('info-size');
const infoPos = $('info-pos');
const infoTile = $('info-tile');
const infoLoaded = $('info-loaded');
const infoFps = $('info-fps');

// ── Direction Logic (matches CMisc::cGetNextMoveDir) ──────────────

/**
 * Matches CMisc::cGetNextMoveDir exactly.
 * absX = sX - dX, absY = sY - dY (source minus destination).
 */
function getNextMoveDir(sx: number, sy: number, dx: number, dy: number): number {
  const absX = sx - dx;
  const absY = sy - dy;

  if (absX === 0 && absY === 0) return 0;

  if (absX === 0) { return absY > 0 ? 1 : 5; } // 1=N, 5=S
  if (absY === 0) { return absX > 0 ? 7 : 3; } // 7=W, 3=E

  if (absX > 0 && absY > 0) return 8;  // NW
  if (absX < 0 && absY > 0) return 2;  // NE
  if (absX > 0 && absY < 0) return 6;  // SW
  if (absX < 0 && absY < 0) return 4;  // SE

  return 0;
}

/**
 * Try preferred direction first; if blocked, try the two adjacent directions.
 */
function getNextMoveDirWithAvoidance(
  sx: number, sy: number, dx: number, dy: number
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
    const opt = document.createElement('option');
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
  fallbackTex = createSolidTexture(0x2a2520);    // dark brown
  blockedFallbackTex = createSolidTexture(0x1a1a1a); // very dark gray

  tileLayer = new Container();
  objectLayer = new Container();
  entityLayer = new Container();
  overlayGraphics = new Graphics();

  app.stage.addChild(tileLayer);
  app.stage.addChild(objectLayer);
  app.stage.addChild(entityLayer);
  app.stage.addChild(overlayGraphics);

  charSprite = new Sprite(Texture.EMPTY);
  charSprite.visible = false;
  entityLayer.addChild(charSprite);

  // Pre-create sprite pools
  for (let i = 0; i < 2000; i++) {
    const ts = new Sprite(Texture.EMPTY);
    ts.visible = false;
    tileLayer.addChild(ts);
    tilePool.push(ts);

    const os = new Sprite(Texture.EMPTY);
    os.visible = false;
    objectLayer.addChild(os);
    objectPool.push(os);
  }

  // ── Events ──

  loadBtn.addEventListener('click', onLoad);
  charSelect.addEventListener('change', onCharChange);

  // Mouse click-to-move
  const canvas = app.view as HTMLCanvasElement;
  canvas.addEventListener('mousedown', onCanvasClick);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Keyboard
  document.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;

    keysDown.add(e.key);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.key === '+' || e.key === '=') setZoom(zoom + 1);
    if (e.key === '-') setZoom(zoom - 1);
  });
  document.addEventListener('keyup', (e) => {
    keysDown.delete(e.key);
  });

  app.ticker.add(gameLoop);
  setStatus('Select a map to begin.');
}

function createSolidTexture(color: number): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
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
  if (tileX < 0 || tileX >= gameMap.sizeX || tileY < 0 || tileY >= gameMap.sizeY) return;

  // Set target
  targetTileX = tileX;
  targetTileY = tileY;
  hasTarget = true;

  // Right click = run
  moveSpeedMs = e.button === 2 ? RUN_DURATION_MS : MOVE_DURATION_MS;
}

// ── Loading ───────────────────────────────────────────────────────

function showLoading(text: string, progress: number) {
  loadingOverlay.classList.remove('hidden');
  loadingText.textContent = text;
  loadingFill.style.width = `${Math.round(progress * 100)}%`;
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

async function onLoad() {
  const mapName = mapSelect.value;
  if (!mapName) return;

  try {
    showLoading(`Loading ${mapName}.amd...`, 0);

    const mapBuf = await fetch(`/mapdata/${mapName}.amd`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    });
    gameMap = parseMap(mapBuf, mapName);

    showLoading('Loading tile sprites...', 0.1);

    // Scan used tile IDs (>= 0 to include sprite 0)
    const usedTileIds = new Set<number>();
    for (let x = 0; x < gameMap.sizeX; x++) {
      for (let y = 0; y < gameMap.sizeY; y++) {
        const t = gameMap.tiles[x][y];
        usedTileIds.add(t.tileSprite);
        if (t.objectSprite > 0) usedTileIds.add(t.objectSprite);
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
      await Promise.all(batchItems.map(async ([pakName, startId, count]) => {
        try {
          await loadTilePak(pakName, startId, count);
        } catch (e) {
          console.warn(`Failed to load ${pakName}.pak:`, e);
        }
        loaded++;
        showLoading(`Loading tiles: ${loaded}/${totalPaks} PAKs...`, 0.1 + 0.6 * (loaded / totalPaks));
      }));
    }

    // Load special tile sprites (Structures1 etc.)
    showLoading('Loading special tiles...', 0.75);
    await loadSpecialTileSprites(usedTileIds);

    // Load character
    showLoading('Loading character...', 0.85);
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
    setStatus(`${mapName}: ${gameMap.sizeX}x${gameMap.sizeY}, ${tilesLoadedCount} tile textures`);
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
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${pakName}.pak`);
  const buffer = await response.arrayBuffer();
  const pak = parsePak(buffer);

  const toLoad = Math.min(count, pak.spriteCount);
  for (let i = 0; i < toLoad; i++) {
    const sprite = pak.sprites[i];
    if (!sprite || sprite.imageData.length === 0) continue;

    const decoded = await decodeSpriteImage(sprite);
    if (!decoded) continue;

    const baseTex = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });
    const frames: Texture[] = [];
    for (const frame of sprite.frames) {
      if (frame.width === 0 || frame.height === 0) continue;
      frames.push(new Texture(baseTex, new Rectangle(frame.x, frame.y, frame.width, frame.height)));
    }
    if (frames.length > 0) {
      tileTextureCache.set(startId + i, frames);
      tilesLoadedCount++;
    }
  }
}

async function loadSpecialTileSprites(usedTileIds: Set<number>) {
  // Group by PAK name
  const byPak = new Map<string, [number, number][]>();
  for (const [pakName, pakIdx, tileId] of SPECIAL_TILE_SPRITES) {
    if (!usedTileIds.has(tileId)) continue;
    if (!byPak.has(pakName)) byPak.set(pakName, []);
    byPak.get(pakName)!.push([pakIdx, tileId]);
  }

  for (const [pakName, entries] of byPak) {
    try {
      const response = await fetch(`/sprites/${pakName}.pak`);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const pak = parsePak(buffer);

      for (const [pakIdx, tileId] of entries) {
        if (pakIdx >= pak.spriteCount) continue;
        const sprite = pak.sprites[pakIdx];
        if (!sprite || sprite.imageData.length === 0) continue;

        const decoded = await decodeSpriteImage(sprite);
        if (!decoded) continue;

        const baseTex = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });
        const frames: Texture[] = [];
        for (const frame of sprite.frames) {
          if (frame.width === 0 || frame.height === 0) continue;
          frames.push(new Texture(baseTex, new Rectangle(frame.x, frame.y, frame.width, frame.height)));
        }
        if (frames.length > 0) {
          tileTextureCache.set(tileId, frames);
          tilesLoadedCount++;
        }
      }
    } catch (e) {
      console.warn(`Failed to load special tiles from ${pakName}.pak:`, e);
    }
  }
}

function getTileTexture(spriteId: number, frame: number): Texture | null {
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

    const baseTex = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });
    const frames: CharFrame[] = [];
    for (const fr of sprite.frames) {
      if (fr.width === 0 || fr.height === 0) continue;
      frames.push({
        texture: new Texture(baseTex, new Rectangle(fr.x, fr.y, fr.width, fr.height)),
        pivotX: fr.pivotX,
        pivotY: fr.pivotY,
      });
    }
    if (frames.length > 0) {
      charTextures.set(si, frames);
    }
  }
}

function getCharFrame(action: number, dir: number, frame: number): CharFrame | null {
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
  const up = keysDown.has('ArrowUp');
  const down = keysDown.has('ArrowDown');
  const left = keysDown.has('ArrowLeft');
  const right = keysDown.has('ArrowRight');

  // Map arrow keys to Helbreath directions (1=N,2=NE,3=E,4=SE,5=S,6=SW,7=W,8=NW)
  if (up && left) return DIR_NW;     // 8
  if (up && right) return DIR_NE;    // 2
  if (down && left) return DIR_SW;   // 6
  if (down && right) return DIR_SE;  // 4
  if (up) return DIR_N;              // 1
  if (down) return DIR_S;            // 5
  if (left) return DIR_W;            // 7
  if (right) return DIR_E;           // 3
  return 0;
}

function updateMovement(dt: number) {
  // Check keyboard - overrides mouse target
  const keyDir = getDirectionFromKeys();
  if (keyDir > 0) {
    hasTarget = false; // cancel mouse target
    moveSpeedMs = keysDown.has('Shift') ? RUN_DURATION_MS : MOVE_DURATION_MS;
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
      } else if (hasTarget && (playerTileX !== targetTileX || playerTileY !== targetTileY)) {
        // Continue toward mouse target
        const dir = getNextMoveDirWithAvoidance(playerTileX, playerTileY, targetTileX, targetTileY);
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
    } else if (hasTarget && (playerTileX !== targetTileX || playerTileY !== targetTileY)) {
      const dir = getNextMoveDirWithAvoidance(playerTileX, playerTileY, targetTileX, targetTileY);
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
      if (charFrameTimer > 64) { // 32ms * 2 since frame is halved
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

// ── Rendering ─────────────────────────────────────────────────────

function render() {
  if (!gameMap) return;

  const screenW = app.screen.width;
  const screenH = app.screen.height;
  const viewW = screenW / zoom;
  const viewH = screenH / zoom;

  const startTX = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
  const startTY = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
  const endTX = Math.min(gameMap.sizeX - 1, Math.ceil((cameraX + viewW) / TILE_SIZE) + 1);
  const endTY = Math.min(gameMap.sizeY - 1, Math.ceil((cameraY + viewH) / TILE_SIZE) + 1);

  // Set layer transforms
  const offsetX = -cameraX;
  const offsetY = -cameraY;
  tileLayer.scale.set(zoom);
  objectLayer.scale.set(zoom);
  entityLayer.scale.set(zoom);
  overlayGraphics.scale.set(zoom);
  tileLayer.position.set(offsetX * zoom, offsetY * zoom);
  objectLayer.position.set(offsetX * zoom, offsetY * zoom);
  entityLayer.position.set(offsetX * zoom, offsetY * zoom);
  overlayGraphics.position.set(offsetX * zoom, offsetY * zoom);

  tilePoolIdx = 0;
  objectPoolIdx = 0;

  // Draw ground tiles + objects
  for (let ty = startTY; ty <= endTY; ty++) {
    for (let tx = startTX; tx <= endTX; tx++) {
      const tile = gameMap.tiles[tx]?.[ty];
      if (!tile) continue;

      // Ground tile (>= 0: sprite 0 is valid)
      if (tilePoolIdx < tilePool.length) {
        const tex = getTileTexture(tile.tileSprite, tile.tileSpriteFrame);
        const s = tilePool[tilePoolIdx++];

        if (tex) {
          s.texture = tex;
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

      // Object sprite
      if (tile.objectSprite > 0 && objectPoolIdx < objectPool.length) {
        const objTex = getTileTexture(tile.objectSprite, tile.objectSpriteFrame);
        if (objTex) {
          const s = objectPool[objectPoolIdx++];
          s.texture = objTex;
          s.width = objTex.width;
          s.height = objTex.height;
          s.x = tx * TILE_SIZE + TILE_SIZE / 2 - objTex.width / 2;
          s.y = ty * TILE_SIZE + TILE_SIZE - objTex.height;
          s.visible = true;
        }
      }
    }
  }

  // Hide unused pool sprites
  for (let i = tilePoolIdx; i < tilePool.length; i++) tilePool[i].visible = false;
  for (let i = objectPoolIdx; i < objectPool.length; i++) objectPool[i].visible = false;

  // Draw character using PAK pivot points (pivotX/Y are the draw offset from the tile position)
  const cf = getCharFrame(playerAction, playerDir, charFrame);
  if (frameCount % 30 === 0) {
    const sprIdx = playerAction * 8 + (playerDir - 1);
    const hasSprite = charTextures?.has(sprIdx);
    const fLen = charTextures?.get(sprIdx)?.length ?? 0;
    console.log(`[char] action=${playerAction} dir=${playerDir} sprIdx=${sprIdx} frame=${charFrame} hasSprite=${hasSprite} fLen=${fLen} cf=${!!cf} isMoving=${isMoving}`);
  }
  if (cf) {
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

  // Click destination marker
  if (hasTarget && gameMap) {
    overlayGraphics.lineStyle(1.5, 0xe94560, 0.7);
    overlayGraphics.drawRect(
      targetTileX * TILE_SIZE + 2, targetTileY * TILE_SIZE + 2,
      TILE_SIZE - 4, TILE_SIZE - 4
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

  const ctx = minimapCanvas.getContext('2d')!;
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
        d[idx] = d[idx + 1] = d[idx + 2] = 0; d[idx + 3] = 255;
        continue;
      }

      if (!tile.isMoveAllowed) {
        d[idx] = 50; d[idx + 1] = 20; d[idx + 2] = 20;
      } else if (tile.objectSprite > 0) {
        d[idx] = 30; d[idx + 1] = 55; d[idx + 2] = 30;
      } else if (tile.isTeleport) {
        d[idx] = 40; d[idx + 1] = 40; d[idx + 2] = 100;
      } else {
        const tint = 40 + (tile.tileSprite % 10) * 4;
        d[idx] = tint + 20; d[idx + 1] = tint + 10; d[idx + 2] = tint;
      }
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function updateMinimapDot() {
  if (!gameMap) return;
  const ctx = minimapCanvas.getContext('2d')!;
  const scale = minimapCanvas.width / gameMap.sizeX;

  drawMinimap();

  // Player dot
  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.arc(playerTileX * scale, playerTileY * scale, Math.max(2, scale * 2), 0, Math.PI * 2);
  ctx.fill();

  // Target dot
  if (hasTarget) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(targetTileX * scale, targetTileY * scale, Math.max(1.5, scale * 1.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // Viewport rectangle
  const viewW = (app.screen.width / zoom) / TILE_SIZE * scale;
  const viewH = (app.screen.height / zoom) / TILE_SIZE * scale;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cameraX / TILE_SIZE * scale, cameraY / TILE_SIZE * scale, viewW, viewH);
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
    if (tile.objectSprite > 0) parts.push(`obj:${tile.objectSprite}:${tile.objectSpriteFrame}`);
    if (!tile.isMoveAllowed) parts.push('BLOCKED');
    if (tile.isTeleport) parts.push('TELEPORT');
    infoTile.textContent = parts.join(' | ');
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
