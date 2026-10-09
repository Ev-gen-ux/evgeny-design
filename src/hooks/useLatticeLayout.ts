import { useEffect, useState } from 'react';

export interface LatticeLayout {
  left: string;
  top: string;
  size: string;
  opacity: string;
}

/**
 * 1:1 with latticeLayout() in Portfolio.dc.html — the hero three.js canvas
 * wrapper is `position:fixed` and roams the viewport based on scroll progress
 * across the *entire document* (not just the hero section), growing slightly
 * near the very end of the page. Rare case where a "hero" element's position
 * genuinely depends on whole-page scroll, not just its own section.
 */
export function useLatticeLayout(): LatticeLayout {
  const [layout, setLayout] = useState<LatticeLayout>(() => compute());

  useEffect(() => {
    let raf: number | null = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setLayout(compute());
        raf = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return layout;
}

function compute(): LatticeLayout {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const docH = typeof document !== 'undefined' ? document.documentElement.scrollHeight : vh * 2;
  const sy = typeof window !== 'undefined' ? window.scrollY : 0;
  const p = Math.max(0, Math.min(1, sy / Math.max(1, docH - vh)));
  const foot = Math.max(0, Math.min(1, (p - 0.82) / 0.18));
  const fe = foot * foot * (3 - 2 * foot);
  const wander = Math.sin(p * Math.PI * 2.2);
  const roamX = 76 - fe * 26 + wander * (1 - fe) * 18;
  const roamY = 50 + Math.sin(p * Math.PI * 3.1) * (1 - fe) * 16;
  // Hero (2026-09-26, per user request): the figure sits dead-center while the
  // hero text lives in the corners, then eases onto the same roaming path as
  // before over the first ~90% of a viewport of scroll — the roaming itself is
  // untouched, only its starting position changed.
  const he = Math.max(0, Math.min(1, sy / (vh * 0.9)));
  const heroEase = he * he * (3 - 2 * he);
  const baseX = 50 + (roamX - 50) * heroEase;
  const baseY = 50 + (roamY - 50) * heroEase;
  const baseSize = 30;
  const size = baseSize + fe * 22;
  return {
    left: baseX.toFixed(2) + '%',
    top: baseY.toFixed(2) + '%',
    size: 'clamp(220px,' + size.toFixed(1) + 'vw,' + (440 + fe * 180).toFixed(0) + 'px)',
    opacity: (0.9 - fe * 0.42).toFixed(2),
  };
}
