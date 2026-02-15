/**
 * EffectManager — Visual effect pool and rendering.
 * Mirrors C++ EffectManager from Sources/Client/EffectManager.h/.cpp.
 *
 * Pool of 300 CEffect objects. Effects are added via AddEffect(),
 * updated each frame (frame advancement, removal of finished effects),
 * and drawn in two passes: lights (before entities) and particles (after).
 */

import { CEffect } from './CEffect';
import { EffectType } from './EffectType';
import { GameClock } from '../core/GameClock';

const DEF_MAXEFFECTS = 300;

export class EffectManager {
	private m_pEffectList: (CEffect | null)[] = new Array(DEF_MAXEFFECTS).fill(null);

	constructor() {
		// Pre-allocate effect pool
		for (let i = 0; i < DEF_MAXEFFECTS; i++) {
			this.m_pEffectList[i] = null;
		}
	}

	/**
	 * Add a new effect to the pool.
	 * Mirrors C++ EffectManager::AddEffect().
	 */
	addEffect(
		sType: EffectType,
		sX: number,
		sY: number,
		dX: number,
		dY: number,
		cStartFrame: number,
		iV1 = 1,
	): void {
		// Find an empty slot
		for (let i = 0; i < DEF_MAXEFFECTS; i++) {
			if (this.m_pEffectList[i] === null) {
				const effect = new CEffect();
				effect.m_sType = sType;
				effect.m_sX = sX;
				effect.m_sY = sY;
				effect.m_dX = dX;
				effect.m_dY = dY;
				effect.m_cFrame = cStartFrame;
				effect.m_iV1 = iV1;
				effect.m_dwTime = GameClock.getTimeMS();
				effect.m_dwFrameTime = 30; // Default frame time; varies per effect type
				this.m_pEffectList[i] = effect;
				return;
			}
		}
		// Pool full — effect dropped
	}

	/**
	 * Update all active effects: advance frames, remove finished.
	 * Mirrors C++ EffectManager::Update().
	 */
	update(): void {
		const now = GameClock.getTimeMS();

		for (let i = 0; i < DEF_MAXEFFECTS; i++) {
			const effect = this.m_pEffectList[i];
			if (!effect) continue;

			// Advance frame based on time
			if (now - effect.m_dwTime >= effect.m_dwFrameTime) {
				effect.m_dwTime = now;
				effect.m_cFrame++;

				if (effect.m_cFrame >= effect.m_cMaxFrame) {
					// Effect finished — remove from pool
					this.m_pEffectList[i] = null;
				}
			}
		}
	}

	/**
	 * Draw lighting effects (called before DrawObjects).
	 * Mirrors C++ EffectManager::DrawEffectLights().
	 * Phase 8 stub: will draw glow/light sprites.
	 */
	drawEffectLights(): void {
		// Stub: iterate effects and draw light sprites for applicable types
	}

	/**
	 * Draw particle effects (called after DrawObjects).
	 * Mirrors C++ EffectManager::DrawEffects().
	 * Phase 8 stub: will draw particle/explosion sprites.
	 */
	drawEffects(): void {
		// Stub: iterate effects and draw particle sprites
	}

	/**
	 * Remove all active effects.
	 */
	clearAllEffects(): void {
		for (let i = 0; i < DEF_MAXEFFECTS; i++) {
			this.m_pEffectList[i] = null;
		}
	}

	getEffect(index: number): CEffect | null {
		return this.m_pEffectList[index] ?? null;
	}

	getActiveCount(): number {
		let count = 0;
		for (let i = 0; i < DEF_MAXEFFECTS; i++) {
			if (this.m_pEffectList[i]) count++;
		}
		return count;
	}
}
