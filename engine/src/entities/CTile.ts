/**
 * CTile — Viewport tile entity/owner data.
 * Mirrors C++ CTile from Sources/Client/Tile.h.
 *
 * Each tile in the active viewport (CMapData.m_pData[60][55]) stores
 * information about which entity occupies it, their appearance, items
 * on the ground, dynamic objects, effects, and chat messages.
 */

export class CTile {
	// ── Living entity ────────────────────────────────────────────

	m_wObjectID = 0;
	m_sOwnerType = 0;
	m_cOwnerName = '';
	m_cOwnerAction = 0;
	m_cOwnerFrame = 0;
	m_cDir = 0;
	m_dwOwnerTime = 0;
	m_bSpriteOmit = false;

	// Appearance fields (encoded equipment/appearance)
	m_sAppr1 = 0;
	m_sAppr2 = 0;
	m_sAppr3 = 0;
	m_sAppr4 = 0;
	m_iApprColor = 0;
	m_iStatus = 0;

	// ── Dead entity ──────────────────────────────────────────────

	m_wDeadObjectID = 0;
	m_sDeadOwnerType = 0;
	m_cDeadOwnerName = '';
	m_cDeadOwnerFrame = -1;
	m_dwDeadOwnerTime = 0;
	m_sDeadAppr1 = 0;
	m_sDeadAppr2 = 0;
	m_sDeadAppr3 = 0;
	m_sDeadAppr4 = 0;
	m_iDeadApprColor = 0;
	m_iDeadStatus = 0;
	m_cDeadDir = 0;

	// ── Ground item ──────────────────────────────────────────────

	m_sItemID = 0;
	m_dwItemAttr = 0;
	m_cItemColor = 0;

	// ── Dynamic object (fire, minerals, flags) ───────────────────

	m_sDynamicObjectType = 0;
	m_cDynamicObjectFrame = 0;
	m_cDynamicObjectData1 = 0;
	m_cDynamicObjectData2 = 0;
	m_cDynamicObjectData3 = 0;
	m_cDynamicObjectData4 = 0;
	m_dwDynamicObjectTime = 0;

	// ── Chat message ─────────────────────────────────────────────

	m_iChatMsg = 0;
	m_iDeadChatMsg = 0;

	// ── Effect ───────────────────────────────────────────────────

	m_iEffectType = 0;
	m_iEffectFrame = 0;
	m_iEffectTotalFrame = 0;
	m_dwEffectTime = 0;

	// ── Extra ────────────────────────────────────────────────────

	m_sV1 = 0;
	m_sV2 = 0;
	m_sV3 = 0;

	/** Reset all fields to default (matches C++ CTile::Clear). */
	clear(): void {
		this.m_wObjectID = 0;
		this.m_wDeadObjectID = 0;
		this.m_sOwnerType = 0;
		this.m_cOwnerName = '';
		this.m_sDeadOwnerType = 0;
		this.m_cDeadOwnerName = '';
		this.m_cDeadOwnerFrame = -1;
		this.m_dwDeadOwnerTime = 0;
		this.m_cOwnerAction = 0;
		this.m_cDir = 0;
		this.m_cOwnerFrame = 0;
		this.m_sItemID = 0;
		this.m_dwItemAttr = 0;
		this.m_cItemColor = 0;
		this.m_sDynamicObjectType = 0;
		this.m_cDynamicObjectFrame = 0;
		this.m_iChatMsg = 0;
		this.m_iDeadChatMsg = 0;
		this.m_iStatus = 0;
		this.m_iDeadStatus = 0;
		this.m_sV1 = 0;
		this.m_sV2 = 0;
		this.m_sV3 = 0;
		this.m_sAppr1 = 0;
		this.m_sAppr2 = 0;
		this.m_sAppr3 = 0;
		this.m_sAppr4 = 0;
		this.m_iApprColor = 0;
		this.m_iEffectType = 0;
		this.m_iEffectFrame = 0;
		this.m_iEffectTotalFrame = 0;
		this.m_dwEffectTime = 0;
		this.m_dwOwnerTime = 0;
	}
}
