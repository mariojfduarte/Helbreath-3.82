/**
 * AnimationController — Per-entity animation state machine.
 * Mirrors C++ m_stFrame[][] from Sources/Client/MapData.cpp.
 *
 * Each entity type (ownerType 0-100+) has per-action frame data:
 *   - maxFrame:  number of animation frames for the action
 *   - frameTime: milliseconds per frame
 *
 * The controller tracks the current action, frame index, and timer.
 * Call update(dt) each frame to advance the animation.
 *
 * Player characters use ownerType 1 (or 0 for defaults).
 * NPC types 10-100 have custom frame data defined in initFrameData().
 */

import {
	DEF_OBJECTSTOP,
	DEF_OBJECTMOVE,
	DEF_OBJECTRUN,
	DEF_OBJECTATTACK,
	DEF_OBJECTMAGIC,
	DEF_OBJECTGETITEM,
	DEF_OBJECTDAMAGE,
	DEF_OBJECTDAMAGEMOVE,
	DEF_OBJECTATTACKMOVE,
	DEF_OBJECTDYING,
	ACTION_COUNT,
} from './ActionID';

// ── Frame data per action ────────────────────────────────────────

export interface FrameData {
	maxFrame: number;   // Total frames in the animation
	frameTime: number;  // Milliseconds per frame
}

/** Frame data table: frameTable[ownerType][action] → FrameData */
export type FrameTable = Map<number, FrameData[]>;

// ── Default frame data (player characters, ownerType 1-9) ────────

const RESTAR = 4; // C++ restar value

function defaultActions(): FrameData[] {
	const data: FrameData[] = new Array(ACTION_COUNT);
	for (let i = 0; i < ACTION_COUNT; i++) {
		data[i] = { maxFrame: 7, frameTime: 40 };
	}
	data[DEF_OBJECTSTOP]       = { maxFrame: 14, frameTime: 32 };
	data[DEF_OBJECTMOVE]       = { maxFrame: 7,  frameTime: Math.floor(38 / 1.1) };
	data[DEF_OBJECTRUN]        = { maxFrame: 7,  frameTime: Math.floor(21 / 1.1) };
	data[DEF_OBJECTATTACK]     = { maxFrame: 7,  frameTime: Math.floor(41 / 1.1) };
	data[DEF_OBJECTATTACKMOVE] = { maxFrame: 12, frameTime: 38 };
	data[DEF_OBJECTMAGIC]      = { maxFrame: 15, frameTime: 40 };
	data[DEF_OBJECTGETITEM]    = { maxFrame: 3,  frameTime: 50 };
	data[DEF_OBJECTDAMAGE]     = { maxFrame: 7,  frameTime: 32 };
	data[DEF_OBJECTDAMAGEMOVE] = { maxFrame: 3,  frameTime: 24 };
	data[DEF_OBJECTDYING]      = { maxFrame: 12, frameTime: 40 };
	return data;
}

/**
 * Build the full frame data table matching C++ CMapData::InitFrameData().
 * Returns Map<ownerType, FrameData[]>.
 */
