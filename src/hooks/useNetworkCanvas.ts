import { useEffect, type RefObject } from 'react';

/**
 * 1:1 with initNetwork() in Portfolio.dc.html — 30 bouncing particle nodes,
 * connected by lines when close, scoped to the canvas's parent element bounds
 * (used inside #skills). Unlike useGraphCanvas, this one stops animating
 * entirely under reduced motion (draws one static frame and returns) — matches
 * the source's `if (!reducedMotion) requestAnimationFrame(draw)` gate.
 */
export function useNetworkCanvas(canvasRef: RefObject<HTMLCanvasElement | null>, reducedMotion: boolean) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.width / dpr;
    const H = () => canvas.height / dpr;
    const N = 30;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
    }));

    let raf = 0;
    const draw = () => {
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);
      // Canvas 2D fillStyle/strokeStyle can't read CSS custom properties via
      // var() the way a real element's `style` can — mono theme (2026-09-17)
      // is checked directly (a cheap attribute read, not getComputedStyle,
      // which would be a real cost called every frame) and branches to a
      // literal matching theme-mono.css's own override values; keep these
      // two in sync if that palette ever changes.
      const mono = document.documentElement.dataset.theme === 'mono';
      ctx.strokeStyle = mono ? 'rgba(152,152,156,0.28)' : 'rgba(var(--color-slate-mist-rgb), 0.28)';
      ctx.fillStyle = mono ? 'rgba(255,255,255,0.55)' : 'rgba(232,67,43,0.55)';
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reducedMotion) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.globalAlpha = 1 - d / 120;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canvasRef, reducedMotion]);
}
