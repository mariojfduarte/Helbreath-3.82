/**
 * DialogBoxManager — Dialog slot management with Z-ordering.
 * Mirrors C++ DialogBoxManager from Sources/Client/DialogBoxManager.h/.cpp.
 *
 * Manages up to 61 dialog slots. Each slot can hold an IDialogBox instance.
 * Z-ordering via m_cOrder array: drawn back-to-front, clicks check front-to-back.
 * The HUD panel (slot 29) is always drawn on top.
 */

import { DialogBoxId, MAX_DIALOG_SLOTS } from './DialogBoxIDs';
import { DialogBoxInfo } from './DialogBoxInfo';
import { IDialogBox } from './IDialogBox';
import type { CGame } from '../core/CGame';

export class DialogBoxManager {
	private m_pGame: CGame | null = null;

	/** Dialog instances by slot index (sparse). */
	private m_dialogs: (IDialogBox | null)[] = new Array(MAX_DIALOG_SLOTS).fill(null);

	/** Info structs by slot index. */
	private m_info: DialogBoxInfo[] = [];

	/** Z-order: m_cOrder[i] = slot index. Index 0 = backmost. */
	private m_cOrder: number[] = new Array(MAX_DIALOG_SLOTS).fill(0);

	constructor(game?: CGame) {
		for (let i = 0; i < MAX_DIALOG_SLOTS; i++) {
			this.m_info.push(new DialogBoxInfo());
			this.m_cOrder[i] = 0;
		}
		if (game) this.initialize(game);
	}

	initialize(game: CGame): void {
		this.m_pGame = game;
	}

	// ── Registration ─────────────────────────────────────────────

	registerDialogBox(dialog: IDialogBox): void {
		const id = dialog.getId() as number;
		if (id >= 0 && id < MAX_DIALOG_SLOTS) {
			this.m_dialogs[id] = dialog;
		}
	}

	getDialogBox(id: DialogBoxId | number): IDialogBox | null {
		const idx = id as number;
		if (idx < 0 || idx >= MAX_DIALOG_SLOTS) return null;
		return this.m_dialogs[idx];
	}

	// ── Enable / Disable ─────────────────────────────────────────

	enable(id: DialogBoxId, cType = 0, sV1 = 0, sV2 = 0, pString = ''): void {
		const idx = id as number;
		if (idx < 0 || idx >= MAX_DIALOG_SLOTS) return;

		const info = this.m_info[idx];
		info.bIsEnabled = true;
		info.cType = cType;
		info.sV1 = sV1;
		info.sV2 = sV2;
		info.cStr = pString;

		// Bring to front in Z-order
		this.bringToFront(idx);

		const dialog = this.m_dialogs[idx];
		if (dialog) {
			dialog.getInfo().bIsEnabled = true;
			dialog.onEnable(cType, sV1, sV2, pString);
		}
	}

	disable(id: DialogBoxId): void {
		const idx = id as number;
		if (idx < 0 || idx >= MAX_DIALOG_SLOTS) return;

		this.m_info[idx].bIsEnabled = false;

		const dialog = this.m_dialogs[idx];
		if (dialog) {
			dialog.getInfo().bIsEnabled = false;
			dialog.onDisable();
		}
	}

	toggle(id: DialogBoxId, cType = 0, sV1 = 0, sV2 = 0, pString = ''): void {
		if (this.isEnabled(id)) {
			this.disable(id);
		} else {
			this.enable(id, cType, sV1, sV2, pString);
		}
	}

	isEnabled(id: DialogBoxId | number): boolean {
		const idx = id as number;
		if (idx < 0 || idx >= MAX_DIALOG_SLOTS) return false;
		return this.m_info[idx].bIsEnabled;
	}

	info(id: DialogBoxId | number): DialogBoxInfo {
		return this.m_info[id as number];
	}

	// ── Z-ordering ───────────────────────────────────────────────

	private bringToFront(slotIdx: number): void {
		// Remove from current position
		const pos = this.m_cOrder.indexOf(slotIdx);
		if (pos >= 0) this.m_cOrder.splice(pos, 1);
		// Add to front (end = topmost)
		this.m_cOrder.push(slotIdx);
	}

	getTopId(): number {
		for (let i = this.m_cOrder.length - 1; i >= 0; i--) {
			const slot = this.m_cOrder[i];
			if (this.m_info[slot]?.bIsEnabled) return slot;
		}
		return 0;
	}

	// ── Per-frame update ─────────────────────────────────────────

	updateDialogBoxes(): void {
		for (let i = 0; i < MAX_DIALOG_SLOTS; i++) {
			if (this.m_info[i].bIsEnabled && this.m_dialogs[i]) {
				this.m_dialogs[i]!.onUpdate();
			}
		}
	}

	// ── Draw (back-to-front Z-order) ─────────────────────────────

	drawAll(msX: number, msY: number, msZ: number, cLB: number): void {
		for (const slot of this.m_cOrder) {
			if (slot >= 0 && slot < MAX_DIALOG_SLOTS
				&& this.m_info[slot]?.bIsEnabled
				&& this.m_dialogs[slot]) {
				this.m_dialogs[slot]!.onDraw(msX, msY, msZ, cLB);
			}
		}
	}

	// ── Click (front-to-back, first hit wins) ────────────────────

	handleClick(msX: number, msY: number): boolean {
		for (let i = this.m_cOrder.length - 1; i >= 0; i--) {
			const slot = this.m_cOrder[i];
			if (slot >= 0 && slot < MAX_DIALOG_SLOTS
				&& this.m_info[slot]?.bIsEnabled
				&& this.m_dialogs[slot]) {
				if (this.m_dialogs[slot]!.isPointInside(msX, msY)) {
					this.bringToFront(slot);
					return this.m_dialogs[slot]!.onClick(msX, msY);
				}
			}
		}
		return false;
	}

	handleDoubleClick(msX: number, msY: number): boolean {
		for (let i = this.m_cOrder.length - 1; i >= 0; i--) {
			const slot = this.m_cOrder[i];
			if (slot >= 0 && slot < MAX_DIALOG_SLOTS
				&& this.m_info[slot]?.bIsEnabled
				&& this.m_dialogs[slot]) {
				if (this.m_dialogs[slot]!.isPointInside(msX, msY)) {
					return this.m_dialogs[slot]!.onDoubleClick(msX, msY);
				}
			}
		}
		return false;
	}
}