export function buildFrameTable(): FrameTable {
	const table: FrameTable = new Map();

	// Default for all types
	for (let i = 0; i < 100; i++) {
		table.set(i, defaultActions());
	}

	// NPC overrides from C++ MapData.cpp (ownerType 10+)
	const set = (type: number, action: number, maxFrame: number, frameTime: number) => {
		const t = table.get(type);
		if (t) t[action] = { maxFrame, frameTime };
	};

	// Type 10: Slime
	set(10, DEF_OBJECTSTOP, 3, 240);
	set(10, DEF_OBJECTMOVE, 7, Math.floor(120 - RESTAR * 2 - RESTAR / 1.2));
	set(10, DEF_OBJECTATTACK, 3, 90);
	set(10, DEF_OBJECTDAMAGE, 7, 150);
	set(10, DEF_OBJECTDYING, 7, 240);

	// Type 11: Skeleton
	set(11, DEF_OBJECTSTOP, 3, 150);
	set(11, DEF_OBJECTMOVE, 7, 90 - RESTAR);
	set(11, DEF_OBJECTATTACK, 3, 90);
	set(11, DEF_OBJECTDAMAGE, 7, 150);
	set(11, DEF_OBJECTDYING, 7, 180);

	// Type 12: Stone Golem
	set(12, DEF_OBJECTSTOP, 3, 210);
	set(12, DEF_OBJECTMOVE, 7, 100 - RESTAR * 2);
	set(12, DEF_OBJECTATTACK, 3, 120);
	set(12, DEF_OBJECTDAMAGE, 7, 150);
	set(12, DEF_OBJECTDYING, 7, 180);

	// Type 13: Cyclops
	set(13, DEF_OBJECTSTOP, 3, 210);
	set(13, DEF_OBJECTMOVE, 7, 80 - RESTAR);
	set(13, DEF_OBJECTATTACK, 3, 90);
	set(13, DEF_OBJECTDAMAGE, 7, 150);
	set(13, DEF_OBJECTDYING, 7, 180);

	// Type 14: Orc
	set(14, DEF_OBJECTSTOP, 3, 180);
	set(14, DEF_OBJECTMOVE, 7, 80 - RESTAR);
	set(14, DEF_OBJECTATTACK, 3, 120);
	set(14, DEF_OBJECTDAMAGE, 7, 150);
	set(14, DEF_OBJECTDYING, 7, 180);

	// Type 15: Scorpion
	set(15, DEF_OBJECTSTOP, 7, 180);
	set(15, DEF_OBJECTMOVE, 7, 100 - RESTAR * 2);
	set(15, DEF_OBJECTATTACK, 3, 150);
	set(15, DEF_OBJECTDAMAGE, 3, 180);
	set(15, DEF_OBJECTDYING, 7, 180);

	// Type 16: Zombie
	set(16, DEF_OBJECTSTOP, 3, 120);
	set(16, DEF_OBJECTMOVE, 7, 60 - RESTAR + 15);
	set(16, DEF_OBJECTATTACK, 3, 120);
	set(16, DEF_OBJECTDAMAGE, 7, 150);
	set(16, DEF_OBJECTDYING, 7, 180);

	// Type 17: Snake
	set(17, DEF_OBJECTSTOP, 3, 120);
	set(17, DEF_OBJECTMOVE, 7, 45 - RESTAR + 15);
	set(17, DEF_OBJECTATTACK, 3, 120);
	set(17, DEF_OBJECTDAMAGE, 7, 150);
	set(17, DEF_OBJECTDYING, 7, 180);

	// Type 18: Giant Ant
	set(18, DEF_OBJECTSTOP, 3, 210);
	set(18, DEF_OBJECTMOVE, 7, 130 - RESTAR * 2);
	set(18, DEF_OBJECTATTACK, 3, 150);
	set(18, DEF_OBJECTDAMAGE, 7, 150);
	set(18, DEF_OBJECTDYING, 7, 180);

	// Type 19: Werewolf
	set(19, DEF_OBJECTSTOP, 7, 250);
	set(19, DEF_OBJECTMOVE, 7, 100 - RESTAR * 2);
	set(19, DEF_OBJECTATTACK, 3, 150);
	set(19, DEF_OBJECTDAMAGE, 3, 180);
	set(19, DEF_OBJECTDYING, 7, 180);

	// Type 20: Dark Elf
	set(20, DEF_OBJECTSTOP, 7, 250);
	set(20, DEF_OBJECTMOVE, 7, 100 - RESTAR * 2);
	set(20, DEF_OBJECTATTACK, 3, 150);
	set(20, DEF_OBJECTDAMAGE, 3, 180);
	set(20, DEF_OBJECTDYING, 7, 180);

	// Type 21-23: Orcs (variants)
	for (const t of [21, 22, 23]) {
		set(t, DEF_OBJECTSTOP, 3, 250);
		set(t, DEF_OBJECTMOVE, 7, 80 - RESTAR);
		set(t, DEF_OBJECTATTACK, 3, 120);
		set(t, DEF_OBJECTDAMAGE, 7, 150);
		set(t, DEF_OBJECTDYING, 7, 180);
	}

	// Type 27: Troll
	set(27, DEF_OBJECTSTOP, 3, 250);
	set(27, DEF_OBJECTMOVE, 7, 50);
	set(27, DEF_OBJECTATTACK, 3, 120);
	set(27, DEF_OBJECTDAMAGE, 7, 120);
	set(27, DEF_OBJECTDYING, 7, 180);

	// Type 28: Ogre
	set(28, DEF_OBJECTSTOP, 3, 250);
	set(28, DEF_OBJECTMOVE, 7, 100 - RESTAR * 2);
	set(28, DEF_OBJECTATTACK, 5, 60);
	set(28, DEF_OBJECTDAMAGE, 7, 120);
	set(28, DEF_OBJECTDYING, 9, 100);

	// Type 29: Liche
	set(29, DEF_OBJECTSTOP, 3, 250);
	set(29, DEF_OBJECTMOVE, 7, 100 - RESTAR * 2);
	set(29, DEF_OBJECTATTACK, 5, 120);
	set(29, DEF_OBJECTDAMAGE, 7, 120);
	set(29, DEF_OBJECTDYING, 9, 100);

	return table;
}

