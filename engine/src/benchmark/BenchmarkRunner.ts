/**
 * BenchmarkRunner — executes rendering tests against an IRenderer.
 *
 * Each test draws a specific workload for a fixed duration and
 * collects frame timing metrics.
 */

import { IRenderer, DrawParams, DrawParamsPresets, SpriteTexture, Rect } from './renderers/IRenderer';

// ── Types ──────────────────────────────────────────────────────────

export interface BenchmarkResult {
	testName: string;
	rendererName: string;
	avgFPS: number;
	p99FrameTime: number; // milliseconds
	minFPS: number;
	totalFrames: number;
	drawCallsPerFrame: number;
}

export interface BenchmarkConfig {
	/** Duration per test in seconds */
	durationSec: number;
	/** Canvas width (matches Helbreath logical resolution) */
	width: number;
	/** Canvas height */
	height: number;
}

const DEFAULT_CONFIG: BenchmarkConfig = {
	durationSec: 5,
	width: 640,
	height: 480,
};

// ── Test definitions ───────────────────────────────────────────────

interface TestDef {
	name: string;
	description: string;
	drawCallsPerFrame: number;
	run(renderer: IRenderer, textures: SpriteTexture[], frame: number): void;
}

/**
 * Generate random positions for sprites (deterministic per frame for fairness).
 * Seeded by frame number to avoid allocation during draw loop.
 */
function pseudoRandom(seed: number): number {
	const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
	return x - Math.floor(x);
}

function buildTests(width: number, height: number): TestDef[] {
	return [
		// ── Test 1: Tile flood ──
		{
			name: '1. Tile Flood',
			description: '355 opaque 32x32 tiles (background layer)',
			drawCallsPerFrame: 355,
			run(renderer, textures, frame) {
				const tex = textures[0];
				const params = DrawParamsPresets.NoColorKey();
				const srcRect: Rect = { x: 0, y: 0, width: 32, height: 32 };
				let count = 0;
				for (let y = 0; y < height + 48; y += 32) {
					for (let x = 0; x < width + 48; x += 32) {
						if (count >= 355) return;
						renderer.drawSprite(tex, srcRect, x, y, params);
						count++;
					}
				}
			},
		},

		// ── Test 2: Sprite storm ──
		{
			name: '2. Sprite Storm',
			description: '750 color-keyed sprites at random positions',
			drawCallsPerFrame: 750,
			run(renderer, textures, frame) {
				const tex = textures[0];
				const params = DrawParamsPresets.Opaque();
				const srcRect: Rect = { x: 0, y: 0, width: 32, height: 32 };
				for (let i = 0; i < 750; i++) {
					const seed = frame * 750 + i;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					renderer.drawSprite(tex, srcRect, x, y, params);
				}
			},
		},

		// ── Test 3: Alpha blend stress ──
		{
			name: '3. Alpha Blend',
			description: '200 sprites with alpha 70%, 50%, 25%',
			drawCallsPerFrame: 200,
			run(renderer, textures, frame) {
				const tex = textures[0];
				const srcRect: Rect = { x: 0, y: 0, width: 32, height: 32 };
				const alphas = [0.7, 0.5, 0.25];
				for (let i = 0; i < 200; i++) {
					const seed = frame * 200 + i;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					const params = DrawParamsPresets.Alpha(alphas[i % 3]);
					renderer.drawSprite(tex, srcRect, x, y, params);
				}
			},
		},

		// ── Test 4: Tint stress ──
		{
			name: '4. Tint Stress',
			description: '200 sprites with RGB tint offsets',
			drawCallsPerFrame: 200,
			run(renderer, textures, frame) {
				const tex = textures[0];
				const srcRect: Rect = { x: 0, y: 0, width: 32, height: 32 };
				for (let i = 0; i < 200; i++) {
					const seed = frame * 200 + i;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					const r = Math.floor(pseudoRandom(seed + 20000) * 200 - 100);
					const g = Math.floor(pseudoRandom(seed + 30000) * 200 - 100);
					const b = Math.floor(pseudoRandom(seed + 40000) * 200 - 100);
					const params = DrawParamsPresets.Tint(r, g, b);
					renderer.drawSprite(tex, srcRect, x, y, params);
				}
			},
		},

		// ── Test 5: Shadow / Fade ──
		{
			name: '5. Shadow/Fade',
			description: '100 shadow + 50 fade sprites',
			drawCallsPerFrame: 150,
			run(renderer, textures, frame) {
				const tex = textures[0];
				const srcRect: Rect = { x: 0, y: 0, width: 32, height: 32 };
				const shadowParams = DrawParamsPresets.Shadow();
				const fadeParams = DrawParamsPresets.Fade();
				for (let i = 0; i < 100; i++) {
					const seed = frame * 150 + i;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					renderer.drawSprite(tex, srcRect, x, y, shadowParams);
				}
				for (let i = 0; i < 50; i++) {
					const seed = frame * 150 + 100 + i;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					renderer.drawSprite(tex, srcRect, x, y, fadeParams);
				}
			},
		},

		// ── Test 6: Full scene simulation ──
		{
			name: '6. Full Scene',
			description: '355 tiles + 160 chars (8 layers) + 75 effects + 30 UI',
			drawCallsPerFrame: 355 + 160 + 75 + 30,
			run(renderer, textures, frame) {
				const tex = textures[0];
				const srcRect: Rect = { x: 0, y: 0, width: 32, height: 32 };

				// Background tiles (opaque, no color key)
				const tileParams = DrawParamsPresets.NoColorKey();
				let count = 0;
				for (let y = 0; y < height + 48; y += 32) {
					for (let x = 0; x < width + 48; x += 32) {
						if (count >= 355) break;
						renderer.drawSprite(tex, srcRect, x, y, tileParams);
						count++;
					}
					if (count >= 355) break;
				}

				// Characters: 20 characters x 8 layers each = 160 sprites
				const charParams = DrawParamsPresets.Opaque();
				for (let c = 0; c < 20; c++) {
					const baseX = 50 + (c % 10) * 60;
					const baseY = 100 + Math.floor(c / 10) * 150;
					for (let layer = 0; layer < 8; layer++) {
						renderer.drawSprite(tex, srcRect, baseX, baseY, charParams);
					}
				}

				// Effects: 75 sprites with alpha blending
				const fxParams = DrawParamsPresets.Alpha(0.5);
				for (let i = 0; i < 75; i++) {
					const seed = frame * 75 + i;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					renderer.drawSprite(tex, srcRect, x, y, fxParams);
				}

				// UI: 30 opaque sprites
				const uiParams = DrawParamsPresets.Opaque();
				for (let i = 0; i < 30; i++) {
					renderer.drawSprite(tex, srcRect, 10 + i * 20, 10, uiParams);
				}
			},
		},

		// ── Test 7: Worst case ──
		{
			name: '7. Worst Case',
			description: '355 tiles + 750 chars + 1800 effects',
			drawCallsPerFrame: 355 + 750 + 1800,
			run(renderer, textures, frame) {
				const tex = textures[0];
				const srcRect: Rect = { x: 0, y: 0, width: 32, height: 32 };

				// Background tiles
				const tileParams = DrawParamsPresets.NoColorKey();
				let count = 0;
				for (let y = 0; y < height + 48; y += 32) {
					for (let x = 0; x < width + 48; x += 32) {
						if (count >= 355) break;
						renderer.drawSprite(tex, srcRect, x, y, tileParams);
						count++;
					}
					if (count >= 355) break;
				}

				// Characters: 750 sprites
				const charParams = DrawParamsPresets.Opaque();
				for (let i = 0; i < 750; i++) {
					const seed = frame * 750 + i + 50000;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					renderer.drawSprite(tex, srcRect, x, y, charParams);
				}

				// Effects: 1800 with mixed blending
				for (let i = 0; i < 1800; i++) {
					const seed = frame * 1800 + i + 100000;
					const x = Math.floor(pseudoRandom(seed) * (width - 32));
					const y = Math.floor(pseudoRandom(seed + 10000) * (height - 32));
					let params: DrawParams;
					if (i % 4 === 0) params = DrawParamsPresets.Alpha(0.5);
					else if (i % 4 === 1) params = DrawParamsPresets.Tint(50, -30, 20);
					else if (i % 4 === 2) params = DrawParamsPresets.Shadow();
					else params = DrawParamsPresets.Opaque();
					renderer.drawSprite(tex, srcRect, x, y, params);
				}
			},
		},
	];
}

