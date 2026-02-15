import {
  Application,
  BaseTexture,
  Texture,
  Sprite,
  Rectangle,
  Graphics,
  SCALE_MODES,
  Container,
  ColorMatrixFilter,
} from "pixi.js";
import {
  parsePak,
  decodeSpriteImage,
  type PakFile,
  type DecodedSprite,
} from "./pak-parser";

// ── PAK file list (populated from the SPRITES directory) ──────────

const PAK_FILES = [
  // Characters
  "Wm",
  "Ww",
  "Ym",
  "Yw",
  "Bm",
  "Bw",
  // NPCs
  "Guard",
  "SHOPKPR",
  "Howard",
  "Kennedy",
  "Tom",
  "Perry",
  "William",
  "Gandlf",
  "Gail",
  // Monsters
  "Orc",
  "Zom",
  "SKE",
  "SLM",
  "Troll",
  "Orge",
  "Cyc",
  "Demon",
  "Barlog",
  "Ettin",
  "Unicorn",
  "WereWolf",
  "DarkKnight",
  "Hellclaw",
  "Minotaurs",
  "Liche",
  "DarkElf",
  "GiantFrog",
  "Ant",
  "Cat",
  "Bunny",
  "Stalker",
  "Centaurus",
  "Beholder",
  "Clawturtle",
  "GiantLizard",
  "GiantPlant",
  "GiantCrayfish",
  "Babarian",
  "Tigerworm",
  "Wyvern",
  "FireWyvern",
  "IceGolem",
  "Sorceress",
  "Nizie",
  "DireBoar",
  "Rudolph",
  "ElfMaster",
  "MasterMageOrc",
  "Tentocle",
  "Catapult",
  "CBTurret",
  "HBTank",
  // Male equipment
  "MAxe1",
  "MAxe2",
  "MAxe3",
  "Msw",
  "Msw2",
  "Msw3",
  "Msh",
  "MBHammer",
  "MStaff1",
  "MStaff2",
  "MStaff3",
  "Mbo",
  "MLarmor",
  "MCMail",
  "MHauberk",
  "MHelm1",
  "MHelm2",
  "MHelm3",
  "MHelm4",
  "Mrobe1",
  "MTrouser",
  "MShirt",
  // Female equipment
  "WAxe1",
  "WAxe2",
  "WAxe3",
  "Wsw",
  "Wsw2",
  "Wsw3",
  "Wsh",
  "WBHammer",
  "WStaff1",
  "WStaff2",
  "WStaff3",
  "Wbo",
  "WLarmor",
  "WCMail",
  "WHauberk",
  "WHelm1",
  "WHelm4",
  "Wrobe1",
  "WTrouser",
  "WShirt",
  "WSkirt",
  // Items
  "item-ground",
  "item-pack",
  "item-equipM",
  "item-equipW",
  "item-dynamic",
  // UI & Interface
  "interface",
  "interface2",
  "New-Dialog",
  "LoginDialog",
  "GameDialog",
  "SPRFONTS",
  "DialogText",
  "newmaps",
  "PartySprite",
  // Map tiles
  "maptiles1",
  "maptiles2",
  "maptiles4",
  "maptiles5",
  "maptiles6",
  // Objects & Tiles
  "Objects1",
  "Objects2",
  "Objects3",
  "objects4",
  "Objects5",
  "Objects6",
  "Objects7",
  "TREES1",
  "TreeShadows",
  "Structures1",
  "BG",
  "ABS",
  // Effects
  "EFFECT",
  "EFFECT2",
  "EFFECT3",
  "effect4",
  "effect5",
  "effect6",
  "Effect7",
  "Effect8",
  "effect9",
  "effect10",
  "Effect11",
  "Effect12",
  "Effect13",
  "CruEffect1",
  "frost",
  "yseffect2",
  "yseffect3",
  "yseffect4",
  // Misc
  "GOL",
  "ESG",
  "GHK",
  "GHKABS",
  "GMG",
  "LWB",
  "TK",
  "TPKnight",
  "Gate",
  "Crop",
  "Detector",
  "ManaStone",
  "ManaCollector",
  "Telescope",
].sort();

// ── DrawParams (mirrors DDrawEngine SpriteTypes.h) ────────────────

