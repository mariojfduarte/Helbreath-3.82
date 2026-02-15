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
import { MONSTER_DEFS } from './assets/MonsterDefs';
import { MALE_EQUIPMENT, EQUIP_SLOTS, type EquipSlot } from './assets/EquipmentDefs';

// ── DOM setup ────────────────────────────────────────────────────

const container = document.getElementById('game-container');
const fpsDisplay = document.getElementById('fps-display');
const modeDisplay = document.getElementById('mode-display');
const mapSelect = document.getElementById('map-select') as HTMLSelectElement | null;
const charSelect = document.getElementById('char-select') as HTMLSelectElement | null;

const monsterSelect = document.getElementById('monster-select') as HTMLSelectElement | null;
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

// ── Populate monster dropdown ─────────────────────────────────────

if (monsterSelect) {
	for (const def of MONSTER_DEFS) {
		const opt = document.createElement('option');
		opt.value = `${def.pakName}|${def.ownerType}`;
		opt.textContent = `${def.name} (${def.ownerType})`;
		monsterSelect.appendChild(opt);
	}
}

// ── Populate equipment dropdowns ──────────────────────────────────

const equipSelects = new Map<EquipSlot, HTMLSelectElement>();
for (const { slot } of EQUIP_SLOTS) {
	const el = document.getElementById(`equip-${slot}`) as HTMLSelectElement | null;
	if (!el) continue;
	equipSelects.set(slot, el);

	// Add items for this slot
	const items = MALE_EQUIPMENT.filter(d => d.slot === slot);
	for (const item of items) {
		const opt = document.createElement('option');
		opt.value = `${item.pakName}|${item.group}`;
		opt.textContent = item.name;
		el.appendChild(opt);
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

	// Monster spawn handler
	if (monsterSelect) {
		monsterSelect.addEventListener('change', async () => {
			const val = monsterSelect.value;
			if (!val) return;
			const [pakName, typeStr] = val.split('|');
			const ownerType = parseInt(typeStr);
			monsterSelect.value = ''; // reset to placeholder
			await game.spawnMonster(pakName, ownerType);
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

	// Equipment slot change handlers
	for (const [slot, el] of equipSelects) {
		el.addEventListener('change', async () => {
			const val = el.value;
			if (!val) {
				// "None" selected → unequip
				game.unequipSlot(slot);
				return;
			}
			const [pakName, groupStr] = val.split('|');
			const group = parseInt(groupStr);
			el.disabled = true;
			await game.equipItem(slot, pakName, group);
			el.disabled = false;
		});
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
