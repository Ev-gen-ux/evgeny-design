import { useEffect, useRef, useState } from 'react';
import type * as ThreeNS from 'three';

export interface ThreeSceneContext {
  THREE: typeof ThreeNS;
  canvas: HTMLCanvasElement;
  /** Raw, non-reactive mouse position (mirrors the source's `this._mouse` instance var — deliberately not React state, so mouse movement never re-runs this effect). */
  mouseRef: { current: { x: number; y: number } | null };
}

export interface ThreeSceneHandle {
  scene: ThreeNS.Scene;
  camera: ThreeNS.PerspectiveCamera;
  /** Called once per animation frame before render, with a performance.now()-style timestamp. */
  onFrame: (nowMs: number) => void;
  onResize?: (width: number, height: number) => void;
  dispose?: () => void;
}

/**
 * Generic three.js scene engine — 1:1 with the shared shape of initThree()/
 * initFooterThree() in Portfolio.dc.html: dynamic `import('three')`, a
 * WebGLRenderer sized to the canvas's parent, a rAF render loop, resize
 * handling, and disposal on unmount/disable. Scene-specific geometry/materials/
 * per-frame logic are supplied by `setup` (see useSaturnThreeScene).
 */
export function useThreeScene(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  setup: (ctx: ThreeSceneContext) => ThreeSceneHandle,
  enabled: boolean,
): { failed: boolean } {
  const [failed, setFailed] = useState(false);
  const setupRef = useRef(setup);
  // Refs can't be written during render (React flags it) — sync it in an effect instead.
  // Safe even though this runs after the main effect below: `setup` is only ever
  // read from an async callback that resolves after both effects have committed.
  useEffect(() => {
    setupRef.current = setup;
  });

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let raf = 0;
    let resizeHandler: (() => void) | null = null;
    let disposeHandle: (() => void) | undefined;
    let renderer: ThreeNS.WebGLRenderer | null = null;

    const mouseRef: { current: { x: number; y: number } | null } = { current: null };
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMouseMove);

    (async () => {
      try {
        const THREE = await import('three');
        if (cancelled) return;
        // Mobile-only (2026-09-19, real-device jank still reported after the
        // first pixel-ratio cut) — no antialiasing and a lower pixel-ratio
        // ceiling on narrow viewports specifically. MSAA on WebGL costs real
        // fill-rate/bandwidth per frame, and this canvas renders continuously
        // for the entire page's scroll range (see the pixel-ratio comment
        // below) — a real phone's weaker GPU pays that cost on every single
        // frame, every scroll, for the whole time someone's on the home
        // page, which desktop-CPU devtools emulation can't reveal at all
        // (it resizes the viewport, it doesn't throttle the GPU). Desktop/
        // tablet keep antialiasing and the 1.5× cap from the previous pass.
        const isMobile = window.innerWidth <= 768;
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile });
        // Pixel ratio cap lowered from 2 to 1.5 (2026-09-18) — originally
        // tuned for the icosahedron hero figure, which used to roam the
        // whole page on a `position: fixed` canvas (removed 2026-10-24); its
        // render loop ran alongside the letter-assembly animation's own rAF
        // loop for the whole time someone was on the home page — reported
        // live as noticeably janky scrolling on Home specifically, vs smooth
        // on case-study pages, which mount no three.js scene at all. Kept as
        // the shared default for any scene built on this hook (currently
        // Saturn, scoped to Hero only). 2× device pixel ratio means shading
        // 4× the pixels; 1.5×
        // means ~2.25×, a meaningful GPU cost cut with only a subtle,
        // likely-unnoticeable softness change on an ambient, mostly-dark
        // background shape — cheaper insurance against contention with the
        // DOM animation than reworking either loop's own logic. Mobile-only
        // (2026-09-19) cuts further, to 1× (native resolution, no
        // supersampling) — still reported janky at 1.5× on a real phone.
        renderer.setPixelRatio(isMobile ? 1 : Math.min(1.5, window.devicePixelRatio || 1));

        const handle = setupRef.current({ THREE, canvas, mouseRef });
        disposeHandle = handle.dispose;

        resizeHandler = () => {
          const parent = canvas.parentElement;
          if (!parent || !renderer) return;
          const w = parent.clientWidth || 1;
          const h = parent.clientHeight || 1;
          renderer.setSize(w, h, false);
          handle.camera.aspect = w / h;
          handle.camera.updateProjectionMatrix();
          handle.onResize?.(w, h);
        };
        resizeHandler();
        window.addEventListener('resize', resizeHandler);

        // A ~30fps throttle was tried here on mobile (2026-09-19), on the
        // assumption that this scene's motion (rotation/drift) was slow
        // and ambient enough that skipping every other frame wouldn't be
        // noticeable — reverted the same day, reported live as visibly
        // worse: the motion is fast enough that redrawing every other
        // frame reads as a stepped, doubled-up jump rather than smooth
        // ambient drift. Back to every frame, on every device — the
        // pixel-ratio cap and disabled antialiasing above (same date) stay,
        // since neither affects motion smoothness, only rendering
        // resolution/quality.
        const animate = (now: number) => {
          handle.onFrame(now);
          renderer!.render(handle.scene, handle.camera);
          raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('mousemove', onMouseMove);
      if (raf) cancelAnimationFrame(raf);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      disposeHandle?.();
      renderer?.dispose();
    };
  }, [canvasRef, enabled]);

  return { failed };
}
