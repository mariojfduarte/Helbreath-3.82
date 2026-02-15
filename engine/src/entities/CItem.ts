/**
 * CItem — Item instance data.
 * Mirrors C++ CItem from Sources/Client/Item.h.
 *
 * Used for inventory (m_pItemList[50]), bank (m_pBankList[1000]),
 * shop items (m_pItemForSaleList[140]), and item config (m_pItemConfigList[5000]).
 */

export const DEF_MAXITEMS = 50;
export const DEF_MAXBANKITEMS = 1000;
export const DEF_MAXMENUITEMS = 140;

export class CItem {
	m_cName = '';
	m_sIDnum = 0;
	m_dwCount = 0;
	m_sX = 0;
	m_sY = 0;
	m_cItemType = 0;
	m_cEquipPos = 0;
	m_sLevelLimit = 0;
	m_cGenderLimit = 0;
	m_wCurLifeSpan = 0;
	m_wMaxLifeSpan = 0;
	m_wWeight = 0;
	m_sSprite = 0;
	m_sSpriteFrame = 0;
	m_cItemColor = 0;
	m_dwAttribute = 0;
	m_sItemEffectType = 0;
	m_sItemEffectValue1 = 0;
	m_sItemEffectValue2 = 0;
	m_sItemEffectValue3 = 0;
	m_sItemEffectValue4 = 0;
	m_sItemEffectValue5 = 0;
	m_sItemEffectValue6 = 0;
	m_sSpecialEffect = 0;
	m_sItemSpecEffectValue2 = 0;
	m_bIsForSale = false;
	m_wPrice = 0;
}
