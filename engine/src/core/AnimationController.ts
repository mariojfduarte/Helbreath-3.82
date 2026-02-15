/**
 * AnimationController — Per-entity animation state machine.
 * Mirrors C++ m_stFrame[][] from Sources/Client/MapData.cpp exactly.
 *
 * Each entity type (ownerType) has per-action frame data:
 *   - maxFrame:  number of animation frames for the action
 *   - frameTime: milliseconds per frame
 *
 * Player characters are ownerTypes 1-6 (Bm, Wm, Ym, Bw, Ww, Yw).
 * NPC types start at 10 (Slime, Skeleton, etc.).
 *
 * IMPORTANT: C++ uses `int restar = 20` (not 4). This affects all NPC timings.
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
} from "./ActionID";

// ── Frame data per action ────────────────────────────────────────

export interface FrameData {
  maxFrame: number; // Total frames in the animation
  frameTime: number; // Milliseconds per frame
}

/** Frame data table: frameTable[ownerType][action] → FrameData */
export type FrameTable = Map<number, FrameData[]>;

// ── C++ restar value (from MapData.cpp line 70) ──────────────────

const RESTAR = 20;

// ── Helper: create default action array ──────────────────────────

function emptyActions(): FrameData[] {
  const data: FrameData[] = new Array(ACTION_COUNT);
  for (let i = 0; i < ACTION_COUNT; i++) {
    data[i] = { maxFrame: 7, frameTime: 100 };
  }
  // Idle default is slower
  data[DEF_OBJECTSTOP] = { maxFrame: 7, frameTime: 250 };
  return data;
}

/** Player character defaults (ownerTypes 1-6 only). */
function playerActions(): FrameData[] {
  const data = emptyActions();
  data[DEF_OBJECTSTOP] = { maxFrame: 14, frameTime: 80 };
  data[DEF_OBJECTMOVE] = { maxFrame: 7, frameTime: Math.floor(38 / 1.1) };
  data[DEF_OBJECTDAMAGEMOVE] = { maxFrame: 3, frameTime: 24 };
  data[DEF_OBJECTRUN] = { maxFrame: 7, frameTime: Math.floor(21 / 1.1) };
  data[DEF_OBJECTATTACK] = { maxFrame: 7, frameTime: Math.floor(41 / 1.1) };
  data[DEF_OBJECTATTACKMOVE] = { maxFrame: 12, frameTime: 38 };
  data[DEF_OBJECTMAGIC] = { maxFrame: 15, frameTime: 40 };
  data[DEF_OBJECTGETITEM] = { maxFrame: 3, frameTime: 50 };
  data[DEF_OBJECTDAMAGE] = { maxFrame: 7, frameTime: 32 };
  data[DEF_OBJECTDYING] = { maxFrame: 12, frameTime: 40 };
  return data;
}

// ── Build frame table ────────────────────────────────────────────

/**
 * Build the full frame data table matching C++ CMapData constructor
 * (Sources/Client/MapData.cpp lines 35-534).
 */
