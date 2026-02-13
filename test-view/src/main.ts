import {
  Application,
  BaseTexture,
  Texture,
  Sprite,
  Rectangle,
  Graphics,
  SCALE_MODES,
  Container,
} from 'pixi.js';
import { parsePak, decodeSpriteImage, type PakFile, type DecodedSprite } from './pak-parser';

// ── PAK file list (populated from the SPRITES directory) ──────────

const PAK_FILES = [
  // Characters
  'Wm', 'Ww', 'Ym', 'Yw', 'Bm', 'Bw',
  // NPCs
  'Guard', 'SHOPKPR', 'Howard', 'Kennedy', 'Tom', 'Perry', 'William', 'Gandlf', 'Gail',
  // Monsters
  'Orc', 'Zom', 'SKE', 'SLM', 'Troll', 'Orge', 'Cyc', 'Demon', 'Barlog', 'Ettin',
  'Unicorn', 'WereWolf', 'DarkKnight', 'Hellclaw', 'Minotaurs', 'Liche', 'DarkElf',
  'GiantFrog', 'Ant', 'Cat', 'Bunny', 'Stalker', 'Centaurus', 'Beholder',
  'Clawturtle', 'GiantLizard', 'GiantPlant', 'GiantCrayfish', 'Babarian',
  'Tigerworm', 'Wyvern', 'FireWyvern', 'IceGolem', 'Sorceress', 'Nizie',
  'DireBoar', 'Rudolph', 'ElfMaster', 'MasterMageOrc', 'Tentocle',
  'Catapult', 'CBTurret', 'HBTank',
  // Male equipment
  'MAxe1', 'MAxe2', 'MAxe3', 'Msw', 'Msw2', 'Msw3', 'Msh', 'MBHammer',
  'MStaff1', 'MStaff2', 'MStaff3', 'Mbo', 'MLarmor', 'MCMail', 'MHauberk',
  'MHelm1', 'MHelm2', 'MHelm3', 'MHelm4', 'Mrobe1', 'MTrouser', 'MShirt',
  // Female equipment
  'WAxe1', 'WAxe2', 'WAxe3', 'Wsw', 'Wsw2', 'Wsw3', 'Wsh', 'WBHammer',
  'WStaff1', 'WStaff2', 'WStaff3', 'Wbo', 'WLarmor', 'WCMail', 'WHauberk',
  'WHelm1', 'WHelm4', 'Wrobe1', 'WTrouser', 'WShirt', 'WSkirt',
  // Items
  'item-ground', 'item-pack', 'item-equipM', 'item-equipW', 'item-dynamic',
  // UI & Interface
  'interface', 'interface2', 'New-Dialog', 'LoginDialog', 'GameDialog',
  'SPRFONTS', 'DialogText', 'newmaps', 'PartySprite',
  // Map tiles
  'maptiles1', 'maptiles2', 'maptiles4', 'maptiles5', 'maptiles6',
  // Objects & Tiles
  'Objects1', 'Objects2', 'Objects3', 'objects4', 'Objects5', 'Objects6', 'Objects7',
  'TREES1', 'TreeShadows', 'Structures1', 'BG', 'ABS',
  // Effects
  'EFFECT', 'EFFECT2', 'EFFECT3', 'effect4', 'effect5', 'effect6',
  'Effect7', 'Effect8', 'effect9', 'effect10', 'Effect11', 'Effect12', 'Effect13',
  'CruEffect1', 'frost', 'yseffect2', 'yseffect3', 'yseffect4',
  // Misc
  'GOL', 'ESG', 'GHK', 'GHKABS', 'GMG', 'LWB', 'TK', 'TPKnight',
  'Gate', 'Crop', 'Detector', 'ManaStone', 'ManaCollector', 'Telescope',
].sort();

// ── App state ─────────────────────────────────────────────────────

let pakFile: PakFile | null = null;
let pakName = '';
let spriteIndex = 0;
let frameIndex = 0;
let isPlaying = false;
let fps = 8;
let zoom = 2;
let showFullSheet = false;
let showPivot = true;
let animTimer: number | null = null;

// Decoded textures cache: spriteIndex -> decoded data
const decodedCache = new Map<number, DecodedSprite | null>();

// PixiJS
let app: Application;
let spriteContainer: Container;
let overlayGraphics: Graphics;

// ── DOM Elements ──────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const pakSelect = $<HTMLSelectElement>('pak-select');
const loadBtn = $<HTMLButtonElement>('load-btn');
const fileInput = $<HTMLInputElement>('file-input');
const statusEl = $('status');
const navBar = $('nav-bar');
const infoBar = $('info-bar');
const canvasContainer = $('canvas-container');
const dropOverlay = $('drop-overlay');

