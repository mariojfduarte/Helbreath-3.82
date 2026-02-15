/**
 * Renderer Benchmark — Phase 1.1a
 *
 * Loads a real PAK sprite file and runs 7 rendering tests against
 * Canvas2D, PixiJS, and raw WebGL to determine the best backend
 * for the Helbreath TypeScript engine.
 */

import { parsePak, decodeSpriteImage } from '../assets/pak-parser';
import { IRenderer, SpriteTexture } from './renderers/IRenderer';
import { Canvas2DRenderer } from './renderers/Canvas2DRenderer';
import { PixiRenderer } from './renderers/PixiRenderer';
import { WebGLRenderer } from './renderers/WebGLRenderer';
import { BenchmarkRunner, BenchmarkResult } from './BenchmarkRunner';

// ── Constants ──────────────────────────────────────────────────────

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const TEST_DURATION_SEC = 5;

// Default PAK file to load for benchmark textures
const DEFAULT_PAK = 'maptiles1.pak';

// ── DOM Elements ───────────────────────────────────────────────────

const $status = document.getElementById('status') as HTMLDivElement;
const $pakSelect = document.getElementById('pak-select') as HTMLSelectElement;
const $btnRun = document.getElementById('btn-run') as HTMLButtonElement;
const $progress = document.getElementById('progress') as HTMLDivElement;
const $progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const $progressText = document.getElementById('progress-text') as HTMLSpanElement;
const $results = document.getElementById('results') as HTMLDivElement;
const $canvasContainer = document.getElementById('canvas-container') as HTMLDivElement;
const $durationInput = document.getElementById('duration') as HTMLInputElement;

// ── State ──────────────────────────────────────────────────────────

let allResults: BenchmarkResult[][] = [];

// ── Initialization ─────────────────────────────────────────────────

async function init() {
	setStatus('Loading PAK file list...');

	try {
		// Fetch list of available PAK files
		const response = await fetch('/sprites/');
		const pakFiles: string[] = await response.json();

		$pakSelect.innerHTML = '';
		for (const f of pakFiles) {
			const opt = document.createElement('option');
			opt.value = f;
			opt.textContent = f;
			if (f === DEFAULT_PAK) opt.selected = true;
			$pakSelect.appendChild(opt);
		}

		setStatus(`Ready. ${pakFiles.length} PAK files available.`);
		$btnRun.disabled = false;
	} catch (e) {
		setStatus(`Error loading PAK list: ${e}. Make sure Vite dev server is running.`);
	}
}

$btnRun.addEventListener('click', runBenchmark);

// ── Benchmark Execution ────────────────────────────────────────────

