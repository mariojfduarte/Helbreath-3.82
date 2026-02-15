/**
 * MessageCodec — Binary message encryption/decryption.
 * Mirrors C++ XOR encryption from Sources/Client/XSocket.cpp.
 *
 * Wire format: [key: 1 byte][size: 2 bytes LE][payload: size bytes]
 *
 * Encryption (when key != 0):
 *   For each byte i in payload:
 *     buf[i] += (i ^ key)
 *     buf[i] ^= (key ^ (size - i))
 *
 * Decryption (reverse):
 *     buf[i] ^= (key ^ (size - i))
 *     buf[i] -= (i ^ key)
 */

import { BinaryReader } from '../utils/BinaryReader';

export class MessageCodec {
	/**
	 * Encrypt payload bytes in-place.
	 * Mirrors C++ iSendMsg encryption loop.
	 */
	static encrypt(buf: Uint8Array, offset: number, size: number, key: number): void {
		for (let i = 0; i < size; i++) {
			buf[offset + i] = (buf[offset + i] + (i ^ key)) & 0xFF;
			buf[offset + i] = (buf[offset + i] ^ (key ^ (size - i))) & 0xFF;
		}
	}

	/**
	 * Decrypt payload bytes in-place.
	 * Mirrors C++ pGetRcvDataPointer decryption loop.
	 */
	static decrypt(buf: Uint8Array, offset: number, size: number, key: number): void {
		for (let i = 0; i < size; i++) {
			buf[offset + i] = (buf[offset + i] ^ (key ^ (size - i))) & 0xFF;
			buf[offset + i] = (buf[offset + i] - (i ^ key)) & 0xFF;
		}
	}

	/**
	 * Build a message buffer with header + payload.
	 * @param msgId 4-byte message ID (written at start of payload)
	 * @param key Encryption key (0 = no encryption)
	 * @param payloadWriter Callback to write additional payload after msgId
	 * @returns Complete message buffer ready for XSocket.iSendMsg()
	 */
	static buildMessage(
		msgId: number,
		payloadWriter?: (view: DataView, offset: number) => number,
	): Uint8Array {
		// Estimate size: 4 bytes for msgId + writer content
		const tempBuf = new ArrayBuffer(4096);
		const tempView = new DataView(tempBuf);

		// Write message ID (4 bytes, little-endian)
		tempView.setUint32(0, msgId, true);

		let payloadSize = 4;
		if (payloadWriter) {
			payloadSize += payloadWriter(tempView, 4);
		}

		// Copy to exact-size buffer
		return new Uint8Array(tempBuf, 0, payloadSize);
	}

	/**
	 * Parse a received message: extract the 4-byte message ID and
	 * return a BinaryReader positioned after it.
	 */
	static parseMessage(data: Uint8Array): { msgId: number; reader: BinaryReader } {
		const reader = new BinaryReader(data.buffer, data.byteOffset);
		const msgId = reader.readUint32();
		return { msgId, reader };
	}
}