const prevSpriteBtn = $<HTMLButtonElement>('prev-sprite');
const nextSpriteBtn = $<HTMLButtonElement>('next-sprite');
const spriteLabel = $('sprite-label');
const prevFrameBtn = $<HTMLButtonElement>('prev-frame');
const nextFrameBtn = $<HTMLButtonElement>('next-frame');
const frameLabel = $('frame-label');
const playBtn = $<HTMLButtonElement>('play-btn');
const fpsSlider = $<HTMLInputElement>('fps-slider');
const fpsLabel = $('fps-label');
const zoomOutBtn = $<HTMLButtonElement>('zoom-out');
const zoomInBtn = $<HTMLButtonElement>('zoom-in');
const zoomLabel = $('zoom-label');
const showSheetCb = $<HTMLInputElement>('show-sheet');
const showPivotCb = $<HTMLInputElement>('show-pivot');

const infoBmp = $('info-bmp');
const infoRect = $('info-rect');
const infoPivot = $('info-pivot');
const infoColorkey = $('info-colorkey');
const infoFrames = $('info-frames');

// ── Initialize ────────────────────────────────────────────────────

async function init() {
  // Populate PAK dropdown
  for (const name of PAK_FILES) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name + '.pak';
    pakSelect.appendChild(opt);
  }

  // Create PixiJS application
  app = new Application({
    resizeTo: canvasContainer,
    backgroundColor: 0x000000,
    backgroundAlpha: 0,
    antialias: false,
    resolution: 1,
  });

  // Set nearest-neighbor scaling globally for pixel art
  BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

  canvasContainer.appendChild(app.view as HTMLCanvasElement);

  spriteContainer = new Container();
  overlayGraphics = new Graphics();
  app.stage.addChild(spriteContainer);
  app.stage.addChild(overlayGraphics);

  // ── Event listeners ──

  loadBtn.addEventListener('click', loadFromSelect);
  pakSelect.addEventListener('dblclick', loadFromSelect);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) loadFromFile(file);
  });

  // Drag and drop
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropOverlay.classList.add('active');
  });
  document.addEventListener('dragleave', () => {
    dropOverlay.classList.remove('active');
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
    const file = e.dataTransfer?.files[0];
    if (file && file.name.toLowerCase().endsWith('.pak')) {
      loadFromFile(file);
    }
  });

  // Navigation
  prevSpriteBtn.addEventListener('click', () => navigateSprite(-1));
  nextSpriteBtn.addEventListener('click', () => navigateSprite(1));
  prevFrameBtn.addEventListener('click', () => navigateFrame(-1));
  nextFrameBtn.addEventListener('click', () => navigateFrame(1));

  playBtn.addEventListener('click', togglePlay);

  fpsSlider.addEventListener('input', () => {
    fps = parseInt(fpsSlider.value);
    fpsLabel.textContent = String(fps);
    if (isPlaying) restartAnimation();
  });

  zoomOutBtn.addEventListener('click', () => setZoom(zoom - 1));
  zoomInBtn.addEventListener('click', () => setZoom(zoom + 1));

  showSheetCb.addEventListener('change', () => {
    showFullSheet = showSheetCb.checked;
    render();
  });

  showPivotCb.addEventListener('change', () => {
    showPivot = showPivotCb.checked;
    render();
  });

  // Keyboard shortcuts (skip when a form element is focused)
  document.addEventListener('keydown', (e) => {
    if (!pakFile) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft': navigateFrame(-1); break;
      case 'ArrowRight': navigateFrame(1); break;
      case 'ArrowUp': navigateSprite(-1); e.preventDefault(); break;
      case 'ArrowDown': navigateSprite(1); e.preventDefault(); break;
      case ' ': togglePlay(); e.preventDefault(); break;
      case '+': case '=': setZoom(zoom + 1); break;
      case '-': setZoom(zoom - 1); break;
    }
  });

  setStatus('Ready. Select a PAK file or drag & drop one.');
}

// ── Loading ───────────────────────────────────────────────────────

async function loadFromSelect() {
  const name = pakSelect.value;
  if (!name) return;

  setStatus(`Loading ${name}.pak...`);

  try {
    const url = `/sprites/${name}.pak`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    await loadPakBuffer(buffer, name);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
    console.error(err);
  }
}

