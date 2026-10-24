import { useRef } from 'react';
import { useThreeScene, type ThreeSceneContext, type ThreeSceneHandle } from './useThreeScene';
import { colorsNumeric } from '../tokens';

/**
 * Saturn hero-layer scene — step 2 of the plan in
 * /Users/evgeniyakovenko/.claude/plans/melodic-crunching-teacup.md ("Saturn —
 * полноэкранная hero-фигура"). 1:1 port of the user-supplied "Particle
 * Saturn 2 — Originkit" reference's shader pipeline (settingsFor/buildCloud,
 * both GLSL shaders, including the ray-occlusion trick that hides ring
 * particles passing behind the core). NOT ported: the reference's own
 * standalone SaturnScene class (own renderer/camera/ResizeObserver — this
 * hook uses useThreeScene's instead) and pointer-drag rotation (not part of
 * the approved plan — this is a scroll-driven ambient background, not an
 * interactive widget). Colors are the one deliberate content change, agreed
 * with the user beforehand: colorsNumeric.vellum (core) / colorsNumeric.glow
 * (rings) in place of the reference's raw white hex, with the mono-theme
 * branch for vellum only (no mono override exists for --color-glow).
 */

const CORE_RADIUS = 1;
// 2026-10-24, round 3: the round-2 fix (artificially shrinking uCoreRadius to
// 0.5, independent of CORE_RADIUS) was rejected by the user after a live
// screenshot compare against the reference render — it read as a cheap trick
// ("просто засунул фигуру посередине... так чтобы она не пересекалась с
// кольцами"/"тупо банально"), not as a real Saturn: the sphere looked
// disproportionately small, floating with an obvious artificial gap, instead
// of the reference's large sphere with the ring hugging/crossing close over
// its face. Reverted: uCoreRadius uses CORE_RADIUS directly again, no
// separate shrink constant. The near-side ring crossing in front of the
// sphere's disc (visible in the reference) is already handled correctly by
// the ray-sphere occlusion test in the fragment/vertex shader below (occludes
// only the FAR side of the ring, the near side draws on top via draw order,
// no depth test) — it doesn't require shrinking the sphere or opening a
// vertical gap to work. What still changed this round: PRESET.sizePercent
// (zoom) and a vertical frame offset — see both below — to match the
// reference's large, higher-positioned composition instead of a small,
// centered, heavily-padded one.
const RING_THICKNESS = 0.011;
const RING_MOTE_FACTOR = 1.35;
const MAX_MOTES = 90000;
const PERSPECTIVE = 0.15;
const VIEW_SPAN = 6.4;

// Effective config: the reference's own preset (density/glow/tilt/etc.) plus
// its ringOptions default — i.e. what a bare <ParticleSaturn /> renders.
const PRESET = {
  density: 20,
  particleSize: 20,
  // 2026-10-24: lowered from 20 — overall brightness (core+ring equally,
  // via uGlow) dialed down slightly on request, after the core/ring mean
  // was already matched (see the ×1.2 note on the core's `bright` formula
  // in SATURN_VERTEX below) — this scales both, so the match is preserved.
  glow: 16,
  // 2026-10-24, side-view request: user explicitly asked for a simple side
  // view matching a new reference screenshot (183.png) — rings open as a
  // flattened ellipse, sphere dominant, pole only faintly suggested by
  // meridian convergence, not the near-face-on "looking into the ring
  // system" look tilt=80 produces. tilt rotates the ring plane (local XZ)
  // around the view's X axis, so the ring's apparent open-ness is
  // ~sin(tilt) of its true radius — estimated from the reference image's
  // ring aspect ratio, not re-derived from source (no access to it for this
  // specific angle).
  // 2026-10-24, round 4: user reported the ring at the BOTTOM of the sphere
  // reading as hidden behind the planet, when it should cross in FRONT there
  // (the classic "ring dips below the visible limb in front" Saturn look).
  // 2026-10-24, round 6 (reverted): tried flipping the sign (tilt=-20) on
  // the theory it would swap which side of the ring is "near" vs "far" —
  // instead it threw off the sphere/ring vertical alignment on screen (user:
  // "кольца теперь вверху, а Сатурн под ними" — reported as broken, not
  // fixed). Reverted to +20. The near/far-swap hypothesis for the original
  // bug is now unconfirmed — needs a fresh look at the occlusion math itself
  // rather than the sign of tilt.
  tilt: 20,
  roll: 3,
  spinSpeed: 7,
  // 210 — the reference preset's own default, kept as-is (round-3 attempt to
  // raise this to 280 for a "bigger, more filled" look was wrong: with
  // outerRadius=2.62×CORE_RADIUS and this hook's updateCamera math, 280
  // shrank the visible half-width below 2.62, clipping the outer ring off
  // the sides/top entirely — confirmed by a live screenshot showing only the
  // sphere, no visible rings. At 210 the half-width comes out to ≈2.7,
  // just enough margin for the full ring system to stay on-screen while
  // still reaching toward the edges — this is what "full width" in the
  // reference actually requires, not a narrower FOV.
  sizePercent: 210,
  extraRings: 4,
  extraRingSpacing: 0.82,
  ringOptions: { gaps: 1, orbitSpeed: 9, innerRadius: 105, outerRadius: 262 },
};

