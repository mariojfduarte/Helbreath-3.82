/**
 * Engine entry point — mirrors C++ EventLoop() from Sources/Client/Wmain.cpp.
 *
 * Creates a CGame instance, initializes it, and starts the game loop
 * using requestAnimationFrame (replacing the C++ while/ProcessMessages loop).
 */

import { CGame } from './core/CGame';
import { FrameTiming } from './core/FrameTiming';
import { InputManager } from './core/InputManager';
import { DEF_GAMEMODE_ONLOADING } from './core/GameModes';
import { MAP_FILES, DEFAULT_MAP } from './assets/SpriteDefs';

// ── DOM setup ────────────────────────────────────────────────────

const container = document.getElementById('game-container');
const fpsDisplay = document.getElementById('fps-display');
const modeDisplay = document.getElementById('mode-display');
const mapSelect = document.getElementById('map-select') as HTMLSelectElement | null;
const charSelect = document.getElementById('char-select') as HTMLSelectElement | null;

const showBlockedCb = document.getElementById('show-blocked') as HTMLInputElement | null;
const showTeleportsCb = document.getElementById('show-teleports') as HTMLInputElement | null;
const showGridCb = document.getElementById('show-grid') as HTMLInputElement | null;

if (!container) {
	throw new Error('Missing #game-container element');
}

// ── Populate map dropdown ────────────────────────────────────────

if (mapSelect) {
	for (const name of MAP_FILES) {
		const opt = document.createElement('option');
		opt.value = name;
		opt.textContent = name;
		if (name === DEFAULT_MAP) opt.selected = true;
		mapSelect.appendChild(opt);
	}
}

// ── Boot ─────────────────────────────────────────────────────────

const game = new CGame();

async function boot() {
	const ok = await game.bInit(container!);
	if (!ok) {
		console.error('[main] CGame.bInit() failed');
		return;
	}

	console.log('[main] CGame initialized — starting event loop');

	// Map change handler
	if (mapSelect) {
		mapSelect.addEventListener('change', async () => {
			const mapName = mapSelect.value;
			if (!mapName) return;
			mapSelect.disabled = true;
			await game.switchMap(mapName, charSelect?.value);
			mapSelect.disabled = false;
		});
	}

	// Character change handler
	if (charSelect) {
		charSelect.addEventListener('change', async () => {
			const mapName = mapSelect?.value || DEFAULT_MAP;
			charSelect.disabled = true;
			await game.switchMap(mapName, charSelect.value);
			charSelect.disabled = false;
		});
	}

	// Debug overlay checkboxes
	if (showBlockedCb) {
		showBlockedCb.addEventListener('change', () => { game.showBlocked = showBlockedCb.checked; });
	}
	if (showTeleportsCb) {
		showTeleportsCb.addEventListener('change', () => { game.showTeleports = showTeleportsCb.checked; });
	}
	if (showGridCb) {
		showGridCb.addEventListener('change', () => { game.showGrid = showGridCb.checked; });
	}

	requestAnimationFrame(eventLoop);
}

// ── Event loop (mirrors C++ EventLoop) ───────────────────────────

function eventLoop(): void {
	if (game.m_bIsProgramActive || game.m_cGameMode === DEF_GAMEMODE_ONLOADING) {
		FrameTiming.beginFrame();
		game.renderFrame();
		InputManager.get().beginFrame();
		FrameTiming.endFrame();
	}

	// Update HUD
	if (fpsDisplay) {
		fpsDisplay.textContent = `${FrameTiming.getFPS()} FPS`;
	}
	if (modeDisplay) {
		modeDisplay.textContent = `Mode: ${game.m_cGameMode}`;
	}

	requestAnimationFrame(eventLoop);
}

// ── Start ────────────────────────────────────────────────────────

boot();
