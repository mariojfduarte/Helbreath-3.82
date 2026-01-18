// Effect_Draw.cpp: DrawEffects implementation
//
//////////////////////////////////////////////////////////////////////

#include "EffectManager.h"
#include "Game.h"
#include "ISprite.h"
#include "Effect.h"
#include "GlobalDef.h"
#include "Misc.h"

void EffectManager::DrawEffectsImpl()
{
	int i, dX, dY, iDvalue, tX, tY, rX, rY, rX2, rY2, rX3, rY3, rX4, rY4, rX5, rY5, iErr;
	char  cTempFrame;
	uint32_t dwTime = m_pGame->m_dwCurTime;
	short sObjectType;
	char  cName[21];
	int iStatus;

	for (i = 0; i < DEF_MAXEFFECTS; i++)
		if ((m_pEffectList[i] != 0) && (m_pEffectList[i]->m_cFrame >= 0))
		{
			switch (m_pEffectList[i]->m_sType) {
			case 1: // Normal hit
				if (m_pEffectList[i]->m_cFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[8]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 2: // Arrow flying
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 2;
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[7]->Draw(dX, dY, cTempFrame);
				break;

			case 4: // gold
				/// 1.5
				if (m_pEffectList[i]->m_cFrame < 9) break;
				cTempFrame = m_pEffectList[i]->m_cFrame - 9;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[1]->Draw(dX, dY - 40, cTempFrame);

				break;

			case 5: // FireBall Fire Explosion
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 8) * (-5);
				if (cTempFrame < 7)
					(*m_pEffectSpr)[3]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[3]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f));
				break;

			case 6:	 // Energy Bolt
			case 10: // Lightning Arrow
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 7) * (-6);
				if (cTempFrame < 6)
					(*m_pEffectSpr)[6]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[6]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

			case 7: // Magic Missile Explosion
				cTempFrame = m_pEffectList[i]->m_cFrame;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 4) * (-3);
				if (cTempFrame < 4)
					(*m_pEffectSpr)[6]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[6]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

			case 8: // Burst
				cTempFrame = m_pEffectList[i]->m_cFrame;
				cTempFrame = 4 - cTempFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 9: // Burst
				cTempFrame = (rand() % 5);
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 11: // pt grenat
				cTempFrame = (rand() % 5) + 5;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.25f));
				break;

			case 12: // Burst
				cTempFrame = (rand() % 6) + 10;
				if (cTempFrame < 0) break;
				iDvalue = (m_pEffectList[i]->m_cFrame - 4) * (-3);
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				if (cTempFrame < 4)
					(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else //(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				//
					(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 13:
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				if (cTempFrame < 13)
				{
					(*m_pEffectSpr)[11]->Draw(dX, dY, 25 + (cTempFrame / 5), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				}
				else
				{
					(*m_pEffectSpr)[11]->Draw(dX, dY, (8 + cTempFrame), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				}
				break;

			case 14: // Traces de pas (terrain sec)
				if (m_pEffectList[i]->m_cFrame < 0) break;
				dX = m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX;
				dY = m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[11]->Draw(dX, dY, (28 + m_pEffectList[i]->m_cFrame), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 15: // petits nuages rouges
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX;
				dY = m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[11]->Draw(dX, dY, (33 + cTempFrame), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 16: //
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[0]->Draw(dX, dY, 0, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 17: //test
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = 39 + (rand() % 3) * 3 + (rand() % 3);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				dX = (m_pEffectList[i]->m_mX2) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY2) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 18: //
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[18]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.7f, 0, 0, 0, false});
				break;

			case 20: // critical hit
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 27: // Critical strike with a weapon
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[8]->Draw(dX, dY, 1, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 30: // Mass-Fire-Strike
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[14]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 31: // Mass-Fire-Strike
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[15]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 32: // Trace de pas  (raining weather)
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame + 20;
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[11]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 33: //
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				iDvalue = 0;
				(*m_pEffectSpr)[19]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

			case 34: // absent (220 et 351)
				break;

			case 35: // Snoopy: Ajout
				if (m_pEffectList[i]->m_cFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame;
				(*m_pEffectSpr)[6]->Draw(dX - 30, dY - 18, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 36: // Snoopy: Ajout
				if (m_pEffectList[i]->m_cFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame;
				(*m_pEffectSpr)[97]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 40:
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[20]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false}); // 20
				break;

			case 41: // Large Type 1, 2, 3, 4
			case 42:
			case 43:
			case 44:
			case 45: // Small Type 1, 2
			case 46:
				dX = (m_pEffectList[i]->m_sX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_sY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[21]->Draw(dX, dY, 48, SpriteLib::DrawParams::Fade());
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				if ((8 * (m_pEffectList[i]->m_sType - 41) + cTempFrame) < (8 * (m_pEffectList[i]->m_sType - 41) + 7))
				{
					iDvalue = -8 * (6 - cTempFrame);
					(*m_pEffectSpr)[21]->Draw(dX, dY, 8 * (m_pEffectList[i]->m_sType - 41) + cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				}
				else
				{
					if ((cTempFrame - 5) >= 8) cTempFrame = ((cTempFrame - 5) - 8) + 5;
					(*m_pEffectSpr)[21]->Draw(dX, dY, 8 * (m_pEffectList[i]->m_sType - 41) + (cTempFrame - 5));
				}
				break;

			case 47:
			case 48:
			case 49: // Blizzard
				dX = (m_pEffectList[i]->m_sX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_sY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[m_pEffectList[i]->m_sType - 1]->Draw(dX, dY, 0, SpriteLib::DrawParams::Alpha(0.7f));
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				//PutString(dX, dY, "*", RGB(255,255,255);
				if (cTempFrame < 7) {
					iDvalue = -8 * (6 - cTempFrame);
					(*m_pEffectSpr)[m_pEffectList[i]->m_sType - 1]->Draw(dX, dY, cTempFrame + 1, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f));
				}
				else {
					if (cTempFrame >= 8) cTempFrame = cTempFrame % 8;
					(*m_pEffectSpr)[m_pEffectList[i]->m_sType - 1]->Draw(dX, dY, cTempFrame + 1);
				}
				break;

			case 50:
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;

				if (cTempFrame <= 6) {
					iDvalue = 0;
					(*m_pEffectSpr)[22]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f));	// RGB2
				}
				else {
					iDvalue = -5 * (cTempFrame - 6);
					(*m_pEffectSpr)[22]->Draw(dX, dY, 6, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				}
				break;

			case 51: //
				cTempFrame = m_pEffectList[i]->m_cFrame + 11; //15
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[28]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.25f)); //20
				break;


			case 52: // Protection Ring commente par siementec, a voir
				/*			cTempFrame = m_pEffectList[i]->m_cFrame;
					dX  = (m_pEffectList[i]->m_mX)  - m_pGame->m_sViewPointX;
					dY  = (m_pEffectList[i]->m_mY)  - m_pGame->m_sViewPointY;
					(*m_pEffectSpr)[24]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.5f));
				*/
				break;


			case 53: // Hold Twist
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				if (cTempFrame < 0) cTempFrame = 0;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[25]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false}); //25
				break;

			case 54: //  star twingkling (effect armes brillantes)
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) cTempFrame = 0;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[28]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 55: //
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) cTempFrame = 0;
				dX = (m_pEffectList[i]->m_mX);
				dY = (m_pEffectList[i]->m_mY);
				(*m_pEffectSpr)[28]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 56: // Mass-Chill-Wind
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) cTempFrame = 0;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[29]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 57:  // absent (220 et 351)
				break;

			case 60:  //
			case 181: // MS
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				if (cTempFrame > 4)
				{
					cTempFrame = cTempFrame / 4;
				}
				if (cTempFrame >= 0)
				{
					dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
					dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
					(*m_pEffectSpr)[31]->Draw(dX, dY, 15 + cTempFrame);
					(*m_pEffectSpr)[31]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.5f));
				}
				break;

			case 61: // Fire aura on ground (crueffect1, 1)
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[32]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 62: // MS strike
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				if (cTempFrame > 0)
				{
					cTempFrame = cTempFrame - 1;
					dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
					dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
					(*m_pEffectSpr)[31]->Draw(dX, dY, 20 + cTempFrame, SpriteLib::DrawParams::Alpha(0.7f));
				}
				break;

			case 63: // Fire explosion (crueffect1, 2)
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[33]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 64: // effet halo blancchatre
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[34]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 65: // MS from crusade striking
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				cTempFrame = cTempFrame / 6;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[31]->Draw(dX, dY, 20 + cTempFrame, SpriteLib::DrawParams::Alpha(0.7f));
				break;

			case 66: // MS explodes on the ground
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[39]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.7f));
				(*m_pEffectSpr)[39]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 67: // MS fire with smoke
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				switch (rand() % 3) {
				case 0: (*m_pEffectSpr)[0]->Draw(dX, dY + 20, 1, SpriteLib::DrawParams{0.25f, 0, 0, 0, false}); break;
				case 1: (*m_pEffectSpr)[0]->Draw(dX, dY + 20, 1, SpriteLib::DrawParams{0.5f, 0, 0, 0, false}); break;
				case 2: (*m_pEffectSpr)[0]->Draw(dX, dY + 20, 1, SpriteLib::DrawParams{0.7f, 0, 0, 0, false}); break;
				}
				(*m_pEffectSpr)[35]->Draw(dX, dY, cTempFrame / 3, SpriteLib::DrawParams{0.7f, 0, 0, 0, false});
				break;

			case 68: // worm-bite
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				if (cTempFrame <= 11)
				{
					(*m_pEffectSpr)[40]->Draw(dX, dY, cTempFrame);
					(*m_pEffectSpr)[41]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
					(*m_pEffectSpr)[44]->Draw(dX - 2, dY - 3, cTempFrame, SpriteLib::DrawParams::Alpha(0.7f));
					(*m_pEffectSpr)[44]->Draw(dX - 4, dY - 3, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				}
				else
				{
					switch (cTempFrame) {
					case 12:
					case 13:
					case 14: (*m_pEffectSpr)[40]->Draw(dX, dY, 11); break;
					case 15: (*m_pEffectSpr)[40]->Draw(dX, dY, 11, SpriteLib::DrawParams{0.7f, 0, 0, 0, false}); break;
					case 16: (*m_pEffectSpr)[40]->Draw(dX, dY, 11, SpriteLib::DrawParams{0.5f, 0, 0, 0, false}); break;
					case 17: (*m_pEffectSpr)[40]->Draw(dX, dY, 11, SpriteLib::DrawParams{0.25f, 0, 0, 0, false}); break;
					}
				}
				break;

			case 69: // identique au cas 70
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[42]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 70: // identique au cas 69
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[43]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 71: // absent v220 et v351
				break;

			case 72: // Blizzard
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				if (cTempFrame <= 8)
				{
					iDvalue = 0;
					(*m_pEffectSpr)[51]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f));
				}
				else
				{
					iDvalue = -1 * (cTempFrame - 8);
					(*m_pEffectSpr)[51]->Draw(dX, dY, 8, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f));	// RGB2
				}
				break;

			case 73: // absent v220 et v351
			case 74: // absent v220 et v351
			case 75: // absent v220 et v351
			case 76: // absent v220 et v351
			case 77: // absent v220 et v351
				break;

			case 80:
			case 196: // Earth-Shock-Wave
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[91]->Draw(dX, dY, cTempFrame); //Nbe d'arguments modifi�s ds la 351....
				(*m_pEffectSpr)[92]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 81: // Snoopy: Ajout StormBlade
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = m_pEffectList[i]->m_cFrame;
				(*m_pEffectSpr)[100]->Draw(dX + 70, dY + 70, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 82: // Gate (apocalypse)
				cTempFrame = m_pEffectList[i]->m_cFrame;
				(*m_pEffectSpr)[101]->Draw(320, 480, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 100: // Magic Missile
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[0]->Draw(dX, dY, 0, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 101: // Heal
			case 121: // Great-Heal
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-5);
				(*m_pEffectSpr)[50]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 102: // Create Food
			case 124: // Protection from N.M
			case 125: // Hold-Person
			case 126: // Possession
			case 127: // Poison
			case 133: // Protect-From-Magic
			case 134: // Detect-Invisibility
			case 135: // Paralyze
			case 136: // Cure
			case 142: // Confuse Language
			case 152: // Polymorph
			case 153: // Mass-Poison
			case 162: // Confusion
			case 171: // Mass-Confusion
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-5);
				if (cTempFrame < 5)
					(*m_pEffectSpr)[4]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[4]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

			case 110: // Energy-Bolt
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[0]->Draw(dX, dY, 2 + (rand() % 4), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 111: // Staminar Drain
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-5);
				(*m_pEffectSpr)[49]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 112: // Recall
			case 131: // Summon-Creature
			case 132: // Invisibility
			case 178: // Haste
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-5);
				(*m_pEffectSpr)[52]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 113: // Defense Shield
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-5);
				if (cTempFrame < 6)
					(*m_pEffectSpr)[62]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[62]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

			case 120: // Fire Ball
			case 130: // Fire Strike
			case 161: // Mass-Fire-Strike
			case 251: //
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 4 + (rand() % 4);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[5]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 122: // Absent v220 et 351
				break;

			case 123: // Staminar-Recovery
			case 128: // Great-Staminar-Recovery
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-5);
				(*m_pEffectSpr)[56]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 137: // Lightning Arrow
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				tX = (m_pEffectList[i]->m_mX2) - m_pGame->m_sViewPointX;
				tY = (m_pEffectList[i]->m_mY2) - m_pGame->m_sViewPointY;
				iErr = 0;
				CMisc::GetPoint(dX, dY, tX, tY, &rX, &rY, &iErr, 15);
				CMisc::GetPoint(dX, dY, tX, tY, &rX2, &rY2, &iErr, 30);
				CMisc::GetPoint(dX, dY, tX, tY, &rX3, &rY3, &iErr, 45);
				CMisc::GetPoint(dX, dY, tX, tY, &rX4, &rY4, &iErr, 60);
				CMisc::GetPoint(dX, dY, tX, tY, &rX5, &rY5, &iErr, 75);
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 4 + (rand() % 4);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[10]->Draw(rX5, rY5, cTempFrame, SpriteLib::DrawParams{0.25f, 0, 0, 0, false});
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 4 + (rand() % 4);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[10]->Draw(rX4, rY4, cTempFrame, SpriteLib::DrawParams{0.25f, 0, 0, 0, false});
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 4 + (rand() % 4);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[10]->Draw(rX3, rY3, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 4 + (rand() % 4);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[10]->Draw(rX2, rY2, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 4 + (rand() % 4);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[10]->Draw(rX, rY, cTempFrame, SpriteLib::DrawParams{0.7f, 0, 0, 0, false});
				cTempFrame = (m_pEffectList[i]->m_cDir - 1) * 4 + (rand() % 4);
				if (cTempFrame < 0) break;
				(*m_pEffectSpr)[10]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 143: // Lightning
				m_pGame->_DrawThunderEffect(m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY - LOGICAL_WIDTH,
					m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_rX, m_pEffectList[i]->m_rY, 1);
				m_pGame->_DrawThunderEffect(m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY - LOGICAL_WIDTH,
					m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_rX + 4, m_pEffectList[i]->m_rY + 2, 2);
				m_pGame->_DrawThunderEffect(m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY - LOGICAL_WIDTH,
					m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_rX - 2, m_pEffectList[i]->m_rY - 2, 2);
				break;

			case 144: // Great-Defense-Shield
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-5);
				if (cTempFrame < 9)
					(*m_pEffectSpr)[63]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[63]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

			case 151: // Lightning Bolt
				m_pGame->_DrawThunderEffect(m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX, m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_rX, m_pEffectList[i]->m_rY, 1);

				m_pGame->_DrawThunderEffect(m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX, m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_rX + 2, m_pEffectList[i]->m_rY - 2, 2);

				m_pGame->_DrawThunderEffect(m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX, m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_dX * 32 - m_pGame->m_sViewPointX, m_pEffectList[i]->m_dY * 32 - m_pGame->m_sViewPointY,
					m_pEffectList[i]->m_rX - 2, m_pEffectList[i]->m_rY - 2, 2);
				break;

			case 165: // Absolute-Magic-Protect
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY; // 53 = APFM buble
				(*m_pEffectSpr)[53]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 166: // Armor-Break
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[55]->Draw(dX, dY + 35, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::Alpha(0.7f));
				(*m_pEffectSpr)[54]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 176: // Cancellation
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[90]->Draw(dX + 50, dY + 85, cTempFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 177: // Illusion-Movement
			case 180: // Illusion
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-3);
				if (cTempFrame < 9)	(*m_pEffectSpr)[60]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[60]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

			case 182: //Mass-Magic-Missile
				cTempFrame = m_pEffectList[i]->m_cFrame;
				dX = (m_pEffectList[i]->m_mX) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_mY) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[98]->Draw(dX, dY, cTempFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 183: // Inhibition-Casting
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-3);
				if (cTempFrame < 9) (*m_pEffectSpr)[94]->Draw(dX, dY + 40, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[94]->Draw(dX, dY + 40, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f));
				break;

			case 244: // Snoopy: d�plac� pour nvx sorts: Aura du casteur de Mass MagicMissile
				//case 184: // Aura du casteur de Mass MagicMissile
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX;
				dY = m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[96]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 190: // Mass-Illusion
			case 195: // Mass-Illusion-Movement
				cTempFrame = m_pEffectList[i]->m_cFrame;
				if (cTempFrame < 0) break;
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				iDvalue = (cTempFrame - 5) * (-3);
				if (cTempFrame < 9) (*m_pEffectSpr)[61]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				else (*m_pEffectSpr)[61]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::TintedAlpha(iDvalue, iDvalue, iDvalue, 0.7f)); // RGB2
				break;

				//case 192: // Mage Hero set effect
			case 242:
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[87]->Draw(dX + 50, dY + 57, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

				//case 193: // War Hero set effect
			case 243:
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[88]->Draw(dX + 65, dY + 80, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 194: // Resurrection
				dX = (m_pEffectList[i]->m_dX * 32) - m_pGame->m_sViewPointX;
				dY = (m_pEffectList[i]->m_dY * 32) - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[99]->Draw(dX, dY, m_pEffectList[i]->m_cFrame, SpriteLib::DrawParams::Alpha(0.5f));
				break;

			case 200: // shotstar fall on ground
				dX = m_pEffectList[i]->m_mX;
				dY = m_pEffectList[i]->m_mY;
				(*m_pEffectSpr)[133]->Draw(dX, dY, (rand() % 15), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 201: // shotstar fall on ground
				dX = m_pEffectList[i]->m_mX;
				dY = m_pEffectList[i]->m_mY;
				(*m_pEffectSpr)[134]->Draw(dX, dY, (rand() % 15), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 202: // shotstar fall on ground
				dX = m_pEffectList[i]->m_mX;
				dY = m_pEffectList[i]->m_mY;
				(*m_pEffectSpr)[135]->Draw(dX, dY, (rand() % 15), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 203: // explosion feu apoc
				dX = m_pEffectList[i]->m_mX;
				dY = m_pEffectList[i]->m_mY;
				(*m_pEffectSpr)[136]->Draw(dX, dY, (rand() % 18), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 204: // Faille oblique
				dX = m_pEffectList[i]->m_mX;
				dY = m_pEffectList[i]->m_mY;
				(*m_pEffectSpr)[137]->Draw(dX, dY, (rand() % 12), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 205: // Faille horizontale
				dX = m_pEffectList[i]->m_mX;
				dY = m_pEffectList[i]->m_mY;
				(*m_pEffectSpr)[138]->Draw(dX, dY, (rand() % 12), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 206: // steams
				dX = m_pEffectList[i]->m_mX;
				dY = m_pEffectList[i]->m_mY;
				(*m_pEffectSpr)[139]->Draw(dX, dY, (rand() % 20), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 250: // Gate (round one)
				dX = m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX;
				dY = m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[103]->Draw(dX, dY, (rand() % 3), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;

			case 252: // burst (lisgt salmon color)
				dX = m_pEffectList[i]->m_mX - m_pGame->m_sViewPointX;
				dY = m_pEffectList[i]->m_mY - m_pGame->m_sViewPointY;
				(*m_pEffectSpr)[104]->Draw(dX, dY, (rand() % 3), SpriteLib::DrawParams{0.5f, 0, 0, 0, false});
				break;
			}
		}
}
