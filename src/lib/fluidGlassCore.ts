/*
 * Fluid Glass UI — canonical material core (Apache-2.0, © csuyincs-creator)
 * Extracted from the fluidglass-ui agent skill (references/fluid-glass-engine.js)
 * for React integration. The vertex/fragment shaders below are kept byte-identical
 * to the canonical assets; only the demo-page DOM binding was removed.
 */

export type QualityName = 'auto' | 'high' | 'balanced' | 'eco' | 'fallback';

export interface FluidCardConfig {
  key: string;
  label?: string;
  a: string;
  b: string;
  c: string;
  preset: string;
  speed: number;
  intensity: number;
  pointer: number;
  seed: number;
  surface: number;
  chart?: { enabled?: boolean };
}

export interface FluidQualityProfile {
  name: QualityName;
  fps: number;
  dpr: number;
}

const QUALITY_VALUES: QualityName[] = ['auto', 'high', 'balanced', 'eco', 'fallback'];

export const PRESETS: Record<string, { a: string; b: string; c: string }> = {
  cyan: { a: '#00e7d2', b: '#3cc8ff', c: '#075f68' },
  original: { a: '#ff3aa7', b: '#ff8050', c: '#a443ff' },
  klein: { a: '#3158ff', b: '#ff6531', c: '#20252e' },
  chrome: { a: '#eef2f3', b: '#6c7780', c: '#11171d' },
};

const clamp = (n: number, a: number, b: number): number => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : a;
};

const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function mixRgb(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return `rgb(${a.map((v, i) => Math.round((v + (b[i] - v) * t) * 255)).join(',')})`;
}

export interface MaterialTokens {
  surface: string;
  shade: string;
  shadeMid: string;
  shadeSoft: string;
  topGlow: string;
  bottomShade: string;
  text: string;
  title: string;
  muted: string;
  eyebrow: string;
  change: string;
  edge: string;
  light: number;
}

export function materialTokens(surface: number): MaterialTokens {
  const s = clamp(surface, 0, 1);
  const light = smoothstep(0.25, 0.46, s);
  return {
    surface: s.toFixed(3),
    shade: (0.48 * Math.pow(1 - s, 1.45)).toFixed(3),
    shadeMid: (0.3456 * Math.pow(1 - s, 1.45)).toFixed(3),
    shadeSoft: (0.1536 * Math.pow(1 - s, 1.45)).toFixed(3),
    topGlow: (0.035 * (1 - s)).toFixed(3),
    bottomShade: (0.1 * (1 - s)).toFixed(3),
    text: mixRgb('#f3fffb', '#16201d', light),
    title: mixRgb('#d8eee8', '#2b3632', light),
    muted: mixRgb('#8fa9a2', '#59635f', light),
    eyebrow: mixRgb('#82a69d', '#66716c', light),
    change: mixRgb('#819b94', '#59645f', light),
    edge: (0.1 + 0.22 * s).toFixed(3),
    light,
  };
}

export function qualityProfile(requested: string): FluidQualityProfile {
  const query = new URLSearchParams(location.search).get('fluid');
  if (query === 'fallback') return { name: 'fallback', fps: 0, dpr: 1 };
  if (query === 'eco') return { name: 'eco', fps: 24, dpr: Math.min(devicePixelRatio || 1, 1) };
  if (requested === 'fallback') return { name: 'fallback', fps: 0, dpr: 1 };
  if (requested === 'high') return { name: 'high', fps: 60, dpr: Math.min(devicePixelRatio || 1, 1.8) };
  if (requested === 'balanced') return { name: 'balanced', fps: 45, dpr: Math.min(devicePixelRatio || 1, 1.35) };
  if (requested === 'eco') return { name: 'eco', fps: 24, dpr: Math.min(devicePixelRatio || 1, 1) };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const lowCpu = (navigator.hardwareConcurrency || 8) <= 4;
  const lowMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;
  if (reduced || saveData || lowCpu || lowMemory <= 4) {
    return { name: 'eco', fps: reduced ? 15 : 24, dpr: Math.min(devicePixelRatio || 1, 1) };
  }
  return { name: 'balanced', fps: 45, dpr: Math.min(devicePixelRatio || 1, 1.35) };
}

export function surfaceLabel(value: number): string {
  const p = Math.round(value * 100);
  if (p === 0) return '0% · transparent';
  if (p < 20) return `${p}% · glass`;
  if (p < 55) return `${p}% · gray glass`;
  if (p < 100) return `${p}% · bright material`;
  return '100% · white';
}

