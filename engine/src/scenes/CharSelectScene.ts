/**
 * CharSelectScene — Character selection screen.
 * Mirrors C++ DEF_GAMEMODE_ONSELECTCHARACTER.
 *
 * Phase 9 stub: will display 4 character slots (from CCharInfo[4]),
 * allow create/delete, and enter game with selected character.
 */

import type { IScene } from './IScene';
import type { CGame } from '../core/CGame';

export class CharSelectScene implements IScene {
	onEnter(_game: CGame): void {
		console.log('[Scene] Entering CharSelect');
	}

	onLeave(_game: CGame): void {
		console.log('[Scene] Leaving CharSelect');
	}

	onUpdate(_game: CGame): void {
		// Stub: handle character selection input
	}

	onDraw(_game: CGame): void {
		// Stub: draw character slots, create/delete buttons
	}
}
