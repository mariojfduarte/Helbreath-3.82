/**
 * MonsterDefs — Monster PAK file mappings and definitions.
 * Mirrors C++ MakeSprite calls for DEF_SPRID_MOB from Game.cpp.
 *
 * Each entry: [pakName, ownerType, displayName, spriteCount]
 * ownerType = server entity type (10=Slime, 11=Skeleton, etc.)
 * spriteCount = number of sprites in the PAK (40=full mob, 8=NPC)
 */

export interface MonsterDef {
	pakName: string;
	ownerType: number;
	name: string;
	spriteCount: number;
}

export const MONSTER_DEFS: MonsterDef[] = [
	{ pakName: 'slm',            ownerType: 10, name: 'Slime',            spriteCount: 40 },
	{ pakName: 'ske',            ownerType: 11, name: 'Skeleton',         spriteCount: 40 },
	{ pakName: 'Gol',            ownerType: 12, name: 'Stone Golem',      spriteCount: 40 },
	{ pakName: 'Cyc',            ownerType: 13, name: 'Cyclops',          spriteCount: 40 },
	{ pakName: 'Orc',            ownerType: 14, name: 'Orc',              spriteCount: 40 },
	{ pakName: 'Shopkpr',        ownerType: 15, name: 'Shopkeeper',       spriteCount: 8 },
	{ pakName: 'Ant',            ownerType: 16, name: 'Giant Ant',        spriteCount: 40 },
	{ pakName: 'Scp',            ownerType: 17, name: 'Scorpion',         spriteCount: 40 },
	{ pakName: 'Zom',            ownerType: 18, name: 'Zombie',           spriteCount: 40 },
	{ pakName: 'Gandlf',         ownerType: 19, name: 'Gandalf',          spriteCount: 8 },
	{ pakName: 'Howard',         ownerType: 20, name: 'Howard',           spriteCount: 8 },
	{ pakName: 'Guard',          ownerType: 21, name: 'Guard',            spriteCount: 40 },
	{ pakName: 'Amp',            ownerType: 22, name: 'Amphis',           spriteCount: 40 },
	{ pakName: 'Cla',            ownerType: 23, name: 'Clay Golem',       spriteCount: 40 },
	{ pakName: 'tom',            ownerType: 24, name: 'Tom',              spriteCount: 8 },
	{ pakName: 'William',        ownerType: 25, name: 'William',          spriteCount: 8 },
	{ pakName: 'Kennedy',        ownerType: 26, name: 'Kennedy',          spriteCount: 8 },
	{ pakName: 'Helb',           ownerType: 27, name: 'Hellbound',        spriteCount: 40 },
	{ pakName: 'Troll',          ownerType: 28, name: 'Troll',            spriteCount: 40 },
	{ pakName: 'Orge',           ownerType: 29, name: 'Ogre',             spriteCount: 40 },
	{ pakName: 'Liche',          ownerType: 30, name: 'Liche',            spriteCount: 40 },
	{ pakName: 'Demon',          ownerType: 31, name: 'Demon',            spriteCount: 40 },
	{ pakName: 'Unicorn',        ownerType: 32, name: 'Unicorn',          spriteCount: 40 },
	{ pakName: 'WereWolf',       ownerType: 33, name: 'WereWolf',         spriteCount: 40 },
	{ pakName: 'Dummy',          ownerType: 34, name: 'Dummy',            spriteCount: 40 },
	{ pakName: 'Stalker',        ownerType: 48, name: 'Stalker',          spriteCount: 40 },
	{ pakName: 'Hellclaw',       ownerType: 49, name: 'Hellclaw',         spriteCount: 40 },
	{ pakName: 'Tigerworm',      ownerType: 50, name: 'Tigerworm',        spriteCount: 40 },
	{ pakName: 'Catapult',       ownerType: 51, name: 'Catapult',         spriteCount: 40 },
	{ pakName: 'Gagoyle',        ownerType: 52, name: 'Gargoyle',         spriteCount: 40 },
	{ pakName: 'Beholder',       ownerType: 53, name: 'Beholder',         spriteCount: 40 },
	{ pakName: 'DarkElf',        ownerType: 54, name: 'Dark Elf',         spriteCount: 40 },
	{ pakName: 'Bunny',          ownerType: 55, name: 'Bunny',            spriteCount: 40 },
	{ pakName: 'Cat',            ownerType: 56, name: 'Cat',              spriteCount: 40 },
	{ pakName: 'GiantFrog',      ownerType: 57, name: 'Giant Frog',       spriteCount: 40 },
	{ pakName: 'MTGiant',        ownerType: 58, name: 'Mountain Giant',   spriteCount: 40 },
	{ pakName: 'Ettin',          ownerType: 59, name: 'Ettin',            spriteCount: 40 },
	{ pakName: 'CanPlant',       ownerType: 60, name: 'Cannibal Plant',   spriteCount: 40 },
	{ pakName: 'Rudolph',        ownerType: 61, name: 'Rudolph',          spriteCount: 40 },
	{ pakName: 'DireBoar',       ownerType: 62, name: 'Dire Boar',        spriteCount: 40 },
	{ pakName: 'frost',          ownerType: 63, name: 'Frost',            spriteCount: 40 },
	{ pakName: 'IceGolem',       ownerType: 65, name: 'Ice Golem',        spriteCount: 40 },
	{ pakName: 'Wyvern',         ownerType: 66, name: 'Wyvern',           spriteCount: 24 },
	{ pakName: 'Barlog',         ownerType: 70, name: 'Barlog',           spriteCount: 40 },
	{ pakName: 'Centaurus',      ownerType: 71, name: 'Centaurus',        spriteCount: 40 },
	{ pakName: 'ClawTurtle',     ownerType: 72, name: 'Claw Turtle',      spriteCount: 40 },
	{ pakName: 'FireWyvern',     ownerType: 73, name: 'Fire Wyvern',      spriteCount: 24 },
	{ pakName: 'GiantCrayfish',  ownerType: 74, name: 'Giant Crayfish',   spriteCount: 40 },
	{ pakName: 'GiantLizard',    ownerType: 75, name: 'Giant Lizard',     spriteCount: 40 },
	{ pakName: 'GiantPlant',     ownerType: 76, name: 'Giant Plant',      spriteCount: 40 },
	{ pakName: 'MasterMageOrc',  ownerType: 77, name: 'MasterMage Orc',   spriteCount: 40 },
	{ pakName: 'Minotaurs',      ownerType: 78, name: 'Minotaur',         spriteCount: 40 },
	{ pakName: 'Nizie',          ownerType: 79, name: 'Nizie',            spriteCount: 40 },
	{ pakName: 'Tentocle',       ownerType: 80, name: 'Tentocle',         spriteCount: 40 },
	{ pakName: 'yspro',          ownerType: 81, name: 'Abaddon',          spriteCount: 32 },
	{ pakName: 'Babarian',       ownerType: 88, name: 'Barbarian',        spriteCount: 40 },
];
