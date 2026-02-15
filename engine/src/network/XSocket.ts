/**
 * XSocket — WebSocket transport wrapper.
 * Mirrors C++ XSocket from Sources/Client/XSocket.h/.cpp.
 *
 * Replaces WinSock TCP with WebSocket binary messaging.
 * The original server uses raw TCP, so a TCP-to-WebSocket proxy is needed.
 *
 * Message format (both send and receive):
 *   [key: 1 byte][size: 2 bytes LE][payload: size bytes]
 *
 * The 3-byte header is added/parsed by this class. XOR encryption is
 * applied to the payload when key != 0 (handled by MessageCodec).
 */

import { MessageCodec } from './MessageCodec';

// ── Socket event constants (mirrors C++ DEF_XSOCKEVENT_*) ───────

export const DEF_XSOCKEVENT_CONNECTIONESTABLISH    = -122;
export const DEF_XSOCKEVENT_ONREAD                 = -124;
export const DEF_XSOCKEVENT_READCOMPLETE           = -125;
export const DEF_XSOCKEVENT_SOCKETCLOSED           = -127;
export const DEF_XSOCKEVENT_SOCKETERROR            = -129;
export const DEF_XSOCKEVENT_QUENEFULL              = -134;

// ── Block limit ──────────────────────────────────────────────────

export const DEF_XSOCKBLOCKLIMIT = 300;

// ── Callback type ────────────────────────────────────────────────

export type SocketEventCallback = (event: number, data?: ArrayBuffer) => void;

// ── XSocket ──────────────────────────────────────────────────────

export class XSocket {
	private ws: WebSocket | null = null;
	private onEvent: SocketEventCallback;

	/** Received message queue (binary ArrayBuffers). */
	private recvQueue: ArrayBuffer[] = [];

	m_bIsAvailable = false;

	constructor(onEvent: SocketEventCallback) {
		this.onEvent = onEvent;
	}

	// ── Connection ───────────────────────────────────────────────

	/**
	 * Connect to the WebSocket proxy.
	 * Mirrors C++ XSocket::bConnect().
	 * @param url WebSocket URL, e.g. "ws://localhost:8080"
	 */
	bConnect(url: string): boolean {
		try {
			this.ws = new WebSocket(url);
			this.ws.binaryType = 'arraybuffer';

			this.ws.onopen = () => {
				this.m_bIsAvailable = true;
				this.onEvent(DEF_XSOCKEVENT_CONNECTIONESTABLISH);
			};

			this.ws.onmessage = (ev: MessageEvent) => {
				if (ev.data instanceof ArrayBuffer) {
					this.recvQueue.push(ev.data);
					this.onEvent(DEF_XSOCKEVENT_READCOMPLETE, ev.data);
				}
			};

			this.ws.onclose = () => {
				this.m_bIsAvailable = false;
				this.onEvent(DEF_XSOCKEVENT_SOCKETCLOSED);
			};

			this.ws.onerror = () => {
				this.m_bIsAvailable = false;
				this.onEvent(DEF_XSOCKEVENT_SOCKETERROR);
			};

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Disconnect.
	 */
	disconnect(): void {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.m_bIsAvailable = false;
		this.recvQueue = [];
	}

	// ── Send ─────────────────────────────────────────────────────

	/**
	 * Send a message with optional XOR encryption.
	 * Mirrors C++ XSocket::iSendMsg().
	 *
	 * Builds the 3-byte header [key, sizeL, sizeH] and encrypts
	 * the payload if key != 0.
	 *
	 * @returns Bytes sent, or negative error code.
	 */
	iSendMsg(data: Uint8Array, key = 0): number {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return DEF_XSOCKEVENT_SOCKETERROR;
		}

		if (this.ws.bufferedAmount > DEF_XSOCKBLOCKLIMIT * 1024) {
			return DEF_XSOCKEVENT_QUENEFULL;
		}

		const size = data.length;
		const buf = new Uint8Array(3 + size);

		// 3-byte header
		buf[0] = key & 0xFF;
		buf[1] = size & 0xFF;
		buf[2] = (size >> 8) & 0xFF;

		// Copy payload
		buf.set(data, 3);

		// Encrypt if key != 0
		if (key !== 0) {
			MessageCodec.encrypt(buf, 3, size, key);
		}

		this.ws.send(buf.buffer);
		return 3 + size;
	}

	// ── Receive ──────────────────────────────────────────────────

	/**
	 * Get the next received message.
	 * Mirrors C++ XSocket::pGetRcvDataPointer().
	 *
	 * @returns { data, key } or null if no messages.
	 */
	pGetRcvDataPointer(): { data: Uint8Array; size: number; key: number } | null {
		const raw = this.recvQueue.shift();
		if (!raw || raw.byteLength < 3) return null;

		const view = new Uint8Array(raw);
		const key = view[0];
		const size = view[1] | (view[2] << 8);

		if (raw.byteLength < 3 + size) return null;

		const payload = new Uint8Array(raw, 3, size);

		// Decrypt if key != 0
		if (key !== 0) {
			MessageCodec.decrypt(payload, 0, size, key);
		}

		return { data: payload, size, key };
	}

	/**
	 * Check if there are pending received messages.
	 */
	hasData(): boolean {
		return this.recvQueue.length > 0;
	}

	/**
	 * Poll for received messages (non-blocking).
	 * Mirrors C++ XSocket::Poll(). WebSocket handles this via events,
	 * so this just returns the queue length.
	 */
	poll(): number {
		return this.recvQueue.length;
	}

	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}
}