async function runBenchmark() {
	$btnRun.disabled = true;
	$results.innerHTML = '';
	allResults = [];

	const pakFile = $pakSelect.value;
	const durationSec = parseInt($durationInput.value) || TEST_DURATION_SEC;

	// Step 1: Load and decode sprites
	setStatus(`Loading ${pakFile}...`);
	showProgress(0, 'Loading PAK...');

	let textures: SpriteTexture[];
	try {
		textures = await loadSprites(pakFile);
	} catch (e) {
		setStatus(`Error loading ${pakFile}: ${e}`);
		$btnRun.disabled = false;
		return;
	}

	if (textures.length === 0) {
		setStatus('No valid sprites decoded from PAK file.');
		$btnRun.disabled = false;
		return;
	}

	setStatus(`Loaded ${textures.length} sprite textures. Starting benchmark...`);

	// Step 2: Run benchmarks on each renderer
	const rendererFactories: Array<{ name: string; create: () => IRenderer }> = [
		{ name: 'Canvas2D', create: () => new Canvas2DRenderer() },
		{ name: 'PixiJS', create: () => new PixiRenderer() },
		{ name: 'WebGL', create: () => new WebGLRenderer() },
	];

	const totalSteps = rendererFactories.length * 7; // 7 tests each
	let completedSteps = 0;

	for (const factory of rendererFactories) {
		setStatus(`Running ${factory.name}...`);

		// Create a fresh canvas for each renderer
		const canvas = document.createElement('canvas');
		canvas.width = CANVAS_WIDTH;
		canvas.height = CANVAS_HEIGHT;
		canvas.style.width = `${CANVAS_WIDTH}px`;
		canvas.style.height = `${CANVAS_HEIGHT}px`;

		$canvasContainer.innerHTML = '';
		$canvasContainer.appendChild(canvas);

		const renderer = factory.create();

		try {
			await renderer.init(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);

			const runner = new BenchmarkRunner({ durationSec, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

			const results = await runner.runAll(renderer, textures, (testIdx, total, result) => {
				completedSteps++;
				const pct = completedSteps / totalSteps;
				showProgress(pct, `${factory.name}: Test ${testIdx}/${total} — ${result.testName}`);
			});

			allResults.push(results);
			renderer.destroy();
		} catch (e) {
			console.error(`Error running ${factory.name}:`, e);
			allResults.push([]);
			try { renderer.destroy(); } catch { /* ignore */ }
		}
	}

	// Step 3: Display results
	hideProgress();
	displayResults();
	setStatus('Benchmark complete.');
	$btnRun.disabled = false;
}

// ── Sprite Loading ─────────────────────────────────────────────────

async function loadSprites(pakFile: string): Promise<SpriteTexture[]> {
	const response = await fetch(`/sprites/${pakFile}`);
	const buffer = await response.arrayBuffer();
	const pak = parsePak(buffer);

	const textures: SpriteTexture[] = [];

	// Decode first 10 sprites (enough for benchmark variety)
	const maxSprites = Math.min(10, pak.sprites.length);
	for (let i = 0; i < maxSprites; i++) {
		const decoded = await decodeSpriteImage(pak.sprites[i]);
		if (decoded) {
			textures.push({
				canvas: decoded.canvas,
				width: decoded.width,
				height: decoded.height,
			});
		}
	}

	return textures;
}

// ── Results Display ────────────────────────────────────────────────

function displayResults() {
	if (allResults.length === 0) return;

	// Build comparison table
	let html = '<h2>Results</h2>';

	// Get test names from first non-empty result set
	const testNames = allResults.find(r => r.length > 0)?.map(r => r.testName) ?? [];
	const rendererNames = ['Canvas2D', 'PixiJS', 'WebGL'];

	// Per-test comparison tables
	for (let t = 0; t < testNames.length; t++) {
		html += `<div class="test-result">`;
		html += `<h3>${testNames[t]}</h3>`;
		html += `<table>`;
		html += `<tr><th>Renderer</th><th>Avg FPS</th><th>Min FPS</th><th>P99 Frame (ms)</th><th>Draws/Frame</th><th>Total Frames</th></tr>`;

		let bestFPS = 0;
		let bestIdx = 0;

		for (let r = 0; r < allResults.length; r++) {
			const result = allResults[r][t];
			if (!result) continue;
			if (result.avgFPS > bestFPS) {
				bestFPS = result.avgFPS;
				bestIdx = r;
			}
		}

		for (let r = 0; r < allResults.length; r++) {
			const result = allResults[r][t];
			if (!result) {
				html += `<tr><td>${rendererNames[r]}</td><td colspan="5">Error</td></tr>`;
				continue;
			}
			const isBest = r === bestIdx;
			const cls = isBest ? ' class="best"' : '';
			html += `<tr${cls}>`;
			html += `<td>${result.rendererName}${isBest ? ' ★' : ''}</td>`;
			html += `<td>${result.avgFPS.toFixed(1)}</td>`;
			html += `<td>${result.minFPS.toFixed(1)}</td>`;
			html += `<td>${result.p99FrameTime.toFixed(2)}</td>`;
			html += `<td>${result.drawCallsPerFrame}</td>`;
			html += `<td>${result.totalFrames}</td>`;
			html += `</tr>`;
		}

		html += `</table></div>`;
	}

	// Summary: which renderer won most tests
	html += `<div class="summary"><h3>Summary</h3>`;
	const wins = [0, 0, 0];
	for (let t = 0; t < testNames.length; t++) {
		let bestFPS = 0;
		let bestIdx = 0;
		for (let r = 0; r < allResults.length; r++) {
			const result = allResults[r][t];
			if (result && result.avgFPS > bestFPS) {
				bestFPS = result.avgFPS;
				bestIdx = r;
			}
		}
		wins[bestIdx]++;
	}

	for (let r = 0; r < rendererNames.length; r++) {
		html += `<p><strong>${rendererNames[r]}:</strong> Won ${wins[r]}/${testNames.length} tests</p>`;
	}
	html += `</div>`;

	$results.innerHTML = html;
}

// ── UI Helpers ─────────────────────────────────────────────────────

function setStatus(msg: string) {
	$status.textContent = msg;
}

function showProgress(fraction: number, text: string) {
	$progress.style.display = 'block';
	$progressBar.style.width = `${Math.round(fraction * 100)}%`;
	$progressText.textContent = text;
}

function hideProgress() {
	$progress.style.display = 'none';
}

// ── Boot ───────────────────────────────────────────────────────────

init();