const VERTEX_SHADER = `    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){
      v_uv=a_position*.5+.5;
      gl_Position=vec4(a_position,0.0,1.0);
    }
  
`;

const FRAGMENT_SHADER = `    precision highp float;
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform vec2 u_mouseVelocity;
    uniform float u_mouseMix;
    uniform float u_time;
    uniform float u_speed;
    uniform float u_intensity;
    uniform float u_pointer;
    uniform float u_seed;
    uniform float u_surfaceOpacity;
    uniform vec3 u_colorA;
    uniform vec3 u_colorB;
    uniform vec3 u_colorC;

    float hash(vec2 p){
      p=fract(p*vec2(123.34,456.21));
      p+=dot(p,p+45.32);
      return fract(p.x*p.y);
    }
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);
    }
    float fbm(vec2 p){
      float value=0.0;
      float amp=.53;
      mat2 rot=mat2(.80,-.60,.60,.80);
      for(int i=0;i<5;i++){
        value+=amp*noise(p);
        p=rot*p*2.02+vec2(17.13,9.27);
        amp*=.49;
      }
      return value;
    }
    float softBlob(vec2 p,vec2 center,float radius,float softness){
      return 1.0-smoothstep(radius-softness,radius+softness,length(p-center));
    }
    void main(){
      vec2 uv=v_uv;
      float aspect=u_resolution.x/max(1.0,u_resolution.y);
      vec2 p=(uv-.5)*vec2(aspect,1.0);
      vec2 mouse=(u_mouse-.5)*vec2(aspect,1.0);
      vec2 delta=p-mouse;
      float dist=length(delta);
      float mouseField=exp(-dist*dist*7.2)*u_mouseMix*u_pointer;
      vec2 normal=delta/max(dist,.035);
      vec2 tangent=vec2(-normal.y,normal.x);
      p+=normal*mouseField*.115+tangent*mouseField*(u_mouseVelocity.x-u_mouseVelocity.y)*.045;

      float t=u_time*u_speed;
      vec2 seedVec=vec2(u_seed*1.713,u_seed*.937);
      float w1=fbm(p*1.22+seedVec+vec2(t*.075,-t*.052));
      float w2=fbm(p*1.54-seedVec*.37+vec2(-t*.057,t*.064)+w1*.82);
      vec2 q=p+(vec2(w1,w2)-.5)*(.58*u_intensity);
      float broad=fbm(q*1.12+vec2(t*.041,-t*.033));
      float detail=fbm(q*2.18+vec2(-t*.083,t*.057)+broad*.95);
      float ribbon=.5+.5*sin(q.x*3.15+q.y*.76+detail*5.0+t*.25+u_seed);
      float colorMix=smoothstep(.16,.88,broad*.61+ribbon*.39);
      vec3 fluid=mix(u_colorA,u_colorB,colorMix);
      float shadow=smoothstep(.43,.84,detail*.69+(.5+.5*sin(q.y*4.2-q.x*.8-t*.17))*.31);
      fluid=mix(fluid,u_colorC,shadow*.74);

      float plume1=softBlob(p,vec2(aspect*.23+.12*sin(t*.08+u_seed),.16*cos(t*.11+u_seed)),.52,.38);
      float plume2=softBlob(p,vec2(aspect*.39+.10*cos(t*.07-u_seed),-.24+.11*sin(t*.09)),.43,.34);
      float haze=clamp(plume1*.72+plume2*.58,0.0,1.0);
      float reveal=smoothstep(.055,.735,uv.x+(.5-broad)*.27+.070*sin(uv.y*4.0+t*.12));
      reveal*=mix(.70,1.0,haze);
      reveal=clamp(reveal*u_intensity,0.0,1.0);

      float spec=pow(clamp(1.0-abs(detail-.52)*2.0,0.0,1.0),5.0)*reveal;
      float caustic=pow(clamp(.52+.48*sin((q.x-q.y)*5.2+detail*7.0-t*.18),0.0,1.0),7.0)*reveal;
      vec3 cyanGlow=mix(fluid,vec3(.34,1.0,.90),spec*.18+caustic*.09);
      cyanGlow*=.78+.25*haze;
      cyanGlow=mix(cyanGlow,cyanGlow*.70,u_surfaceOpacity*.34);
      float filament=smoothstep(.48,.86,detail)*reveal;
      float density=clamp(reveal*(.36+.48*haze)+filament*.22+mouseField*.28,0.0,1.0);
      float alpha=clamp(.035*haze+density*(.24+.50*u_intensity)+spec*.08+u_surfaceOpacity*density*.14,0.0,.92);
      float edgeFade=smoothstep(1.08,.70,length((uv-.5)*vec2(1.0,.92)));
      alpha*=edgeFade;
      cyanGlow=pow(max(cyanGlow,0.0),vec3(.94));
      gl_FragColor=vec4(cyanGlow,alpha);
    }
  
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Shader create failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Shader compile failed';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Program create failed');
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Program link failed');
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

let liveContexts = 0;
const MAX_CONTEXTS = 8;

interface FluidGlassManagerLike {
  profile: FluidQualityProfile;
}

export class FluidGlassRenderer {
  private element: HTMLElement;
  private key: string;
  private index: number;
  private manager: FluidGlassManagerLike;
  private canvas: HTMLCanvasElement;
  private config: FluidCardConfig;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation> = {};
  private active = true;
  private lastFrame = 0;
  private mouse: [number, number] = [0.76, 0.46];
  private mouseTarget: [number, number] = [0.76, 0.46];
  private mouseVelocity: [number, number] = [0, 0];
  private mouseMix = 0;
  private pointerInside = false;
  private controller = new AbortController();
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  fallbackReason = '';

  constructor(element: HTMLElement, config: FluidCardConfig, index: number, manager: FluidGlassManagerLike) {
    this.element = element;
    this.key = config.key;
    this.index = index;
    this.manager = manager;
    const canvas = element.querySelector('.fg-fluid-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing .fg-fluid-canvas');
    this.canvas = canvas;
    this.config = config;
    this.bindPointer();
    this.canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.fallback('WebGL context lost'); }, { signal: this.controller.signal });
    this.canvas.addEventListener('webglcontextrestored', () => { this.destroyGl(); this.init(); }, { signal: this.controller.signal });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(element);
    this.intersectionObserver = new IntersectionObserver((entries) => { this.active = entries[0]?.isIntersecting !== false; }, { rootMargin: '80px' });
    this.intersectionObserver.observe(element);
    this.applyCssPalette();
  }

  private bindPointer(): void {
    const signal = this.controller.signal;
    let last: [number, number] = [0, 0];
    let lastT = 0;
    const update = (event: PointerEvent): void => {
      const rect = this.element.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const y = clamp(1 - (event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1);
      const now = performance.now();
      const dt = Math.max(8, now - lastT || 16);
      this.mouseTarget = [x, y];
      this.mouseVelocity = [clamp((x - last[0]) / (dt / 16.67), -0.12, 0.12), clamp((y - last[1]) / (dt / 16.67), -0.12, 0.12)];
      last = [x, y];
      lastT = now;
      this.mouseMix = 1;
    };
    this.element.addEventListener('pointerenter', (event) => { this.pointerInside = true; update(event); }, { signal, passive: true });
    this.element.addEventListener('pointermove', update, { signal, passive: true });
    this.element.addEventListener('pointerleave', () => { this.pointerInside = false; this.mouseTarget = [0.76, 0.46]; }, { signal, passive: true });
    this.element.addEventListener('pointerdown', (event) => { this.mouseMix = 1.2; update(event); }, { signal, passive: true });
  }

  init(): boolean {
    const profile = this.manager.profile;
    if (profile.name === 'fallback') return this.fallback('CSS fallback mode');
    if (liveContexts >= MAX_CONTEXTS) return this.fallback('WebGL context budget reached');
    try {
      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: profile.name === 'eco' ? 'low-power' : 'high-performance',
      });
      if (!gl) throw new Error('WebGL context unavailable');
      this.gl = gl;
      liveContexts++;
      gl.clearColor(0, 0, 0, 0);
      this.program = buildProgram(gl);
      gl.useProgram(this.program);
      const buffer = gl.createBuffer();
      this.buffer = buffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(this.program, 'a_position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      (['u_resolution', 'u_mouse', 'u_mouseVelocity', 'u_mouseMix', 'u_time', 'u_speed', 'u_intensity', 'u_pointer', 'u_seed', 'u_surfaceOpacity', 'u_colorA', 'u_colorB', 'u_colorC'] as const).forEach((name) => {
        const loc = gl.getUniformLocation(this.program as WebGLProgram, name);
        if (loc) this.uniforms[name] = loc;
      });
      this.element.classList.remove('is-fallback');
      this.resize();
      return true;
    } catch (error) {
      console.warn(`[FluidGlass:${this.key}]`, error);
      this.fallback(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private fallback(reason: string): boolean {
    this.destroyGl();
    this.element.classList.add('is-fallback');
    this.fallbackReason = reason;
    return false;
  }

  private destroyGl(): void {
    const gl = this.gl;
    if (gl) {
      try { if (this.program) gl.deleteProgram(this.program); } catch (_) { /* noop */ }
      try { if (this.buffer) gl.deleteBuffer(this.buffer); } catch (_) { /* noop */ }
      try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (_) { /* noop */ }
      liveContexts = Math.max(0, liveContexts - 1);
    }
    this.gl = null;
    this.program = null;
    this.buffer = null;
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.controller.abort();
    this.destroyGl();
  }

  setConfig(config: FluidCardConfig): void {
    this.config = config;
    this.applyCssPalette();
  }

  private applyCssPalette(): void {
    const t = materialTokens(this.config.surface);
    const style = this.element.style;
    style.setProperty('--fluid-a', this.config.a);
    style.setProperty('--fluid-b', this.config.b);
    style.setProperty('--fluid-c', this.config.c);
    style.setProperty('--surface-opacity', t.surface);
    style.setProperty('--content-shade', t.shade);
    style.setProperty('--content-shade-mid', t.shadeMid);
    style.setProperty('--content-shade-soft', t.shadeSoft);
    style.setProperty('--top-glow', t.topGlow);
    style.setProperty('--bottom-shade', t.bottomShade);
    style.setProperty('--stat-text', t.text);
    style.setProperty('--stat-title', t.title);
    style.setProperty('--stat-muted', t.muted);
    style.setProperty('--stat-eyebrow', t.eyebrow);
    style.setProperty('--stat-change', t.change);
    style.setProperty('--edge-highlight', t.edge);
    this.element.dataset.surfaceTone = t.light ? 'light' : 'dark';
  }

  private resize(): void {
    if (!this.gl) return;
    const rect = this.element.getBoundingClientRect();
    const dpr = this.manager.profile.dpr;
    const width = Math.max(2, Math.round(rect.width * dpr));
    const height = Math.max(2, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  render(now: number): boolean {
    if (!this.gl || !this.active || document.hidden) return false;
    const interval = 1000 / this.manager.profile.fps;
    if (now - this.lastFrame < interval) return false;
    this.lastFrame = now;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mouse[0] += (this.mouseTarget[0] - this.mouse[0]) * 0.105;
    this.mouse[1] += (this.mouseTarget[1] - this.mouse[1]) * 0.105;
    this.mouseVelocity[0] *= 0.9;
    this.mouseVelocity[1] *= 0.9;
    this.mouseMix += ((this.pointerInside ? 1 : 0) - this.mouseMix) * 0.075;
    if (!this.pointerInside) this.mouseMix *= 0.945;
    const gl = this.gl;
    const c = this.config;
    gl.useProgram(this.program as WebGLProgram);
    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniforms.u_mouse, this.mouse[0], this.mouse[1]);
    gl.uniform2f(this.uniforms.u_mouseVelocity, this.mouseVelocity[0], this.mouseVelocity[1]);
    gl.uniform1f(this.uniforms.u_mouseMix, clamp(this.mouseMix, 0, 1.2));
    gl.uniform1f(this.uniforms.u_time, now * 0.001 + this.index * 3.73);
    gl.uniform1f(this.uniforms.u_speed, reduced ? Math.min(c.speed, 0.08) : c.speed);
    gl.uniform1f(this.uniforms.u_intensity, c.intensity);
    gl.uniform1f(this.uniforms.u_pointer, c.pointer);
    gl.uniform1f(this.uniforms.u_seed, c.seed);
    gl.uniform1f(this.uniforms.u_surfaceOpacity, c.surface);
    gl.uniform3fv(this.uniforms.u_colorA, hexToRgb(c.a));
    gl.uniform3fv(this.uniforms.u_colorB, hexToRgb(c.b));
    gl.uniform3fv(this.uniforms.u_colorC, hexToRgb(c.c));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }
}

export function isQualityValue(value: string): value is QualityName {
  return (QUALITY_VALUES as string[]).includes(value);
}