interface DrawParams {
  alpha: number; // 0.0–1.0
  tintR: number; // -255..+255
  tintG: number;
  tintB: number;
  isShadow: boolean;
  isFade: boolean;
  alphaDegree: number; // 1–13, simulates time-of-day tinting
}

function defaultDrawParams(): DrawParams {
  return {
    alpha: 1.0,
    tintR: 0,
    tintG: 0,
    tintB: 0,
    isShadow: false,
    isFade: false,
    alphaDegree: 1,
  };
}

/**
 * Alpha-degree tint table — matches DDrawSprite::ApplyAlphaDegree().
 * Each entry is [R, G, B] offset applied to all sprite pixels.
 * Degree 1 = normal daylight, higher = darker/tinted (dusk/night).
 */
const ALPHA_DEGREE_TINTS: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-4, -4, -4],
  3: [-8, -8, -8],
  4: [-12, -12, -12],
  5: [-16, -16, -16],
  6: [-20, -20, -20],
  7: [-24, -24, -24],
  8: [-28, -28, -28],
  9: [-32, -32, -32],
  10: [-36, -36, -36],
  11: [-40, -40, -40],
  12: [-44, -44, -44],
  13: [-20, -20, -6], // Night: bluish tint
};

// ── App state ─────────────────────────────────────────────────────

let pakFile: PakFile | null = null;
let pakName = "";
let spriteIndex = 0;
let frameIndex = 0;
let isPlaying = false;
let fps = 8;
let zoom = 2;
let showFullSheet = false;
let showPivot = true;
let showBounds = false;
let showTileGrid = false;
let animTimer: number | null = null;
let drawParams: DrawParams = defaultDrawParams();

// Decoded textures cache: spriteIndex -> decoded data
const decodedCache = new Map<number, DecodedSprite | null>();

// PixiJS
let app: Application;
let spriteContainer: Container;
let overlayGraphics: Graphics;

// ── DOM Elements ──────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const pakSelect = $<HTMLSelectElement>("pak-select");
const loadBtn = $<HTMLButtonElement>("load-btn");
const fileInput = $<HTMLInputElement>("file-input");
const statusEl = $("status");
const navBar = $("nav-bar");
const infoBar = $("info-bar");
const effectsPanel = $("effects-panel");
const canvasContainer = $("canvas-container");
const dropOverlay = $("drop-overlay");

const prevSpriteBtn = $<HTMLButtonElement>("prev-sprite");
const nextSpriteBtn = $<HTMLButtonElement>("next-sprite");
const spriteLabel = $("sprite-label");
const prevFrameBtn = $<HTMLButtonElement>("prev-frame");
const nextFrameBtn = $<HTMLButtonElement>("next-frame");
const frameLabel = $("frame-label");
const playBtn = $<HTMLButtonElement>("play-btn");
const fpsSlider = $<HTMLInputElement>("fps-slider");
const fpsLabel = $("fps-label");
const zoomOutBtn = $<HTMLButtonElement>("zoom-out");
const zoomInBtn = $<HTMLButtonElement>("zoom-in");
const zoomLabel = $("zoom-label");
const showSheetCb = $<HTMLInputElement>("show-sheet");
const showPivotCb = $<HTMLInputElement>("show-pivot");

// Effects panel elements
const alphaSlider = $<HTMLInputElement>("alpha-slider");
const alphaVal = $("alpha-val");
const alpha100Btn = $<HTMLButtonElement>("alpha-100");
const alpha70Btn = $<HTMLButtonElement>("alpha-70");
const alpha50Btn = $<HTMLButtonElement>("alpha-50");
const alpha25Btn = $<HTMLButtonElement>("alpha-25");
const tintR = $<HTMLInputElement>("tint-r");
const tintG = $<HTMLInputElement>("tint-g");
const tintB = $<HTMLInputElement>("tint-b");
const tintRVal = $("tint-r-val");
const tintGVal = $("tint-g-val");
const tintBVal = $("tint-b-val");
const tintSwatch = $("tint-swatch");
const showShadowCb = $<HTMLInputElement>("show-shadow");
const showFadeCb = $<HTMLInputElement>("show-fade");
const showBoundsCb = $<HTMLInputElement>("show-bounds");
const showTileGridCb = $<HTMLInputElement>("show-tile-grid");
const alphaDegreeSlider = $<HTMLInputElement>("alpha-degree");
const alphaDegreeVal = $("alpha-degree-val");
const resetEffectsBtn = $<HTMLButtonElement>("reset-effects");

