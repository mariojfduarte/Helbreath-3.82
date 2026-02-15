/**
 * InputManager — Frame-based keyboard and mouse input singleton.
 * Mirrors C++ InputManager from Sources/Client/InputManager.h/.cpp.
 *
 * Tracks down/pressed/released per frame. Call beginFrame() once per frame
 * to reset pressed/released flags before processing new events.
 *
 * Uses string key names (KeyboardEvent.key.toLowerCase()) instead of
 * Win32 virtual-key codes. Mouse buttons: 0 = left, 2 = right.
 */

export class InputManager {
	private static s_instance: InputManager | null = null;

	static get(): InputManager {
		if (!InputManager.s_instance) {
			InputManager.s_instance = new InputManager();
		}
		return InputManager.s_instance;
	}

	// ── Keyboard state ────────────────────────────────────────────

	private m_keyDown = new Set<string>();
	private m_keyPressed = new Set<string>();
	private m_keyReleased = new Set<string>();

	// ── Mouse state ───────────────────────────────────────────────

	private m_mouseX = 0;
	private m_mouseY = 0;
	private m_wheelDelta = 0;

	private m_leftDown = false;
	private m_rightDown = false;
	private m_leftPressed = false;
	private m_rightPressed = false;
	private m_leftReleased = false;
	private m_rightReleased = false;

	// ── Modifier cache ────────────────────────────────────────────

	private m_shiftDown = false;
	private m_ctrlDown = false;
	private m_altDown = false;

	// ── Active flag ───────────────────────────────────────────────

	private m_active = true;

	// ── Initialization ────────────────────────────────────────────

	/**
	 * Attach DOM event listeners to the given element (usually the canvas
	 * or document). Call once during CGame.bInit().
	 */
	initialize(target: HTMLElement | Document = document): void {
		target.addEventListener('keydown', this.onKeyDown);
		target.addEventListener('keyup', this.onKeyUp);
		target.addEventListener('mousemove', this.onMouseMove);
		target.addEventListener('mousedown', this.onMouseDown);
		target.addEventListener('mouseup', this.onMouseUp);
		target.addEventListener('wheel', this.onWheel, { passive: false });
		target.addEventListener('contextmenu', (e) => e.preventDefault());

		// Track window blur to reset all keys (prevents sticky keys)
		window.addEventListener('blur', this.onBlur);
	}

	setActive(active: boolean): void {
		this.m_active = active;
	}

	/** Reset per-frame pressed/released flags. Call once per frame. */
	beginFrame(): void {
		this.m_keyPressed.clear();
		this.m_keyReleased.clear();
		this.m_leftPressed = false;
		this.m_rightPressed = false;
		this.m_leftReleased = false;
		this.m_rightReleased = false;
		this.m_wheelDelta = 0;
	}

	// ── Keyboard queries ──────────────────────────────────────────

	/** True while the key is held down. */
	isKeyDown(key: string): boolean {
		return this.m_keyDown.has(key.toLowerCase());
	}

	/** True only on the frame the key was first pressed. */
	isKeyPressed(key: string): boolean {
		return this.m_keyPressed.has(key.toLowerCase());
	}

	/** True only on the frame the key was released. */
	isKeyReleased(key: string): boolean {
		return this.m_keyReleased.has(key.toLowerCase());
	}

	/** Like isKeyPressed but consumes the event so subsequent checks return false. */
	consumeKeyPressed(key: string): boolean {
		const k = key.toLowerCase();
		if (this.m_keyPressed.has(k)) {
			this.m_keyPressed.delete(k);
			return true;
		}
		return false;
	}

	clearKeyPressed(key: string): void {
		this.m_keyPressed.delete(key.toLowerCase());
	}

	clearAllKeys(): void {
		this.m_keyDown.clear();
		this.m_keyPressed.clear();
		this.m_keyReleased.clear();
		this.m_shiftDown = false;
		this.m_ctrlDown = false;
		this.m_altDown = false;
	}

