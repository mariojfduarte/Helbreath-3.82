/**
 * ActionID — Object action constants.
 * Mirrors C++ Dependencies/Shared/ActionID.h.
 *
 * Used for animation frame lookup and entity state machine.
 * Index into m_stFrame[ownerType][action] for frame timing/count.
 */

export const DEF_OBJECTSTOP        = 0;
export const DEF_OBJECTMOVE        = 1;
export const DEF_OBJECTRUN         = 2;
export const DEF_OBJECTATTACK      = 3;
export const DEF_OBJECTMAGIC       = 4;
export const DEF_OBJECTGETITEM     = 5;
export const DEF_OBJECTDAMAGE      = 6;
export const DEF_OBJECTDAMAGEMOVE  = 7;
export const DEF_OBJECTATTACKMOVE  = 8;
export const DEF_OBJECTDYING       = 10;

// Confirm/reject responses from server (not animation actions)
export const DEF_OBJECTMOVE_CONFIRM = 1001;
export const DEF_OBJECTMOVE_REJECT  = 1010;

/** Total number of action slots used in frame data tables. */
export const ACTION_COUNT = 11;

/**
 * Maps DEF_OBJECT* action IDs to PAK sprite action offsets.
 * PAK layout: actionOffset * 8 + (dir - 1) = sprite index.
 *   Idle unarmed (DEF_OBJECTSTOP)   → offset 0  (sprites 0-7)
 *   Idle armed                      → offset 1  (sprites 8-15)
 *   Walk unarmed (DEF_OBJECTMOVE)   → offset 2  (sprites 16-23)
 *   Walk armed                      → offset 3  (sprites 24-31)
 *   Attack etc.                     → offset 4+ (sprites 32+)
 */
export const ACTION_TO_SPRITE_OFFSET: Record<number, number> = {
	[DEF_OBJECTSTOP]:       0,  // idle unarmed  → PAK group 0 (sprites 0-7)
	[DEF_OBJECTMOVE]:       2,  // walk unarmed  → PAK group 2 (sprites 16-23)
	[DEF_OBJECTRUN]:        4,  // run → PAK group 4 (sprites 32-39)
	[DEF_OBJECTATTACK]:     4,  // attack        → PAK group 4 (sprites 32-39)
	[DEF_OBJECTMAGIC]:      5,  // magic         → PAK group 5 (sprites 40-47)
	[DEF_OBJECTGETITEM]:    6,  // get item      → PAK group 6 (sprites 48-55)
	[DEF_OBJECTDAMAGE]:     7,  // damage        → PAK group 7 (sprites 56-63)
	[DEF_OBJECTDAMAGEMOVE]: 7,  // damage move (same sprites as damage)
	[DEF_OBJECTATTACKMOVE]: 8,  // attack move   → PAK group 8 (sprites 64-71)
	[DEF_OBJECTDYING]:      9,  // dying         → PAK group 9 (sprites 72-79)
};
