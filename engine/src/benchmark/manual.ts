/**
 * Manual Visual Benchmark — PixiJS only.
 *
 * Renders a Helbreath map with tiles, objects, and a movable character.
 * Uses PixiJS directly with sprite pools (no IRenderer abstraction).
 *
 * Object transparency: mirrors C++ tree approach (CalculateBounds +
 * bounding rect containment check) extended to ALL objects. When an
 * object's bounds overlap the player rect, sprite.alpha is set to 0.25.
 *
 * Controls:
 *   Arrow keys / WASD — move character
 *   Shift + move — run
 */

import {
	Application, BaseTexture, Texture, Sprite, Container,
	Rectangle, SCALE_MODES, Graphics,
} from 'pixi.js';
import { parsePak, decodeSpriteImage } from '../assets/pak-parser';
import { parseMap, findSpawnPoint, type GameMap } from '../assets/map-parser';

// ── Constants ──────────────────────────────────────────────────────

const TILE_SIZE = 32;

const DIR_N = 1, DIR_NE = 2, DIR_E = 3, DIR_SE = 4;
const DIR_S = 5, DIR_SW = 6, DIR_W = 7, DIR_NW = 8;

const DIR_DX: Record<number, number> = {
	[DIR_N]: 0, [DIR_NE]: 1, [DIR_E]: 1, [DIR_SE]: 1,
	[DIR_S]: 0, [DIR_SW]: -1, [DIR_W]: -1, [DIR_NW]: -1,
};
const DIR_DY: Record<number, number> = {
	[DIR_N]: -1, [DIR_NE]: -1, [DIR_E]: 0, [DIR_SE]: 1,
	[DIR_S]: 1, [DIR_SW]: 1, [DIR_W]: 0, [DIR_NW]: -1,
};

const MOVE_DURATION_MS = 260;
const RUN_DURATION_MS = 150;
const ACTION_IDLE = 0;
const ACTION_WALK = 2;

/** Special single-sprite loads: [pakName, spriteIndexInPak, tileID] */
const SPECIAL_TILE_SPRITES: [string, number, number][] = [
	['Structures1', 1, 51],
	['Structures1', 5, 55],
];

const TILE_PAK_MAP: [string, number, number][] = [
	['maptiles1', 0, 32], ['Sinside1', 70, 27], ['Trees1', 100, 46],
	['TreeShadows', 150, 46],
	['objects1', 200, 10], ['objects2', 211, 5], ['objects3', 216, 4],
	['objects4', 220, 2], ['Tile223-225', 223, 3], ['Tile226-229', 226, 4],
	['objects5', 230, 9], ['objects6', 238, 4], ['objects7', 242, 7],
	['maptiles2', 300, 15], ['maptiles4', 320, 10], ['maptiles5', 330, 19],
	['maptiles6', 349, 4], ['maptiles353-361', 353, 9],
	['Tile363-366', 363, 4], ['Tile367-367', 367, 1],
	['Tile370-381', 370, 12], ['Tile382-387', 382, 6],
	['Tile388-402', 388, 15], ['Tile403-405', 403, 3],
	['Tile406-421', 406, 16], ['Tile422-429', 422, 8],
	['Tile430-443', 430, 14], ['Tile444-444', 444, 1],
	['Tile445-461', 445, 17], ['Tile462-473', 462, 12],
	['Tile474-478', 474, 5], ['Tile479-488', 479, 10],
	['Tile489-522', 489, 34], ['Tile523-530', 523, 8],
	['Tile531-540', 531, 10], ['Tile541-545', 541, 5],
];

const MAP_FILES = [
	'ARESDEN', 'ELVINE', 'middleland', '2ndmiddle',
	'arefarm', 'elvfarm', 'huntzone1', 'huntzone2',
	'huntzone3', 'huntzone4', 'default',
].sort();

// ── Types ──────────────────────────────────────────────────────────

interface TileFrame {
	texture: Texture;
	pivotX: number;
	pivotY: number;
	width: number;
	height: number;
}

// ── State ──────────────────────────────────────────────────────────

let app: Application;
let gameMap: GameMap | null = null;

// Tile sprite cache: tileID → TileFrame[]
const tileTextureCache = new Map<number, TileFrame[]>();

// Character sprite cache: spriteIndex → TileFrame[]
const charTextureCache = new Map<number, TileFrame[]>();

// PixiJS layers: ground (tiles only), world (entities + objects, Y-sorted via zIndex)
let groundLayer: Container;
let worldLayer: Container;

