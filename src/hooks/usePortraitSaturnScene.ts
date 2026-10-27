import { useRef, type RefObject } from 'react';
import { useThreeScene, type ThreeSceneContext, type ThreeSceneHandle } from './useThreeScene';
import { colorsNumeric } from '../tokens';

/**
 * LOCAL EXPERIMENT (2026-10-27, not in prod) — the hero figure is the
 * user-supplied "Particle Portrait" bust (projects/evgeny.design/
 * particle-portrait/): a dense point-cloud face/shoulders portrait, always
 * assembled, with a loose ambient mote cloud drifting around it and a
 * cursor-reactive "repel void" on its own surface. Saturn's ring system
 * (originally kept alongside the bust) was explicitly removed on 2026-10-27
 * ("кольца Сатурна вообще просто выпиливай") — this file now has no
 * dependency on useSaturnThreeScene.ts at all, just the bust + ambient motes.
 */

// 2026-10-27, live feedback: "размер фигуры увеличить на 30%" then "+10%" —
// the bust read too small at the original Saturn-core footprint (0.81).
const BUST_SIZE_BOOST = 1.43;
const BUST_FIT_RADIUS = 0.81 * BUST_SIZE_BOOST;

const PERSPECTIVE = 0.15;
const VIEW_SPAN = 6.4;
const SIZE_PERCENT = 210; // camera zoom, inherited from the original Saturn framing

// ---------------------------------------------------------------------------
// Bust — adapted from projects/evgeny.design/particle-portrait/particle-portrait.js
// Author's post-review notes applied in-shader (2026-10-27, see _process_log.md):
//  1) tighter frame on face/shoulders — handled by BUST_FIT_RADIUS + bottom fade (2).
//  2) hierarchy — fades/scatters toward the bottom instead of uniform density.
//  3) texture — size jitter, rare bright sparkles, a few large soft foreground points.
//  4) idle cloud shown immediately; target data swapped in once the .bin loads.
// ---------------------------------------------------------------------------

const BUST_POINTS_URL = '/particle-portrait/portrait-points.bin';
const BUST_COUNT_DESKTOP = 220000; // trimmed from the file's 360k per author's own "~200k, barely visible difference" note
const BUST_COUNT_MOBILE = 90000;
const BUST_BASE_TURN = -0.5;
const BUST_TURN_RANGE = 0.35;
const BUST_INNER_RADIUS = 0.32;
const BUST_OUTER_RADIUS = 0.8;
const BUST_ASSEMBLE_TIME = 0.22;
// 2026-10-27, dialed back same day after a real-device overexposure report —
// see `uSize`'s own comment in bustUniforms for the full story. Was the
// derived `Math.sqrt(BUST_COUNT_DESKTOP / BUST_COUNT_MOBILE) * 1.3` (≈×2.03),
// cheapest/lowest-risk fix chosen: a single flat constant, mobile-only.
const MOBILE_SIZE_BOOST = 1.35;

function decodeBustPoints(buffer: ArrayBuffer, n: number) {
  const u8 = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  const total = Math.floor(u8.length / 12);
  const count = Math.min(n, total);
  const target = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const bright = new Float32Array(count);
  const scale = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 12;
    target[i * 3] = dv.getInt16(o, true) / 8000;
    target[i * 3 + 1] = dv.getInt16(o + 2, true) / 8000;
    target[i * 3 + 2] = dv.getInt16(o + 4, true) / 8000;
    bright[i] = (u8[o + 6] / 255) * 1.4;
    scale[i] = u8[o + 7] / 200;
    normal[i * 3] = dv.getInt8(o + 8) / 127;
    normal[i * 3 + 1] = dv.getInt8(o + 9) / 127;
    normal[i * 3 + 2] = dv.getInt8(o + 10) / 127;
  }
  return { count, target, normal, bright, scale };
}