// Info bar
const infoBmp = $("info-bmp");
const infoRect = $("info-rect");
const infoPivot = $("info-pivot");
const infoColorkey = $("info-colorkey");
const infoFrames = $("info-frames");
const infoBounds = $("info-bounds");
const infoEffect = $("info-effect");

// ── Initialize ────────────────────────────────────────────────────

async function init() {
  // Populate PAK dropdown
  for (const name of PAK_FILES) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name + ".pak";
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

  loadBtn.addEventListener("click", loadFromSelect);
  pakSelect.addEventListener("dblclick", loadFromSelect);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) loadFromFile(file);
  });

  // Drag and drop
  document.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropOverlay.classList.add("active");
  });
  document.addEventListener("dragleave", () => {
    dropOverlay.classList.remove("active");
  });
  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dropOverlay.classList.remove("active");
    const file = e.dataTransfer?.files[0];
    if (file && file.name.toLowerCase().endsWith(".pak")) {
      loadFromFile(file);
    }
  });

  // Navigation
  prevSpriteBtn.addEventListener("click", () => navigateSprite(-1));
  nextSpriteBtn.addEventListener("click", () => navigateSprite(1));
  prevFrameBtn.addEventListener("click", () => navigateFrame(-1));
  nextFrameBtn.addEventListener("click", () => navigateFrame(1));

  playBtn.addEventListener("click", togglePlay);

  fpsSlider.addEventListener("input", () => {
    fps = parseInt(fpsSlider.value);
    fpsLabel.textContent = String(fps);
    if (isPlaying) restartAnimation();
  });

  zoomOutBtn.addEventListener("click", () => setZoom(zoom - 1));
  zoomInBtn.addEventListener("click", () => setZoom(zoom + 1));

  showSheetCb.addEventListener("change", () => {
    showFullSheet = showSheetCb.checked;
    render();
  });

  showPivotCb.addEventListener("change", () => {
    showPivot = showPivotCb.checked;
    render();
  });

  // ── Effects panel listeners ──

  // Alpha preset buttons (match DDrawEngine AlphaPreset enum)
  const alphaPresetBtns = [alpha100Btn, alpha70Btn, alpha50Btn, alpha25Btn];
  const alphaPresetValues = [100, 70, 50, 25];
  alphaPresetBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      drawParams.alpha = alphaPresetValues[i] / 100;
      alphaSlider.value = String(alphaPresetValues[i]);
      syncAlphaUI();
      render();
    });
  });

  alphaSlider.addEventListener("input", () => {
    drawParams.alpha = parseInt(alphaSlider.value) / 100;
    syncAlphaUI();
    render();
  });

  // Tint sliders (match DrawParams tintR/G/B: -255..+255)
  tintR.addEventListener("input", () => {
    drawParams.tintR = parseInt(tintR.value);
    syncTintUI();
    render();
  });
  tintG.addEventListener("input", () => {
    drawParams.tintG = parseInt(tintG.value);
    syncTintUI();
    render();
  });
  tintB.addEventListener("input", () => {
    drawParams.tintB = parseInt(tintB.value);
    syncTintUI();
    render();
  });

  // Shadow & Fade toggles (match DrawParams flags)
  showShadowCb.addEventListener("change", () => {
    drawParams.isShadow = showShadowCb.checked;
    if (drawParams.isShadow) {
      showFadeCb.checked = false;
      drawParams.isFade = false;
    }
    render();
  });
  showFadeCb.addEventListener("change", () => {
    drawParams.isFade = showFadeCb.checked;
    if (drawParams.isFade) {
      showShadowCb.checked = false;
      drawParams.isShadow = false;
    }
    render();
  });

  // Bounds & tile grid toggles
  showBoundsCb.addEventListener("change", () => {
    showBounds = showBoundsCb.checked;
    render();
  });
  showTileGridCb.addEventListener("change", () => {
    showTileGrid = showTileGridCb.checked;
    render();
  });

  // Alpha degree (time-of-day simulation matching DDrawSprite::ApplyAlphaDegree)
  alphaDegreeSlider.addEventListener("input", () => {
    drawParams.alphaDegree = parseInt(alphaDegreeSlider.value);
    syncAlphaDegreeUI();
    render();
  });

  // Reset button
  resetEffectsBtn.addEventListener("click", () => {
    drawParams = defaultDrawParams();
    alphaSlider.value = "100";
    tintR.value = "0";
    tintG.value = "0";
    tintB.value = "0";
    showShadowCb.checked = false;
    showFadeCb.checked = false;
    showBoundsCb.checked = false;
    showTileGridCb.checked = false;
    alphaDegreeSlider.value = "1";
    showBounds = false;
    showTileGrid = false;
    syncAlphaUI();
    syncTintUI();
    syncAlphaDegreeUI();
    render();
  });

  // Keyboard shortcuts (skip when a form element is focused)
  document.addEventListener("keydown", (e) => {
    if (!pakFile) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;
    switch (e.key) {
      case "ArrowLeft":
        navigateFrame(-1);
        break;
      case "ArrowRight":
        navigateFrame(1);
        break;
      case "ArrowUp":
        navigateSprite(-1);
        e.preventDefault();
        break;
      case "ArrowDown":
        navigateSprite(1);
        e.preventDefault();
        break;
      case " ":
        togglePlay();
        e.preventDefault();
        break;
      case "+":
      case "=":
        setZoom(zoom + 1);
        break;
      case "-":
        setZoom(zoom - 1);
        break;
    }
  });

  setStatus("Ready. Select a PAK file or drag & drop one.");
}

