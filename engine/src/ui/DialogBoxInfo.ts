/**
 * DialogBoxInfo — Per-dialog position, size, and state data.
 * Mirrors C++ DialogBoxInfo struct.
 *
 * Each dialog slot has an info struct that tracks its screen position,
 * size, enabled state, and type-specific parameters.
 */

export class DialogBoxInfo {
	sX = 0;
	sY = 0;
	sSizeX = 0;
	sSizeY = 0;
	bIsEnabled = false;
	cType = 0;
	sV1 = 0;
	sV2 = 0;
	sV3 = 0;
	sV4 = 0;
	sV5 = 0;
	sV6 = 0;
	sV7 = 0;
	sV8 = 0;
	sV9 = 0;
	sV10 = 0;
	dwV1 = 0;
	sItemIndex = -1;
	cStr = '';

	reset(): void {
		this.bIsEnabled = false;
		this.cType = 0;
		this.sV1 = 0;
		this.sV2 = 0;
		this.sV3 = 0;
		this.sV4 = 0;
		this.sV5 = 0;
		this.sV6 = 0;
		this.sV7 = 0;
		this.sV8 = 0;
		this.sV9 = 0;
		this.sV10 = 0;
		this.dwV1 = 0;
		this.sItemIndex = -1;
		this.cStr = '';
	}
}
