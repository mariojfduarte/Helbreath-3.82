/**
 * HUD — Head-Up Display using original game sprites.
 * Mirrors C++ DialogBox_HudPanel from Sources/Client/DialogBox_HudPanel.cpp.
 *
 * Loads the icon panel sprite from GameDialog.pak (sprite index 6).
 * Draws the panel background (frame 14), HP/MP/SP gauge bars, and
 * icon buttons (Character, Inventory, Magic, Skill, Chat, System).
 *
 * The original HUD is 640px wide, positioned at the bottom of the screen.
 * HP/MP bars are at the left side, SP bar in the middle, icons on the right.
 */

import {
  Container,
  Sprite,
  Texture,
  BaseTexture,
  Rectangle,
  SCALE_MODES,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";
import { parsePak, decodeSpriteImage } from "../assets/pak-parser";
import { FrameTiming } from "../core/FrameTiming";

// ── Bar layout constants from C++ DialogBox_HudPanel.h ──────────

const HP_MP_BAR_WIDTH = 101;
const SP_BAR_WIDTH = 167;

const HP_BAR_X = 23;
const HP_BAR_Y = 437;
const MP_BAR_Y = 459;
const SP_BAR_X = 147;
const SP_BAR_Y = 434;

const PANEL_HEIGHT = 53;

// ── Player stats ─────────────────────────────────────────────────

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  sp: number;
  maxSp: number;
  exp: number;
  maxExp: number;
  level: number;
  name: string;
  mapName: string;
  posX: number;
  posY: number;
}

export function defaultPlayerStats(): PlayerStats {
  return {
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    sp: 50,
    maxSp: 50,
    exp: 0,
    maxExp: 1000,
    level: 1,
    name: "Player",
    mapName: "",
    posX: 0,
    posY: 0,
  };
}

// ── Frame data from PAK ──────────────────────────────────────────

interface HUDFrame {
  texture: Texture;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
}

// ── HUD class ────────────────────────────────────────────────────

export class HUD {
	private container: Container;
	private panelSprite: Sprite;
	private barGfx: Graphics;
	private infoText: Text;
	private stats: PlayerStats;

	// Sprite frames from GameDialog.pak sprite 6 (icon panel)
	private frames: HUDFrame[] = [];
	private loaded = false;

	// Panel position (bottom of screen)
	private panelX = 0;
	private panelY = 0;

	/** Width as a percentage of the screen (1-100). Default 100 = full width. */
	private widthPercent = 100;

