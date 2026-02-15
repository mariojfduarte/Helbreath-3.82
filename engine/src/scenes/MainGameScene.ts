/**
 * MainGameScene — Full gameplay scene.
 * Mirrors C++ DEF_GAMEMODE_ONMAINGAME.
 *
 * Currently delegates to CGame.updateScreen_OnGame() and
 * CGame.drawScreen_OnGame() which already implement map rendering,
 * character movement, and object transparency.
 */

import type { IScene } from './IScene';
import type { CGame } from '../core/CGame';

export class MainGameScene implements IScene {
	onEnter(_game: CGame): void {
		console.log('[Scene] Entering MainGame');
	}

	onLeave(_game: CGame): void {
		console.log('[Scene] Leaving MainGame');
	}

	onUpdate(game: CGame): void {
		game.updateScreen_OnGame();
	}

	onDraw(game: CGame): void {
		game.drawScreen_OnGame();
	}
}
