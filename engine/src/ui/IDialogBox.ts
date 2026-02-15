/**
 * IDialogBox — Base class for all game dialogs.
 * Mirrors C++ IDialogBox from Sources/Client/IDialogBox.h.
 *
 * Each dialog implements OnDraw and OnClick. Optional: OnUpdate,
 * OnDoubleClick, OnEnable, OnDisable.
 *
 * Derived classes will be created per dialog type (Phase 7+):
 *   DialogBox_Inventory, DialogBox_CharacterInfo, DialogBox_Chat, etc.
 */

import { DialogBoxId } from './DialogBoxIDs';
import { DialogBoxInfo } from './DialogBoxInfo';
import type { CGame } from '../core/CGame';

export abstract class IDialogBox {
	protected m_id: DialogBoxId;
	protected m_pGame: CGame;
	protected m_info: DialogBoxInfo;

	constructor(id: DialogBoxId, game: CGame) {
		this.m_id = id;
		this.m_pGame = game;
		this.m_info = new DialogBoxInfo();
	}

	// ── Core virtual methods (must implement) ────────────────────

	abstract onDraw(msX: number, msY: number, msZ: number, cLB: number): void;
	abstract onClick(msX: number, msY: number): boolean;

	// ── Optional virtual methods ─────────────────────────────────

	onUpdate(): void {}
	onDoubleClick(_msX: number, _msY: number): boolean { return false; }
	onEnable(_cType: number, _sV1: number, _sV2: number, _pString: string): void {}
	onDisable(): void {}

	// ── Accessors ────────────────────────────────────────────────

	getId(): DialogBoxId { return this.m_id; }
	getInfo(): DialogBoxInfo { return this.m_info; }
	isEnabled(): boolean { return this.m_info.bIsEnabled; }

	setEnabled(enabled: boolean): void { this.m_info.bIsEnabled = enabled; }
	setPosition(x: number, y: number): void { this.m_info.sX = x; this.m_info.sY = y; }
	setSize(w: number, h: number): void { this.m_info.sSizeX = w; this.m_info.sSizeY = h; }

	/**
	 * Check if a point is inside this dialog's bounding rect.
	 */
	isPointInside(x: number, y: number): boolean {
		const i = this.m_info;
		return x >= i.sX && x < i.sX + i.sSizeX && y >= i.sY && y < i.sY + i.sSizeY;
	}
}
