/**
 * Movement — Direction calculation, pathfinding, and command rate limiting.
 * Mirrors C++ CMisc::cGetNextMoveDir and movement logic from Game.cpp.
 *
 * 8-directional movement matching the original:
 *   1=N, 2=NE, 3=E, 4=SE, 5=S, 6=SW, 7=W, 8=NW
 */

// ── Direction constants ──────────────────────────────────────────

export const DIR_NONE = 0;
export const DIR_N    = 1;
export const DIR_NE   = 2;
export const DIR_E    = 3;
export const DIR_SE   = 4;
export const DIR_S    = 5;
export const DIR_SW   = 6;
export const DIR_W    = 7;
export const DIR_NW   = 8;

/** X delta per direction. */
export const DIR_DX: Record<number, number> = {
	[DIR_N]: 0,  [DIR_NE]: 1,  [DIR_E]: 1,  [DIR_SE]: 1,
	[DIR_S]: 0,  [DIR_SW]: -1, [DIR_W]: -1, [DIR_NW]: -1,
};

/** Y delta per direction. */
export const DIR_DY: Record<number, number> = {
	[DIR_N]: -1, [DIR_NE]: -1, [DIR_E]: 0,  [DIR_SE]: 1,
	[DIR_S]: 1,  [DIR_SW]: 1,  [DIR_W]: 0,  [DIR_NW]: -1,
};

/** Movement durations (ms). */
export const MOVE_DURATION_MS = 260;
export const RUN_DURATION_MS  = 150;

/** Maximum pending movement commands (mirrors C++ m_cCommandCount limit). */
export const MAX_PENDING_COMMANDS = 6;

// ── Direction calculation ────────────────────────────────────────

/**
 * Get direction from source to destination.
 * Mirrors C++ CMisc::cGetNextMoveDir().
 * absX = sX - dX, absY = sY - dY (source minus dest).
 */
export function getNextMoveDir(sx: number, sy: number, dx: number, dy: number): number {
	const absX = sx - dx;
	const absY = sy - dy;

	if (absX === 0 && absY === 0) return DIR_NONE;

	if (absX === 0) return absY > 0 ? DIR_N : DIR_S;
	if (absY === 0) return absX > 0 ? DIR_W : DIR_E;

	if (absX > 0 && absY > 0) return DIR_NW;
	if (absX < 0 && absY > 0) return DIR_NE;
	if (absX > 0 && absY < 0) return DIR_SW;
	if (absX < 0 && absY < 0) return DIR_SE;

	return DIR_NONE;
}

/**
 * Try preferred direction first; if blocked, try adjacent directions.
 * Returns 0 if all three are blocked.
 */
export function getNextMoveDirWithAvoidance(
	sx: number,
	sy: number,
	dx: number,
	dy: number,
	canWalkTo: (x: number, y: number) => boolean,
): number {
	const preferred = getNextMoveDir(sx, sy, dx, dy);
	if (preferred === DIR_NONE) return DIR_NONE;

	// Try preferred
	if (canWalkTo(sx + DIR_DX[preferred], sy + DIR_DY[preferred])) return preferred;

	// Try clockwise neighbor
	const cw = preferred === 8 ? 1 : preferred + 1;
	if (canWalkTo(sx + DIR_DX[cw], sy + DIR_DY[cw])) return cw;

	// Try counter-clockwise neighbor
	const ccw = preferred === 1 ? 8 : preferred - 1;
	if (canWalkTo(sx + DIR_DX[ccw], sy + DIR_DY[ccw])) return ccw;

	return DIR_NONE;
}

/**
 * Get the opposite direction (turn 180 degrees).
 */
export function getOppositeDir(dir: number): number {
	if (dir === DIR_NONE) return DIR_NONE;
	return ((dir - 1 + 4) % 8) + 1;
}

// ── Command rate limiter ─────────────────────────────────────────

/**
 * Rate limits outgoing movement commands to match C++ behavior.
 * The C++ client limits to MAX_PENDING_COMMANDS (6) pending commands,
 * and checks m_bCommandAvailable before sending.
 */
export class CommandRateLimiter {
	private pendingCount = 0;
	private commandAvailable = true;
	private lastCommandTime = 0;

	/** Check if a new command can be sent. */
	canSendCommand(): boolean {
		return this.commandAvailable && this.pendingCount < MAX_PENDING_COMMANDS;
	}

	/** Record that a command was sent. */
	onCommandSent(): void {
		this.pendingCount++;
		this.lastCommandTime = performance.now();
		if (this.pendingCount >= MAX_PENDING_COMMANDS) {
			this.commandAvailable = false;
		}
	}

	/** Record that a command was acknowledged (confirmed or rejected). */
	onCommandAcknowledged(): void {
		if (this.pendingCount > 0) this.pendingCount--;
		this.commandAvailable = true;
	}

	/** Reset (e.g. on disconnect). */
	reset(): void {
		this.pendingCount = 0;
		this.commandAvailable = true;
		this.lastCommandTime = 0;
	}

	getPendingCount(): number { return this.pendingCount; }
	isAvailable(): boolean { return this.commandAvailable; }
}
