/**
 * CCharInfo — Character selection data.
 * Mirrors C++ CCharInfo from Sources/Client/CharInfo.h.
 *
 * Used for the 4 character slots on the character select screen.
 * Populated from server response (PacketLogCharacterEntry).
 */

export class CCharInfo {
	m_cName = '';
	m_cMapName = '';
	m_sSkinCol = 0;
	m_sSex = 0;
	m_sAppr1 = 0;
	m_sAppr2 = 0;
	m_sAppr3 = 0;
	m_sAppr4 = 0;
	m_sStr = 0;
	m_sVit = 0;
	m_sDex = 0;
	m_sInt = 0;
	m_sMag = 0;
	m_sChr = 0;
	m_sLevel = 0;
	m_iExp = 0;
	m_iApprColor = 0;
	m_iYear = 0;
	m_iMonth = 0;
	m_iDay = 0;
	m_iHour = 0;
	m_iMinute = 0;
}
