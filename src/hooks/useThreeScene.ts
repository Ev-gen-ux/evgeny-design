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
 * per-frame logic are supplied by `setup` (see useHeroThreeScene/useFooterThreeScene).
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
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

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

        const animate = () => {
          handle.onFrame(performance.now());
          renderer!.render(handle.scene, handle.camera);
          raf = requestAnimationFrame(animate);
        };
        animate();
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