// ── UI Sync helpers ───────────────────────────────────────────────

function syncAlphaUI() {
  const pct = Math.round(drawParams.alpha * 100);
  alphaVal.textContent = `${pct}%`;

  // Highlight matching preset button
  const presetBtns = [alpha100Btn, alpha70Btn, alpha50Btn, alpha25Btn];
  const presetVals = [100, 70, 50, 25];
  presetBtns.forEach((btn, i) => {
    btn.classList.toggle("active", pct === presetVals[i]);
  });
}

function syncTintUI() {
  tintRVal.textContent = String(drawParams.tintR);
  tintGVal.textContent = String(drawParams.tintG);
  tintBVal.textContent = String(drawParams.tintB);

  // Show combined tint as a color swatch (offset from neutral gray)
  const r = Math.max(0, Math.min(255, 128 + drawParams.tintR));
  const g = Math.max(0, Math.min(255, 128 + drawParams.tintG));
  const b = Math.max(0, Math.min(255, 128 + drawParams.tintB));
  tintSwatch.style.background = `rgb(${r},${g},${b})`;
}

function syncAlphaDegreeUI() {
  const deg = drawParams.alphaDegree;
  const labels: Record<number, string> = {
    1: "Day",
    2: "Day-",
    3: "Dusk 1",
    4: "Dusk 2",
    5: "Dusk 3",
    6: "Eve 1",
    7: "Eve 2",
    8: "Eve 3",
    9: "Night 1",
    10: "Night 2",
    11: "Night 3",
    12: "Night 4",
    13: "Night",
  };
  alphaDegreeVal.textContent = labels[deg] ?? String(deg);
}

// ── Loading ───────────────────────────────────────────────────────

