import { useRef } from 'react';
import { colors, colorsNumeric } from '../tokens';
import { pipelineSync } from './pipelineSync';
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
      const { THREE, mouseRef } = ctx;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 10);
      camera.position.z = 4.4;

      const geo = new THREE.IcosahedronGeometry(1.5, 1);
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
            ringMat.map = mono ? ringTextureMono : ringTextureDefault;
            ringMat.needsUpdate = true;
          }

          const build = Math.min(1, (performance.now() - t0) / 1900);
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
          } else {
            if ((colorAttr.array as Float32Array)[0] !== 1) {
              (colorAttr.array as Float32Array).fill(1);
              colorAttr.needsUpdate = true;
            }
            const edgeArr = edgeColorAttr.array as Float32Array;
            if (edgeArr[0] !== slateColor.r) {
              for (let ei = 0; ei < edgeVertexCount; ei++) {
                edgeArr[ei * 3] = slateColor.r;
                edgeArr[ei * 3 + 1] = slateColor.g;
                edgeArr[ei * 3 + 2] = slateColor.b;
              }
              edgeColorAttr.needsUpdate = true;
            }
            if (ringMat.opacity !== 0) ringMat.opacity = 0;
          }

          const mouse = mouseRef.current;
          if (mouse) {
            targetY = (mouse.x / window.innerWidth - 0.5) * 0.7;
            targetX = (mouse.y / window.innerHeight - 0.5) * 0.5;
          }
          group.rotation.y += (targetY - group.rotation.y) * 0.04 + 0.0016;
          group.rotation.x += (targetX - group.rotation.x) * 0.04;
          group.rotation.z = Math.sin(window.scrollY * 0.001) * 0.08;
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
        },
      };
    },
    enabled,
  );

  return { canvasRef, failed: failed || !enabled };
}
