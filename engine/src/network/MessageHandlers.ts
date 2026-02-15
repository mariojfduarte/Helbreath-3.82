/**
 * MessageHandlers — Network message dispatch skeleton.
 * Mirrors C++ NetworkMessages_*.cpp handler groups.
 *
 * Each handler group processes messages from the server:
 *   - Motion: entity movement, position updates
 *   - Notify: game events (HP, EXP, items, effects, etc.)
 *   - Common: action responses
 *   - Log: login/account responses
 *   - InitData: character data, item configs
 *
 * Phase 6: dispatch skeleton with logging stubs.
 * Later phases will implement each handler's logic.
 */

import { BinaryReader } from '../utils/BinaryReader';
import { MessageCodec } from './MessageCodec';
import {
	MSGID_RESPONSE_MOTION,
	MSGID_EVENT_MOTION,
	MSGID_EVENT_COMMON,
	MSGID_NOTIFY,
	MSGID_RESPONSE_LOG,
	MSGID_RESPONSE_ENTERGAME,
	MSGID_RESPONSE_INITDATA,
	MSGID_ITEMCONFIGURATIONCONTENTS,
	MSGID_PLAYERITEMLISTCONTENTS,
	MSGID_PLAYERCHARACTERCONTENTS,
	MSGID_COMMAND_CHECKCONNECTION,
	MSGID_RESPONSE_PANNING,
} from './NetMessages';
import type { CGame } from '../core/CGame';

// ── Handler type ─────────────────────────────────────────────────

type MsgHandler = (game: CGame, data: Uint8Array, reader: BinaryReader) => void;

// ── Handler registry ─────────────────────────────────────────────

const handlers = new Map<number, MsgHandler>();

function register(msgId: number, handler: MsgHandler): void {
	handlers.set(msgId, handler);
}

// ── Dispatch ─────────────────────────────────────────────────────

/**
 * Process a received network message.
 * Parses the 4-byte message ID and dispatches to the registered handler.
 */
export function handleMessage(game: CGame, data: Uint8Array): void {
	if (data.length < 4) return;

	const { msgId, reader } = MessageCodec.parseMessage(data);
	const handler = handlers.get(msgId);

	if (handler) {
		handler(game, data, reader);
	} else {
		console.warn(`[Net] Unhandled message: 0x${msgId.toString(16).toUpperCase()}`);
	}
}

// ── Motion handlers ──────────────────────────────────────────────

register(MSGID_RESPONSE_MOTION, (_game, _data, _reader) => {
	// Phase 6 stub: server confirms/rejects player movement
	// Will update player position and reconcile with prediction
});

register(MSGID_EVENT_MOTION, (_game, _data, _reader) => {
	// Phase 6 stub: other entity movement events
	// Will create/update/remove entities in CMapData viewport
});

// ── Common event handlers ────────────────────────────────────────

register(MSGID_EVENT_COMMON, (_game, _data, _reader) => {
	// Phase 6 stub: common game events (items, magic, skills, etc.)
	// Will dispatch on sub-type (DEF_COMMONTYPE_*)
});

// ── Notification handlers ────────────────────────────────────────

register(MSGID_NOTIFY, (_game, _data, _reader) => {
	// Phase 6 stub: game notifications (HP, EXP, level up, etc.)
	// Will dispatch on notify sub-type (DEF_NOTIFY_*)
});

// ── Login/Account handlers ───────────────────────────────────────

register(MSGID_RESPONSE_LOG, (_game, _data, _reader) => {
	// Phase 6 stub: login response (character list, reject, etc.)
});

register(MSGID_RESPONSE_ENTERGAME, (_game, _data, _reader) => {
	// Phase 6 stub: enter game response (confirm, reject, force disconnect)
});

// ── Init data handlers ───────────────────────────────────────────

register(MSGID_RESPONSE_INITDATA, (_game, _data, _reader) => {
	// Phase 6 stub: initial game data (map, entities, time of day)
});

register(MSGID_ITEMCONFIGURATIONCONTENTS, (_game, _data, _reader) => {
	// Phase 6 stub: item definition database
});

register(MSGID_PLAYERITEMLISTCONTENTS, (_game, _data, _reader) => {
	// Phase 6 stub: player inventory contents
});

register(MSGID_PLAYERCHARACTERCONTENTS, (_game, _data, _reader) => {
	// Phase 6 stub: player character stats and appearance
});

// ── Connection handlers ──────────────────────────────────────────

register(MSGID_COMMAND_CHECKCONNECTION, (_game, _data, _reader) => {
	// Heartbeat — no action needed, just acknowledges connection is alive
});

register(MSGID_RESPONSE_PANNING, (_game, _data, _reader) => {
	// Phase 6 stub: panning/camera response from server
});