	// ── Modifier queries ──────────────────────────────────────────

	isShiftDown(): boolean { return this.m_shiftDown; }
	isCtrlDown(): boolean { return this.m_ctrlDown; }
	isAltDown(): boolean { return this.m_altDown; }

	// ── Special key shortcuts (mirrors C++ convenience methods) ───

	isEnterPressed(): boolean { return this.isKeyPressed('enter'); }
	isEscPressed(): boolean { return this.isKeyPressed('escape'); }

	// ── Mouse queries ─────────────────────────────────────────────

	getMouseX(): number { return this.m_mouseX; }
	getMouseY(): number { return this.m_mouseY; }
	getWheelDelta(): number { return this.m_wheelDelta; }

	consumeWheelDelta(): number {
		const d = this.m_wheelDelta;
		this.m_wheelDelta = 0;
		return d;
	}

	setMousePosition(x: number, y: number): void {
		this.m_mouseX = x;
		this.m_mouseY = y;
	}

	isLeftMouseDown(): boolean { return this.m_leftDown; }
	isLeftMousePressed(): boolean { return this.m_leftPressed; }
	isLeftMouseReleased(): boolean { return this.m_leftReleased; }

	isRightMouseDown(): boolean { return this.m_rightDown; }
	isRightMousePressed(): boolean { return this.m_rightPressed; }
	isRightMouseReleased(): boolean { return this.m_rightReleased; }

	// ── Legacy state (mirrors C++ GetLegacyState) ─────────────────

	getLegacyState(): { x: number; y: number; z: number; lb: number; rb: number } {
		return {
			x: this.m_mouseX,
			y: this.m_mouseY,
			z: this.m_wheelDelta,
			lb: this.m_leftDown ? 1 : 0,
			rb: this.m_rightDown ? 1 : 0,
		};
	}

	// ── DOM event handlers (arrow functions for correct `this`) ───

	private onKeyDown = (e: Event): void => {
		if (!this.m_active) return;
		const ke = e as KeyboardEvent;
		const key = ke.key.toLowerCase();

		this.m_shiftDown = ke.shiftKey;
		this.m_ctrlDown = ke.ctrlKey;
		this.m_altDown = ke.altKey;

		if (!this.m_keyDown.has(key)) {
			this.m_keyDown.add(key);
			this.m_keyPressed.add(key);
		}
	};

	private onKeyUp = (e: Event): void => {
		if (!this.m_active) return;
		const ke = e as KeyboardEvent;
		const key = ke.key.toLowerCase();

		this.m_shiftDown = ke.shiftKey;
		this.m_ctrlDown = ke.ctrlKey;
		this.m_altDown = ke.altKey;

		this.m_keyDown.delete(key);
		this.m_keyReleased.add(key);
	};

	private onMouseMove = (e: Event): void => {
		if (!this.m_active) return;
		const me = e as MouseEvent;
		this.m_mouseX = me.offsetX;
		this.m_mouseY = me.offsetY;
	};

	private onMouseDown = (e: Event): void => {
		if (!this.m_active) return;
		const me = e as MouseEvent;
		if (me.button === 0) { this.m_leftDown = true; this.m_leftPressed = true; }
		if (me.button === 2) { this.m_rightDown = true; this.m_rightPressed = true; }
	};

	private onMouseUp = (e: Event): void => {
		if (!this.m_active) return;
		const me = e as MouseEvent;
		if (me.button === 0) { this.m_leftDown = false; this.m_leftReleased = true; }
		if (me.button === 2) { this.m_rightDown = false; this.m_rightReleased = true; }
	};

	private onWheel = (e: Event): void => {
		if (!this.m_active) return;
		const we = e as WheelEvent;
		we.preventDefault();
		this.m_wheelDelta += we.deltaY > 0 ? -1 : we.deltaY < 0 ? 1 : 0;
	};

	private onBlur = (): void => {
		this.clearAllKeys();
		this.m_leftDown = false;
		this.m_rightDown = false;
	};
}
