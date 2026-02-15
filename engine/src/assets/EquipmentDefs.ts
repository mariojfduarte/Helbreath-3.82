/**
 * EquipmentDefs — Equipment PAK file definitions for the player character.
 * Mirrors C++ MakeSprite calls for equipment from Sources/Client/Game.cpp.
 *
 * Sprite index formula per slot:
 *   baseID + group * stride + actionOffset
 *
 * Where actionOffset comes from ACTION_TO_SPRITE_OFFSET[currentAction].
 * Weapons use a larger stride (64) vs armor/helm/etc. (15).
 * Shields use stride 8.
 */

// ── Sprite index base addresses (from SpriteID.h) ───────────────

// Male equipment
export const SPRID_UNDIES_M    = 1400;
export const SPRID_HAIR_M      = 1600;
export const SPRID_BODYARMOR_M = 1800;
export const SPRID_BERK_M      = 2100;  // arm armor (shirt/hauberk)
export const SPRID_LEGG_M      = 2300;
export const SPRID_BOOT_M      = 2500;
export const SPRID_MANTLE_M    = 2600;
export const SPRID_HEAD_M      = 2800;  // helm
export const SPRID_WEAPON_M    = 3000;
export const SPRID_SHIELD_M    = 6500;

// Female equipment (male + 10000)
export const SPRID_UNDIES_W    = 11400;
export const SPRID_HAIR_W      = 11600;
export const SPRID_BODYARMOR_W = 11800;
export const SPRID_BERK_W      = 12100;
export const SPRID_LEGG_W      = 12300;
export const SPRID_BOOT_W      = 12500;
export const SPRID_MANTLE_W    = 12600;
export const SPRID_HEAD_W      = 12800;
export const SPRID_WEAPON_W    = 13000;
export const SPRID_SHIELD_W    = 16500;

// ── Stride (sprite slots per group) per slot type ────────────────

export const WEAPON_STRIDE = 64;  // 64 sprites per weapon type (8 dirs * 8 actions)
export const SHIELD_STRIDE = 8;   // 8 sprites per shield type
export const EQUIP_STRIDE  = 15;  // 15 sprites per armor/helm/mantle/boot/leg type

// ── Equipment slot type ──────────────────────────────────────────

export type EquipSlot =
	| 'weapon'
	| 'shield'
	| 'bodyArmor'
	| 'armArmor'
	| 'leggings'
	| 'boots'
	| 'mantle'
	| 'helm';

// ── Equipment item definition ────────────────────────────────────

export interface EquipItemDef {
	pakName: string;     // PAK file to load (without .pak extension)
	name: string;        // Display name in dropdown
	slot: EquipSlot;     // Equipment slot
	group: number;       // Group index within the slot
	sprCount: number;    // Number of sprites in the PAK
}

// ── Helpers ──────────────────────────────────────────────────────

/** Get base sprite ID for a slot. */
export function getSlotBase(slot: EquipSlot, isFemale: boolean): number {
	const f = isFemale ? 10000 : 0;
	switch (slot) {
		case 'weapon':    return SPRID_WEAPON_M + f;
		case 'shield':    return SPRID_SHIELD_M + f;
		case 'bodyArmor': return SPRID_BODYARMOR_M + f;
		case 'armArmor':  return SPRID_BERK_M + f;
		case 'leggings':  return SPRID_LEGG_M + f;
		case 'boots':     return SPRID_BOOT_M + f;
		case 'mantle':    return SPRID_MANTLE_M + f;
		case 'helm':      return SPRID_HEAD_M + f;
	}
}

/** Get stride for a slot. */
export function getSlotStride(slot: EquipSlot): number {
	if (slot === 'weapon') return WEAPON_STRIDE;
	if (slot === 'shield') return SHIELD_STRIDE;
	return EQUIP_STRIDE;
}

/**
 * Compute the charCache base sprite index for an equipment item.
 * The final per-frame index adds actionOffset (for non-weapon)
 * or actionOffset*8+(dir-1) (for weapon).
 */
export function getEquipBaseIndex(slot: EquipSlot, group: number, isFemale: boolean): number {
	return getSlotBase(slot, isFemale) + group * getSlotStride(slot);
}

// ── Male equipment definitions ───────────────────────────────────