// Sprite pools
const tilePool: Sprite[] = [];
const objectPool: Sprite[] = [];
let tilePoolIdx = 0;
let objectPoolIdx = 0;

// Character sprite
let charSprite: Sprite;
let charShadowSprite: Sprite;

// Player
let playerX = 0, playerY = 0;
let playerDir = DIR_S;
let playerAction = ACTION_IDLE;
let playerFrame = 0;
let playerFrameTimer = 0;

// Player bounding rect on screen — set after drawing character.
// Mirrors C++ m_rcPlayerRect. Used for object transparency check.
let playerBounds = { left: 0, top: 0, right: 0, bottom: 0 };

// Movement
let isMoving = false;
let moveStartTime = 0;
let moveFromX = 0, moveFromY = 0;
let moveToX = 0, moveToY = 0;
let moveDuration = MOVE_DURATION_MS;

// Camera
let cameraX = 0, cameraY = 0;

// Input
const keysDown = new Set<string>();

// FPS
let frameCount = 0;
let lastFpsTime = 0;
let currentFps = 0;

// ── DOM ────────────────────────────────────────────────────────────

const $status = document.getElementById('status')!;
const $mapSelect = document.getElementById('map-select') as HTMLSelectElement;
const $loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
const $canvasContainer = document.getElementById('canvas-container')!;
const $fpsDisplay = document.getElementById('fps-display')!;
const $info = document.getElementById('info-bar')!;
const $loadingOverlay = document.getElementById('loading-overlay')!;
const $loadingText = document.getElementById('loading-text')!;
const $loadingBar = document.getElementById('loading-bar')!;

// ── Init ───────────────────────────────────────────────────────────

async function init() {
	$mapSelect.innerHTML = '';
	for (const m of MAP_FILES) {
		const opt = document.createElement('option');
		opt.value = m;
		opt.textContent = m;
		if (m === 'ARESDEN') opt.selected = true;
		$mapSelect.appendChild(opt);
	}

	$loadBtn.addEventListener('click', loadMap);

	window.addEventListener('keydown', (e) => keysDown.add(e.key.toLowerCase()));
	window.addEventListener('keyup', (e) => keysDown.delete(e.key.toLowerCase()));

	// Create PixiJS app
	app = new Application({
		width: 640,
		height: 480,
		backgroundColor: 0x000000,
		antialias: false,
		resolution: 1,
	});
	BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;
	const canvas = app.view as HTMLCanvasElement;
	canvas.style.imageRendering = 'pixelated';
	$canvasContainer.appendChild(canvas);

	// Two layers: ground (tiles), world (entities + objects, Y-sorted)
	groundLayer = new Container();
	worldLayer = new Container();
	worldLayer.sortableChildren = true;
	app.stage.addChild(groundLayer);
	app.stage.addChild(worldLayer);

	// Character sprites go into worldLayer so they sort with objects by zIndex
	charShadowSprite = new Sprite(Texture.EMPTY);
	charShadowSprite.visible = false;
	charShadowSprite.tint = 0x000000;
	charShadowSprite.alpha = 0.3;
	worldLayer.addChild(charShadowSprite);

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

	app.ticker.add(gameLoop);
	$status.textContent = 'Ready. Select a map and click Load.';
}

// ── Asset Loading ──────────────────────────────────────────────────

async function loadMap() {
	const mapName = $mapSelect.value;
	$loadBtn.disabled = true;
	showLoading('Loading map...');

	try {
		const mapResp = await fetch(`/mapdata/${mapName}.amd`);
		if (!mapResp.ok) throw new Error(`Map not found: ${mapName}.amd`);
		gameMap = parseMap(await mapResp.arrayBuffer(), mapName);

		const spawn = findSpawnPoint(gameMap);
		playerX = spawn.x;
		playerY = spawn.y;
		playerDir = DIR_S;
		playerAction = ACTION_IDLE;
		isMoving = false;
		cameraX = playerX * TILE_SIZE - 320;
		cameraY = playerY * TILE_SIZE - 240;

		await loadTileSprites();
		await loadCharacterSprites('Wm');

		hideLoading();
		$status.textContent = `${mapName} (${gameMap.sizeX}x${gameMap.sizeY}). Arrow keys to move.`;
	} catch (e) {
		$status.textContent = `Error: ${e}`;
		hideLoading();
	}

	$loadBtn.disabled = false;
}

