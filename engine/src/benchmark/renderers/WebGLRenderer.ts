/**
 * WebGLRenderer — implements IRenderer using raw WebGL 2 with custom shaders.
 *
 * This gives full control over the blending pipeline. Each blend mode from
 * the original DDrawSprite is replicated exactly via GLSL fragment shaders.
 *
 * Uses a sprite batcher to minimize draw calls: quads are accumulated into
 * a vertex buffer and flushed when the blend mode or texture changes.
 *
 * Strengths: Custom shaders replicate exact C++ blend math, GPU batching.
 * Weaknesses: More boilerplate, manual resource management.
 */

import {
	IRenderer,
	DrawParams,
	SpriteTexture,
	Rect,
	OffscreenSurface,
} from './IRenderer';

// ── Shader sources ─────────────────────────────────────────────────

const VERT_SRC = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

uniform vec2 u_resolution;

out vec2 v_texCoord;

void main() {
	// Convert pixel coordinates to clip space (-1..+1)
	vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
	// Flip Y (screen space: top-left origin)
	gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
	v_texCoord = a_texCoord;
}
`;

/**
 * Fragment shader that handles all blend modes via uniforms:
 * - u_alpha: opacity (0..1)
 * - u_tint: RGB additive offset (-1..+1 normalized)
 * - u_mode: 0=normal, 1=shadow, 2=fade
 */
const FRAG_SRC = `#version 300 es
precision mediump float;

in vec2 v_texCoord;

uniform sampler2D u_texture;
uniform float u_alpha;
uniform vec3 u_tint;
uniform int u_mode;

out vec4 fragColor;