export function buildFrameTable(): FrameTable {
  const table: FrameTable = new Map();
  const r = RESTAR; // shorthand

  // C++ initializes all DEF_TOTALCHARACTERS with DEF_OBJECTMOVE.maxFrame=7
  // Then overrides types 1-6 with player defaults
  for (let i = 0; i < 100; i++) {
    table.set(i, emptyActions());
  }

  // Player characters: types 1-6 (C++ line 46: for (i = 1; i <= 6; i++))
  for (let i = 1; i <= 6; i++) {
    table.set(i, playerActions());
  }

  // Helper to set a single entry
  const s = (
    type: number,
    action: number,
    maxFrame: number,
    frameTime: number
  ) => {
    const t = table.get(type);
    if (t) t[action] = { maxFrame, frameTime };
  };

  // ── NPC overrides (C++ lines 72-534, restar=20) ──────────────

  // Type 10: Slime
  s(10, DEF_OBJECTSTOP, 3, 240);
  s(10, DEF_OBJECTMOVE, 7, Math.floor(120 - r - r - r / 1.2));
  s(10, DEF_OBJECTATTACK, 3, 90);
  s(10, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(10, DEF_OBJECTDYING, 7, 240);

  // Type 11: Skeleton
  s(11, DEF_OBJECTSTOP, 3, 150);
  s(11, DEF_OBJECTMOVE, 7, 90 - r);
  s(11, DEF_OBJECTATTACK, 3, 90);
  s(11, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(11, DEF_OBJECTDYING, 7, 180);

  // Type 12: Stone Golem
  s(12, DEF_OBJECTSTOP, 3, 210);
  s(12, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(12, DEF_OBJECTATTACK, 3, 120);
  s(12, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(12, DEF_OBJECTDYING, 7, 180);

  // Type 13: Cyclops
  s(13, DEF_OBJECTSTOP, 3, 210);
  s(13, DEF_OBJECTMOVE, 7, 80 - r);
  s(13, DEF_OBJECTATTACK, 3, 90);
  s(13, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(13, DEF_OBJECTDYING, 7, 180);

  // Type 14: Orc
  s(14, DEF_OBJECTSTOP, 3, 180);
  s(14, DEF_OBJECTMOVE, 7, 80 - r);
  s(14, DEF_OBJECTATTACK, 3, 120);
  s(14, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(14, DEF_OBJECTDYING, 7, 180);

  // Type 15: Shopkeeper (not Scorpion!)
  s(15, DEF_OBJECTSTOP, 7, 180);
  s(15, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(15, DEF_OBJECTATTACK, 3, 150);
  s(15, DEF_OBJECTDAMAGE, 3, 180);
  s(15, DEF_OBJECTDYING, 7, 180);

  // Type 16: Giant Ant (not Zombie!)
  s(16, DEF_OBJECTSTOP, 3, 120);
  s(16, DEF_OBJECTMOVE, 7, 60 - r + 15);
  s(16, DEF_OBJECTATTACK, 3, 120);
  s(16, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(16, DEF_OBJECTDYING, 7, 180);

  // Type 17: Scorpion (not Snake!)
  s(17, DEF_OBJECTSTOP, 3, 120);
  s(17, DEF_OBJECTMOVE, 7, 45 - r + 15);
  s(17, DEF_OBJECTATTACK, 3, 120);
  s(17, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(17, DEF_OBJECTDYING, 7, 180);

  // Type 18: Zombie
  s(18, DEF_OBJECTSTOP, 3, 210);
  s(18, DEF_OBJECTMOVE, 7, 130 - r - r);
  s(18, DEF_OBJECTATTACK, 3, 150);
  s(18, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(18, DEF_OBJECTDYING, 7, 180);

  // Type 19: Snake
  s(19, DEF_OBJECTSTOP, 7, 250);
  s(19, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(19, DEF_OBJECTATTACK, 3, 150);
  s(19, DEF_OBJECTDAMAGE, 3, 180);
  s(19, DEF_OBJECTDYING, 7, 180);

  // Type 20: Werewolf
  s(20, DEF_OBJECTSTOP, 7, 250);
  s(20, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(20, DEF_OBJECTATTACK, 3, 150);
  s(20, DEF_OBJECTDAMAGE, 3, 180);
  s(20, DEF_OBJECTDYING, 7, 180);

  // Type 21-23: Orc variants
  for (const t of [21, 22, 23]) {
    s(t, DEF_OBJECTSTOP, 3, 250);
    s(t, DEF_OBJECTMOVE, 7, 80 - r);
    s(t, DEF_OBJECTATTACK, 3, 120);
    s(t, DEF_OBJECTDAMAGE, 3 + 4, 150);
    s(t, DEF_OBJECTDYING, 7, 180);
  }

  // Types 24-26: Idle-only NPCs
  s(24, DEF_OBJECTSTOP, 7, 150);
  s(25, DEF_OBJECTSTOP, 7, 250);
  s(26, DEF_OBJECTSTOP, 7, 250);

  // Type 27: Troll
  s(27, DEF_OBJECTSTOP, 3, 250);
  s(27, DEF_OBJECTMOVE, 7, 50);
  s(27, DEF_OBJECTATTACK, 3, 120);
  s(27, DEF_OBJECTDAMAGE, 3 + 4, 120);
  s(27, DEF_OBJECTDYING, 7, 180);

  // Type 28: Ogre
  s(28, DEF_OBJECTSTOP, 3, 250);
  s(28, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(28, DEF_OBJECTATTACK, 5, 60);
  s(28, DEF_OBJECTDAMAGE, 3 + 4, 120);
  s(28, DEF_OBJECTDYING, 9, 100);

  // Type 29: Liche
  s(29, DEF_OBJECTSTOP, 3, 250);
  s(29, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(29, DEF_OBJECTATTACK, 5, 120);
  s(29, DEF_OBJECTDAMAGE, 3 + 4, 120);
  s(29, DEF_OBJECTDYING, 9, 100);

  // Types 30-32: Demon, Unicorn, WereWolf2 etc.
  for (const t of [30, 31]) {
    s(t, DEF_OBJECTSTOP, 3, 250);
    s(t, DEF_OBJECTMOVE, 7, 100 - r - r);
    s(t, DEF_OBJECTATTACK, 5, 120);
    s(t, DEF_OBJECTDAMAGE, 3 + 4, 120);
    s(t, DEF_OBJECTDYING, 9, 100);
  }
  // Type 31: attack maxFrame=7
  s(31, DEF_OBJECTATTACK, 7, 120);
  // Type 32
  s(32, DEF_OBJECTSTOP, 3, 250);
  s(32, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(32, DEF_OBJECTATTACK, 7, 120);
  s(32, DEF_OBJECTDAMAGE, 3 + 4, 120);
  s(32, DEF_OBJECTDYING, 11, 100);

  // Type 33: DireBoar
  s(33, DEF_OBJECTSTOP, 3, 250);
  s(33, DEF_OBJECTMOVE, 7, 120 - r - r);
  s(33, DEF_OBJECTATTACK, 7, 120);
  s(33, DEF_OBJECTDAMAGE, 3 + 4, 120);
  s(33, DEF_OBJECTDYING, 11, 100);

  // Type 34: Rudolph
  s(34, DEF_OBJECTSTOP, 3, 240);
  s(34, DEF_OBJECTMOVE, 7, 120 - r - r);
  s(34, DEF_OBJECTATTACK, 3, 90);
  s(34, DEF_OBJECTDAMAGE, 3 + 4, 150);
  s(34, DEF_OBJECTDYING, 7, 240);

  // Type 35: Energy Sphere
  s(35, DEF_OBJECTSTOP, 9, 80);
  s(35, DEF_OBJECTMOVE, 3, 20);
  s(35, DEF_OBJECTATTACK, 3, 80);
  s(35, DEF_OBJECTDAMAGE, 3 + 4, 80);
  s(35, DEF_OBJECTDYING, 7, 80);

  // Types 36-42: Crossbow Guards / NPCs (maxFrame=0 for stop/move/damage)
  for (const t of [36, 37, 38, 39, 40, 41, 42]) {
    s(t, DEF_OBJECTSTOP, 0, 250);
    s(t, DEF_OBJECTMOVE, 0, 80 - r);
    s(t, DEF_OBJECTATTACK, 3, 120);
    s(t, DEF_OBJECTDAMAGE, 0, 150);
    s(t, DEF_OBJECTDYING, 6, 200);
  }
  // Type 42: dying maxFrame=0
  s(42, DEF_OBJECTDYING, 0, 200);

  // Types 43-50: Wyvern, Barlog, etc. (heavy hitters)
  s(43, DEF_OBJECTSTOP, 7, 250);
  s(43, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(43, DEF_OBJECTATTACK, 7, 60);
  s(43, DEF_OBJECTDAMAGE, 3 + 7, 120);
  s(43, DEF_OBJECTDYING, 9, 100);

  for (const t of [44, 45, 46, 47]) {
    s(t, DEF_OBJECTSTOP, 7, 250);
    s(t, DEF_OBJECTMOVE, 7, Math.floor(100 / 1.8));
    s(t, DEF_OBJECTATTACK, 7, 60);
    s(t, DEF_OBJECTDAMAGE, 3 + 7, 120);
    s(t, DEF_OBJECTDYING, 9, 100);
  }

  for (const t of [48, 49, 50]) {
    s(t, DEF_OBJECTSTOP, 7, 250);
    s(t, DEF_OBJECTMOVE, 7, 100 - r - r);
    s(t, DEF_OBJECTATTACK, 7, 60);
    s(t, DEF_OBJECTDAMAGE, 3 + 7, 120);
    s(t, DEF_OBJECTDYING, 9, 100);
  }

  // Type 51: Catapult
  s(51, DEF_OBJECTSTOP, 0, 250);
  s(51, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(51, DEF_OBJECTATTACK, 4, 60);
  s(51, DEF_OBJECTDAMAGE, 0, 120);
  s(51, DEF_OBJECTDYING, 6, 100);

  // Type 52: Dark Knight
  s(52, DEF_OBJECTSTOP, 7, 250);
  s(52, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(52, DEF_OBJECTATTACK, 9, 70);
  s(52, DEF_OBJECTDAMAGE, 7, 120);
  s(52, DEF_OBJECTDYING, 11 + 3, 100);

  // Type 53: Hell Claw
  s(53, DEF_OBJECTSTOP, 7, 250);
  s(53, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(53, DEF_OBJECTATTACK, 12, 60);
  s(53, DEF_OBJECTDAMAGE, 7, 120);
  s(53, DEF_OBJECTDYING, 7 + 3, 70);

  // Type 54: Tigerworm
  s(54, DEF_OBJECTSTOP, 7, 250);
  s(54, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(54, DEF_OBJECTATTACK, 9, 60);
  s(54, DEF_OBJECTDAMAGE, 7, 120);
  s(54, DEF_OBJECTDYING, 7 + 3, 100);

  // Type 55: Rabbit/Bunny
  s(55, DEF_OBJECTSTOP, 7, 250);
  s(55, DEF_OBJECTMOVE, 7, 70 - r - r);
  s(55, DEF_OBJECTATTACK, 7, 100);
  s(55, DEF_OBJECTDAMAGE, 7, 100);
  s(55, DEF_OBJECTDYING, 7 + 3, 150);

  // Type 56: Cat
  s(56, DEF_OBJECTSTOP, 7, 250);
  s(56, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(56, DEF_OBJECTATTACK, 7, 60);
  s(56, DEF_OBJECTDAMAGE, 7, 100);
  s(56, DEF_OBJECTDYING, 7 + 3, 150);

  // Type 57: Giant Frog
  s(57, DEF_OBJECTSTOP, 7, 300);
  s(57, DEF_OBJECTMOVE, 7, 100 - r - r);
  s(57, DEF_OBJECTATTACK, 7, 100);
  s(57, DEF_OBJECTDAMAGE, 7, 100);
  s(57, DEF_OBJECTDYING, 7 + 3, 150);

  // Types 58-59: Mountain Giant variants
  for (const t of [58, 59]) {
    s(t, DEF_OBJECTSTOP, 7, 250);
    s(t, DEF_OBJECTMOVE, 7, 90 - r);
    s(t, DEF_OBJECTATTACK, 7, 100);
    s(t, DEF_OBJECTDAMAGE, 7, 100);
    s(t, DEF_OBJECTDYING, 7 + 3, 150);
  }

  // Type 60: Plant
  s(60, DEF_OBJECTSTOP, 7, 250);
  s(60, DEF_OBJECTMOVE, 7, 120 - r - r);
  s(60, DEF_OBJECTATTACK, 7, 100);
  s(60, DEF_OBJECTDAMAGE, 7, 100);
  s(60, DEF_OBJECTDYING, 7 + 3, 150);

  // Type 61: Rudolph2
  s(61, DEF_OBJECTSTOP, 7, 200);
  s(61, DEF_OBJECTMOVE, 7, 90 - r);
  s(61, DEF_OBJECTATTACK, 7, 120);
  s(61, DEF_OBJECTDAMAGE, 7, 60);
  s(61, DEF_OBJECTDYING, 7 + 3, 150);

  // Type 62: IceGolem
  s(62, DEF_OBJECTSTOP, 7, 200);
  s(62, DEF_OBJECTMOVE, 7, 60 - r + 15);
  s(62, DEF_OBJECTATTACK, 7, 60);
  s(62, DEF_OBJECTDAMAGE, 7, 60);
  s(62, DEF_OBJECTDYING, 7 + 3, 150);

  return table;
}

// ── AnimationController ──────────────────────────────────────────

export class AnimationController {
  private ownerType: number;
  private action: number;
  private frame: number;
  private timer: number; // ms accumulated
  private finished: boolean; // true when a non-looping anim completes

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

  getAction(): number {
    return this.action;
  }
  getFrame(): number {
    return this.frame;
  }
  isFinished(): boolean {
    return this.finished;
  }
  getOwnerType(): number {
    return this.ownerType;
  }

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
    if (fd.maxFrame <= 0) return; // Some NPCs have maxFrame=0 (static)

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
    return (
      this.action === DEF_OBJECTSTOP ||
      this.action === DEF_OBJECTMOVE ||
      this.action === DEF_OBJECTRUN
    );
  }
}
