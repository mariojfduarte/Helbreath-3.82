/**
 * LoginScene — Server connection and authentication.
 * Mirrors C++ DEF_GAMEMODE_ONLOGIN.
 *
 * Phase 9 stub: will display login form, connect to server,
 * send MSGID_REQUEST_LOGIN, handle MSGID_RESPONSE_LOG.
 */

import type { IScene } from './IScene';
import type { CGame } from '../core/CGame';

export class LoginScene implements IScene {
	onEnter(_game: CGame): void {
		console.log('[Scene] Entering Login');
	}

	onLeave(_game: CGame): void {
		console.log('[Scene] Leaving Login');
	}

	onUpdate(_game: CGame): void {
		// Stub: handle login form input, connection state
	}

	onDraw(_game: CGame): void {
		// Stub: draw login UI
	}
}
