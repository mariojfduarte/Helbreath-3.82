/**
 * IScene — Base interface for game scenes (game modes).
 * Each DEF_GAMEMODE_* maps to a scene that handles update and draw.
 *
 * Scenes are registered with the SceneManager and dispatched per frame.
 * Phase 9: Loading and MainGame are functional; others are stubs.
 */

import type { CGame } from '../core/CGame';

export interface IScene {
	/** Called when entering this scene (mode change). */
	onEnter(game: CGame): void;

	/** Called when leaving this scene. */
	onLeave(game: CGame): void;

	/** Per-frame update logic. */
	onUpdate(game: CGame): void;

	/** Per-frame draw. */
	onDraw(game: CGame): void;
}