const monoVellum = '#d8d8d5'; // matches theme-mono.css's --color-vellum override

function clamp(v: number, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' && isFinite(v) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}

function settingsFor() {
  const ring = PRESET.ringOptions;
  const density = clamp(PRESET.density, 1, 20, 20);

  const baseMotes = 600 + density * density * 95;
  const coreMotes = Math.min(MAX_MOTES, Math.round(baseMotes));
  const extraRingsCount = clamp(PRESET.extraRings, 0, 4, 4);
  const extraRingSpacing = clamp(PRESET.extraRingSpacing, 0.1, 2.0, 0.82);
  const ringMotes = Math.min(MAX_MOTES, Math.round(baseMotes * RING_MOTE_FACTOR));
  const extraRingMotes = extraRingsCount > 0 ? Math.min(MAX_MOTES, Math.round(ringMotes * 0.4)) : 0;

  const innerFraction = clamp(ring.innerRadius, 105, 200, 105) / 100;
  const outerFraction = clamp(ring.outerRadius, 110, 300, 262) / 100;

  return {
    coreMotes,
    ringMotes,
    extraRingMotes,
    extraRingsCount,
    extraRingSpacing,
    moteSize: 0.5 + clamp(PRESET.particleSize, 1, 20, 20) * 0.13,
    glow: 0.15 + clamp(PRESET.glow, 1, 20, 20) * 0.055,
    tiltRadians: (clamp(PRESET.tilt, -80, 80, 80) * Math.PI) / 180,
    rollRadians: (clamp(PRESET.roll, -90, 90, 3) * Math.PI) / 180,
    spinRate: clamp(PRESET.spinSpeed, 0, 20, 7) * 0.05,
    innerRadius: innerFraction * CORE_RADIUS,
    outerRadius: Math.max(innerFraction + 0.08, outerFraction) * CORE_RADIUS,
    gapCount: Math.round(clamp(ring.gaps, 0, 4, 1)),
    ringThickness: RING_THICKNESS,
    orbitRate: clamp(ring.orbitSpeed, 0, 20, 9) * 0.11,
  };
}

type Settings = ReturnType<typeof settingsFor>;

function insideGap(S: Settings, radius: number, span: number): boolean {
  for (let g = 0; g < S.gapCount; g++) {
    const centre = S.innerRadius + span * ((g + 1) / (S.gapCount + 1));
    const halfWidth = span * (0.075 - g * 0.011);
    if (Math.abs(radius - centre) < halfWidth) return true;
  }
  return false;
}

function pickRingRadius(S: Settings, span: number): number {
  for (let attempt = 0; attempt < 10; attempt++) {
    const u = Math.sqrt(Math.random());
    const radius = S.innerRadius + u * span;
    if (!insideGap(S, radius, span)) return radius;
  }
  return S.outerRadius;
}

function buildCloud(THREE: typeof import('three'), S: Settings) {
  const count = S.coreMotes + S.ringMotes + S.extraRingMotes;
  const position = new Float32Array(count * 3); // dummy — real position computed in the vertex shader
  const kind = new Float32Array(count);
  const along = new Float32Array(count);
  const seed = new Float32Array(count);
  const radius = new Float32Array(count);

  for (let i = 0; i < S.coreMotes; i++) {
    kind[i] = 0;
    along[i] = (i + 0.5) / S.coreMotes;
    seed[i] = Math.random();
    radius[i] = 0;
  }

  const span = S.outerRadius - S.innerRadius;
  for (let i = 0; i < S.ringMotes; i++) {
    const k = S.coreMotes + i;
    kind[k] = 1;
    along[k] = i / Math.max(1, S.ringMotes - 1);
    seed[k] = Math.random();
    radius[k] = pickRingRadius(S, span);
  }

  const extraStart = S.coreMotes + S.ringMotes;
  if (S.extraRingsCount > 0 && S.extraRingMotes > 0) {
    const perRing = Math.floor(S.extraRingMotes / S.extraRingsCount);
    let idx = 0;
    for (let r = 0; r < S.extraRingsCount; r++) {
      const bandInner = S.outerRadius + S.extraRingSpacing * CORE_RADIUS + r * 0.22 * CORE_RADIUS;
      const bandWidth = 0.08 * CORE_RADIUS;
      for (let i = 0; i < perRing && extraStart + idx < count; i++, idx++) {
        const k = extraStart + idx;
        kind[k] = 1;
        along[k] = i / Math.max(1, perRing - 1);
        seed[k] = Math.random();
        const u = Math.sqrt(Math.random());
        radius[k] = bandInner + u * bandWidth;
      }
    }
    while (extraStart + idx < count) {
      const k = extraStart + idx;
      kind[k] = 1;
      along[k] = 0.5;
      seed[k] = Math.random();
      radius[k] = S.outerRadius + S.extraRingSpacing * CORE_RADIUS;
      idx++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aRadius', new THREE.BufferAttribute(radius, 1));
  return geometry;
}

const SATURN_VERTEX = /* glsl */ `
  attribute float aKind;
  attribute float aAlong;
  attribute float aSeed;
  attribute float aRadius;

  uniform float uTime;
  uniform float uMoteSize;
  uniform float uOrbitRate;
  uniform float uRingThickness;
  uniform float uCoreRadius;
  uniform float uPixelRatio;
  uniform float uInnerRingOuter;
  uniform float uRingLift;

  varying float vKind;
  varying float vBright;

  const float TAU = 6.28318530718;

  float hash11(float n) {
    return fract(sin(n * 78.233) * 43758.5453);
  }

  void main() {
    vec3 modelPos;
    float bright = 1.0;

    if (aKind < 0.5) {
      float y = 1.0 - aAlong * 2.0;
      float ringRadius = sqrt(max(0.0, 1.0 - y * y));
      float theta = aAlong * 2399.96;
      modelPos = vec3(cos(theta) * ringRadius, y, sin(theta) * ringRadius) * uCoreRadius;
      modelPos *= 1.0 + (hash11(aSeed * 91.7) - 0.5) * 0.012;
      // 2026-10-25: "яркость планеты как у колец" — core's own range (0.55–1.15,
      // mean ≈0.85) averaged noticeably dimmer than the ring branch below
      // (mean ≈1.02 after its own 1.3× boost). ×1.2 brings the core's mean up
      // to ≈1.02 to match, without changing its spread/noise pattern.
      bright = (0.55 + hash11(aSeed * 13.1) * 0.6) * 1.2;
    } else {
      float orbitRadius = aRadius;
      float rate = uOrbitRate / pow(max(orbitRadius, 0.2), 1.5);
      float theta = aSeed * TAU + uTime * rate;
      float lift = (hash11(aSeed * 37.9) - 0.5) * 2.0 * uRingThickness;
      modelPos = vec3(cos(theta) * orbitRadius, lift, sin(theta) * orbitRadius);
      float lane = hash11(floor(orbitRadius * 46.0));
      // 2026-10-24: "кольцо целиком ярче" — boosted this branch only (ring
      // particles, aKind>=0.5); uGlow in the fragment shader is shared with
      // the core, so bumping it would brighten the sphere too. Went 1.4 → 2.0,
      // then dialed back to 1.3 — at 2.0 the left-side ring arc washed out the
      // heading text behind it (screenshot 197.png). Still above the original
      // unboosted brightness, below the first guess. Visual estimate, not measured.
      bright = (0.35 + lane * 0.95) * (0.6 + hash11(aSeed * 5.3) * 0.7) * 1.3;
      // 2026-10-24: "самое маленькое кольцо, ближе всего к Сатурну, поднять
      // яркость" — aRadius distinguishes the single inner ring (radius inside
      // [innerRadius, outerRadius], this one) from the extraRings bands further
      // out (radius > outerRadius + spacing); only the inner one gets the extra
      // boost, the outer bands and the core are untouched.
      if (orbitRadius <= uInnerRingOuter) {
        bright *= 1.3;
      }
      // 2026-10-24: "кольца должны быть перед планетой, а не наоборот" (mobile) —
      // this core-vs-ring "front" look was never a real depth test (see the
      // occluded-branch comment ~30 lines down): it's pure density/brightness
      // contrast, dense ring band stacked on sparse core lines reads as
      // "covering" it. That contrast assumed the ring stays brighter than the
      // core — true before the 2026-10-25 core match-boost (core's own bright
      // formula above now *1.2's its way up to the SAME mean the ring sits at,
      // "яркость планеты как у колец"), and still roughly true on desktop.
      // uGlow (readGlow, below) is shared equally by core and ring on
      // both platforms now (no mobile-only multiplier any more — "сделай по
      // яркости на моб также как и на десктоп"), so it can't fix a
      // ring-vs-core imbalance either way; only a ring-only lift can.
      // uRingLift does exactly that — independent of uGlow, tuned per
      // platform (desktop/mobile) purely for this density-contrast margin,
      // not for overall exposure.
      bright *= uRingLift;
    }

    vec4 viewPos = modelViewMatrix * vec4(modelPos, 1.0);

    vec3 modelCentre = modelViewMatrix[3].xyz;
    vec3 fromCamera = viewPos.xyz;
    float rayLength = max(length(fromCamera), 1e-5);
    vec3 rayDir = fromCamera / rayLength;

    bool occluded;
    if (aKind < 0.5) {
      // 2026-10-24, reverted back to the reference 1:1: the original
      // "Particle Saturn 2 — Originkit" source (recovered from this session's
      // own transcript after two failed attempts to add a ring/core
      // occlusion or dimming test — "ты обрезал планету", then "ничего не
      // изменилось") has NO ring-vs-core test at all here, only this
      // self-occlusion check. The reference gets its "ring crosses in front
      // of the planet" look for free, with no extra geometry test: the core
      // is a SPARSE comb of meridian lines (big gaps of background between
      // them, see aAlong's theta = aAlong*2399.96 above), the ring is a
      // dense bright band, additive blending with no depth test just sums
      // them — and a dense band stacked on top of a sparse line pattern
      // reads as "covering" it, purely from density contrast, not from any
      // discard/dim logic. Both prior attempts were solving a problem the
      // reference doesn't have; removing them restores the reference
      // behaviour exactly.
      occluded = dot(viewPos.xyz - modelCentre, rayDir) > 0.0;
    } else {
      // 2026-10-25: this ring-vs-core sphere-occlusion test was exactly the
      // "reverted" test the comment above describes — it survived in THIS
      // branch even though the revert above only touched the core's own
      // branch. Live effect: any ring particle whose camera-ray passes
      // behind the core's near surface got hidden outright, which cut a
      // visible gap in the ring everywhere it should cross IN FRONT of the
      // sphere (reported live, screenshot 228 — "кольца на заднем плане,
      // видно сам срез"). The core here isn't actually opaque (sparse
      // meridian lines, see the branch above) so treating it as a hard
      // occluder was never right to begin with. Dropped entirely — ring
      // particles are never occluded, exactly like the reference; the
      // "rings in front" look comes only from the density/brightness
      // contrast (uRingLift et al.), same mechanism as the core branch.
      occluded = false;
    }

    if (occluded) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vKind = aKind;
      vBright = 0.0;
      return;
    }

    gl_Position = projectionMatrix * viewPos;
    gl_PointSize = uMoteSize * uPixelRatio * (9.0 / max(0.001, -viewPos.z));

    vKind = aKind;
    vBright = bright;
  }
`;

const SATURN_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec3 uCoreColor;
  uniform vec3 uRingColor;
  uniform float uGlow;

  varying float vKind;
  varying float vBright;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;

    float fall = 1.0 - d;
    float shape = pow(fall, 5.0) + pow(fall, 1.6) * 0.3;

    vec3 col = vKind < 0.5 ? uCoreColor : uRingColor;
    float a = shape * vBright * (0.35 + uGlow);

    gl_FragColor = vec4(col * a, a);
  }
`;

function readPixelRatio() {
  const isMobile = window.innerWidth <= 768;
  return isMobile ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
}

// 2026-10-25: removed the mobile-only glow multiplier — explicit request,
// "сделай по яркости на моб также как и на десктоп" (make mobile brightness
// match desktop). History: `useThreeScene` forces `renderer.setPixelRatio(1)`
// on mobile instead of desktop/tablet's up-to-1.5× cap (perf — see that
// hook's own comment, a real-device jank fix, not touched here), which was
// first treated as making the figure read dimmer (lost supersampling) and
// "compensated" with a boost — several boost values (1.5 → 1.15 → 1.05) all
// read as "basically unchanged," so the constant was flipped to cut
// brightness instead (0.6), apparently chasing a moving target rather than
// a stable read on the actual mismatch. Given the explicit ask now is
// parity, not any particular direction, the simplest correct fix is no
// mobile-specific multiplier at all: `uGlow` uses the same `base` value
// both platforms get from `PRESET.glow`, so the two can no longer drift
// apart from each other by construction.
function readGlow(base: number) {
  return base;
}

// 2026-10-24, extended 2026-10-25: restores the ring's brightness margin
// over the core (see uRingLift's declaration/use in the vertex shader
// above) — kept as its own constant, independent of `uGlow`/`readGlow`,
// because it compensates a DIFFERENT problem (ring-vs-core visual
// layering, not overall exposure). Originally mobile-only (desktop's own
// margin was confirmed fine at the time) — but the core's own
// `bright` formula picked up a ×1.2 "яркость планеты как у колец" boost
// the same day (see its own comment, ~line 245), deliberately matching the
// core's mean brightness to the ring's. That erased the margin this
// constant exists to protect, on BOTH desktop and mobile — reported live
// as "кольца должны перекрывать планету, а сейчас опять планета сверху"
// (screenshot-free, both viewports). There is no real depth/occlusion test
// here (see the aKind<0.5 branch's own comment, ~line 303) — "rings in
// front" is ENTIRELY this density/brightness contrast, so losing the
// margin directly reads as "planet on top." Fixed by lifting the ring on
// desktop too (1.2, proportional to the core's own ×1.2 — restores the
// SAME ratio the two had before the core boost existed) and scaling
// mobile's lift up by the same ×1.2 factor (1.5 → 1.8) rather than leaving
// it at a value tuned against the core's pre-boost brightness.
const DESKTOP_RING_LIFT = 1.2;
const MOBILE_RING_LIFT = 1.8;

function readRingLift() {
  const isMobile = window.innerWidth <= 768;
  return isMobile ? MOBILE_RING_LIFT : DESKTOP_RING_LIFT;
}

export function useSaturnThreeScene(enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { failed } = useThreeScene(
    canvasRef,
    (ctx: ThreeSceneContext): ThreeSceneHandle => {
      const { THREE } = ctx;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
      const S = settingsFor();

      const geometry = buildCloud(THREE, S);

      const themeVellum = new THREE.Color(colorsNumeric.vellum);
      const monoVellumColor = new THREE.Color(monoVellum);
      const ringColor = new THREE.Color(colorsNumeric.glow); // no mono override exists for --color-glow

      let mono = document.documentElement.dataset.theme === 'mono';

      const material = new THREE.ShaderMaterial({
        vertexShader: SATURN_VERTEX,
        fragmentShader: SATURN_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uMoteSize: { value: S.moteSize },
          uOrbitRate: { value: S.orbitRate },
          uRingThickness: { value: S.ringThickness },
          // 2026-10-24: "уменьши саму планету на 10%, кольца не трогай" —
          // uCoreRadius scales ONLY the core particles' modelPos (aKind<0.5
          // branch, `modelPos *= uCoreRadius`) and the ring-occlusion test's
          // occluder radius (so the hidden zone behind the sphere shrinks to
          // match, no mismatch gap). Ring positions (aKind>=0.5) come from
          // `aRadius`, baked in JS off CORE_RADIUS independently — never
          // multiplied by this uniform — so rings are untouched.
          uCoreRadius: { value: CORE_RADIUS * 0.81 },
          uInnerRingOuter: { value: S.outerRadius },
          uRingLift: { value: readRingLift() },
          uPixelRatio: { value: readPixelRatio() },
          uCoreColor: { value: (mono ? monoVellumColor : themeVellum).clone() },
          uRingColor: { value: ringColor.clone() },
          uGlow: { value: readGlow(S.glow) },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });

      const group = new THREE.Group();
      group.rotation.order = 'ZXY';
      // 2026-10-24: explicit, standalone request — "вся экспозиция прижата к
      // низу, поднять выше" — unrelated to the earlier-session FRAME_OFFSET_Y
      // attempt (that one was rejected because it was bundled with a
      // shrink-the-sphere hack and contradicted a then-current "strictly
      // centered" instruction). Here it's the only change, straight from a
      // live screenshot showing empty headroom above the rings and the
      // composition sitting low against the bottom of the hero. Camera still
      // looks at world origin (unchanged), so shifting the group up in world
      // Y moves the whole sphere+rings higher on screen without touching
      // FOV/zoom. Value is a visual estimate, not derived — needs a live
      // check that it doesn't clip the top of the outer ring.
      // 2026-10-24: 0.35 was too much — sphere top pushed into/behind the
      // fixed header. Backed off to 0.18, still estimated visually.
      // 2026-10-25: reverted to 0 — the +0.18 upward shift turned out to be
      // the actual reason the ring never visibly crossed the sphere's face
      // (reported live, screenshot 229 — "кольца за планетой"), not an
      // occlusion or `tilt` problem (both were tried and ruled out first,
      // via Playwright screenshots at tilt 30/40/50 — higher tilt only
      // collapsed the ring toward a polar/spiral look, confirmed NOT the
      // right lever). At 0, the ring is vertically centered on the sphere
      // again, same as before the "raise it" request, and the dense band
      // clearly crosses the sphere's upper face (confirmed via Playwright
      // screenshots across several orbital phases — consistent, not a
      // lucky frame). A smaller compensating offset (0.08) was tried to
      // partially keep both asks satisfied — rejected, it let the ring
      // graze the spec-tag badges above the sphere while weakening the
      // crossing back down. User explicitly prioritized the crossing over
      // the raised framing when asked directly. If the composition now
      // reads as sitting too low again, that's the known trade-off to
      // revisit, not a new bug.
      group.position.y = 0;
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      group.add(points);
      scene.add(group);

      let spinAngle = 0;
      let lastT = performance.now();

      const updateCamera = (width: number, height: number) => {
        const aspect = Math.max(1, width) / Math.max(1, height);
        const distance = 1 / PERSPECTIVE;
        const span = VIEW_SPAN * (100 / PRESET.sizePercent);
        const visibleHeight = aspect < 1 ? span / aspect : span;

        camera.aspect = aspect;
        camera.position.set(0, 0, distance);
        camera.lookAt(0, 0, 0);
        camera.fov = 2 * Math.atan(visibleHeight / 2 / distance) * (180 / Math.PI);
        camera.near = Math.max(0.1, distance - 20);
        camera.far = distance + 20;
        camera.updateProjectionMatrix();
      };
      updateCamera(ctx.canvas.clientWidth || 1, ctx.canvas.clientHeight || 1);

      return {
        scene,
        camera,
        onFrame: (nowMs: number) => {
          const now = performance.now();
          let dt = (now - lastT) / 1000;
          lastT = now;
          if (!isFinite(dt) || dt < 0) dt = 0;
          if (dt > 0.05) dt = 0.05;

          spinAngle += S.spinRate * dt;
          group.rotation.set(S.tiltRadians, spinAngle, S.rollRadians);

          material.uniforms.uTime.value = nowMs / 1000;

          const nowMono = document.documentElement.dataset.theme === 'mono';
          if (nowMono !== mono) {
            mono = nowMono;
            material.uniforms.uCoreColor.value.copy(mono ? monoVellumColor : themeVellum);
          }
        },
        onResize: (width: number, height: number) => {
          updateCamera(width, height);
          material.uniforms.uPixelRatio.value = readPixelRatio();
          material.uniforms.uGlow.value = readGlow(S.glow);
          material.uniforms.uRingLift.value = readRingLift();
        },
        dispose: () => {
          geometry.dispose();
          material.dispose();
        },
      };
    },
    enabled,
  );

  return { canvasRef, failed };
}
