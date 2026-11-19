/**
 * The WebGL aurora behind the hero.
 *
 * Written against raw WebGL rather than a 3D library on purpose: the scene is
 * a single full-quad fragment shader, so a scene graph, a camera and a
 * renderer would be several hundred kilobytes of JavaScript doing nothing
 * that two triangles and thirty lines of GLSL do not already do. On a study
 * tool that students open on school laptops, that bundle is not free.
 *
 * Every failure path degrades to the CSS `aurora-wash` underneath:
 *   - no WebGL context (old hardware, blocklisted driver) → never mounts
 *   - reduced-motion preference → never mounts
 *   - context lost (tab backgrounded on a low-memory device) → stops cleanly
 *
 * It also stops rendering entirely when scrolled out of view or when the tab
 * is hidden, so an idle marketing page is not holding a GPU loop open behind
 * whatever the reader has actually gone off to do.
 */

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uDark;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

/* One aurora ribbon: a band whose centre line is displaced by drifting
   noise, so it folds and thins the way a real curtain does instead of
   sliding across as a rigid band. */
float ribbon(vec2 uv, float yOff, float speed, float thick, float t) {
  float w = fbm(vec2(uv.x * 1.5 + t * speed, t * 0.12 + yOff * 4.0));
  float centre = yOff + (w - 0.5) * 0.62;
  float d = abs(uv.y - centre);
  float body = smoothstep(thick, 0.0, d);
  /* Vertical striations along the curtain. */
  float streak = 0.72 + 0.28 * noise(vec2(uv.x * 26.0, t * 0.5 + yOff * 10.0));
  return body * streak;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

  float t = uTime;
  /* The pointer nudges the whole curtain rather than dragging any one
     ribbon, which keeps the parallax readable at a glance. */
  vec2 m = uMouse * 0.06;

  vec2 q = vec2(p.x + m.x, uv.y + m.y);

  float r1 = ribbon(q, 0.70, 0.16, 0.20, t);
  float r2 = ribbon(q, 0.50, -0.11, 0.16, t + 21.0);
  float r3 = ribbon(q, 0.32, 0.08, 0.13, t + 47.0);

  vec3 orchid     = mix(vec3(0.68, 0.56, 0.96), vec3(0.60, 0.48, 0.98), uDark);
  vec3 periwinkle = mix(vec3(0.45, 0.58, 0.96), vec3(0.36, 0.55, 0.99), uDark);
  vec3 lavender   = mix(vec3(0.78, 0.68, 0.98), vec3(0.66, 0.58, 0.96), uDark);

  vec3 col = orchid * r1 + periwinkle * r2 + lavender * r3;
  float a = (r1 + r2 + r3);

  /* Stars, night only: a sparse lattice of points, each on its own phase. */
  vec2 cell = floor(uv * vec2(240.0 * aspect, 240.0));
  float star = hash(cell);
  float twinkle = 0.5 + 0.5 * sin(t * 1.6 + star * 44.0);
  float pt = step(0.9975, star) * twinkle;
  col += vec3(1.0) * pt * uDark;
  a += pt * uDark;

  /* Fade out toward the bottom so the artwork never fights the headline
     sitting on top of it. */
  float falloff = smoothstep(0.0, 0.55, uv.y);
  a *= falloff * mix(0.20, 0.62, uDark);

  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function AuroraCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = (canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    }) ?? null) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    // One full-screen quad. Nothing else is ever uploaded.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uDark = gl.getUniformLocation(program, "uDark");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let width = 0;
    let height = 0;
    const resize = () => {
      // Capped DPR: at 3x this shader is fill-rate bound on integrated GPUs
      // and the extra detail is invisible on a soft gradient anyway.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };

    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    const onMove = (event: PointerEvent) => {
      tx = (event.clientX / window.innerWidth) * 2 - 1;
      ty = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (!document.hidden) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let frame = 0;
    let running = false;
    let elapsed = 0;
    let last = performance.now();

    const render = (now: number) => {
      if (!visible || document.hidden) {
        running = false;
        return;
      }
      // Time is accumulated from deltas rather than read from the clock, so
      // pausing and resuming never jumps the animation forward.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;

      resize();
      const dark = document.documentElement.classList.contains("dark") ? 1 : 0;
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uDark, dark);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(render);
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      running = false;
      cancelAnimationFrame(frame);
      canvas.dataset.ready = "false";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    canvas.dataset.ready = "true";
    start();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return <canvas ref={ref} className={cn("aurora-canvas", className)} aria-hidden="true" />;
}
