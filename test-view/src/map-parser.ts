/**
 * Helbreath .amd map file parser.
 *
 * Format:
 *   [Header: 256 bytes] ASCII text with "MAPSIZEX = n MAPSIZEY = m"
 *   [Tiles: sizeX * sizeY * 10 bytes] row-major (y-outer, x-inner)
 *     Per tile (10 bytes):
 *       int16  tileSprite
 *       int16  tileSpriteFrame
 *       int16  objectSprite
 *       int16  objectSpriteFrame
 *       uint8  flags (bit 0x80 = blocked, 0x40 = teleport)
 *       uint8  padding
 */

export interface MapTile {
  tileSprite: number;
  tileSpriteFrame: number;
  objectSprite: number;
  objectSpriteFrame: number;
  isMoveAllowed: boolean;
  isTeleport: boolean;
}

export interface GameMap {
  name: string;
  sizeX: number;
  sizeY: number;
  tiles: MapTile[][]; // tiles[x][y] to match C++ convention
}

export function parseMap(buffer: ArrayBuffer, name: string = ''): GameMap {
  // Parse 256-byte ASCII header
  const headerBytes = new Uint8Array(buffer, 0, 256);
  let headerText = '';
  for (let i = 0; i < 256; i++) {
    headerText += headerBytes[i] === 0 ? ' ' : String.fromCharCode(headerBytes[i]);
  }

  const sizeXMatch = headerText.match(/MAPSIZEX\s*=\s*(\d+)/i);
  const sizeYMatch = headerText.match(/MAPSIZEY\s*=\s*(\d+)/i);

  const sizeX = sizeXMatch ? parseInt(sizeXMatch[1]) : 0;
  const sizeY = sizeYMatch ? parseInt(sizeYMatch[1]) : 0;

  if (sizeX === 0 || sizeY === 0) {
    throw new Error(`Invalid map dimensions: ${sizeX}x${sizeY}`);
  }

  // Validate file size
  const expectedSize = 256 + sizeX * sizeY * 10;
  if (buffer.byteLength < expectedSize) {
    throw new Error(`File too small: expected ${expectedSize}, got ${buffer.byteLength}`);
  }

  // Parse tile data (row-major: y-outer, x-inner)
  const view = new DataView(buffer, 256);
  const tiles: MapTile[][] = [];

  // Pre-allocate columns
  for (let x = 0; x < sizeX; x++) {
    tiles[x] = new Array(sizeY);
  }

  let offset = 0;
  for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x < sizeX; x++) {
      tiles[x][y] = {
        tileSprite: view.getInt16(offset, true),
        tileSpriteFrame: view.getInt16(offset + 2, true),
        objectSprite: view.getInt16(offset + 4, true),
        objectSpriteFrame: view.getInt16(offset + 6, true),
        isMoveAllowed: (view.getUint8(offset + 8) & 0x80) === 0,
        isTeleport: (view.getUint8(offset + 8) & 0x40) !== 0,
      };
      offset += 10;
    }
  }

  return { name, sizeX, sizeY, tiles };
}

/**
 * Find a walkable starting position near the center of the map.
 */
export function findSpawnPoint(map: GameMap): { x: number; y: number } {
  const cx = Math.floor(map.sizeX / 2);
  const cy = Math.floor(map.sizeY / 2);

  // Spiral search from center
  for (let radius = 0; radius < Math.max(map.sizeX, map.sizeY); radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < map.sizeX && y >= 0 && y < map.sizeY) {
          if (map.tiles[x][y].isMoveAllowed) {
            return { x, y };
          }
        }
      }
    }
  }

  return { x: cx, y: cy };
}
