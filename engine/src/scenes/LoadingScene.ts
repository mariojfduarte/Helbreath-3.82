/**
 * LoadingScene — Asset preload with progress bar.
 * Mirrors C++ DEF_GAMEMODE_ONLOADING / UpdateScreen_OnLoading.
 *
 * Currently delegates to CGame.updateScreen_OnLoading() and
 * CGame.drawScreen_OnLoading() which already implement loading.
 * Phase 9 provides the scene structure for future refactoring.
 */

import type { IScene } from './IScene';
import type { CGame } from '../core/CGame';

export class LoadingScene implements IScene {
	onEnter(_game: CGame): void {
		console.log('[Scene] Entering Loading');
	}

	onLeave(_game: CGame): void {
		console.log('[Scene] Leaving Loading');
	}

	onUpdate(game: CGame): void {
		game.updateScreen_OnLoading();
	}

	onDraw(game: CGame): void {
		game.drawScreen_OnLoading();
	}
}