async function loadTileSprites() {
	tileTextureCache.clear();

	// Load batch PAKs: [pakName, startID, count]
	for (const [pakName, startID, count] of TILE_PAK_MAP) {
		try {
			showLoading(`Loading ${pakName}.pak...`);
			const resp = await fetch(`/sprites/${pakName}.pak`);
			if (!resp.ok) continue;
			const pak = parsePak(await resp.arrayBuffer());

			for (let i = 0; i < Math.min(count, pak.sprites.length); i++) {
				const frames = await decodeSpriteToFrames(pak.sprites[i]);
				if (frames) tileTextureCache.set(startID + i, frames);
			}
		} catch { /* skip failed PAKs */ }
	}

	// Load special single-sprite entries: [pakName, spriteIndexInPak, tileID]
	const specialPakCache = new Map<string, Awaited<ReturnType<typeof fetchPak>>>();
	for (const [pakName, sprIdx, tileID] of SPECIAL_TILE_SPRITES) {
		try {
			let pak = specialPakCache.get(pakName);
			if (!pak) {
				showLoading(`Loading ${pakName}.pak...`);
				const resp = await fetch(`/sprites/${pakName}.pak`);
				if (!resp.ok) continue;
				pak = parsePak(await resp.arrayBuffer());
				specialPakCache.set(pakName, pak);
			}
			if (sprIdx < pak.sprites.length) {
				const frames = await decodeSpriteToFrames(pak.sprites[sprIdx]);
				if (frames) tileTextureCache.set(tileID, frames);
			}
		} catch { /* skip */ }
	}
}

/** Fetch and parse a PAK file (alias for type inference) */
function fetchPak(buf: ArrayBuffer) { return parsePak(buf); }

/** Decode a PAK sprite into an array of TileFrame with clamped rects */
async function decodeSpriteToFrames(sprite: { frames: Array<{ x: number; y: number; width: number; height: number; pivotX: number; pivotY: number }>; imageData: Uint8Array; index: number }): Promise<TileFrame[] | null> {
	const decoded = await decodeSpriteImage(sprite as any);
	if (!decoded) return null;

	const baseTex = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });
	const texW = decoded.width;
	const texH = decoded.height;

	return sprite.frames.map(f => {
		// Clamp frame rect to base texture bounds (some PAK frames exceed bitmap size)
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

async function loadCharacterSprites(pakName: string) {
	charTextureCache.clear();
	showLoading(`Loading ${pakName}.pak...`);

	try {
		const resp = await fetch(`/sprites/${pakName}.pak`);
		if (!resp.ok) return;
		const pak = parsePak(await resp.arrayBuffer());

		for (let si = 0; si < pak.sprites.length; si++) {
			const sprite = pak.sprites[si];
			const decoded = await decodeSpriteImage(sprite);
			if (!decoded) continue;

			const baseTex = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });
			const frames: TileFrame[] = sprite.frames.map(f => ({
				texture: new Texture(baseTex, new Rectangle(f.x, f.y, f.width, f.height)),
				pivotX: f.pivotX,
				pivotY: f.pivotY,
				width: f.width,
				height: f.height,
			}));

			charTextureCache.set(si, frames);
		}
	} catch (e) {
		console.error(`Failed to load ${pakName}:`, e);
	}
}

// ── Game Loop ──────────────────────────────────────────────────────

function gameLoop() {
	const dt = app.ticker.deltaMS;
	const now = performance.now();

	update(dt, now);
	render();

	frameCount++;
	if (now - lastFpsTime >= 1000) {
		currentFps = frameCount;
		frameCount = 0;
		lastFpsTime = now;
		$fpsDisplay.textContent = `${currentFps} FPS | PixiJS`;
	}
}

// ── Update ─────────────────────────────────────────────────────────

