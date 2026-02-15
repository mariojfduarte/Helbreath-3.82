/**
 * CMapData — Active viewport tile data and entity placement.
 * Mirrors C++ CMapData from Sources/Client/MapData.h/.cpp.
 *
 * The C++ client uses two grids:
 *   m_pData[60][55] — active viewport tiles with entity owner data (CTile)
 *   m_tile[752][752] — tile sprite definitions (tileSprite, objectSprite, etc.)
 *
 * m_pData is the "live" viewport: entities are placed/removed via
 * bSetOwner/bGetOwner as the server sends entity updates.
 * m_tile is the static map loaded from .amd files.
 *
 * ShiftMapData() scrolls the viewport when the player moves, shifting
 * the m_pData grid and clearing the newly exposed edge.
 */

import { CTile } from './CTile';

// ── Constants (matching C++ MAPDATASIZEX/Y) ──────────────────────

export const MAPDATASIZEX = 60;
export const MAPDATASIZEY = 55;

// ── CMapData ─────────────────────────────────────────────────────

export class CMapData {
	// Active viewport tile data (entity placement)
	m_pData: CTile[][] = [];

	// Pivot: world tile coordinate of the viewport origin
	m_sPivotX = 0;
	m_sPivotY = 0;

	// Player position within the viewport
	m_sPlayerX = 0;
	m_sPlayerY = 0;

	constructor() {
		// Initialize viewport grid
		for (let x = 0; x < MAPDATASIZEX; x++) {
			this.m_pData[x] = [];
			for (let y = 0; y < MAPDATASIZEY; y++) {
				this.m_pData[x][y] = new CTile();
			}
		}
	}

	// ── Owner management ─────────────────────────────────────────

	/**
	 * Place an entity on a viewport tile.
	 * Mirrors C++ CMapData::bSetOwner().
	 */
	bSetOwner(
		indexX: number,
		indexY: number,
		objectID: number,
		ownerType: number,
		dir: number,
		action: number,
		frame: number,
		name: string,
		appr1: number,
		appr2: number,
		appr3: number,
		appr4: number,
		apprColor: number,
		status: number,
		time: number,
	): boolean {
		if (indexX < 0 || indexX >= MAPDATASIZEX || indexY < 0 || indexY >= MAPDATASIZEY) return false;
		const tile = this.m_pData[indexX][indexY];

		tile.m_wObjectID = objectID;
		tile.m_sOwnerType = ownerType;
		tile.m_cDir = dir;
		tile.m_cOwnerAction = action;
		tile.m_cOwnerFrame = frame;
		tile.m_cOwnerName = name;
		tile.m_sAppr1 = appr1;
		tile.m_sAppr2 = appr2;
		tile.m_sAppr3 = appr3;
		tile.m_sAppr4 = appr4;
		tile.m_iApprColor = apprColor;
		tile.m_iStatus = status;
		tile.m_dwOwnerTime = time;

		return true;
	}

	/**
	 * Check if a tile has an owner entity.
	 * Mirrors C++ CMapData::bGetOwner().
	 */
	bGetOwner(indexX: number, indexY: number): CTile | null {
		if (indexX < 0 || indexX >= MAPDATASIZEX || indexY < 0 || indexY >= MAPDATASIZEY) return null;
		const tile = this.m_pData[indexX][indexY];
		if (tile.m_sOwnerType === 0) return null;
		return tile;
	}

	/**
	 * Clear owner from a viewport tile.
	 */
	clearOwner(indexX: number, indexY: number): void {
		if (indexX < 0 || indexX >= MAPDATASIZEX || indexY < 0 || indexY >= MAPDATASIZEY) return;
		this.m_pData[indexX][indexY].clear();
	}

	/**
	 * Clear chat message from a viewport tile.
	 */
	clearChatMsg(indexX: number, indexY: number): void {
		if (indexX < 0 || indexX >= MAPDATASIZEX || indexY < 0 || indexY >= MAPDATASIZEY) return;
		this.m_pData[indexX][indexY].m_iChatMsg = 0;
	}

	// ── Viewport scrolling ───────────────────────────────────────