// ── Runner ─────────────────────────────────────────────────────────

export class BenchmarkRunner {
	private config: BenchmarkConfig;

	constructor(config?: Partial<BenchmarkConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Run all benchmark tests on a given renderer.
	 * @param renderer  Initialized renderer
	 * @param textures  Array of decoded sprite textures to use
	 * @param onProgress Called after each test completes (0..1)
	 */
	async runAll(
		renderer: IRenderer,
		textures: SpriteTexture[],
		onProgress?: (testIndex: number, total: number, result: BenchmarkResult) => void,
	): Promise<BenchmarkResult[]> {
		const tests = buildTests(this.config.width, this.config.height);
		const results: BenchmarkResult[] = [];

		for (let t = 0; t < tests.length; t++) {
			const result = await this.runTest(renderer, textures, tests[t]);
			results.push(result);
			onProgress?.(t + 1, tests.length, result);

			// Small delay between tests to let GC run
			await sleep(100);
		}

		return results;
	}

	private async runTest(
		renderer: IRenderer,
		textures: SpriteTexture[],
		test: TestDef,
	): Promise<BenchmarkResult> {
		const frameTimes: number[] = [];
		const durationMs = this.config.durationSec * 1000;
		let frameCount = 0;
		const start = performance.now();

		while (performance.now() - start < durationMs) {
			const frameStart = performance.now();

			renderer.beginFrame();
			test.run(renderer, textures, frameCount);
			renderer.endFrame();

			const frameEnd = performance.now();
			frameTimes.push(frameEnd - frameStart);
			frameCount++;

			// Yield to browser every 16ms to keep UI responsive
			if (frameCount % 10 === 0) {
				await sleep(0);
			}
		}

		// Calculate metrics
		frameTimes.sort((a, b) => a - b);
		const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
		const p99Index = Math.floor(frameTimes.length * 0.99);
		const p99FrameTime = frameTimes[p99Index] ?? frameTimes[frameTimes.length - 1];
		const maxFrameTime = frameTimes[frameTimes.length - 1];

		return {
			testName: test.name,
			rendererName: renderer.name,
			avgFPS: 1000 / avgFrameTime,
			p99FrameTime,
			minFPS: 1000 / maxFrameTime,
			totalFrames: frameCount,
			drawCallsPerFrame: test.drawCallsPerFrame,
		};
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
