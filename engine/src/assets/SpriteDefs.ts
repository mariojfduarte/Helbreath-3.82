/**
 * SpriteDefs — Tile PAK mappings and map file list.
 * Mirrors C++ MakeTileSpr() calls and Sprites::Create() calls from Game.cpp.
 *
 * TILE_PAK_MAP:          [pakName, startID, count] — batch-loaded via MakeTileSpr
 * SPECIAL_TILE_SPRITES:  [pakName, spriteIndex, tileID] — individual sprite loads
 * MAP_FILES:             Available .amd map files
 */

/** Maps PAK file names → [startID, count] for MakeTileSpr calls */
export const TILE_PAK_MAP: [string, number, number][] = [
	['maptiles1', 0, 32],
	['Sinside1', 70, 27],
	['Trees1', 100, 46],
	['TreeShadows', 150, 46],
	['objects1', 200, 10],
	['objects2', 211, 5],
	['objects3', 216, 4],
	['objects4', 220, 2],
	['Tile223-225', 223, 3],
	['Tile226-229', 226, 4],
	['objects5', 230, 9],
	['objects6', 238, 4],
	['objects7', 242, 7],
	['maptiles2', 300, 15],
	['maptiles4', 320, 10],
	['maptiles5', 330, 19],
	['maptiles6', 349, 4],
	['maptiles353-361', 353, 9],
	['Tile363-366', 363, 4],
	['Tile367-367', 367, 1],
	['Tile370-381', 370, 12],
	['Tile382-387', 382, 6],
	['Tile388-402', 388, 15],
	['Tile403-405', 403, 3],
	['Tile406-421', 406, 16],
	['Tile422-429', 422, 8],
	['Tile430-443', 430, 14],
	['Tile444-444', 444, 1],
	['Tile445-461', 445, 17],
	['Tile462-473', 462, 12],
	['Tile474-478', 474, 5],
	['Tile479-488', 479, 10],
	['Tile489-522', 489, 34],
	['Tile523-530', 523, 8],
	['Tile531-540', 531, 10],
	['Tile541-545', 541, 5],
];

/**
 * Special individual tile sprites loaded via Sprites::Create (not MakeTileSpr).
 * C++ uses lowercase "structures1"; file on disk may be Structures1.pak.
 * Format: [pakName, spriteIndexInPak, tileSpriteID]
 */
export const SPECIAL_TILE_SPRITES: [string, number, number][] = [
	['Structures1', 1, 51],
	['Structures1', 5, 55],
];

/** Available .amd map files. */
export const MAP_FILES = [
	'ARESDEN', 'ELVINE', 'middleland', '2ndmiddle',
	'arefarm', 'elvfarm', 'huntzone1', 'huntzone2',
	'huntzone3', 'huntzone4', 'aresdend1', 'elvined1',
	'BTField', 'bisle', 'GodH', 'HRampart',
	'DruncnCity', 'procella', 'icebound', 'default',
	'Abaddon', 'dglv2', 'dglv3', 'dglv4',
	'fightzone1', 'fightzone2', 'fightzone3', 'fightzone4',
	'bsmith_1', 'bsmith_2', 'cath_1', 'cath_2',
	'cityhall_1', 'cityhall_2', 'gshop_1', 'gshop_2',
	'wrhus_1', 'wrhus_2', 'wzdtwr_1', 'wzdtwr_2',
	'Toh1', 'Toh2', 'Toh3', 'Resurr1', 'Resurr2',
	'inferniaA', 'inferniaB', 'maze',
].sort();

/** Default map to load. */
export const DEFAULT_MAP = 'default';

/** Default character PAK. */
export const DEFAULT_CHAR_PAK = 'Wm';
