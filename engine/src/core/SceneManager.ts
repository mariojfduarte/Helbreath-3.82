/**
 * SceneManager — Game mode dispatch.
 * Mirrors the C++ switch(m_cGameMode) in CGame::UpdateScreen() / DrawScreen().
 *
 * Each game mode maps to an update and draw handler. Only Loading and MainGame
 * are implemented in Phase 1; all others are stubs logged to console.
 */

import {
	DEF_GAMEMODE_NULL,
	DEF_GAMEMODE_ONQUIT,
	DEF_GAMEMODE_ONMAINMENU,
	DEF_GAMEMODE_ONCONNECTING,
	DEF_GAMEMODE_ONLOADING,
	DEF_GAMEMODE_ONWAITINGINITDATA,
	DEF_GAMEMODE_ONMAINGAME,
	DEF_GAMEMODE_ONCONNECTIONLOST,
	DEF_GAMEMODE_ONMSG,
	DEF_GAMEMODE_ONCREATENEWACCOUNT,
	DEF_GAMEMODE_ONLOGIN,
	DEF_GAMEMODE_ONQUERYFORCELOGIN,
	DEF_GAMEMODE_ONSELECTCHARACTER,
	DEF_GAMEMODE_ONCREATENEWCHARACTER,
	DEF_GAMEMODE_ONWAITINGRESPONSE,
	DEF_GAMEMODE_ONQUERYDELETECHARACTER,
	DEF_GAMEMODE_ONLOGRESMSG,
	DEF_GAMEMODE_ONCHANGEPASSWORD,
	DEF_GAMEMODE_ONVERSIONNOTMATCH,
	DEF_GAMEMODE_ONINTRODUCTION,
	DEF_GAMEMODE_ONAGREEMENT,
	DEF_GAMEMODE_ONSELECTSERVER,
	DEF_GAMEMODE_ONINPUTKEYCODE,
} from './GameModes';
import { GameClock } from './GameClock';
import type { CGame } from './CGame';

// ── SceneManager ─────────────────────────────────────────────────

export class SceneManager {
	private m_cGameMode: number = DEF_GAMEMODE_NULL;
	private m_cGameModeCount = 0;
	private m_dwModeChangeTime = 0;

	// ── Mode access ───────────────────────────────────────────────

	getGameMode(): number {
		return this.m_cGameMode;
	}

	getGameModeCount(): number {
		return this.m_cGameModeCount;
	}

	getModeChangeTime(): number {
		return this.m_dwModeChangeTime;
	}

	/**
	 * Change the active game mode.
	 * Mirrors C++ CGame::ChangeGameMode().
	 */
	changeGameMode(mode: number): void {
		this.m_cGameMode = mode;
		this.m_cGameModeCount = 0;
		this.m_dwModeChangeTime = GameClock.getTimeMS();
	}

	// ── Update dispatch (mirrors C++ CGame::UpdateScreen switch) ──

	updateScreen(game: CGame): void {
		switch (this.m_cGameMode) {
			case DEF_GAMEMODE_ONLOADING:
				game.updateScreen_OnLoading();
				break;
			case DEF_GAMEMODE_ONMAINGAME:
				game.updateScreen_OnGame();
				break;

			// ── Stubs for future phases ───────────────────────────
			case DEF_GAMEMODE_ONMAINMENU:
			case DEF_GAMEMODE_ONCONNECTING:
			case DEF_GAMEMODE_ONWAITINGINITDATA:
			case DEF_GAMEMODE_ONCONNECTIONLOST:
			case DEF_GAMEMODE_ONMSG:
			case DEF_GAMEMODE_ONCREATENEWACCOUNT:
			case DEF_GAMEMODE_ONLOGIN:
			case DEF_GAMEMODE_ONQUERYFORCELOGIN:
			case DEF_GAMEMODE_ONSELECTCHARACTER:
			case DEF_GAMEMODE_ONCREATENEWCHARACTER:
			case DEF_GAMEMODE_ONWAITINGRESPONSE:
			case DEF_GAMEMODE_ONQUERYDELETECHARACTER:
			case DEF_GAMEMODE_ONLOGRESMSG:
			case DEF_GAMEMODE_ONCHANGEPASSWORD:
			case DEF_GAMEMODE_ONVERSIONNOTMATCH:
			case DEF_GAMEMODE_ONINTRODUCTION:
			case DEF_GAMEMODE_ONAGREEMENT:
			case DEF_GAMEMODE_ONSELECTSERVER:
			case DEF_GAMEMODE_ONINPUTKEYCODE:
				// Stub: will be implemented in later phases
				break;

			case DEF_GAMEMODE_ONQUIT:
			case DEF_GAMEMODE_NULL:
				break;
		}

		this.m_cGameModeCount++;
	}

	// ── Draw dispatch (mirrors C++ CGame::DrawScreen switch) ──────

	drawScreen(game: CGame): void {
		switch (this.m_cGameMode) {
			case DEF_GAMEMODE_ONLOADING:
				game.drawScreen_OnLoading();
				break;
			case DEF_GAMEMODE_ONMAINGAME:
				game.drawScreen_OnGame();
				break;

			// ── Stubs for future phases ───────────────────────────
			case DEF_GAMEMODE_ONMAINMENU:
			case DEF_GAMEMODE_ONCONNECTING:
			case DEF_GAMEMODE_ONWAITINGINITDATA:
			case DEF_GAMEMODE_ONCONNECTIONLOST:
			case DEF_GAMEMODE_ONMSG:
			case DEF_GAMEMODE_ONCREATENEWACCOUNT:
			case DEF_GAMEMODE_ONLOGIN:
			case DEF_GAMEMODE_ONQUERYFORCELOGIN:
			case DEF_GAMEMODE_ONSELECTCHARACTER:
			case DEF_GAMEMODE_ONCREATENEWCHARACTER:
			case DEF_GAMEMODE_ONWAITINGRESPONSE:
			case DEF_GAMEMODE_ONQUERYDELETECHARACTER:
			case DEF_GAMEMODE_ONLOGRESMSG:
			case DEF_GAMEMODE_ONCHANGEPASSWORD:
			case DEF_GAMEMODE_ONVERSIONNOTMATCH:
			case DEF_GAMEMODE_ONINTRODUCTION:
			case DEF_GAMEMODE_ONAGREEMENT:
			case DEF_GAMEMODE_ONSELECTSERVER:
			case DEF_GAMEMODE_ONINPUTKEYCODE:
				break;

			case DEF_GAMEMODE_ONQUIT:
			case DEF_GAMEMODE_NULL:
				break;
		}
	}
}