export const MALE_EQUIPMENT: EquipItemDef[] = [
	// ── Weapons ──────────────────────────────────────────────────
	{ pakName: 'Mswx',           name: 'Short Sword',     slot: 'weapon', group: 5,  sprCount: 56 },
	{ pakName: 'Msw2',           name: 'Battle Sword',    slot: 'weapon', group: 13, sprCount: 56 },
	{ pakName: 'Msw3',           name: 'Great Sword',     slot: 'weapon', group: 14, sprCount: 56 },
	{ pakName: 'MStormBringer',  name: 'Storm Bringer',   slot: 'weapon', group: 15, sprCount: 56 },
	{ pakName: 'MDarkExec',      name: 'Dark Executor',   slot: 'weapon', group: 16, sprCount: 56 },
	{ pakName: 'MKlonessBlade',  name: 'Klonesse Blade',  slot: 'weapon', group: 17, sprCount: 56 },
	{ pakName: 'MDebastator',    name: 'Devastator',      slot: 'weapon', group: 19, sprCount: 56 },
	{ pakName: 'MAxe1',          name: 'Axe',             slot: 'weapon', group: 20, sprCount: 56 },
	{ pakName: 'MAxe3',          name: 'War Axe',         slot: 'weapon', group: 22, sprCount: 56 },
	{ pakName: 'MAxe5',          name: 'Great Axe',       slot: 'weapon', group: 24, sprCount: 56 },
	{ pakName: 'MHammer',        name: 'Hammer',          slot: 'weapon', group: 30, sprCount: 56 },
	{ pakName: 'MBHammer',       name: 'Battle Hammer',   slot: 'weapon', group: 31, sprCount: 56 },
	{ pakName: 'MStaff1',        name: 'Staff',           slot: 'weapon', group: 35, sprCount: 56 },
	{ pakName: 'MStaff2',        name: 'Magic Staff',     slot: 'weapon', group: 36, sprCount: 56 },
	{ pakName: 'MStaff3',        name: 'Wand',            slot: 'weapon', group: 37, sprCount: 56 },

	// ── Body Armor ───────────────────────────────────────────────
	{ pakName: 'MLarmor',   name: 'Leather Armor',   slot: 'bodyArmor', group: 1,  sprCount: 12 },
	{ pakName: 'MCMail',    name: 'Chain Mail',      slot: 'bodyArmor', group: 2,  sprCount: 12 },
	{ pakName: 'MSMail',    name: 'Scale Mail',      slot: 'bodyArmor', group: 3,  sprCount: 12 },
	{ pakName: 'MPMail',    name: 'Plate Mail',      slot: 'bodyArmor', group: 4,  sprCount: 12 },
	{ pakName: 'MTunic',    name: 'Tunic',           slot: 'bodyArmor', group: 5,  sprCount: 12 },
	{ pakName: 'MRobe1',    name: 'Robe',            slot: 'bodyArmor', group: 6,  sprCount: 12 },

	// ── Helms ────────────────────────────────────────────────────
	{ pakName: 'MHelm1',    name: 'Helm',            slot: 'helm', group: 1,  sprCount: 12 },
	{ pakName: 'MHelm2',    name: 'Great Helm',      slot: 'helm', group: 2,  sprCount: 12 },
	{ pakName: 'MHelm3',    name: 'Full Helm',       slot: 'helm', group: 3,  sprCount: 12 },
	{ pakName: 'MHelm4',    name: 'Horned Helm',     slot: 'helm', group: 4,  sprCount: 12 },

	// ── Mantles ──────────────────────────────────────────────────
	{ pakName: 'Mmantle01', name: 'Cape',            slot: 'mantle', group: 1, sprCount: 12 },
	{ pakName: 'Mmantle02', name: 'Cloak',           slot: 'mantle', group: 2, sprCount: 12 },
	{ pakName: 'Mmantle03', name: 'Mantle',          slot: 'mantle', group: 3, sprCount: 12 },
	{ pakName: 'Mmantle04', name: 'Shroud',          slot: 'mantle', group: 4, sprCount: 12 },
	{ pakName: 'Mmantle05', name: 'Ancient Cape',    slot: 'mantle', group: 5, sprCount: 12 },
	{ pakName: 'Mmantle06', name: 'Royal Mantle',    slot: 'mantle', group: 6, sprCount: 12 },

	// ── Arm Armor ────────────────────────────────────────────────
	{ pakName: 'MShirt',    name: 'Shirt',           slot: 'armArmor', group: 1, sprCount: 12 },
	{ pakName: 'MHauberk',  name: 'Hauberk',         slot: 'armArmor', group: 2, sprCount: 12 },

	// ── Leggings ─────────────────────────────────────────────────
	{ pakName: 'MTrouser',  name: 'Trouser',         slot: 'leggings', group: 1, sprCount: 12 },
	{ pakName: 'MCHoses',   name: 'Hose',            slot: 'leggings', group: 3, sprCount: 12 },
	{ pakName: 'MLeggings', name: 'Leggings',        slot: 'leggings', group: 4, sprCount: 12 },

	// ── Boots ────────────────────────────────────────────────────
	{ pakName: 'MShoes',    name: 'Shoes',           slot: 'boots', group: 1, sprCount: 12 },
	{ pakName: 'MLBoots',   name: 'Long Boots',      slot: 'boots', group: 2, sprCount: 12 },
];

/** All equipment slots that have dropdown items. */
export const EQUIP_SLOTS: { slot: EquipSlot; label: string }[] = [
	{ slot: 'weapon',    label: 'Weapon' },
	{ slot: 'bodyArmor', label: 'Armor' },
	{ slot: 'helm',      label: 'Helm' },
	{ slot: 'mantle',    label: 'Cape' },
	{ slot: 'armArmor',  label: 'Arms' },
	{ slot: 'leggings',  label: 'Legs' },
	{ slot: 'boots',     label: 'Boots' },
];