function buildIdleCloud(n: number) {
  const idle = new Float32Array(n * 3);
  const seed = new Float32Array(n * 4);
  const soft = () => Math.random() + Math.random() - 1;
  for (let i = 0; i < n; i++) {
    idle[i * 3] = soft() * 1.05;
    idle[i * 3 + 1] = soft() * 1.35;
    idle[i * 3 + 2] = soft() * 0.6;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  return { idle, seed };
}

const BUST_VERTEX = /* glsl */ `
  attribute vec3 aIdle, aNormal; attribute vec4 aSeed; attribute float aBright, aScale;
  uniform float uTime, uAssemble, uSize, uPR, uIdleBright, uAsmBright;
  uniform vec3 uColor;
  // 2026-10-27: cursor-reactive "texture change", per the Storm reference's
  // repel-void trick — uCursor is in this object's own local space (computed
  // in JS via bustGroup.worldToLocal each frame), so the comparison below
  // works directly against the raw per-particle positions.
  uniform vec3 uCursor;
  uniform float uRepelRadius, uRepelStrength, uActivity;
  varying vec3 vColor; varying float vB; varying float vSoft;
  float ease(float t) { return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t + 2.0, 3.0) * 0.5; }
  float hash(float n) { return fract(sin(n * 91.345) * 47453.5); }
  void main() {
    float e = ease(clamp(uAssemble * 1.35 - aSeed.x * 0.35, 0.0, 1.0));
    vec3 sp = 0.6 + aSeed.yzw;
    vec3 idleP = aIdle + 0.24 * vec3(
      sin(uTime * 0.23 * sp.x + aSeed.z * 6.283),
      cos(uTime * 0.19 * sp.y + aSeed.w * 6.283),
      sin(uTime * 0.17 * sp.z + aSeed.y * 6.283) * 0.6);
    idleP += 0.04 * vec3(sin(uTime * 1.1 + aSeed.w * 40.0), cos(uTime * 0.9 + aSeed.z * 30.0), 0.0);
    vec3 tgt = position + 0.0035 * vec3(sin(uTime * 1.3 + aSeed.y * 50.0), cos(uTime * 1.1 + aSeed.z * 50.0), 0.0);
    vec3 p = mix(idleP, tgt, e) + sin(3.14159 * e) * 0.16 * (aSeed.zwy - 0.5);

    // cursor-reactive void: particles near the cursor get pushed outward,
    // fading in/out smoothly via uActivity so it never snaps on/off.
    vec3 toCursor = p - uCursor;
    float cursorDist = length(toCursor);
    float repelFalloff = smoothstep(uRepelRadius, 0.0, cursorDist);
    p += normalize(toCursor + vec3(0.0001)) * repelFalloff * uRepelStrength * uActivity;

    // (2) hierarchy — fade/scatter toward the bottom of the bust instead of
    // uniform density; pushes low points outward and dims them so the figure
    // reads as dissolving downward rather than a flat block. The position
    // scatter must fade out as the bust finishes assembling (1.0 - e), not
    // scale WITH uAssemble — the original (0.3 + uAssemble) version kept
    // displacing the lower third even at e==1, so hovering dead-center never
    // fully resolved the sweater/shoulders (reported live, screenshot 250).
    // The brightness dim (lowFade) stays active even at full assembly — that
    // part of the "dissolve downward" look is intentional and permanent.
    float depthLow = smoothstep(0.05, -1.05, p.y);
    p.xz += depthLow * (aSeed.zw - 0.5) * 0.9 * (1.0 - e);
    float lowFade = 1.0 - depthLow * 0.85;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // (3) texture — broaden the base size spread, rare bright sparkles, a few
    // large soft foreground points (bokeh-like) instead of uniform "sand".
    float jitter = 0.6 + hash(aSeed.x * 133.0 + aSeed.y * 71.0) * 0.9;
    float sparkle = step(0.986, hash(aSeed.z * 211.0));
    float big = step(0.995, hash(aSeed.w * 311.0));
    float sizeMul = mix(jitter, 2.8, sparkle);
    sizeMul = mix(sizeMul, 4.4, big);
    gl_PointSize = uSize * aScale * sizeMul * uPR * (3.6 / -mv.z);

    vSoft = big;
    vec3 nv = normalize(normalMatrix * aNormal);
    float facing = mix(0.03, 1.0, smoothstep(-0.25, 0.3, nv.z));
    float depthCue = mix(1.1, 0.7, smoothstep(4.7, 6.1, -mv.z));
    float sparkleFlicker = 1.0 + sparkle * (0.6 + 0.6 * sin(uTime * 6.0 + aSeed.x * 60.0));
    // "текстура бюста" shimmer — a slow, low-amplitude per-particle breathing
    // of brightness across the whole surface (not position, so the face stays
    // sharp/recognizable), so the always-assembled figure still reads as
    // alive rather than a static render. 2026-10-27, per Storm-reference ask.
    float shimmer = 1.0 + 0.12 * sin(uTime * 0.5 + aSeed.y * 18.0 + aSeed.z * 7.0);
    float assembled = aBright * uAsmBright * facing * depthCue * lowFade * sparkleFlicker * shimmer;
    vB = mix(uIdleBright * (0.55 + 0.45 * aSeed.y), assembled, e);
    // 2026-10-25 follow-up: full-figure color is now uColor (set to the same
    // warm token the ring system used to use, kept for continuity even after
    // the rings themselves were removed) — sparkle/big points just mix in a
    // touch of white for a hot highlight.
    vColor = mix(uColor, vec3(1.0), sparkle * 0.25 + big * 0.15);
  }
`;

const BUST_FRAGMENT = /* glsl */ `
  varying vec3 vColor; varying float vB; varying float vSoft;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    // 2026-10-27, live feedback: "уменьшить прозрачность, чтобы более заметен
    // был бюст" — narrower soft edge (was 0.12..0.46, diffuse points read as
    // half-empty) and a lighter dimming on big/soft points (was ×0.5).
    float edge = mix(0.12, 0.3, vSoft);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, edge, d) * vB * mix(1.0, 0.8, vSoft);
    // 2026-10-27: "+15% заметности" on top of the previous ×1.3 boost.
    gl_FragColor = vec4(vColor, clamp(alpha * 1.5, 0.0, 1.0));
  }
`;

// ---------------------------------------------------------------------------
// Ambient mote cloud — loose particles drifting around the (always-
// assembled) bust, idea borrowed from the referenced Storm prompt's camera-
// attached "atmosphere" points: a thin, slow, independent drift layer that
// reads as ambient life around the main shape, not part of it. This is now
// the ONLY secondary element in the scene (rings removed 2026-10-27).
// ---------------------------------------------------------------------------
const AMBIENT_COUNT = 14300; // grown several times from an initial 3500, per live feedback

function buildAmbientCloud(centerRadius: number) {
  const position = new Float32Array(AMBIENT_COUNT * 3);
  const seed = new Float32Array(AMBIENT_COUNT * 4);
  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const r = centerRadius * (1.15 + Math.random() * 1.6);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    position[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    position[i * 3 + 1] = r * Math.cos(phi) * 0.85;
    position[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  return { position, seed };
}

const AMBIENT_VERTEX = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  varying float vA;
  void main() {
    vec3 p = position + 0.4 * vec3(
      sin(uTime * 0.18 * (0.6 + aSeed.y) + aSeed.z * 6.283),
      cos(uTime * 0.14 * (0.6 + aSeed.z) + aSeed.w * 6.283),
      sin(uTime * 0.11 * (0.6 + aSeed.w) + aSeed.y * 6.283));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sizeJ = 0.6 + aSeed.x * 1.8;
    gl_PointSize = 2.2 * sizeJ * (3.6 / -mv.z);
    vA = 0.22 + 0.32 * aSeed.x;
  }
`;

const AMBIENT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d) * vA;
    gl_FragColor = vec4(uColor, a);
  }
`;

function readPixelRatio() {
  const isMobile = window.innerWidth <= 768;
  return isMobile ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
}

export function usePortraitSaturnScene(enabled: boolean, mobileAnchorRef?: RefObject<HTMLElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { failed } = useThreeScene(
    canvasRef,
    (ctx: ThreeSceneContext): ThreeSceneHandle => {
      const { THREE, mouseRef, canvas } = ctx;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);

      // 2026-10-27: "всю композицию на 40 пикселей вверх" — kept as its own
      // root group even with a single child now (rings removed), so a future
      // shift still only needs touching one place.
      const compositionRoot = new THREE.Group();
      scene.add(compositionRoot);
      const SHIFT_UP_PX = 40; // 2026-10-27: 80 then -20, -20

      // ---------- bust ----------
      const coarse = matchMedia('(pointer: coarse)').matches;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wantN = coarse || window.innerWidth < 768 ? BUST_COUNT_MOBILE : BUST_COUNT_DESKTOP;
      const { idle, seed } = buildIdleCloud(wantN);
      const bright0 = new Float32Array(wantN).fill(0.6);
      const scale0 = new Float32Array(wantN).fill(1);
      const normal0 = new Float32Array(wantN * 3);
      for (let i = 0; i < wantN; i++) normal0[i * 3 + 2] = 1;

      const bustGeometry = new THREE.BufferGeometry();
      bustGeometry.setAttribute('position', new THREE.BufferAttribute(idle.slice(), 3)); // target = idle until loaded
      bustGeometry.setAttribute('aIdle', new THREE.BufferAttribute(idle, 3));
      bustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
      bustGeometry.setAttribute('aBright', new THREE.BufferAttribute(bright0, 1));
      bustGeometry.setAttribute('aScale', new THREE.BufferAttribute(scale0, 1));
      bustGeometry.setAttribute('aNormal', new THREE.BufferAttribute(normal0, 3));
      bustGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);

      const bustGlowColor = new THREE.Color(colorsNumeric.glow);
      const bustUniforms = {
        uTime: { value: 0 },
        uAssemble: { value: 0 },
        // 2026-10-27: measured via Playwright pixel-sampling (average
        // luminance over the bust region) that mobile read notably dimmer
        // than desktop despite identical brightness constants below — not a
        // brightness-formula mismatch. Root cause: `BUST_COUNT_MOBILE`
        // (90000) is less than half of `BUST_COUNT_DESKTOP` (220000, traded
        // off for GPU budget), so fewer points cover the same silhouette
        // area, leaving more uncovered black gaps between them. Boosting
        // per-particle ALPHA first (tried, then reverted) only pushes
        // already-lit pixels brighter — it can't light up a gap where no
        // point was drawn at all, so it barely moved the measured average.
        // The actual fix for a COVERAGE problem is bigger points, not
        // brighter ones: `DENSITY_COMPENSATION` (sqrt of the desktop/mobile
        // count ratio — the same math a Poisson-coverage estimate implies
        // for keeping covered-area fraction constant as count drops) scales
        // `uSize` up on mobile only, filling the same gaps the reduced count
        // opened up. Only this one uniform changes — no layout/camera/
        // composition impact (explicit constraint: keep everything else
        // exactly as already approved).
        // 2026-10-27, follow-up: `DENSITY_COMPENSATION*1.3` (≈×2.03) read
        // badly overexposed on a real AMOLED phone screen (live report,
        // prod screenshot) — bigger points overlap more, and additive
        // blending has no ceiling until the final clamp, so denser overlap
        // clips to blown-out white much more aggressively on a real high-
        // brightness/high-contrast panel than it ever did in headless/
        // DevTools testing (which can't reproduce real display behavior at
        // all — same caveat as the earlier brightness-vs-desktop measurement
        // above). Dialed back to a flat `MOBILE_SIZE_BOOST` within the
        // originally-estimated 1.3–1.4 range instead of the derived-but-too-
        // strong `DENSITY_COMPENSATION*1.3` — still fills most of the
        // coverage gap from fewer mobile points without pushing overlap into
        // clipping. Needs eyes on a real device again, not just headless.
        uSize: { value: 2.7 * (wantN === BUST_COUNT_MOBILE ? MOBILE_SIZE_BOOST : 1) },
        uPR: { value: readPixelRatio() },
        uColor: { value: bustGlowColor.clone() },
        // 2026-10-27, explicit request: "прозрачность... точно такая же как
        // на десктопе". First attempt used the raw 0.5/1.9 base multipliers
        // flat on both platforms — wrong: those were never the EFFECTIVE
        // desktop values, only inputs to a sqrt(particle-count) formula that
        // used to scale them down for desktop's much larger wantN. That
        // actually made desktop itself brighter than before, AND mobile
        // still didn't match it. Fixed properly: baked in the formula's own
        // desktop-wantN (220000) result as flat constants for BOTH
        // platforms, so desktop is bit-for-bit unchanged from before this
        // whole mobile pass, and mobile now matches it exactly instead of
        // reading brighter.
        uIdleBright: { value: 0.5 * Math.min(1, Math.sqrt(90000 / BUST_COUNT_DESKTOP)) },
        uAsmBright: { value: 1.9 * Math.min(1, Math.sqrt(160000 / BUST_COUNT_DESKTOP)) },
        uCursor: { value: new THREE.Vector3(9999, 9999, 9999) }, // far away = no effect until the pointer is tracked
        uRepelRadius: { value: 1.4 * 0.4 },
        uRepelStrength: { value: 0.22 },
        uActivity: { value: 0 },
      };
      const bustMaterial = new THREE.ShaderMaterial({
        uniforms: bustUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: BUST_VERTEX,
        fragmentShader: BUST_FRAGMENT,
      });
      const bustGroup = new THREE.Group();
      const bustPoints = new THREE.Points(bustGeometry, bustMaterial);
      bustPoints.frustumCulled = false;
      bustGroup.add(bustPoints);
      // fit-scale applied once real data loads (see fetch below); until then
      // a conservative guess keeps the idle cloud roughly in frame.
      bustGroup.scale.setScalar(BUST_FIT_RADIUS / 1.4);
      compositionRoot.add(bustGroup);

      // ---------- ambient mote cloud (sibling of the bust, not rotated with it) ----------
      const ambientGeometry = new THREE.BufferGeometry();
      const ambientCloud = buildAmbientCloud(BUST_FIT_RADIUS);
      ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientCloud.position, 3));
      ambientGeometry.setAttribute('aSeed', new THREE.BufferAttribute(ambientCloud.seed, 4));
      const ambientMaterial = new THREE.ShaderMaterial({
        vertexShader: AMBIENT_VERTEX,
        fragmentShader: AMBIENT_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: bustGlowColor.clone() },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });
      const ambientPoints = new THREE.Points(ambientGeometry, ambientMaterial);
      ambientPoints.frustumCulled = false;
      compositionRoot.add(ambientPoints);

      let bustLoaded = false;
      fetch(BUST_POINTS_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`particle-portrait: ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buf) => {
          const d = decodeBustPoints(buf, wantN);
          bustGeometry.setAttribute('position', new THREE.BufferAttribute(d.target, 3));
          bustGeometry.setAttribute('aNormal', new THREE.BufferAttribute(d.normal, 3));
          bustGeometry.setAttribute('aBright', new THREE.BufferAttribute(d.bright, 1));
          bustGeometry.setAttribute('aScale', new THREE.BufferAttribute(d.scale, 1));
          // re-fit idle/seed to the decoded count, in case the file held fewer points than requested
          if (d.count !== wantN) {
            const { idle: idle2, seed: seed2 } = buildIdleCloud(d.count);
            bustGeometry.setAttribute('aIdle', new THREE.BufferAttribute(idle2, 3));
            bustGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seed2, 4));
          }
          // fit the bust's own bounding radius to BUST_FIT_RADIUS so it fills
          // the same footprint the old Saturn core sphere used to.
          let maxR = 0.001;
          for (let i = 0; i < d.count; i++) {
            const x = d.target[i * 3], y = d.target[i * 3 + 1], z = d.target[i * 3 + 2];
            const r = Math.sqrt(x * x + y * y + z * z);
            if (r > maxR) maxR = r;
          }
          bustGroup.scale.setScalar(BUST_FIT_RADIUS / maxR);
          bustUniforms.uRepelRadius.value = maxR * 0.4;
          bustLoaded = true;
        })
        .catch((err) => {
          if (import.meta.env?.DEV) console.warn('particle-portrait: failed to load', err);
        });

      // ---------- cursor → head-turn + repel ----------
      const parallax = new THREE.Vector2();
      const parallaxTarget = new THREE.Vector2();
      const smooth = (a: number, b: number, x: number) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      // 2026-10-27 — approach changed, per live reference (storm plasma-orb
      // screenshot + explicit instruction): the bust is now ALWAYS assembled
      // (no idle-chaos → hover-assemble cycle any more; an earlier breathing
      // baseline was a workaround for the same "looks like a blob" complaint,
      // superseded by this). What cursor proximity now drives is only a
      // subtle head-turn (`turnAmount` below), not the assembly amount —
      // ambient life instead comes from the loose mote cloud above and the
      // per-particle shimmer in BUST_VERTEX, both inspired by the referenced
      // Storm prompt's drifting atmosphere + per-point wobble (not ported
      // verbatim — that scene is unrelated bloom/composer plumbing; only the
      // "loose ambient points + living shimmer" idea carries over).
      const BUST_IDLE_ASSEMBLE = 0.95;

      // Cursor → world point on the bust's own z=0 plane, then into the
      // bust's local space (same convention as the Storm reference's own
      // `updatePointer()`), so the repel effect above compares against the
      // same coordinates the per-particle positions live in.
      const cursorWorld = new THREE.Vector3();
      const cursorLocal = new THREE.Vector3();
      const _ndc = new THREE.Vector3();
      const _dir = new THREE.Vector3();
      let cursorOverCanvas = false;
      let cursorActivity = 0;
      // 2026-10-27, perf fix: `canvas.getBoundingClientRect()` is a forced
      // synchronous layout read — doing it unconditionally every rAF frame
      // (60/s, for as long as the Hero figure is mounted, i.e. basically
      // always on Home) is the same "layout thrashing" class of bug already
      // diagnosed and fixed once in useAssemblyAnimation.ts's own history.
      // On touch devices `mouseRef.current` never gets set at all (no
      // `mousemove` ever fires), so this was a 100%-wasted forced reflow on
      // every single frame on phones — live report: "микрофриз... во всех
      // блоках" while scrolling, worst exactly where the assembly engine's
      // own rAF loop is also competing for main-thread frame budget.
      // `updateCursorWorld` used to call `getBoundingClientRect()` BEFORE
      // checking whether there even IS a mouse position to use it for
      // (`turnAmount` below already had the check in the right order) — bug
      // was just the order of these two lines, fixed by swapping them so a
      // null cursor short-circuits before the read, not after.
      function updateCursorWorld() {
        const m = mouseRef.current;
        if (!m) {
          cursorOverCanvas = false;
          return;
        }
        const r = canvas.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0 || m.x < r.left || m.x > r.right || m.y < r.top || m.y > r.bottom) {
          cursorOverCanvas = false;
          return;
        }
        const ndcX = ((m.x - r.left) / r.width) * 2 - 1;
        const ndcY = -(((m.y - r.top) / r.height) * 2 - 1);
        _ndc.set(ndcX, ndcY, 0.5).unproject(camera);
        _dir.copy(_ndc).sub(camera.position).normalize();
        const denom = _dir.z;
        if (Math.abs(denom) < 1e-4) {
          cursorOverCanvas = false;
          return;
        }
        const t = -camera.position.z / denom;
        if (!(t > 0) || !Number.isFinite(t)) {
          cursorOverCanvas = false;
          return;
        }
        cursorWorld.copy(camera.position).addScaledVector(_dir, t);
        cursorOverCanvas = true;
      }

      function turnAmount() {
        const m = mouseRef.current;
        if (!m) {
          parallaxTarget.set(0, 0);
          return 0;
        }
        const r = canvas.getBoundingClientRect();
        const half = Math.min(r.width, r.height) / 2;
        if (half <= 0) return 0;
        const dx = (m.x - (r.left + r.width / 2)) / half;
        const dy = (m.y - (r.top + r.height / 2)) / half;
        parallaxTarget.set(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)));
        return 1 - smooth(BUST_INNER_RADIUS, BUST_OUTER_RADIUS, Math.hypot(dx, dy));
      }

      let lastT = performance.now();

      const updateCamera = (width: number, height: number) => {
        const isMobile = window.innerWidth <= 640;
        const aspect = Math.max(1, width) / Math.max(1, height);
        const distance = 1 / PERSPECTIVE;
        const span = VIEW_SPAN * (100 / SIZE_PERCENT);
        // 2026-10-27: this used to widen on narrow/portrait aspects
        // (`span / aspect`), meaning the camera showed MORE vertical world-
        // space — effectively zoomed OUT — the narrower the box got. On a
        // tall, narrow canvas that made the bust and ambient cloud both read
        // smaller and more "contained" than on desktop, the opposite of
        // "точно такой же, как на десктопе" (explicit live feedback). A
        // fixed vertical span, independent of aspect, keeps the same
        // apparent vertical fill regardless of canvas shape; only the
        // horizontal FOV (driven by `camera.aspect` below) widens/narrows to
        // match the canvas's own width/height ratio.
        // 2026-10-27, mobile-only: the canvas is now the full Hero section
        // (see Hero.module.css's `.saturnLayer`, full-bleed `inset:0` —
        // replaced an earlier `62vh` box this same day after live feedback
        // that ANY sized div clips the canvas inside it: "частица опять в
        // обрезанном контейнере. Я устал тебе это повторять"), so the bust
        // needs to render at the SAME apparent size it had in that box, not
        // the much bigger section — zooming in by the same 0.8 factor that
        // box's height implied keeps the figure's on-screen size unchanged;
        // its vertical PLACEMENT within the section is handled below via the
        // spacer-anchor measurement, not by this zoom level.
        // 2026-10-27, follow-up: explicit request to shrink the bust itself
        // (not reorder content, not touch anything else) — the goal line
        // ("Цель — решать реальные бизнес‑задачи") was landing below the
        // fold on a typical phone screen, only visible after a scroll, mid
        // way through its own scroll-reveal animation. `.saturnSpacer`'s
        // height dropped from 62vh/420px to 42vh/300px (see Hero.module.css)
        // to reclaim that vertical space — `MOBILE_ZOOM_OUT` is the matching
        // camera-side half: without it the bust's on-screen SIZE would stay
        // exactly the same (apparent size depends on `visibleHeight`, not on
        // the spacer box), so shrinking only the box would leave the same
        // size figure overflowing a now-smaller area. Computed to shrink the
        // bust by the same ratio the box itself shrank (new spacer height ÷
        // old spacer height ≈ 0.68, so zoom-out ≈ 1/0.68 ≈ 1.18) — tuned
        // empirically afterward against a real screenshot, not left as the
        // raw ratio.
        const MOBILE_ZOOM_OUT = 1.18;
        const mobileFrame = isMobile ? 0.8 * MOBILE_ZOOM_OUT : 1;
        const visibleHeight = span * mobileFrame;
        camera.aspect = aspect;
        camera.position.set(0, 0, distance);
        camera.lookAt(0, 0, 0);
        camera.fov = 2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI);
        camera.near = Math.max(0.1, distance - 20);
        camera.far = distance + 20;
        camera.updateProjectionMatrix();
        // world units per screen pixel at this FOV/distance, so a fixed px
        // shift stays visually constant across resizes (devicePixelRatio
        // doesn't matter here — `height` is CSS pixels, same units as the
        // SHIFT_UP_PX request).
        const worldPerPx = visibleHeight / Math.max(1, height);

        // 2026-10-27: on phone the canvas is the full Hero section, so a
        // fixed pixel shift (desktop's `SHIFT_UP_PX`) has no relationship to
        // where the CTA row/goal text actually sit — that in-flow gap moves
        // with font-loading, copy length, and viewport width. Instead, read
        // the real on-screen rect of `.saturnSpacer` (an invisible, zero-
        // render element that still occupies the document-flow gap the bust
        // used to visually sit in, see Hero.tsx/Hero.module.css) and aim the
        // camera at ITS vertical center, converted from screen pixels into
        // this frame's world-space Y. Falls back to the old fixed-shift
        // behavior if the anchor isn't available for any reason (anchor not
        // mounted yet, desktop where no ref is passed at all).
        let shiftWorldY = SHIFT_UP_PX * worldPerPx;
        const anchor = isMobile ? mobileAnchorRef?.current : null;
        if (anchor) {
          const canvasRect = canvas.getBoundingClientRect();
          const anchorRect = anchor.getBoundingClientRect();
          if (canvasRect.height > 0 && anchorRect.height > 0) {
            // The bust's own point-cloud mass isn't centered on its local
            // origin (shoulders/chest extend lower than the head rises) —
            // same reason desktop needs its own fixed SHIFT_UP_PX rather
            // than sitting at a bare geometric 0. Empirically-tuned via
            // Playwright screenshot (2026-10-27): the raw anchor-midpoint
            // placed the head ~80px higher than the spacer's own top, i.e.
            // overlapping the CTA row above it.
            const VISUAL_CENTER_OFFSET_PX = 80;
            const targetPixelY = anchorRect.top + anchorRect.height / 2 - canvasRect.top + VISUAL_CENTER_OFFSET_PX;
            shiftWorldY = (height / 2 - targetPixelY) * worldPerPx;
          }
        }
        compositionRoot.position.y = shiftWorldY;
      };
      updateCamera(ctx.canvas.clientWidth || 1, ctx.canvas.clientHeight || 1);
      // One retry shortly after mount: the first call can land before web
      // fonts finish loading (shifting text/the spacer's rect a few px) or
      // before the full-section canvas has its final layout height.
      if (typeof window !== 'undefined') {
        window.setTimeout(() => updateCamera(canvas.clientWidth || 1, canvas.clientHeight || 1), 120);
      }

      return {
        scene,
        camera,
        onFrame: () => {
          const now = performance.now();
          let dt = (now - lastT) / 1000;
          lastT = now;
          if (!isFinite(dt) || dt < 0) dt = 0;
          if (dt > 0.05) dt = 0.05;

          bustUniforms.uTime.value += reduced ? dt * 0.3 : dt;
          const target = bustLoaded ? BUST_IDLE_ASSEMBLE : 0;
          const u = bustUniforms.uAssemble;
          u.value += (target - u.value) * (1 - Math.exp(-dt / BUST_ASSEMBLE_TIME));
          // 2026-10-27: gated on `coarse` too, not just `reduced` — live
          // report on a real Samsung Galaxy S24 showed the cursor-repel
          // distortion triggering continuously WHILE SCROLLING (no mouse
          // involved at all), and the bust never settling into a resolved
          // face. `mouseRef` is only ever written from a `mousemove`
          // listener (see useThreeScene.ts) which shouldn't fire from touch
          // input — but some Android browsers synthesize compatibility
          // mouse events for touch/scroll gestures under certain
          // conditions, and this scene had no explicit guard against that
          // actually happening, only an implicit assumption that it
          // wouldn't. `coarse` (pointer: coarse) is already computed above
          // for the particle-count choice — reusing it here makes the whole
          // cursor-interaction branch (turn + repel) structurally unable to
          // run on a touch/coarse-pointer device, regardless of whatever
          // stray mouse-compatibility events a given mobile browser fires.
          const turn = reduced || coarse ? 0 : turnAmount();
          parallax.lerp(parallaxTarget, 1 - Math.exp(-dt / 0.4));
          // base three-quarter pose always shown (bust is always assembled
          // now); cursor proximity only adds the extra lean on top.
          bustGroup.rotation.y = BUST_BASE_TURN + parallax.x * BUST_TURN_RANGE * turn;
          bustGroup.rotation.x = parallax.y * 0.08 * turn;

          // Cursor-reactive repel void (see uCursor/uRepelRadius in
          // BUST_VERTEX) — needs the JUST-updated rotation applied to the
          // group's world matrix before converting the cursor into local
          // space, hence the explicit updateMatrixWorld here rather than
          // waiting for the renderer's own automatic one later this frame.
          bustGroup.updateMatrixWorld(true);
          if (!reduced && !coarse) updateCursorWorld();
          const activityTarget = !reduced && !coarse && cursorOverCanvas ? 1 : 0;
          cursorActivity += (activityTarget - cursorActivity) * (1 - Math.exp(-dt / 0.3));
          bustUniforms.uActivity.value = cursorActivity;
          if (cursorOverCanvas) {
            cursorLocal.copy(cursorWorld);
            bustGroup.worldToLocal(cursorLocal);
            bustUniforms.uCursor.value.copy(cursorLocal);
          }

          ambientMaterial.uniforms.uTime.value = bustUniforms.uTime.value;
        },
        onResize: (width: number, height: number) => {
          updateCamera(width, height);
          bustUniforms.uPR.value = readPixelRatio();
        },
        dispose: () => {
          bustGeometry.dispose();
          bustMaterial.dispose();
          ambientGeometry.dispose();
          ambientMaterial.dispose();
        },
      };
    },
    enabled,
  );

  return { canvasRef, failed };
}