  constructor(parent: Container) {
    this.container = new Container();
    parent.addChild(this.container);

    // Panel background sprite
    this.panelSprite = new Sprite(Texture.EMPTY);
    this.panelSprite.visible = false;
    this.container.addChild(this.panelSprite);

    // Bar overlay drawn on top of panel
    this.barGfx = new Graphics();
    this.container.addChild(this.barGfx);

    // Info text overlay (top-left)
    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: "#cccccc",
    });
    this.infoText = new Text("", style);
    this.container.addChild(this.infoText);

    this.stats = defaultPlayerStats();

    // Start loading the icon panel sprite
    this.loadPanelSprite();
  }

  // ── Load original sprites ────────────────────────────────────

  private async loadPanelSprite(): Promise<void> {
    try {
      // GameDialog.pak sprite index 6 = icon panel (DEF_SPRID_INTERFACE_ND_ICONPANNEL)
      let resp = await fetch("/sprites/GameDialog.pak");
      if (!resp.ok) resp = await fetch("/sprites/gamedialog.pak");
      if (!resp.ok) {
        console.warn("[HUD] GameDialog.pak not found, using fallback HUD");
        return;
      }

      const pak = parsePak(await resp.arrayBuffer());
      if (pak.sprites.length <= 6) {
        console.warn("[HUD] GameDialog.pak has too few sprites");
        return;
      }

      const sprite = pak.sprites[6]; // Icon panel sprite
      const decoded = await decodeSpriteImage(sprite);
      if (!decoded) {
        console.warn("[HUD] Failed to decode icon panel sprite");
        return;
      }

      const baseTex = BaseTexture.from(decoded.canvas, {
        scaleMode: SCALE_MODES.NEAREST,
      });
      const texW = decoded.width;
      const texH = decoded.height;

      this.frames = sprite.frames.map((f) => {
        const cx = Math.min(f.x, texW);
        const cy = Math.min(f.y, texH);
        const cw = Math.min(f.width, texW - cx);
        const ch = Math.min(f.height, texH - cy);
        return {
          texture:
            cw > 0 && ch > 0
              ? new Texture(baseTex, new Rectangle(cx, cy, cw, ch))
              : Texture.EMPTY,
          width: cw > 0 ? cw : 0,
          height: ch > 0 ? ch : 0,
          pivotX: f.pivotX,
          pivotY: f.pivotY,
        };
      });

      this.loaded = this.frames.length > 14;
      if (this.loaded) {
        console.log(`[HUD] Loaded icon panel: ${this.frames.length} frames`);
      }
    } catch (e) {
      console.warn("[HUD] Failed to load GameDialog.pak:", e);
    }
  }

  // ── Stats ────────────────────────────────────────────────────

	setStats(stats: Partial<PlayerStats>): void {
		Object.assign(this.stats, stats);
	}

	getStats(): PlayerStats {
		return this.stats;
	}

	/** Set HUD width as percentage of screen width (1-100). */
	setWidthPercent(pct: number): void {
		this.widthPercent = Math.max(1, Math.min(100, pct));
	}

	getWidthPercent(): number {
		return this.widthPercent;
	}

  // ── Draw ─────────────────────────────────────────────────────

  draw(screenW: number, screenH: number): void {
    this.barGfx.clear();

    if (this.loaded) {
      this.drawSpriteHUD(screenW, screenH);
    } else {
      this.drawFallbackHUD(screenW, screenH);
    }

    // Info text (top-left)
    const s = this.stats;
    this.infoText.x = 10;
    this.infoText.y = 10;
    this.infoText.text =
      `${s.mapName}  |  ${Math.round(s.posX)},${Math.round(s.posY)}  |  ` +
      `Lv.${s.level}  |  FPS: ${FrameTiming.getFPS()}`;
  }

  // ── Sprite-based HUD (original game art) ─────────────────────

  private drawSpriteHUD(screenW: number, _screenH: number): void {
    const s = this.stats;

    const panelFrame = this.frames[14];
    if (!panelFrame || panelFrame.texture === Texture.EMPTY) return;

    // Size panel by widthPercent, centered horizontally
    const panelW = Math.floor(screenW * this.widthPercent / 100);
    const scale = panelW / panelFrame.width;
    this.panelX = Math.floor((screenW - panelW) / 2);
    this.panelY = _screenH - Math.floor(panelFrame.height * scale);

    this.panelSprite.texture = panelFrame.texture;
    this.panelSprite.x = this.panelX;
    this.panelSprite.y = this.panelY;
    this.panelSprite.width = panelW;
    this.panelSprite.height = Math.floor(panelFrame.height * scale);
    this.panelSprite.visible = true;

    // All bar positions/sizes scaled to match
    const ofsX = this.panelX;
    const ofsY = this.panelY - Math.floor((480 - panelFrame.height) * scale);
    const barH = Math.max(4, Math.floor(8 * scale));

    const hpFill = s.maxHp > 0 ? Math.min(1, s.hp / s.maxHp) : 0;
    const mpFill = s.maxMp > 0 ? Math.min(1, s.mp / s.maxMp) : 0;
    const spFill = s.maxSp > 0 ? Math.min(1, s.sp / s.maxSp) : 0;

    // HP bar (red)
    this.barGfx.beginFill(0xcc2222);
    this.barGfx.drawRect(ofsX + Math.floor(HP_BAR_X * scale), ofsY + Math.floor(HP_BAR_Y * scale), Math.floor(HP_MP_BAR_WIDTH * scale) * hpFill, barH);
    this.barGfx.endFill();

    // MP bar (blue)
    this.barGfx.beginFill(0x2266cc);
    this.barGfx.drawRect(ofsX + Math.floor(HP_BAR_X * scale), ofsY + Math.floor(MP_BAR_Y * scale), Math.floor(HP_MP_BAR_WIDTH * scale) * mpFill, barH);
    this.barGfx.endFill();

    // SP bar (green)
    this.barGfx.beginFill(0x22aa44);
    this.barGfx.drawRect(ofsX + Math.floor(SP_BAR_X * scale), ofsY + Math.floor(SP_BAR_Y * scale), Math.floor(SP_BAR_WIDTH * scale) * spFill, barH);
    this.barGfx.endFill();

    // XP bar (thin bar at top of panel)
    const xpFill = s.maxExp > 0 ? s.exp / s.maxExp : 0;
    this.barGfx.beginFill(0xccaa00);
    this.barGfx.drawRect(ofsX + Math.floor(23 * scale), this.panelY, (panelW - Math.floor(46 * scale)) * xpFill, Math.max(2, Math.floor(2 * scale)));
    this.barGfx.endFill();
  }

  // ── Fallback HUD (no sprites loaded) ─────────────────────────

  private drawFallbackHUD(screenW: number, screenH: number): void {
    const s = this.stats;
    const barW = 150;
    const barH = 10;
    const gap = 4;
    const margin = 10;

    this.panelSprite.visible = false;

    let barY = screenH - margin - barH;

    // SP
    this.drawBar(margin, barY, barW, barH, s.sp, s.maxSp, 0x22aa44, 0x113322);
    barY -= barH + gap;
    // MP
    this.drawBar(margin, barY, barW, barH, s.mp, s.maxMp, 0x3366cc, 0x112244);
    barY -= barH + gap;
    // HP
    this.drawBar(margin, barY, barW, barH, s.hp, s.maxHp, 0xcc3333, 0x331111);

    // XP (bottom)
    const xpW = screenW - margin * 2;
    const xpFill = s.maxExp > 0 ? s.exp / s.maxExp : 0;
    this.barGfx.beginFill(0x222200);
    this.barGfx.drawRect(margin, screenH - 4, xpW, 4);
    this.barGfx.endFill();
    this.barGfx.beginFill(0xccaa00);
    this.barGfx.drawRect(margin, screenH - 4, xpW * xpFill, 4);
    this.barGfx.endFill();
  }

  private drawBar(
    x: number,
    y: number,
    w: number,
    h: number,
    val: number,
    max: number,
    fill: number,
    bg: number
  ): void {
    const ratio = max > 0 ? Math.min(1, val / max) : 0;
    this.barGfx.beginFill(bg);
    this.barGfx.drawRect(x, y, w, h);
    this.barGfx.endFill();
    this.barGfx.beginFill(fill);
    this.barGfx.drawRect(x, y, w * ratio, h);
    this.barGfx.endFill();
    this.barGfx.lineStyle(1, 0x444444, 0.5);
    this.barGfx.drawRect(x, y, w, h);
    this.barGfx.lineStyle(0);
  }

  setVisible(visible: boolean): void {
    this.container.visible = visible;
  }
}
