import { useRef } from 'react';
import { colors, colorsNumeric } from '../tokens';
import { pipelineSync } from './pipelineSync';
import { figureSync } from './figureSync';
import { useThreeScene, type ThreeSceneContext, type ThreeSceneHandle } from './useThreeScene';

/**
 * Small glowing-dot-plus-ring sprite for the Pipeline stage highlight (see
 * useHeroThreeScene) — drawn once via Canvas 2D, reused as a
 * THREE.CanvasTexture. Takes a hex color (not read from a CSS custom
 * property — Canvas 2D can't do that, see useNetworkCanvas's docstring for
 * the same limitation) so the caller can bake one texture per theme.
 */
function makeRingTexture(hex: string): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  const rgb = r + ',' + g + ',' + b;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
  glow.addColorStop(0, 'rgba(' + rgb + ',0.95)');
  glow.addColorStop(1, 'rgba(' + rgb + ',0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = 'rgba(' + rgb + ',0.9)';
  ctx.stroke();

  return canvas;
}

/**
 * Prototype switch (2026-09-26, per user request, local only): agent-signal pulses that run along the
 * lattice edges, and a scroll-driven morph of the lattice into a flat spiral galaxy (5 arms = the 5 Pipeline
 * stages) while Pipeline is on screen (sphere -> galaxy -> sphere). false = the scene exactly as before.
 */