void main() {
	vec4 texel = texture(u_texture, v_texCoord);

	// Discard transparent pixels (color-key already applied to texture)
	if (texel.a < 0.01) discard;

	if (u_mode == 1) {
		// Shadow mode: output black with low alpha (darken destination)
		fragColor = vec4(0.0, 0.0, 0.0, 0.75 * texel.a);
		return;
	}

	if (u_mode == 2) {
		// Fade mode: similar to shadow but stronger
		fragColor = vec4(0.0, 0.0, 0.0, 0.85 * texel.a);
		return;
	}

	// Apply additive tint: clamp(src + tintOffset, 0, 1)
	vec3 tinted = clamp(texel.rgb + u_tint, 0.0, 1.0);

	// Standard alpha blending output.
	// Output non-premultiplied — the blend func is SRC_ALPHA, ONE_MINUS_SRC_ALPHA.
	float finalAlpha = texel.a * u_alpha;
	fragColor = vec4(tinted, finalAlpha);
}
`;

// ── Max batch size ─────────────────────────────────────────────────
const MAX_QUADS = 4096;
const FLOATS_PER_VERTEX = 4; // x, y, u, v
const VERTICES_PER_QUAD = 6; // 2 triangles
const FLOATS_PER_QUAD = VERTICES_PER_QUAD * FLOATS_PER_VERTEX;

// ── Implementation ─────────────────────────────────────────────────

export class WebGLRenderer implements IRenderer {
	readonly name = 'WebGL';

	private gl!: WebGL2RenderingContext;
	private program!: WebGLProgram;
	private width = 0;
	private height = 0;

	// Uniforms
	private uResolution!: WebGLUniformLocation;
	private uTexture!: WebGLUniformLocation;
	private uAlpha!: WebGLUniformLocation;
	private uTint!: WebGLUniformLocation;
	private uMode!: WebGLUniformLocation;

	// Vertex buffer
	private vao!: WebGLVertexArrayObject;
	private vbo!: WebGLBuffer;
	private vertexData = new Float32Array(MAX_QUADS * FLOATS_PER_QUAD);
	private quadCount = 0;

	// Current batch state
	private currentTexture: WebGLTexture | null = null;
	private currentAlpha = 1.0;
	private currentTint = [0, 0, 0];
	private currentMode = 0;

	// Texture cache
	private textureCache = new Map<HTMLCanvasElement, WebGLTexture>();

	// For offscreen rendering
	private activeFBO: WebGLFramebuffer | null = null;

	async init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void> {
		this.width = width;
		this.height = height;
		canvas.width = width;
		canvas.height = height;

		const gl = canvas.getContext('webgl2', {
			alpha: false,
			premultipliedAlpha: false,
			antialias: false,
			preserveDrawingBuffer: false,
		});
		if (!gl) throw new Error('WebGL 2 not supported');
		this.gl = gl;

		// Compile shaders
		this.program = this.createProgram(VERT_SRC, FRAG_SRC);
		gl.useProgram(this.program);

		// Get uniform locations
		this.uResolution = gl.getUniformLocation(this.program, 'u_resolution')!;
		this.uTexture = gl.getUniformLocation(this.program, 'u_texture')!;
		this.uAlpha = gl.getUniformLocation(this.program, 'u_alpha')!;
		this.uTint = gl.getUniformLocation(this.program, 'u_tint')!;
		this.uMode = gl.getUniformLocation(this.program, 'u_mode')!;

		// Set static uniforms
		gl.uniform2f(this.uResolution, width, height);
		gl.uniform1i(this.uTexture, 0);

		// Create VAO + VBO
		this.vao = gl.createVertexArray()!;
		gl.bindVertexArray(this.vao);

		this.vbo = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
		gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);

		// a_position (location 0): vec2
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 0);

		// a_texCoord (location 1): vec2
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, FLOATS_PER_VERTEX * 4, 2 * 4);

		gl.bindVertexArray(null);

		// Enable blending
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		// Viewport
		gl.viewport(0, 0, width, height);
	}

	beginFrame(): void {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.quadCount = 0;
		this.currentTexture = null;
	}

	endFrame(): void {
		this.flush();
	}

	drawSprite(
		texture: SpriteTexture,
		srcRect: Rect,
		dstX: number,
		dstY: number,
		params: DrawParams,
	): void {
		const glTex = this.getTexture(texture.canvas);
		const mode = params.isShadow ? 1 : params.isFade ? 2 : 0;
		const tintR = params.tintR / 255;
		const tintG = params.tintG / 255;
		const tintB = params.tintB / 255;

		// Flush if state changed
		if (
			glTex !== this.currentTexture ||
			params.alpha !== this.currentAlpha ||
			tintR !== this.currentTint[0] ||
			tintG !== this.currentTint[1] ||
			tintB !== this.currentTint[2] ||
			mode !== this.currentMode ||
			this.quadCount >= MAX_QUADS
		) {
			this.flush();
			this.currentTexture = glTex;
			this.currentAlpha = params.alpha;
			this.currentTint = [tintR, tintG, tintB];
			this.currentMode = mode;
		}

		// Compute UV coordinates
		const tw = texture.width;
		const th = texture.height;
		const u0 = srcRect.x / tw;
		const v0 = srcRect.y / th;
		const u1 = (srcRect.x + srcRect.width) / tw;
		const v1 = (srcRect.y + srcRect.height) / th;

		// Destination quad corners
		const x0 = dstX;
		const y0 = dstY;
		const x1 = dstX + srcRect.width;
		const y1 = dstY + srcRect.height;

		// Write 6 vertices (2 triangles) into the batch buffer
		const offset = this.quadCount * FLOATS_PER_QUAD;
		const d = this.vertexData;

		// Triangle 1: top-left, top-right, bottom-left
		d[offset]      = x0; d[offset + 1]  = y0; d[offset + 2]  = u0; d[offset + 3]  = v0;
		d[offset + 4]  = x1; d[offset + 5]  = y0; d[offset + 6]  = u1; d[offset + 7]  = v0;
		d[offset + 8]  = x0; d[offset + 9]  = y1; d[offset + 10] = u0; d[offset + 11] = v1;

		// Triangle 2: top-right, bottom-right, bottom-left
		d[offset + 12] = x1; d[offset + 13] = y0; d[offset + 14] = u1; d[offset + 15] = v0;
		d[offset + 16] = x1; d[offset + 17] = y1; d[offset + 18] = u1; d[offset + 19] = v1;
		d[offset + 20] = x0; d[offset + 21] = y1; d[offset + 22] = u0; d[offset + 23] = v1;

		this.quadCount++;
	}

	private flush(): void {
		if (this.quadCount === 0 || !this.currentTexture) return;

		const gl = this.gl;

		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);

		// Bind texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.currentTexture);

		// Set uniforms
		gl.uniform1f(this.uAlpha, this.currentAlpha);
		gl.uniform3f(this.uTint, this.currentTint[0], this.currentTint[1], this.currentTint[2]);
		gl.uniform1i(this.uMode, this.currentMode);

		// Upload vertex data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData, 0, this.quadCount * FLOATS_PER_QUAD);

		// Draw
		gl.drawArrays(gl.TRIANGLES, 0, this.quadCount * VERTICES_PER_QUAD);

		gl.bindVertexArray(null);
		this.quadCount = 0;
	}

	private getTexture(canvas: HTMLCanvasElement): WebGLTexture {
		let tex = this.textureCache.get(canvas);
		if (!tex) {
			const gl = this.gl;
			tex = gl.createTexture()!;
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
			this.textureCache.set(canvas, tex);
		}
		return tex;
	}

	createOffscreenSurface(width: number, height: number): OffscreenSurface {
		const gl = this.gl;

		const fbo = gl.createFramebuffer()!;
		const tex = gl.createTexture()!;

		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return { width, height, _handle: { fbo, tex } };
	}

	drawToSurface(surface: OffscreenSurface, callback: () => void): void {
		const gl = this.gl;
		const handle = surface._handle as { fbo: WebGLFramebuffer; tex: WebGLTexture };

		this.flush();

		const prevFBO = this.activeFBO;
		this.activeFBO = handle.fbo;

		gl.bindFramebuffer(gl.FRAMEBUFFER, handle.fbo);
		gl.viewport(0, 0, surface.width, surface.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// Update resolution uniform for this surface
		gl.useProgram(this.program);
		gl.uniform2f(this.uResolution, surface.width, surface.height);

		callback();

		this.flush();

		// Restore
		this.activeFBO = prevFBO;
		gl.bindFramebuffer(gl.FRAMEBUFFER, prevFBO);
		gl.viewport(0, 0, this.width, this.height);
		gl.uniform2f(this.uResolution, this.width, this.height);
	}

	blitSurface(surface: OffscreenSurface, dstX: number, dstY: number): void {
		const handle = surface._handle as { fbo: WebGLFramebuffer; tex: WebGLTexture };

		// Flush any pending draws
		this.flush();

		const gl = this.gl;

		// Bind the surface texture and draw a full-surface quad
		this.currentTexture = handle.tex;
		this.currentAlpha = 1.0;
		this.currentTint = [0, 0, 0];
		this.currentMode = 0;

		const x0 = dstX;
		const y0 = dstY;
		const x1 = dstX + surface.width;
		const y1 = dstY + surface.height;

		// UV is flipped on Y because FBO renders upside-down
		const offset = 0;
		const d = this.vertexData;

		d[offset]      = x0; d[offset + 1]  = y0; d[offset + 2]  = 0; d[offset + 3]  = 1;
		d[offset + 4]  = x1; d[offset + 5]  = y0; d[offset + 6]  = 1; d[offset + 7]  = 1;
		d[offset + 8]  = x0; d[offset + 9]  = y1; d[offset + 10] = 0; d[offset + 11] = 0;

		d[offset + 12] = x1; d[offset + 13] = y0; d[offset + 14] = 1; d[offset + 15] = 1;
		d[offset + 16] = x1; d[offset + 17] = y1; d[offset + 18] = 1; d[offset + 19] = 0;
		d[offset + 20] = x0; d[offset + 21] = y1; d[offset + 22] = 0; d[offset + 23] = 0;

		this.quadCount = 1;

		gl.useProgram(this.program);
		gl.bindVertexArray(this.vao);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, handle.tex);
		gl.uniform1f(this.uAlpha, 1.0);
		gl.uniform3f(this.uTint, 0, 0, 0);
		gl.uniform1i(this.uMode, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, FLOATS_PER_QUAD);
		gl.drawArrays(gl.TRIANGLES, 0, VERTICES_PER_QUAD);

		gl.bindVertexArray(null);
		this.quadCount = 0;
		this.currentTexture = null;
	}

	destroy(): void {
		const gl = this.gl;
		for (const tex of this.textureCache.values()) {
			gl.deleteTexture(tex);
		}
		this.textureCache.clear();
		gl.deleteBuffer(this.vbo);
		gl.deleteVertexArray(this.vao);
		gl.deleteProgram(this.program);
	}

	// ── Shader compilation helpers ─────────────────────────────────

	private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
		const gl = this.gl;
		const vert = this.compileShader(gl.VERTEX_SHADER, vertSrc);
		const frag = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);

		const program = gl.createProgram()!;
		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const log = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			throw new Error(`Shader link failed: ${log}`);
		}

		gl.deleteShader(vert);
		gl.deleteShader(frag);
		return program;
	}

	private compileShader(type: number, source: string): WebGLShader {
		const gl = this.gl;
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const log = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error(`Shader compile failed: ${log}`);
		}

		return shader;
	}
}
