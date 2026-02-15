/**
 * BinaryReader — wraps DataView for sequential little-endian binary reads.
 * Mirrors the pattern used by C++ PAK/MAP/network parsers.
 */
export class BinaryReader {
	private view: DataView;
	private pos: number;

	constructor(buffer: ArrayBuffer, offset = 0) {
		this.view = new DataView(buffer);
		this.pos = offset;
	}

	get position(): number { return this.pos; }
	set position(v: number) { this.pos = v; }
	get byteLength(): number { return this.view.byteLength; }
	get remaining(): number { return this.view.byteLength - this.pos; }

	seek(offset: number): void { this.pos = offset; }
	skip(bytes: number): void { this.pos += bytes; }

	readUint8(): number {
		const v = this.view.getUint8(this.pos);
		this.pos += 1;
		return v;
	}

	readInt8(): number {
		const v = this.view.getInt8(this.pos);
		this.pos += 1;
		return v;
	}

	readUint16(): number {
		const v = this.view.getUint16(this.pos, true);
		this.pos += 2;
		return v;
	}

	readInt16(): number {
		const v = this.view.getInt16(this.pos, true);
		this.pos += 2;
		return v;
	}

	readUint32(): number {
		const v = this.view.getUint32(this.pos, true);
		this.pos += 4;
		return v;
	}

	readInt32(): number {
		const v = this.view.getInt32(this.pos, true);
		this.pos += 4;
		return v;
	}

	readFloat32(): number {
		const v = this.view.getFloat32(this.pos, true);
		this.pos += 4;
		return v;
	}

	readBytes(count: number): Uint8Array {
		const bytes = new Uint8Array(this.view.buffer, this.pos, count);
		this.pos += count;
		return new Uint8Array(bytes); // copy to avoid detached buffer issues
	}

	readString(length: number): string {
		const bytes = this.readBytes(length);
		// Trim null terminators
		let end = bytes.indexOf(0);
		if (end === -1) end = length;
		return new TextDecoder('ascii').decode(bytes.subarray(0, end));
	}

	/** Peek at a value without advancing position */
	peekUint32(offset?: number): number {
		return this.view.getUint32(offset ?? this.pos, true);
	}
}