const MORPH_AND_PULSES = true;
/** Galaxy: inner / outer radius of the arms, turn of each arm (radians), tilt of the disc towards the viewer, spin (rad/ms). */
const GAL_R0 = 0.16;
const GAL_R1 = 1.5;
const GAL_TURN = 4.4;
const GAL_TILT = 0.5;
const GAL_SPIN = 0.00014;
/** Edge slots per spiral arm: 120 edges / 5 arms = 24, each linking two arm points 2 apart. */
const EDGES_PER_ARM = 24;
const CHAIN_CAMERA_PULL = 0.2;
const PULSES = 14;
const PULSE_SPEED = 1.1;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Soft round dot, white — tinted by the material color. */
function makeDotTexture(): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Wide, very soft glow (blurred light) — the galaxy's core. */
function makeGlowTexture(): HTMLCanvasElement {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** 1:1 with `asmSeed()` in Portfolio.dc.html — deterministic PRNG seeding the scatter positions. */
function asmSeed(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  const r1 = s / 233280;
  s = (s * 9301 + 49297) % 233280;
  const r2 = s / 233280;
  s = (s * 9301 + 49297) % 233280;
  const r3 = s / 233280;
  s = (s * 9301 + 49297) % 233280;
  const r4 = s / 233280;
  return { r1, r2, r3, r4 };
}

/**
 * Hero icosahedron scene — 1:1 with initThree(): points scatter in a sphere on
 * load, ease into the icosahedron lattice over ~1.9s, then drift with mouse
 * parallax + a slow scroll-driven Z rotation. Disabled on touch/reduced-motion
 * (enabled is the caller's job to compute, same as the source's early return).
 *
 * Deliberate deviation from source (user request, 2026-08-02): the canvas is
 * `position:fixed` and roams the whole page (see useLatticeLayout), so it's
 * still visible while scrolling through Design Pipeline — its points (and the
 * edges connecting them) now tie into `pipelineSync.panelT`, split into 5
 * contiguous groups. Per `usePipelineScroll`'s own semantics, a group's `panelT`
 * reaches 1 and *stays* there once you've scrolled past that stage (only the
 * currently-active one is still ramping 0→1) — so groups accumulate lit as you
 * progress, all 5 fully bright by the outcome panel. On top of that, the group
 * matching `pipelineSync.activeIndex` (the stage currently being scrolled
 * through) gets an extra glowing-ring overlay per vertex that grows with that
 * stage's own progress — "this part is being assembled right now." Only kicks
 * in while `pipelineSync.active` is true (genuinely inside Pipeline's pinned
 * zone) — elsewhere on the page the icosahedron looks exactly as before.
 *
 * Edge→group matching: EdgesGeometry generates its own deduplicated vertex
 * buffer from the source geometry, not indexed the same way — so each edge
 * vertex's group is resolved once at setup by nearest-position match against
 * the base geometry's vertices (cheap: ~240 edge vertices × 42 base vertices,
 * done once, not per frame).
 */
export function useHeroThreeScene(enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { failed } = useThreeScene(
    canvasRef,
    (ctx: ThreeSceneContext): ThreeSceneHandle => {
      const { THREE, mouseRef, canvas } = ctx;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10);
      camera.position.z = 4.4;

      const geo = new THREE.IcosahedronGeometry(1.5, 1);
      if (MORPH_AND_PULSES) {
        // Faces sorted top -> bottom: the 5 vertex groups (Pipeline stages) become 5 horizontal bands, so the
        // stage highlight fills the figure downward and the chain morph gets 5 compact, neighbouring nodes.
        const pa = geo.attributes.position.array as Float32Array;
        const faces = pa.length / 9;
        const order = Array.from({ length: faces }, (_, f) => ({ f, y: (pa[f * 9 + 1] + pa[f * 9 + 4] + pa[f * 9 + 7]) / 3 }));
        order.sort((a, b) => b.y - a.y);
        const sorted = new Float32Array(pa.length);
        order.forEach(({ f }, i) => sorted.set(pa.subarray(f * 9, f * 9 + 9), i * 9));
        pa.set(sorted);
      }
      const vertexCount = geo.attributes.position.count;
      const intensities = new Float32Array(vertexCount * 3).fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(intensities, 3));
      const colorAttr = geo.getAttribute('color') as InstanceType<typeof THREE.BufferAttribute>;
      const pointsMat = new THREE.PointsMaterial({
        color: colorsNumeric.redline,
        vertexColors: true,
        size: 0.05,
        transparent: true,
        opacity: 0.9,
      });
      const points = new THREE.Points(geo, pointsMat);

      // Mono theme (2026-09-17): this whole scene reads its colors from TS
      // constants once at setup, not from CSS custom properties — a WebGL
      // material's `.color` doesn't understand var() any more than a Canvas
      // 2D context does (see useNetworkCanvas). `slateColor`/`redColor` are
      // shared, mutable THREE.Color instances (not swapped for new objects)
      // so every place that already reads them by reference — the edge lerp
      // loop, pointsMat.color — picks up a live theme change automatically;
      // applyThemeColors() below is the only place that ever writes to them.
      const themeSlate = new THREE.Color(colorsNumeric.slateMist);
      const themeRed = new THREE.Color(colorsNumeric.redline);
      const monoSlate = new THREE.Color('#7c7c80'); // matches theme-mono.css's --color-slate-mist
      const monoAccent = new THREE.Color('#b8b8b6'); // matches theme-mono.css's --color-accent
      const slateColor = new THREE.Color();
      const redColor = new THREE.Color();
      const tmpColor = new THREE.Color();
      let mono = document.documentElement.dataset.theme === 'mono';
      slateColor.copy(mono ? monoSlate : themeSlate);
      redColor.copy(mono ? monoAccent : themeRed);
      pointsMat.color.copy(redColor);

      const groupCount = pipelineSync.panelT.length;
      const groupSize = Math.ceil(vertexCount / groupCount);
      const basePos = geo.attributes.position.array as Float32Array;

      const edges = new THREE.EdgesGeometry(geo);
      const edgePosAttr = edges.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
      const edgeVertexCount = edgePosAttr.count;
      const edgeColors = new Float32Array(edgeVertexCount * 3);
      // Each edge vertex's group is whichever base icosahedron vertex it's closest
      // to — resolved once here, not per frame (see docstring above).
      const edgeGroup = new Uint8Array(edgeVertexCount);
      const edgeBase = new Int32Array(edgeVertexCount);
      for (let ei = 0; ei < edgeVertexCount; ei++) {
        const ex = edgePosAttr.array[ei * 3];
        const ey = edgePosAttr.array[ei * 3 + 1];
        const ez = edgePosAttr.array[ei * 3 + 2];
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let vi = 0; vi < vertexCount; vi++) {
          const dx = basePos[vi * 3] - ex;
          const dy = basePos[vi * 3 + 1] - ey;
          const dz = basePos[vi * 3 + 2] - ez;
          const dist = dx * dx + dy * dy + dz * dz;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = vi;
          }
        }
        edgeGroup[ei] = Math.floor(bestIdx / groupSize);
        edgeBase[ei] = bestIdx;
        edgeColors[ei * 3] = slateColor.r;
        edgeColors[ei * 3 + 1] = slateColor.g;
        edgeColors[ei * 3 + 2] = slateColor.b;
      }
      edges.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));
      const edgeColorAttr = edges.getAttribute('color') as InstanceType<typeof THREE.BufferAttribute>;
      const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 });
      const lines = new THREE.LineSegments(edges, lineMat);
      lines.visible = false;

      // Stage-highlight ring overlay — a bigger glowing-ring sprite over whichever
      // group is the *currently active* stage (pipelineSync.activeIndex), growing
      // with that stage's own progress. Reuses one small fixed-size buffer,
      // repositioned to the active group's vertices each frame.
      // Two baked textures (not one, swapped by theme) — Canvas 2D can't
      // read a CSS custom property, same reason makeRingTexture takes a
      // literal hex instead of a token reference (see its docstring).
      const ringTextureDefault = new THREE.CanvasTexture(makeRingTexture(colors.redline));
      const ringTextureMono = new THREE.CanvasTexture(makeRingTexture('#b8b8b6'));
      const ringGeo = new THREE.BufferGeometry();
      ringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(groupSize * 3), 3));
      const ringPosAttr = ringGeo.getAttribute('position') as InstanceType<typeof THREE.BufferAttribute>;
      const ringMat = new THREE.PointsMaterial({
        map: mono ? ringTextureMono : ringTextureDefault,
        size: 0.14,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const ringPoints = new THREE.Points(ringGeo, ringMat);

      const group = new THREE.Group();
      group.add(points, lines, ringPoints);
      scene.add(group);

      const posAttr = geo.attributes.position;
      const target = new Float32Array(posAttr.array);
      const scatter = new Float32Array(posAttr.array.length);
      for (let i = 0; i < scatter.length; i += 3) {
        const r = asmSeed(i * 13 + 5);
        const rad = 5 + r.r3 * 7;
        const th = r.r1 * Math.PI * 2;
        const ph = Math.acos(2 * r.r2 - 1);
        scatter[i] = Math.sin(ph) * Math.cos(th) * rad;
        scatter[i + 1] = Math.sin(ph) * Math.sin(th) * rad;
        scatter[i + 2] = Math.cos(ph) * rad;
      }

      // ---- Morph + pulses prototype (see MORPH_AND_PULSES) ----
      const edgeTarget = new Float32Array(edgePosAttr.array);
      const chainPos = new Float32Array(target.length);
      const edgeChain = new Float32Array(edgeTarget.length);
      const pulseGeo = new THREE.BufferGeometry();
      pulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PULSES * 3), 3));
      const pulsePosAttr = pulseGeo.getAttribute('position') as InstanceType<typeof THREE.BufferAttribute>;
      const dotTexture = new THREE.CanvasTexture(makeDotTexture());
      const pulseMat = new THREE.PointsMaterial({
        map: dotTexture,
        color: redColor,
        size: 0.22,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const pulsePoints = new THREE.Points(pulseGeo, pulseMat);
      pulsePoints.visible = false;
      pulsePoints.frustumCulled = false;
      points.frustumCulled = false;
      lines.frustumCulled = false;
      const pulse = { ei: new Int32Array(PULSES), t: new Float32Array(PULSES), v: new Float32Array(PULSES) };
      const incident = new Map<string, number[]>();
      let updateChain: (spin: number) => void = () => {};
      const keyOf = (ei: number) =>
        Math.round(edgeTarget[ei * 3] * 500) + ',' + Math.round(edgeTarget[ei * 3 + 1] * 500) + ',' + Math.round(edgeTarget[ei * 3 + 2] * 500);
      if (MORPH_AND_PULSES) {
        // Galaxy layout: each of the 5 bands (Pipeline stages) becomes one spiral arm of a flat disc that faces
        // the viewer. A point's place along its arm follows its index inside the band, so consecutive points of a
        // face are neighbours on the arm (the face edges become the arm's polyline), and the edges between
        // neighbouring bands become short cross links. Links that would be too long fade out.
        const hash = (n: number) => {
          const x = Math.sin(n * 12.9898) * 43758.5453;
          return x - Math.floor(x);
        };
        const pr = new Float32Array(vertexCount);
        const pphi = new Float32Array(vertexCount);
        const pz = new Float32Array(vertexCount);
        for (let vi = 0; vi < vertexCount; vi++) {
          const g = Math.min(groupCount - 1, Math.floor(vi / groupSize));
          const t = (vi - g * groupSize) / Math.max(1, groupSize - 1);
          pr[vi] = GAL_R0 + t * (GAL_R1 - GAL_R0) + (hash(vi) - 0.5) * 0.1;
          pphi[vi] = (g * Math.PI * 2) / groupCount + t * GAL_TURN + (hash(vi + 500) - 0.5) * 0.16;
          pz[vi] = (hash(vi + 900) - 0.5) * 0.12;
        }
        const cosT = Math.cos(GAL_TILT);
        const sinT = Math.sin(GAL_TILT);
        updateChain = (spin: number) => {
          for (let vi = 0; vi < vertexCount; vi++) {
            const phi = pphi[vi] + spin;
            const x = pr[vi] * Math.cos(phi);
            const y = pr[vi] * Math.sin(phi);
            const z = pz[vi];
            chainPos[vi * 3] = x;
            chainPos[vi * 3 + 1] = y * cosT - z * sinT;
            chainPos[vi * 3 + 2] = y * sinT + z * cosT;
          }
          // In the galaxy the edge slots are re-assigned to the arms: slot k of arm g links point 2j to point 2j+2 of
          // that arm, so each arm is one continuous polyline running outward.
          for (let k = 0; k < edgeVertexCount / 2; k++) {
            const g = Math.min(groupCount - 1, Math.floor(k / EDGES_PER_ARM));
            const j = k - g * EDGES_PER_ARM;
            const first = g * groupSize;
            const last = Math.min(vertexCount - 1, first + groupSize - 1);
            const pa = Math.min(last, first + j * 2);
            const pb = Math.min(last, pa + 2);
            const collapsed = k >= EDGES_PER_ARM * groupCount;
            for (let c = 0; c < 3; c++) {
              edgeChain[2 * k * 3 + c] = chainPos[pa * 3 + c];
              edgeChain[(2 * k + 1) * 3 + c] = collapsed ? chainPos[pa * 3 + c] : chainPos[pb * 3 + c];
            }
          }
        };
        updateChain(0);
        for (let ei = 0; ei < edgeVertexCount; ei++) {
          const key = keyOf(ei);
          const list = incident.get(key);
          if (list) list.push(ei);
          else incident.set(key, [ei]);
        }
        for (let i = 0; i < PULSES; i++) {
          pulse.ei[i] = Math.floor(Math.random() * edgeVertexCount);
          pulse.t[i] = Math.random();
          pulse.v[i] = PULSE_SPEED * (0.75 + Math.random() * 0.5);
        }
        group.add(pulsePoints);
      }
      // Core: a soft glow at the centre of the galaxy that switches on when the last stage is reached.
      const coreGeo = new THREE.BufferGeometry();
      coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
      const glowTexture = new THREE.CanvasTexture(makeGlowTexture());
      const coreMat = new THREE.PointsMaterial({
        map: glowTexture,
        color: redColor,
        size: 1,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const corePoints = new THREE.Points(coreGeo, coreMat);
      corePoints.visible = false;
      corePoints.frustumCulled = false;
      if (MORPH_AND_PULSES) group.add(corePoints);
      // Star dust around the galaxy: two static clouds of tiny dots in the disc plane (no twinkling), dimmer and
      // sparser towards the edge so nothing is cut off by the square canvas. Turns slowly with the disc.
      const dustTilt = new THREE.Group();
      dustTilt.rotation.x = GAL_TILT;
      const dustLayers = [320, 70].map((count, layer) => {
        const h = (n: number) => {
          const x = Math.sin(n * 12.9898 + layer * 78.233) * 43758.5453;
          return x - Math.floor(x);
        };
        const pos = new Float32Array(count * 3);
        const bright = new Float32Array(count);
        const isRed = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
          const r = 0.3 + 1.4 * Math.sqrt(h(i));
          const a = h(i + 300) * Math.PI * 2;
          pos[i * 3] = r * Math.cos(a);
          pos[i * 3 + 1] = r * Math.sin(a);
          pos[i * 3 + 2] = (h(i + 700) - 0.5) * 0.35;
          bright[i] = (1 - Math.pow(r / 1.7, 2.2)) * (0.3 + 0.7 * h(i + 900)) * 1;
          isRed[i] = h(i + 1300) < 0.22 ? 1 : 0;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        const mat = new THREE.PointsMaterial({
          map: dotTexture,
          size: layer === 0 ? 0.04 : 0.075,
          vertexColors: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          sizeAttenuation: true,
        });
        const pts = new THREE.Points(geo, mat);
        pts.frustumCulled = false;
        pts.visible = false;
        dustTilt.add(pts);
        return { geo, mat, pts, bright, isRed, count };
      });
      const fillDust = () => {
        for (const l of dustLayers) {
          const col = l.geo.getAttribute('color') as InstanceType<typeof THREE.BufferAttribute>;
          for (let i = 0; i < l.count; i++) {
            const k = l.bright[i];
            col.array[i * 3] = (l.isRed[i] ? redColor.r : 0.72) * k;
            col.array[i * 3 + 1] = (l.isRed[i] ? redColor.g : 0.78) * k;
            col.array[i * 3 + 2] = (l.isRed[i] ? redColor.b : 0.92) * k;
          }
          col.needsUpdate = true;
        }
      };
      fillDust();
      if (MORPH_AND_PULSES) group.add(dustTilt);
      let contract = 0;
      let contractTarget = 0;
      let pipeEl: HTMLElement | null = null;
      let lastMM = 0;
      let lastFrameT = performance.now();
      const computeMorph = () => {
        if (!pipeEl) pipeEl = document.getElementById('pipeline');
        if (!pipeEl) return 0;
        const vh = window.innerHeight;
        const r = pipeEl.getBoundingClientRect();
        const enter = clamp01((vh * 0.9 - r.top) / (vh * 0.7));
        const exit = clamp01((vh * 0.9 - r.bottom) / (vh * 0.7));
        return enter * (1 - exit);
      };
      // Footer finale (2026-09-26): the figure becomes the galaxy again, fully lit, with the core glowing — the
      // finished process. 0 -> 1 as the contact section rises from 95% to 35% of the viewport.
      let footerEl: HTMLElement | null = null;
      // About-block highlight (figureSync): per-band smoothing + dirty flags for the colour buffers.
      const hl = new Float32Array(groupCount);
      let lastHlSum = 0;
      let lastEdgeSig = -1;
      let pointsDirty = false;
      let edgesDirty = false;
      const anchorVec = new THREE.Vector3();
      const computeFooterMorph = () => {
        if (!footerEl) footerEl = document.getElementById('contact');
        if (!footerEl) return 0;
        const vh = window.innerHeight;
        return clamp01((vh * 0.95 - footerEl.getBoundingClientRect().top) / (vh * 0.6));
      };

      const t0 = performance.now();
      let latticeBuilt = false;
      let targetX = 0;
      let targetY = 0;

      return {
        scene,
        camera,
        onFrame: () => {
          // Mono theme (2026-09-17): checked fresh every frame, same cheap
          // dataset-attribute read used by useNetworkCanvas/useStageProgress
          // — the toggle can flip at any time without remounting this scene.
          const nowMono = document.documentElement.dataset.theme === 'mono';
          if (nowMono !== mono) {
            mono = nowMono;
            slateColor.copy(mono ? monoSlate : themeSlate);
            redColor.copy(mono ? monoAccent : themeRed);
            pointsMat.color.copy(redColor);
            pulseMat.color.copy(redColor);
            coreMat.color.copy(redColor);
            fillDust();
            edgesDirty = true;
            ringMat.map = mono ? ringTextureMono : ringTextureDefault;
            ringMat.needsUpdate = true;
          }

          const build = Math.min(1, (performance.now() - t0) / 1900);
          const footerM = MORPH_AND_PULSES && build >= 1 ? computeFooterMorph() : 0;
          if (build < 1) {
            const e = build * build * (3 - 2 * build);
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < arr.length; i += 3) {
              const d = Math.min(1, Math.max(0, (e - (i / arr.length) * 0.35) / 0.65));
              const k = d * d * (3 - 2 * d);
              arr[i] = scatter[i] + (target[i] - scatter[i]) * k;
              arr[i + 1] = scatter[i + 1] + (target[i + 1] - scatter[i + 1]) * k;
              arr[i + 2] = scatter[i + 2] + (target[i + 2] - scatter[i + 2]) * k;
            }
            posAttr.needsUpdate = true;
            lineMat.opacity = 0.32 * Math.max(0, (build - 0.62) / 0.38);
            lines.visible = build > 0.62;
          } else if (!latticeBuilt) {
            latticeBuilt = true;
            posAttr.array.set(target);
            posAttr.needsUpdate = true;
            lineMat.opacity = 0.32;
            lines.visible = true;
          }

          if (pipelineSync.active) {
            const panelT = pipelineSync.panelT;

            // Points: per-group brightness — dim (0.32) → fully lit (1.0) as
            // that stage's own panelT rises. Past stages stay at 1 (see
            // usePipelineScroll's semantics), so lit groups accumulate.
            const arr = colorAttr.array as Float32Array;
            for (let g = 0; g < groupCount; g++) {
              const t = Math.max(0, Math.min(1, panelT[g] ?? 0));
              const intensity = 0.32 + t * 0.68;
              const start = g * groupSize;
              const end = Math.min(vertexCount, start + groupSize);
              for (let i = start; i < end; i++) {
                arr[i * 3] = intensity;
                arr[i * 3 + 1] = intensity;
                arr[i * 3 + 2] = intensity;
              }
            }
            colorAttr.needsUpdate = true;

            // Edges: same per-group progress, but a full slate→redline color
            // lerp instead of a brightness scalar (these two colors are
            // different hues, not just different brightnesses of one).
            const edgeArr = edgeColorAttr.array as Float32Array;
            for (let ei = 0; ei < edgeVertexCount; ei++) {
              const t = Math.max(0, Math.min(1, panelT[edgeGroup[ei]] ?? 0));
              tmpColor.copy(slateColor).lerp(redColor, t);
              edgeArr[ei * 3] = tmpColor.r;
              edgeArr[ei * 3 + 1] = tmpColor.g;
              edgeArr[ei * 3 + 2] = tmpColor.b;
            }
            edgeColorAttr.needsUpdate = true;

            // Ring overlay: only on the group matching the stage currently
            // being scrolled through, growing with that stage's own progress.
            const activeIndex = Math.max(0, Math.min(groupCount - 1, pipelineSync.activeIndex));
            const activeT = Math.max(0, Math.min(1, panelT[activeIndex] ?? 0));
            const rStart = activeIndex * groupSize;
            const rEnd = Math.min(vertexCount, rStart + groupSize);
            const ringArr = ringPosAttr.array as Float32Array;
            for (let i = rStart, rj = 0; i < rEnd; i++, rj++) {
              ringArr[rj * 3] = basePos[i * 3];
              ringArr[rj * 3 + 1] = basePos[i * 3 + 1];
              ringArr[rj * 3 + 2] = basePos[i * 3 + 2];
            }
            ringPosAttr.needsUpdate = true;
            ringGeo.setDrawRange(0, rEnd - rStart);
            ringMat.opacity = activeT * 0.9;
            ringMat.size = 0.14 + activeT * 0.22;
            pointsDirty = true;
            edgesDirty = true;
          } else {
            // About block: the band of the hovered statement stays bright, the others dim; its edges turn red.
            let hlSum = 0;
            let hlMax = 0;
            for (let g = 0; g < groupCount; g++) {
              const goal = figureSync.highlight === g ? 1 : 0;
              hl[g] += (goal - hl[g]) * 0.14;
              if (Math.abs(goal - hl[g]) < 0.002) hl[g] = goal;
              hlSum += hl[g];
              hlMax = Math.max(hlMax, hl[g]);
            }
            if (hlSum !== lastHlSum || pointsDirty) {
              const carr = colorAttr.array as Float32Array;
              for (let g = 0; g < groupCount; g++) {
                const k = 1 - 0.65 * hlMax * (1 - hl[g]);
                const from = g * groupSize;
                const to = Math.min(vertexCount, from + groupSize);
                for (let i = from; i < to; i++) {
                  carr[i * 3] = k;
                  carr[i * 3 + 1] = k;
                  carr[i * 3 + 2] = k;
                }
              }
              colorAttr.needsUpdate = true;
              lastHlSum = hlSum;
              pointsDirty = false;
            }
            const edgeArr = edgeColorAttr.array as Float32Array;
            // Outside Pipeline the edges are slate; in the footer finale they turn red with the galaxy (all arms lit).
            const litNow = footerM * footerM * (3 - 2 * footerM);
            const edgeSig = litNow * 10 + hlSum;
            if (edgeSig !== lastEdgeSig || edgesDirty) {
              for (let ei = 0; ei < edgeVertexCount; ei++) {
                tmpColor.copy(slateColor).lerp(redColor, Math.max(litNow, hl[edgeGroup[ei]] ?? 0));
                edgeArr[ei * 3] = tmpColor.r;
                edgeArr[ei * 3 + 1] = tmpColor.g;
                edgeArr[ei * 3 + 2] = tmpColor.b;
              }
              edgeColorAttr.needsUpdate = true;
              lastEdgeSig = edgeSig;
              edgesDirty = false;
            }
            if (ringMat.opacity !== 0) ringMat.opacity = 0;
          }

          if (MORPH_AND_PULSES && build >= 1) {
            const m = Math.max(computeMorph(), footerM);
            const mm = m * m * (3 - 2 * m);
            camera.position.z = 4.4 + CHAIN_CAMERA_PULL * mm;
            // Stage progress 0..1 (sum of the 5 stage values) only drives the core glow: it fades in over the last stages
            // and stays while the figure morphs back to the sphere; reset once it is a sphere again.
            if (pipelineSync.active) {
              let sum = 0;
              for (let g = 0; g < groupCount; g++) sum += Math.max(0, Math.min(1, pipelineSync.panelT[g] ?? 0));
              contractTarget = sum / groupCount;
            } else if (footerM > 0.02) {
              contractTarget = 1;
            } else if (mm < 0.02) {
              contractTarget = 0;
            }
            contract += (contractTarget - contract) * 0.07;
            if (Math.abs(contractTarget - contract) < 0.0005) contract = contractTarget;
            const coreOn = clamp01((contract - 0.6) / 0.4);
            coreMat.opacity = mm * coreOn * 0.9;
            coreMat.size = 0.9 + 1.1 * coreOn;
            corePoints.visible = coreMat.opacity > 0.01;
            const dustOpacity = mm * 0.85;
            const dustAngle = performance.now() * GAL_SPIN * 0.6;
            for (const l of dustLayers) {
              l.mat.opacity = dustOpacity;
              l.pts.visible = dustOpacity > 0.01;
              l.pts.rotation.z = dustAngle;
            }
            if (mm > 1e-4 || lastMM > 1e-4) {
              lastMM = mm;
              if (mm > 1e-4) updateChain(performance.now() * GAL_SPIN);
              const pa = posAttr.array as Float32Array;
              for (let i = 0; i < pa.length; i++) pa[i] = target[i] + (chainPos[i] - target[i]) * mm;
              posAttr.needsUpdate = true;
              const ea = edgePosAttr.array as Float32Array;
              for (let i = 0; i < ea.length; i++) ea[i] = edgeTarget[i] + (edgeChain[i] - edgeTarget[i]) * mm;
              edgePosAttr.needsUpdate = true;
            }

            // Agent-signal pulses: small glowing dots that run along the edges and hop to a neighbouring edge
            // at each end (in the chain, only over links that still exist).
            const now = performance.now();
            const dt = Math.min(0.05, (now - lastFrameT) / 1000);
            lastFrameT = now;
            const ea = edgePosAttr.array as Float32Array;
            const pp = pulsePosAttr.array as Float32Array;
            for (let i = 0; i < PULSES; i++) {
              let ei = pulse.ei[i];
              let partner = ei ^ 1;
              const dx = ea[partner * 3] - ea[ei * 3];
              const dy = ea[partner * 3 + 1] - ea[ei * 3 + 1];
              const dz = ea[partner * 3 + 2] - ea[ei * 3 + 2];
              const len = Math.max(0.05, Math.sqrt(dx * dx + dy * dy + dz * dz));
              pulse.t[i] += (dt * pulse.v[i]) / len;
              if (pulse.t[i] >= 1) {
                if (mm > 0.5) {
                  // Galaxy: run inward along the arm, from the tip to the core; then start again at the tip of a random arm.
                  const k = ei >> 1;
                  const g = Math.min(groupCount - 1, Math.floor(k / EDGES_PER_ARM));
                  const nextK = k - 1 >= g * EDGES_PER_ARM ? k - 1 : (Math.floor(Math.random() * groupCount) + 1) * EDGES_PER_ARM - 1;
                  ei = nextK * 2 + 1;
                } else {
                  const list = incident.get(keyOf(partner)) ?? [];
                  const options = list.filter((c) => c !== partner);
                  ei = options.length ? options[Math.floor(Math.random() * options.length)] : partner;
                }
                pulse.ei[i] = ei;
                pulse.t[i] = 0;
                partner = ei ^ 1;
              }
              const t = pulse.t[i];
              pp[i * 3] = ea[ei * 3] + (ea[partner * 3] - ea[ei * 3]) * t;
              pp[i * 3 + 1] = ea[ei * 3 + 1] + (ea[partner * 3 + 1] - ea[ei * 3 + 1]) * t;
              pp[i * 3 + 2] = ea[ei * 3 + 2] + (ea[partner * 3 + 2] - ea[ei * 3 + 2]) * t;
            }
            pulsePosAttr.needsUpdate = true;
            pulsePoints.visible = lines.visible;
          }

          const mouse = mouseRef.current;
          if (mouse) {
            targetY = (mouse.x / window.innerWidth - 0.5) * 0.7;
            targetX = (mouse.y / window.innerHeight - 0.5) * 0.5;
          }
          group.rotation.y += (targetY - group.rotation.y) * 0.04 + 0.0016 * (1 - lastMM);
          group.rotation.x += (targetX - group.rotation.x) * 0.04;
          group.rotation.z = Math.sin(window.scrollY * 0.001) * 0.08;

          // Leader-line anchors for the About block: screen position of each band's left-most vertex.
          if (figureSync.active) {
            group.updateMatrixWorld(true);
            camera.updateMatrixWorld();
            const rect = canvas.getBoundingClientRect();
            const pa = posAttr.array as Float32Array;
            // Bands share boundary vertices (duplicated per face): each band takes its left-most vertex that no
            // earlier band has taken, so two leader lines never end on the same point.
            const taken = new Set<string>();
            for (let g = 0; g < groupCount; g++) {
              let bestX = Infinity;
              let bestY = 0;
              let bestKey = '';
              const from = g * groupSize;
              const to = Math.min(vertexCount, from + groupSize);
              for (let vi = from; vi < to; vi++) {
                anchorVec.set(pa[vi * 3], pa[vi * 3 + 1], pa[vi * 3 + 2]).applyMatrix4(group.matrixWorld).project(camera);
                const sx = rect.left + (anchorVec.x * 0.5 + 0.5) * rect.width;
                const sy = rect.top + (-anchorVec.y * 0.5 + 0.5) * rect.height;
                const key = Math.round(sx / 3) + ',' + Math.round(sy / 3);
                if (sx < bestX && !taken.has(key)) {
                  bestX = sx;
                  bestY = sy;
                  bestKey = key;
                }
              }
              taken.add(bestKey);
              figureSync.anchors[g] = { x: bestX, y: bestY };
            }
          }
        },
        dispose: () => {
          geo.dispose();
          edges.dispose();
          pointsMat.dispose();
          lineMat.dispose();
          ringGeo.dispose();
          ringMat.dispose();
          ringTextureDefault.dispose();
          ringTextureMono.dispose();
          pulseGeo.dispose();
          pulseMat.dispose();
          dotTexture.dispose();
          coreGeo.dispose();
          coreMat.dispose();
          glowTexture.dispose();
          dustLayers.forEach((l) => {
            l.geo.dispose();
            l.mat.dispose();
          });
        },
      };
    },
    enabled,
  );

  return { canvasRef, failed: failed || !enabled };
}
