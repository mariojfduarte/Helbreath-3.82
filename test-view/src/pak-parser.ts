/**
 * PAK file binary parser for Helbreath .pak sprite archives.
 *
 * PAK binary layout (all integers are little-endian):
 *
 *   [File Header: 20 bytes]  "<Pak file header>" + 3 padding
 *   [Sprite Count: 4 bytes]  uint32
 *   [Sprite Entries: 8*N]    array of {offset: uint32, size: uint32}
 *
 *   Per sprite (at entry.offset):
 *     [Sprite Header: 100 bytes]  signature + padding (skip)
 *     [Rect Count: 4 bytes]       uint32
 *     [Frame Rects: 12*M bytes]   {x, y, width, height, pivotX, pivotY}
 *     [Padding: 4 bytes]          (skip)
 *     [Image Data: rest]          raw BMP file (BITMAPFILEHEADER + pixels)
 */

// ── Types ──────────────────────────────────────────────────────────

export interface SpriteRect {
  x: number;
  y: number;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
}

export interface PakSprite {
  index: number;
  frames: SpriteRect[];
  imageData: Uint8Array; // Raw BMP bytes
}

export interface PakFile {
  spriteCount: number;
  sprites: PakSprite[];
}

// ── Constants ──────────────────────────────────────────────────────

const FILE_HEADER_SIZE = 20;
const SPRITE_HEADER_SIZE = 100;
const RECT_SIZE = 12;
const PADDING_SIZE = 4;
const MAX_SPRITES = 1500;
const MAX_FRAMES = 1000;

// ── Parser ─────────────────────────────────────────────────────────

export function parsePak(buffer: ArrayBuffer): PakFile {
  const view = new DataView(buffer);

  // Validate minimum file size (header + sprite count)
  if (buffer.byteLength < FILE_HEADER_SIZE + 4) {
    throw new Error('File too small to be a valid PAK file');
  }

  // Read sprite count (offset 20, after 20-byte file header)
  const spriteCount = view.getUint32(FILE_HEADER_SIZE, true);

  if (spriteCount === 0 || spriteCount > MAX_SPRITES) {
    throw new Error(`Invalid sprite count: ${spriteCount}`);
  }

  // Read sprite entries table
  const entriesOffset = FILE_HEADER_SIZE + 4;
  const entries: { offset: number; size: number }[] = [];

  for (let i = 0; i < spriteCount; i++) {
    const entryOffset = entriesOffset + i * 8;
    entries.push({
      offset: view.getUint32(entryOffset, true),
      size: view.getUint32(entryOffset + 4, true),
    });
  }

  // Parse each sprite
  const sprites: PakSprite[] = [];

  for (let si = 0; si < entries.length; si++) {
    const entry = entries[si];

    // Read rect count (after 100-byte sprite header)
    const rectCountOffset = entry.offset + SPRITE_HEADER_SIZE;
    const rectCount = view.getUint32(rectCountOffset, true);

    if (rectCount === 0 || rectCount > MAX_FRAMES) {
      console.warn(`Sprite ${si}: invalid rect count ${rectCount}, skipping`);
      sprites.push({ index: si, frames: [], imageData: new Uint8Array(0) });
      continue;
    }

    // Read frame rectangles
    const frames: SpriteRect[] = [];
    let pos = rectCountOffset + 4; // after rect_count

    for (let r = 0; r < rectCount; r++) {
      frames.push({
        x: view.getUint16(pos, true),
        y: view.getUint16(pos + 2, true),
        width: view.getUint16(pos + 4, true),
        height: view.getUint16(pos + 6, true),
        pivotX: view.getInt16(pos + 8, true),  // signed
        pivotY: view.getInt16(pos + 10, true),  // signed
      });
      pos += RECT_SIZE;
    }

    // Skip 4 bytes padding
    pos += PADDING_SIZE;

    // Calculate image data size
    const headerAndRects = SPRITE_HEADER_SIZE + 4 + (rectCount * RECT_SIZE) + PADDING_SIZE;
    const imageSize = entry.size - headerAndRects;

    if (imageSize <= 0) {
      console.warn(`Sprite ${si}: no image data (size=${imageSize})`);
      sprites.push({ index: si, frames, imageData: new Uint8Array(0) });
      continue;
    }

    // Extract BMP bytes (copy to avoid detached buffer issues)
    const imageData = new Uint8Array(buffer.slice(pos, pos + imageSize));

    sprites.push({ index: si, frames, imageData });
  }

  return { spriteCount, sprites };
}

// ── BMP → Canvas with color-key transparency ──────────────────────

export interface DecodedSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  colorKey: [number, number, number];
}

/**
 * Decode a BMP from a PakSprite's imageData into a canvas
 * with color-key transparency applied (top-left pixel = transparent).
 */
export async function decodeSpriteImage(sprite: PakSprite): Promise<DecodedSprite | null> {
  if (sprite.imageData.length === 0) return null;

  // Load BMP via browser's native decoder
  const blob = new Blob([sprite.imageData.buffer as ArrayBuffer], { type: 'image/bmp' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);

    // Draw to canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    // Read pixels and apply color-key transparency
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = pixelData.data;

    // Top-left pixel is the color key
    const keyR = d[0];
    const keyG = d[1];
    const keyB = d[2];

    for (let i = 0; i < d.length; i += 4) {
      if (d[i] === keyR && d[i + 1] === keyG && d[i + 2] === keyB) {
        d[i + 3] = 0; // set alpha to 0
      }
    }

    ctx.putImageData(pixelData, 0, 0);

    return {
      canvas,
      width: img.width,
      height: img.height,
      colorKey: [keyR, keyG, keyB],
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