function update(dt: number, now: number) {
	if (!gameMap) return;

	if (isMoving) {
		const t = Math.min(1, (now - moveStartTime) / moveDuration);
		playerX = moveFromX + (moveToX - moveFromX) * t;
		playerY = moveFromY + (moveToY - moveFromY) * t;

		playerFrameTimer += dt;
		if (playerFrameTimer > 35) { playerFrameTimer = 0; playerFrame = (playerFrame + 1) % 7; }

		if (t >= 1) {
			playerX = moveToX; playerY = moveToY;
			isMoving = false; playerAction = ACTION_IDLE; playerFrame = 0;
		}
	}

	if (!isMoving) {
		const dir = getInputDirection();
		if (dir !== 0) {
			const nx = Math.round(playerX) + DIR_DX[dir];
			const ny = Math.round(playerY) + DIR_DY[dir];
			playerDir = dir;

			if (nx >= 0 && nx < gameMap.sizeX && ny >= 0 && ny < gameMap.sizeY
				&& gameMap.tiles[nx][ny].isMoveAllowed) {
				isMoving = true;
				moveStartTime = performance.now();
				moveFromX = Math.round(playerX); moveFromY = Math.round(playerY);
				moveToX = nx; moveToY = ny;
				moveDuration = keysDown.has('shift') ? RUN_DURATION_MS : MOVE_DURATION_MS;
				playerAction = ACTION_WALK; playerFrame = 0;
			}
		} else {
			playerFrameTimer += dt;
			if (playerFrameTimer > 80) { playerFrameTimer = 0; playerFrame = (playerFrame + 1) % 14; }
		}
	}

	// Smooth camera
	const tcx = playerX * TILE_SIZE - 320 + TILE_SIZE / 2;
	const tcy = playerY * TILE_SIZE - 240 + TILE_SIZE / 2;
	cameraX += (tcx - cameraX) * 0.15;
	cameraY += (tcy - cameraY) * 0.15;
	if (gameMap) {
		cameraX = Math.max(0, Math.min(gameMap.sizeX * TILE_SIZE - 640, cameraX));
		cameraY = Math.max(0, Math.min(gameMap.sizeY * TILE_SIZE - 480, cameraY));
	}

	$info.textContent = `Map: ${gameMap.name} (${gameMap.sizeX}x${gameMap.sizeY}) | ` +
		`Pos: ${Math.round(playerX)},${Math.round(playerY)} | Dir: ${playerDir}`;
}

function getInputDirection(): number {
	const u = keysDown.has('arrowup') || keysDown.has('w');
	const d = keysDown.has('arrowdown') || keysDown.has('s');
	const l = keysDown.has('arrowleft') || keysDown.has('a');
	const r = keysDown.has('arrowright') || keysDown.has('d');
	if (u && r) return DIR_NE; if (u && l) return DIR_NW;
	if (d && r) return DIR_SE; if (d && l) return DIR_SW;
	if (u) return DIR_N; if (d) return DIR_S;
	if (l) return DIR_W; if (r) return DIR_E;
	return 0;
}

// ── Render ─────────────────────────────────────────────────────────