	/**
	 * Shift the viewport when the player moves.
	 * Mirrors C++ CMapData::ShiftMapData().
	 *
	 * Shifts all tile data in the given direction and clears
	 * the newly exposed edge.
	 */
	shiftMapData(dx: number, dy: number): void {
		// Shift right (player moved left): shift data +X
		if (dx > 0) {
			for (let x = MAPDATASIZEX - 1; x > 0; x--) {
				for (let y = 0; y < MAPDATASIZEY; y++) {
					this.copyTile(this.m_pData[x][y], this.m_pData[x - 1][y]);
				}
			}
			for (let y = 0; y < MAPDATASIZEY; y++) {
				this.m_pData[0][y].clear();
			}
		}

		// Shift left (player moved right): shift data -X
		if (dx < 0) {
			for (let x = 0; x < MAPDATASIZEX - 1; x++) {
				for (let y = 0; y < MAPDATASIZEY; y++) {
					this.copyTile(this.m_pData[x][y], this.m_pData[x + 1][y]);
				}
			}
			for (let y = 0; y < MAPDATASIZEY; y++) {
				this.m_pData[MAPDATASIZEX - 1][y].clear();
			}
		}

		// Shift down (player moved up): shift data +Y
		if (dy > 0) {
			for (let x = 0; x < MAPDATASIZEX; x++) {
				for (let y = MAPDATASIZEY - 1; y > 0; y--) {
					this.copyTile(this.m_pData[x][y], this.m_pData[x][y - 1]);
				}
				this.m_pData[x][0].clear();
			}
		}

		// Shift up (player moved down): shift data -Y
		if (dy < 0) {
			for (let x = 0; x < MAPDATASIZEX; x++) {
				for (let y = 0; y < MAPDATASIZEY - 1; y++) {
					this.copyTile(this.m_pData[x][y], this.m_pData[x][y + 1]);
				}
				this.m_pData[x][MAPDATASIZEY - 1].clear();
			}
		}

		this.m_sPivotX -= dx;
		this.m_sPivotY -= dy;
	}

	/** Copy all fields from src to dst. */
	private copyTile(dst: CTile, src: CTile): void {
		dst.m_wObjectID = src.m_wObjectID;
		dst.m_wDeadObjectID = src.m_wDeadObjectID;
		dst.m_sOwnerType = src.m_sOwnerType;
		dst.m_cOwnerName = src.m_cOwnerName;
		dst.m_cOwnerAction = src.m_cOwnerAction;
		dst.m_cOwnerFrame = src.m_cOwnerFrame;
		dst.m_cDir = src.m_cDir;
		dst.m_dwOwnerTime = src.m_dwOwnerTime;
		dst.m_bSpriteOmit = src.m_bSpriteOmit;
		dst.m_sAppr1 = src.m_sAppr1;
		dst.m_sAppr2 = src.m_sAppr2;
		dst.m_sAppr3 = src.m_sAppr3;
		dst.m_sAppr4 = src.m_sAppr4;
		dst.m_iApprColor = src.m_iApprColor;
		dst.m_iStatus = src.m_iStatus;
		dst.m_sDeadOwnerType = src.m_sDeadOwnerType;
		dst.m_cDeadOwnerName = src.m_cDeadOwnerName;
		dst.m_cDeadOwnerFrame = src.m_cDeadOwnerFrame;
		dst.m_dwDeadOwnerTime = src.m_dwDeadOwnerTime;
		dst.m_sDeadAppr1 = src.m_sDeadAppr1;
		dst.m_sDeadAppr2 = src.m_sDeadAppr2;
		dst.m_sDeadAppr3 = src.m_sDeadAppr3;
		dst.m_sDeadAppr4 = src.m_sDeadAppr4;
		dst.m_iDeadApprColor = src.m_iDeadApprColor;
		dst.m_iDeadStatus = src.m_iDeadStatus;
		dst.m_cDeadDir = src.m_cDeadDir;
		dst.m_sItemID = src.m_sItemID;
		dst.m_dwItemAttr = src.m_dwItemAttr;
		dst.m_cItemColor = src.m_cItemColor;
		dst.m_sDynamicObjectType = src.m_sDynamicObjectType;
		dst.m_cDynamicObjectFrame = src.m_cDynamicObjectFrame;
		dst.m_cDynamicObjectData1 = src.m_cDynamicObjectData1;
		dst.m_cDynamicObjectData2 = src.m_cDynamicObjectData2;
		dst.m_cDynamicObjectData3 = src.m_cDynamicObjectData3;
		dst.m_cDynamicObjectData4 = src.m_cDynamicObjectData4;
		dst.m_dwDynamicObjectTime = src.m_dwDynamicObjectTime;
		dst.m_iChatMsg = src.m_iChatMsg;
		dst.m_iDeadChatMsg = src.m_iDeadChatMsg;
		dst.m_iEffectType = src.m_iEffectType;
		dst.m_iEffectFrame = src.m_iEffectFrame;
		dst.m_iEffectTotalFrame = src.m_iEffectTotalFrame;
		dst.m_dwEffectTime = src.m_dwEffectTime;
		dst.m_sV1 = src.m_sV1;
		dst.m_sV2 = src.m_sV2;
		dst.m_sV3 = src.m_sV3;
	}

	/** Clear all viewport tiles. */
	clearAll(): void {
		for (let x = 0; x < MAPDATASIZEX; x++) {
			for (let y = 0; y < MAPDATASIZEY; y++) {
				this.m_pData[x][y].clear();
			}
		}
	}
}