async function loadFromSelect() {
  const name = pakSelect.value;
  if (!name) return;

  setStatus(`Loading ${name}.pak...`);

  try {
    const url = `/sprites/${name}.pak`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
    const name = file.name.replace(/\.pak$/i, "");
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

  // Show navigation & effects panel
  navBar.style.display = "flex";
  infoBar.style.display = "flex";
  effectsPanel.classList.add("visible");

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
  frameIndex =
    (frameIndex + delta + sprite.frames.length) % sprite.frames.length;
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
  playBtn.classList.add("playing");
  playBtn.innerHTML = "&#9724; Stop";
  restartAnimation();
}

function stopPlay() {
  isPlaying = false;
  playBtn.classList.remove("playing");
  playBtn.innerHTML = "&#9654; Play";
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

// ── Effect application (mirrors DDrawEngine rendering pipeline) ───

/**
 * Build a PixiJS ColorMatrixFilter that simulates the DDrawEngine's
 * rendering effects: alpha-degree tint + RGB tint offsets + shadow/fade.
 *
 * The DDrawEngine applies effects by manipulating 16-bit pixel values
 * through lookup tables. We approximate this using color matrix operations.
 */
function buildEffectFilter(params: DrawParams): ColorMatrixFilter | null {
  const hasTint =
    params.tintR !== 0 || params.tintG !== 0 || params.tintB !== 0;
  const hasAlphaDegree = params.alphaDegree > 1;

  if (!hasTint && !hasAlphaDegree && !params.isShadow && !params.isFade) {
    return null;
  }

  const filter = new ColorMatrixFilter();

  if (params.isShadow) {
    // Shadow: DDrawEngine draws a darkened silhouette at ~50% brightness
    // using the m_lTransRB50/G50 tables. All color channels are halved.
    filter.matrix[0] = 0.15; // R
    filter.matrix[6] = 0.15; // G
    filter.matrix[12] = 0.2; // B (slightly higher, matching shadow blue tint)
    filter.matrix[4] = 0; // R offset
    filter.matrix[9] = 0; // G offset
    filter.matrix[14] = 0; // B offset
    return filter;
  }

  if (params.isFade) {
    // Fade: DDrawEngine uses m_lFadeRB/m_lFadeG tables
    // This blends the sprite towards white at ~50% opacity
    filter.matrix[0] = 0.5; // R scale
    filter.matrix[6] = 0.5; // G scale
    filter.matrix[12] = 0.5; // B scale
    filter.matrix[4] = 0.5; // R offset (towards white)
    filter.matrix[9] = 0.5; // G offset
    filter.matrix[14] = 0.5; // B offset
    return filter;
  }

  // Apply alpha-degree tinting (time-of-day from DDrawSprite::ApplyAlphaDegree)
  let totalR = 0,
    totalG = 0,
    totalB = 0;
  if (hasAlphaDegree) {
    const tint = ALPHA_DEGREE_TINTS[params.alphaDegree] ?? [0, 0, 0];
    totalR += tint[0];
    totalG += tint[1];
    totalB += tint[2];
  }

  // Apply manual tint (DrawParams::Tint from SpriteTypes.h)
  totalR += params.tintR;
  totalG += params.tintG;
  totalB += params.tintB;

  if (totalR !== 0 || totalG !== 0 || totalB !== 0) {
    // ColorMatrix offsets are 0..1 range (normalized from 0..255)
    filter.matrix[4] = totalR / 255;
    filter.matrix[9] = totalG / 255;
    filter.matrix[14] = totalB / 255;
  }

  return filter;
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
  const baseTexture = BaseTexture.from(decoded.canvas, {
    scaleMode: SCALE_MODES.NEAREST,
  });

  if (showFullSheet) {
    renderFullSheet(baseTexture, sprite, decoded);
  } else {
    renderSingleFrame(baseTexture, sprite, decoded);
  }

  updateInfo(sprite, decoded);
}

function renderSingleFrame(
  baseTexture: BaseTexture,
  sprite: {
    frames: {
      x: number;
      y: number;
      width: number;
      height: number;
      pivotX: number;
      pivotY: number;
    }[];
  },
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

  // When tile grid is on, position relative to a reference tile using pivot
  let spriteX: number;
  let spriteY: number;

  if (showTileGrid) {
    // Show sprite as it would appear in-game: positioned by pivot relative to tile center
    // The DDrawEngine draws at: tileScreenX + pivotX, tileScreenY + pivotY
    // where pivot is a negative offset that positions the sprite so its "feet" align with the tile
    const tileSize = 32 * zoom;
    const tileCenterX = Math.floor(canvasW / 2);
    const tileCenterY = Math.floor(canvasH / 2);

    spriteX = tileCenterX + frame.pivotX * zoom;
    spriteY = tileCenterY + frame.pivotY * zoom;
  } else {
    spriteX = Math.floor((canvasW - frameW) / 2);
    spriteY = Math.floor((canvasH - frameH) / 2);
  }

  pixiSprite.x = spriteX;
  pixiSprite.y = spriteY;

  // Apply DrawParams effects
  pixiSprite.alpha = drawParams.alpha;

  const effectFilter = buildEffectFilter(drawParams);
  if (effectFilter) {
    pixiSprite.filters = [effectFilter];
  } else {
    pixiSprite.filters = [];
  }

  spriteContainer.addChild(pixiSprite);

  // ── Overlay drawings ──

  // Tile grid (shows 32x32 game tiles for spatial context)
  if (showTileGrid) {
    const tileSize = 32 * zoom;
    const tileCenterX = Math.floor(canvasW / 2);
    const tileCenterY = Math.floor(canvasH / 2);

    // Draw grid lines
    overlayGraphics.lineStyle(1, 0x333333, 0.5);
    const gridExtent = 5;
    for (let gx = -gridExtent; gx <= gridExtent; gx++) {
      const x = tileCenterX + gx * tileSize;
      overlayGraphics.moveTo(x, tileCenterY - gridExtent * tileSize);
      overlayGraphics.lineTo(x, tileCenterY + gridExtent * tileSize);
    }
    for (let gy = -gridExtent; gy <= gridExtent; gy++) {
      const y = tileCenterY + gy * tileSize;
      overlayGraphics.moveTo(tileCenterX - gridExtent * tileSize, y);
      overlayGraphics.lineTo(tileCenterX + gridExtent * tileSize, y);
    }

    // Highlight the center tile (where sprite is anchored)
    overlayGraphics.lineStyle(2, 0x0f3460, 0.8);
    overlayGraphics.drawRect(tileCenterX, tileCenterY, tileSize, tileSize);

    // Tile origin marker
    overlayGraphics.lineStyle(1, 0x0f3460, 0.6);
    overlayGraphics.beginFill(0x0f3460, 0.3);
    overlayGraphics.drawCircle(tileCenterX, tileCenterY, 4);
    overlayGraphics.endFill();
  }

  // Bounding box (matches DDrawSprite::GetBoundingRect / _GetSpriteRect)
  // In the engine: left = x + pivotX, top = y + pivotY, right = left + width, bottom = top + height
  if (showBounds) {
    const boundsX = spriteX;
    const boundsY = spriteY;
    const boundsW = frameW;
    const boundsH = frameH;

    overlayGraphics.lineStyle(1, 0xf5a623, 0.7);
    overlayGraphics.drawRect(boundsX, boundsY, boundsW, boundsH);

    // Dimension labels
    overlayGraphics.lineStyle(0);
    overlayGraphics.beginFill(0xf5a623, 0.7);
    overlayGraphics.drawRoundedRect(boundsX + boundsW + 4, boundsY, 60, 16, 2);
    overlayGraphics.drawRoundedRect(boundsX, boundsY + boundsH + 4, 60, 16, 2);
    overlayGraphics.endFill();
  }

  // Pivot point crosshair
  if (showPivot) {
    let pivotScreenX: number;
    let pivotScreenY: number;

    if (showTileGrid) {
      // When tile grid is on, pivot is at the tile origin
      pivotScreenX = Math.floor(canvasW / 2);
      pivotScreenY = Math.floor(canvasH / 2);
    } else {
      pivotScreenX = spriteX - frame.pivotX * zoom;
      pivotScreenY = spriteY - frame.pivotY * zoom;
    }

    // Draw crosshair lines extending across the full canvas
    overlayGraphics.lineStyle(1, 0xe94560, 0.25);
    overlayGraphics.moveTo(pivotScreenX, 0);
    overlayGraphics.lineTo(pivotScreenX, canvasH);
    overlayGraphics.moveTo(0, pivotScreenY);
    overlayGraphics.lineTo(canvasW, pivotScreenY);

    // Inner crosshair
    overlayGraphics.lineStyle(2, 0xe94560, 0.8);
    overlayGraphics.moveTo(pivotScreenX - 12, pivotScreenY);
    overlayGraphics.lineTo(pivotScreenX + 12, pivotScreenY);
    overlayGraphics.moveTo(pivotScreenX, pivotScreenY - 12);
    overlayGraphics.lineTo(pivotScreenX, pivotScreenY + 12);

    // Circle
    overlayGraphics.lineStyle(1.5, 0xe94560, 0.8);
    overlayGraphics.drawCircle(pivotScreenX, pivotScreenY, 5);
  }
}

function renderFullSheet(
  baseTexture: BaseTexture,
  sprite: {
    frames: {
      x: number;
      y: number;
      width: number;
      height: number;
      pivotX: number;
      pivotY: number;
    }[];
  },
  decoded: DecodedSprite
) {
  // Show the entire BMP with frame rects overlaid
  const texture = new Texture(baseTexture);
  const pixiSprite = new Sprite(texture);
  pixiSprite.scale.set(zoom);

  // Apply effects to full sheet too
  pixiSprite.alpha = drawParams.alpha;
  const effectFilter = buildEffectFilter(drawParams);
  if (effectFilter) {
    pixiSprite.filters = [effectFilter];
  }

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

    // Pivot point for each frame
    if (showPivot && isActive) {
      const pvX = offsetX + (f.x - f.pivotX) * zoom;
      const pvY = offsetY + (f.y - f.pivotY) * zoom;
      overlayGraphics.lineStyle(1, 0xe94560, 0.6);
      overlayGraphics.drawCircle(pvX, pvY, 3);
    }

    // Frame index label for active frame
    if (isActive) {
      overlayGraphics.lineStyle(0);
      overlayGraphics.beginFill(0xe94560, 0.8);
      overlayGraphics.drawRoundedRect(
        offsetX + f.x * zoom,
        offsetY + f.y * zoom - 14,
        20,
        14,
        2
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
  frameLabel.textContent = count > 0 ? `${frameIndex + 1} / ${count}` : "- / 0";

  prevSpriteBtn.disabled = spriteIndex <= 0;
  nextSpriteBtn.disabled = spriteIndex >= pakFile.spriteCount - 1;
  prevFrameBtn.disabled = count === 0;
  nextFrameBtn.disabled = count === 0;
  playBtn.disabled = count <= 1;
}

function updateInfo(
  sprite: {
    frames: {
      x: number;
      y: number;
      width: number;
      height: number;
      pivotX: number;
      pivotY: number;
    }[];
  },
  decoded: DecodedSprite
) {
  infoBmp.textContent = `${decoded.width} x ${decoded.height}`;
  infoFrames.textContent = String(sprite.frames.length);

  if (sprite.frames.length > 0 && frameIndex < sprite.frames.length) {
    const f = sprite.frames[frameIndex];
    infoRect.textContent = `(${f.x}, ${f.y}) ${f.width}x${f.height}`;
    infoPivot.textContent = `(${f.pivotX}, ${f.pivotY})`;

    // Bounding box as the engine would compute it:
    // DDrawSprite::GetBoundingRect → left=x+pivotX, top=y+pivotY, right=left+width, bottom=top+height
    // For display, show the pixel-space bounds at draw position
    const bLeft = f.pivotX;
    const bTop = f.pivotY;
    const bRight = bLeft + f.width;
    const bBottom = bTop + f.height;
    infoBounds.textContent = `(${bLeft}, ${bTop}) → (${bRight}, ${bBottom})`;
  } else {
    infoRect.textContent = "-";
    infoPivot.textContent = "-";
    infoBounds.textContent = "-";
  }

  const [r, g, b] = decoded.colorKey;
  infoColorkey.innerHTML = `rgb(${r}, ${g}, ${b}) <span class="color-swatch" style="background:rgb(${r},${g},${b})"></span>`;

  // Effect description (matching DDrawEngine method names)
  const effects: string[] = [];
  if (drawParams.isShadow) effects.push("Shadow");
  else if (drawParams.isFade) effects.push("Fade");
  else if (drawParams.alpha < 1)
    effects.push(`Alpha ${Math.round(drawParams.alpha * 100)}%`);
  else effects.push("Opaque");

  if (
    drawParams.tintR !== 0 ||
    drawParams.tintG !== 0 ||
    drawParams.tintB !== 0
  ) {
    effects.push(
      `Tint(${drawParams.tintR},${drawParams.tintG},${drawParams.tintB})`
    );
  }

  if (drawParams.alphaDegree > 1) {
    effects.push(`AlphaDeg ${drawParams.alphaDegree}`);
  }

  infoEffect.textContent = effects.join(" + ");
}

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

// ── Start ─────────────────────────────────────────────────────────

init().catch(console.error);