function render() {
	if (!gameMap) return;

	tilePoolIdx = 0;
	objectPoolIdx = 0;

	const startTX = Math.floor(cameraX / TILE_SIZE);
	const startTY = Math.floor(cameraY / TILE_SIZE);
	const offX = -(cameraX % TILE_SIZE);
	const offY = -(cameraY % TILE_SIZE);
	const tilesX = Math.ceil(640 / TILE_SIZE) + 2;
	const tilesY = Math.ceil(480 / TILE_SIZE) + 2;

	// 1) Draw background tiles
	for (let ty = 0; ty < tilesY; ty++) {
		for (let tx = 0; tx < tilesX; tx++) {
			const mx = startTX + tx, my = startTY + ty;
			if (mx < 0 || mx >= gameMap.sizeX || my < 0 || my >= gameMap.sizeY) continue;

			const tile = gameMap.tiles[mx][my];
			const frames = tileTextureCache.get(tile.tileSprite);
			if (!frames || tile.tileSpriteFrame >= frames.length) continue;

			const f = frames[tile.tileSpriteFrame];
			const spr = getTileSprite();
			spr.texture = f.texture;
			spr.x = Math.floor(offX + tx * TILE_SIZE);
			spr.y = Math.floor(offY + ty * TILE_SIZE);
			spr.alpha = 1;
			spr.visible = true;
		}
	}

	// 2) Draw character — sets playerBounds for transparency checks
	drawCharacter();

	// 3) Draw objects: zIndex = tileY + 0.5 (same row draws above character), transparency by bounds overlap
	for (let ty = -7; ty < tilesY + 4; ty++) {
		for (let tx = -4; tx < tilesX + 4; tx++) {
			const mx = startTX + tx, my = startTY + ty;
			if (mx < 0 || mx >= gameMap.sizeX || my < 0 || my >= gameMap.sizeY) continue;

			const tile = gameMap.tiles[mx][my];
			if (tile.objectSprite <= 0) continue;

			const objID = tile.objectSprite;
			const frames = tileTextureCache.get(objID);
			if (!frames || tile.objectSpriteFrame >= frames.length) continue;

			const f = frames[tile.objectSpriteFrame];

			const baseX = Math.floor(offX + tx * TILE_SIZE);
			const baseY = Math.floor(offY + ty * TILE_SIZE);
			const drawX = baseX - 16 + f.pivotX;
			const drawY = baseY - 16 + f.pivotY;

			// Transparency: C++-style CalculateBounds — object screen rect vs player rect
			const objRect = { left: drawX, top: drawY, right: drawX + f.width, bottom: drawY + f.height };
			const overlaps = boundsOverlap(objRect, playerBounds);

			// Tree shadows (ID+50) for sprites 100-199
			if (objID >= 100 && objID < 200) {
				const shadowFrames = tileTextureCache.get(objID + 50);
				if (shadowFrames && tile.objectSpriteFrame < shadowFrames.length) {
					const sf = shadowFrames[tile.objectSpriteFrame];
					const ss = getObjectSprite();
					ss.texture = sf.texture;
					ss.x = baseX;
					ss.y = baseY;
					ss.zIndex = my + 0.4;
					ss.alpha = overlaps ? 0.15 : 1;
					ss.tint = overlaps ? 0x000000 : 0xFFFFFF;
					ss.visible = true;
				}
			}

			// Object sprite: Y-sort so objects south of/same row as player draw on top
			const spr = getObjectSprite();
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
	for (let i = tilePoolIdx; i < tilePool.length; i++) tilePool[i].visible = false;
	for (let i = objectPoolIdx; i < objectPool.length; i++) objectPool[i].visible = false;
}

function drawCharacter() {
	if (charTextureCache.size === 0) {
		charSprite.visible = false;
		charShadowSprite.visible = false;
		return;
	}

	const sprIdx = playerAction * 8 + (playerDir - 1);
	const frames = charTextureCache.get(sprIdx);
	if (!frames || frames.length === 0) {
		charSprite.visible = false;
		charShadowSprite.visible = false;
		return;
	}

	const f = frames[playerFrame % frames.length];
	const sx = Math.floor(playerX * TILE_SIZE - cameraX + f.pivotX);
	const sy = Math.floor(playerY * TILE_SIZE - cameraY + f.pivotY);

	// zIndex for Y-sort: objects at same/higher tileY render on top
	charShadowSprite.zIndex = Math.round(playerY) - 0.1;
	charSprite.zIndex = Math.round(playerY);

	// Shadow
	charShadowSprite.texture = f.texture;
	charShadowSprite.x = sx + 2;
	charShadowSprite.y = sy + 4;
	charShadowSprite.visible = true;

	// Body
	charSprite.texture = f.texture;
	charSprite.x = sx;
	charSprite.y = sy;
	charSprite.visible = true;

	// Set player bounding rect for object transparency (C++ CalculateBounds / GetBoundRect)
	playerBounds = {
		left: sx,
		top: sy,
		right: sx + f.width,
		bottom: sy + f.height,
	};
}

/**
 * Check if two rectangles overlap (any intersection).
 * Mirrors C++ CalculateBounds + GetBoundRect comparison,
 * but uses intersection instead of full containment so it
 * works for both large trees and small building tile pieces.
 */
function boundsOverlap(
	a: { left: number; top: number; right: number; bottom: number },
	b: { left: number; top: number; right: number; bottom: number },
): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// ── Sprite Pool ────────────────────────────────────────────────────

function getTileSprite(): Sprite {
	if (tilePoolIdx < tilePool.length) return tilePool[tilePoolIdx++];
	const s = new Sprite(Texture.EMPTY);
	s.visible = false;
	groundLayer.addChild(s);
	tilePool.push(s);
	tilePoolIdx++;
	return s;
}

function getObjectSprite(): Sprite {
	if (objectPoolIdx < objectPool.length) return objectPool[objectPoolIdx++];
	const s = new Sprite(Texture.EMPTY);
	s.visible = false;
	worldLayer.addChild(s);
	objectPool.push(s);
	objectPoolIdx++;
	return s;
}

// ── UI Helpers ─────────────────────────────────────────────────────

function showLoading(text: string) {
	$loadingOverlay.style.display = 'flex';
	$loadingText.textContent = text;
}

function hideLoading() {
	$loadingOverlay.style.display = 'none';
}

// ── Boot ───────────────────────────────────────────────────────────

init();
