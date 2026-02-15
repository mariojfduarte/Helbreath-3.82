/**
 * CEffect — Single effect instance.
 * Mirrors C++ CEffect from Sources/Client/Effect.h.
 */

import { EffectType } from './EffectType';

export class CEffect {
	m_sType: EffectType = EffectType.INVALID;
	m_cFrame = -1;
	m_cMaxFrame = 0;
	m_cDir = 0;
	m_dwTime = 0;
	m_dwFrameTime = 0;
	m_sX = 0;
	m_sY = 0;
	m_dX = 0;
	m_dY = 0;
	m_mX = 0;
	m_mY = 0;
	m_mX2 = 0;
	m_mY2 = 0;
	m_mX3 = 0;
	m_mY3 = 0;
	m_iErr = 0;
	m_rX = 0;
	m_rY = 0;
	m_iV1 = 0;

	reset(): void {
		this.m_sType = EffectType.INVALID;
		this.m_cFrame = -1;
		this.m_cMaxFrame = 0;
		this.m_dwTime = 0;
		this.m_dwFrameTime = 0;
	}
}