async function loadFromFile(file: File) {
  setStatus(`Loading ${file.name}...`);

  try {
    const buffer = await file.arrayBuffer();
    const name = file.name.replace(/\.pak$/i, '');
    await loadPakBuffer(buffer, name);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`);
    console.error(err);
  }
}

async function loadPakBuffer(buffer: ArrayBuffer, name: string) {
  // Parse
  pakFile = parsePak(buffer);
  pakName = name;
  spriteIndex = 0;
  frameIndex = 0;
  decodedCache.clear();
  stopPlay();

  setStatus(`Loaded ${name}.pak: ${pakFile.spriteCount} sprite(s)`);

  // Show navigation
  navBar.style.display = 'flex';
  infoBar.style.display = 'flex';

  // Decode first sprite
  await ensureDecoded(0);

  updateLabels();
  render();
}

// ── Sprite decoding (lazy) ────────────────────────────────────────

async function ensureDecoded(idx: number): Promise<DecodedSprite | null> {
  if (decodedCache.has(idx)) return decodedCache.get(idx) ?? null;
  if (!pakFile || idx >= pakFile.sprites.length) return null;

  const decoded = await decodeSpriteImage(pakFile.sprites[idx]);
  decodedCache.set(idx, decoded);
  return decoded;
}

// ── Navigation ────────────────────────────────────────────────────

function navigateSprite(delta: number) {
  if (!pakFile) return;
  const newIdx = spriteIndex + delta;
  if (newIdx < 0 || newIdx >= pakFile.spriteCount) return;
  spriteIndex = newIdx;
  frameIndex = 0;
  updateLabels();
  render();
}

function navigateFrame(delta: number) {
  if (!pakFile) return;
  const sprite = pakFile.sprites[spriteIndex];
  if (!sprite || sprite.frames.length === 0) return;
  frameIndex = (frameIndex + delta + sprite.frames.length) % sprite.frames.length;
  updateLabels();
  render();
}

// ── Animation ─────────────────────────────────────────────────────

function togglePlay() {
  if (isPlaying) {
    stopPlay();
  } else {
    startPlay();
  }
}

function startPlay() {
  isPlaying = true;
  playBtn.classList.add('playing');
  playBtn.innerHTML = '&#9724; Stop';
  restartAnimation();
}

function stopPlay() {
  isPlaying = false;
  playBtn.classList.remove('playing');
  playBtn.innerHTML = '&#9654; Play';
  if (animTimer !== null) {
    clearInterval(animTimer);
    animTimer = null;
  }
}

function restartAnimation() {
  if (animTimer !== null) clearInterval(animTimer);
  animTimer = window.setInterval(() => {
    navigateFrame(1);
  }, 1000 / fps);
}

// ── Zoom ──────────────────────────────────────────────────────────

function setZoom(z: number) {
  zoom = Math.max(1, Math.min(8, z));
  zoomLabel.textContent = `${zoom}x`;
  render();
}

// ── Render ────────────────────────────────────────────────────────

async function render() {
  spriteContainer.removeChildren();
  overlayGraphics.clear();

  if (!pakFile) return;

  const sprite = pakFile.sprites[spriteIndex];
  if (!sprite) return;

  const decoded = await ensureDecoded(spriteIndex);
  if (!decoded) {
    setStatus(`Sprite ${spriteIndex}: no image data`);
    return;
  }

  // Create base texture from decoded canvas
  const baseTexture = BaseTexture.from(decoded.canvas, { scaleMode: SCALE_MODES.NEAREST });

  if (showFullSheet) {
    renderFullSheet(baseTexture, sprite, decoded);
  } else {
    renderSingleFrame(baseTexture, sprite, decoded);
  }

  updateInfo(sprite, decoded);
}

function renderSingleFrame(
  baseTexture: BaseTexture,
  sprite: { frames: { x: number; y: number; width: number; height: number; pivotX: number; pivotY: number }[] },
  decoded: DecodedSprite
) {
  if (sprite.frames.length === 0) return;

  const frame = sprite.frames[frameIndex];
  if (!frame || frame.width === 0 || frame.height === 0) return;

  // Create sub-texture for this frame
  const texture = new Texture(
    baseTexture,
    new Rectangle(frame.x, frame.y, frame.width, frame.height)
  );

  const pixiSprite = new Sprite(texture);

  // Scale by zoom
  pixiSprite.scale.set(zoom);

  // Center in the canvas
  const canvasW = app.screen.width;
  const canvasH = app.screen.height;
  const frameW = frame.width * zoom;
  const frameH = frame.height * zoom;

  pixiSprite.x = Math.floor((canvasW - frameW) / 2);
  pixiSprite.y = Math.floor((canvasH - frameH) / 2);

  spriteContainer.addChild(pixiSprite);

  // Draw pivot point crosshair
  if (showPivot) {
    const pivotScreenX = pixiSprite.x - frame.pivotX * zoom;
    const pivotScreenY = pixiSprite.y - frame.pivotY * zoom;

    overlayGraphics.lineStyle(1, 0xe94560, 0.8);
    // Horizontal line
    overlayGraphics.moveTo(pivotScreenX - 10, pivotScreenY);
    overlayGraphics.lineTo(pivotScreenX + 10, pivotScreenY);
    // Vertical line
    overlayGraphics.moveTo(pivotScreenX, pivotScreenY - 10);
    overlayGraphics.lineTo(pivotScreenX, pivotScreenY + 10);
    // Small circle
    overlayGraphics.drawCircle(pivotScreenX, pivotScreenY, 3);
  }
}

function renderFullSheet(baseTexture: BaseTexture, sprite: { frames: { x: number; y: number; width: number; height: number; pivotX: number; pivotY: number }[] }, decoded: DecodedSprite) {
  // Show the entire BMP with frame rects overlaid
  const texture = new Texture(baseTexture);
  const pixiSprite = new Sprite(texture);
  pixiSprite.scale.set(zoom);

  // Center
  const canvasW = app.screen.width;
  const canvasH = app.screen.height;
  const sheetW = decoded.width * zoom;
  const sheetH = decoded.height * zoom;

  const offsetX = Math.floor(Math.max(0, (canvasW - sheetW) / 2));
  const offsetY = Math.floor(Math.max(0, (canvasH - sheetH) / 2));

  pixiSprite.x = offsetX;
  pixiSprite.y = offsetY;
  spriteContainer.addChild(pixiSprite);

  // Draw frame rectangles
  for (let i = 0; i < sprite.frames.length; i++) {
    const f = sprite.frames[i];
    const isActive = i === frameIndex;
    const color = isActive ? 0xe94560 : 0x533483;
    const alpha = isActive ? 0.9 : 0.4;

    overlayGraphics.lineStyle(isActive ? 2 : 1, color, alpha);
    overlayGraphics.drawRect(
      offsetX + f.x * zoom,
      offsetY + f.y * zoom,
      f.width * zoom,
      f.height * zoom
    );

    // Frame index label for active frame
    if (isActive) {
      overlayGraphics.lineStyle(0);
      overlayGraphics.beginFill(0xe94560, 0.8);
      overlayGraphics.drawRoundedRect(
        offsetX + f.x * zoom,
        offsetY + f.y * zoom - 14,
        20, 14, 2
      );
      overlayGraphics.endFill();
    }
  }
}

// ── UI Updates ────────────────────────────────────────────────────

function updateLabels() {
  if (!pakFile) return;

  spriteLabel.textContent = `${spriteIndex + 1} / ${pakFile.spriteCount}`;

  const sprite = pakFile.sprites[spriteIndex];
  const count = sprite?.frames.length ?? 0;
  frameLabel.textContent = count > 0 ? `${frameIndex + 1} / ${count}` : '- / 0';

  prevSpriteBtn.disabled = spriteIndex <= 0;
  nextSpriteBtn.disabled = spriteIndex >= pakFile.spriteCount - 1;
  prevFrameBtn.disabled = count === 0;
  nextFrameBtn.disabled = count === 0;
  playBtn.disabled = count <= 1;
}

function updateInfo(
  sprite: { frames: { x: number; y: number; width: number; height: number; pivotX: number; pivotY: number }[] },
  decoded: DecodedSprite
) {
  infoBmp.textContent = `${decoded.width} x ${decoded.height}`;
  infoFrames.textContent = String(sprite.frames.length);

  if (sprite.frames.length > 0 && frameIndex < sprite.frames.length) {
    const f = sprite.frames[frameIndex];
    infoRect.textContent = `(${f.x}, ${f.y}) ${f.width}x${f.height}`;
    infoPivot.textContent = `(${f.pivotX}, ${f.pivotY})`;
  } else {
    infoRect.textContent = '-';
    infoPivot.textContent = '-';
  }

  const [r, g, b] = decoded.colorKey;
  infoColorkey.innerHTML = `rgb(${r}, ${g}, ${b}) <span class="color-swatch" style="background:rgb(${r},${g},${b})"></span>`;
}

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

// ── Start ─────────────────────────────────────────────────────────

init().catch(console.error);