// ── AnimationController ──────────────────────────────────────────

export class AnimationController {
	private ownerType: number;
	private action: number;
	private frame: number;
	private timer: number;      // ms accumulated
	private finished: boolean;  // true when a non-looping anim completes

	private static s_frameTable: FrameTable | null = null;

	/** Lazy-initialize the shared frame table. */
	private static getTable(): FrameTable {
		if (!AnimationController.s_frameTable) {
			AnimationController.s_frameTable = buildFrameTable();
		}
		return AnimationController.s_frameTable;
	}

	constructor(ownerType = 1) {
		this.ownerType = ownerType;
		this.action = DEF_OBJECTSTOP;
		this.frame = 0;
		this.timer = 0;
		this.finished = false;
	}

	// ── Accessors ────────────────────────────────────────────────

	getAction(): number { return this.action; }
	getFrame(): number { return this.frame; }
	isFinished(): boolean { return this.finished; }
	getOwnerType(): number { return this.ownerType; }

	setOwnerType(type: number): void {
		this.ownerType = type;
	}

	/** Get frame data for the current action. */
	getFrameData(): FrameData {
		const table = AnimationController.getTable();
		const actions = table.get(this.ownerType) ?? table.get(0)!;
		return actions[this.action] ?? { maxFrame: 7, frameTime: 40 };
	}

	/** Get frame data for a specific action/ownerType. */
	static getFrameDataFor(ownerType: number, action: number): FrameData {
		const table = AnimationController.getTable();
		const actions = table.get(ownerType) ?? table.get(0)!;
		return actions[action] ?? { maxFrame: 7, frameTime: 40 };
	}

	// ── State changes ────────────────────────────────────────────

	/** Start a new action. Resets frame and timer. */
	setAction(action: number): void {
		if (this.action === action) return;
		this.action = action;
		this.frame = 0;
		this.timer = 0;
		this.finished = false;
	}

	/** Force-set action even if it's the same (e.g. restart attack). */
	forceAction(action: number): void {
		this.action = action;
		this.frame = 0;
		this.timer = 0;
		this.finished = false;
	}

	/** Reset to idle. */
	reset(): void {
		this.action = DEF_OBJECTSTOP;
		this.frame = 0;
		this.timer = 0;
		this.finished = false;
	}

	// ── Per-frame update ─────────────────────────────────────────

	/**
	 * Advance animation by dt milliseconds.
	 * Looping actions (Idle, Move, Run) wrap around.
	 * One-shot actions (Attack, Damage, Dying) stop at the last frame and set finished.
	 */
	update(dtMS: number): void {
		if (this.finished) return;

		const fd = this.getFrameData();
		this.timer += dtMS;

		while (this.timer >= fd.frameTime) {
			this.timer -= fd.frameTime;
			this.frame++;

			if (this.frame >= fd.maxFrame) {
				if (this.isLoopingAction()) {
					this.frame = 0;
				} else {
					this.frame = fd.maxFrame - 1;
					this.finished = true;
					break;
				}
			}
		}
	}

	/** Actions that loop continuously. */
	private isLoopingAction(): boolean {
		return this.action === DEF_OBJECTSTOP
			|| this.action === DEF_OBJECTMOVE
			|| this.action === DEF_OBJECTRUN;
	}
}
