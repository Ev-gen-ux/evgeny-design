import { useLayoutEffect, useRef, type RefObject } from 'react';
import { pipelineSync } from './pipelineSync';
import { seedOf, asmSeed, docTop, type AsmSpan } from './asmMath';

/**
 * 1:1 with buildAsmUnits/measureAsmUnits/driveAsm/startAsmLoop/startAsmClock in
 * Portfolio.dc.html — the "assembly" effect where paragraph/heading text is
 * split into per-character (or per-word, for long text) spans that scatter to
 * random offsets and reassemble as they scroll into view (hero text reassembles
 * on load instead, via a 2.6s clock; pipeline panel text syncs to which panel
 * is active, via `pipelineSync` — written by usePipelineScroll).
 *
 * This is genuinely imperative DOM surgery outside React's render cycle — it
 * splits text nodes into <span> elements directly and animates their style
 * every frame via rAF, matching the source exactly rather than a React-idiomatic
 * rewrite. It works *because* the underlying text values never change after
 * mount (all content here is static), so React's reconciler never has a reason
 * to re-touch these DOM subtrees — same assumption the original code relies on.
 */

interface AsmUnit {
  el: HTMLElement;
  blk: Element;
  spans: AsmSpan[];
  hero: boolean;
  /** Index into pipelineSync.panelT, if this unit sits inside a `[data-pl-panel]`. */
  panel: number | null;
  /**
   * Index into pipelineSync.stepT, if this unit sits inside a `[data-pl-step]`
   * (the AGENT SESSION list's verb/target labels, 2026-08-03) — deliberately
   * separate from `panel`: same per-stage timing source underneath, but
   * `stepT` never resets once a step's been reached, unlike `panelT` (see
   * pipelineSync.ts). Takes priority over both `panel` and `latch` when set.
   */
  step: number | null;
  /** Inside the pipeline's `[data-pl-fixed]` left column — uses pipelineSync.leftT instead of the scroll formula. */
  latch: boolean;
  /**
   * Nearest `[data-asm-sync]` ancestor, if any — a deliberate deviation from
   * the source (user request, 2026-08-02): inside a Selected Work case card,
   * every text unit (including the footer links) reaches fully-assembled
   * together, timed to the CARD's own position, instead of each element's
   * individual distance-into-the-card. Without this, elements further down a
   * tall card (e.g. the "solution"/"result" blocks) were still scattering
   * once the card had already scrolled to the vertical center of the
   * viewport — the most awkward moment for it to still be unreadable.
   */
  syncEl: HTMLElement | null;
  t: number;
  top: number;
  cur?: number;
}

const SKIP_TAGS = new Set(['CANVAS', 'SVG', 'SCRIPT', 'STYLE', 'IMG', 'INPUT', 'TEXTAREA', 'BR']);

export function useAssemblyAnimation(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const unitsRef = useRef<AsmUnit[]>([]);

  // useLayoutEffect, not useEffect (2026-08-02, still-visible flash fix): the
  // scattered-init fix in mk() only closed the gap *inside* buildUnits (span
  // creation → first driveAsm frame) — but useEffect itself runs after the
  // browser paints, so React's plain, never-split text was still visible for
  // a beat first. buildUnits needs to run before paint, splitting text into
  // already-scattered spans before anything is ever shown.
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;

    const buildUnits = () => {
      const vw0 = window.innerWidth;
      const vh0 = window.innerHeight;
      const sections = root.querySelectorAll('section');
      sections.forEach((sec) => {
        const hero = sec.id === 'hero';
        const cands = sec.querySelectorAll('h1,h2,h3,h4,p,span,div,a,li,strong,em,td,th');
        cands.forEach((node) => {
          const el = node as HTMLElement;
          if (el.dataset.ac === '1') return;
          if (el.dataset.asmSplit === '1') return;
          if (el.parentElement && el.parentElement.closest('[data-asm-split="1"]')) return;
          if (unitsRef.current.length > 420) return;
          if (SKIP_TAGS.has(el.tagName)) return;
          if (el.closest('[aria-hidden="true"]')) return;
          // Ancestor-based (2026-08-02, matches the same fix already made in
          // useCaseStudyAssembly.ts for CodeBlock): an exact-match check here
          // only skipped the exact element carrying data-noasm, not its
          // descendants — harmless for single-text-node containers (the hero
          // token counter), but AgentExchange's/Pipeline's AGENT SESSION's
          // nested spans (question/verb/target/outcome) are each their own
          // matching candidate, so they'd still get individually scattered
          // without this.
          if (el.closest('[data-noasm="1"]')) return;
          const kids = Array.prototype.slice.call(el.childNodes) as ChildNode[];
          if (!kids.length) return;
          if (!kids.every((n) => n.nodeType === 3)) return;
          const text = el.textContent || '';
          if (!text || !text.trim()) return;
          if (text.length > 1400) return;
          // The hero <h1> always scatters letter-by-letter, regardless of length
          // (by user request) — every other long text still falls back to
          // per-word (a per-letter split on a full paragraph would be excessive).
          const byWord = el.tagName === 'H1' ? false : text.replace(/\s+/g, ' ').trim().length > 64;
          const parts = text.split(/(\s+)/).filter((x) => x.length);
          if (parts.length > 460) return;

          const frag = document.createDocumentFragment();
          const spans: AsmSpan[] = [];
          const seedI = seedOf(sec.id + ':' + (el.tagName || '') + ':' + text.slice(0, 24));
          let idx = 0;
          const mk = (txt: string) => {
            const sp = document.createElement('span') as AsmSpan;
            sp.dataset.ac = '1';
            sp.textContent = txt;
            sp.style.display = 'inline-block';
            sp.style.whiteSpace = 'pre';
            const r = asmSeed(seedI + idx++ * 37 + 11);
            const d = { dx: (r.r1 - 0.5) * 2, dy: (r.r2 - 0.5) * 2, rot: (r.r3 - 0.5) * 2, sc: 0.4 + r.r4 * 0.5 };
            sp.__d = d;
            // Fully-scattered initial state (k=1, same formula driveAsm uses at
            // q=0) set synchronously at creation — without this, spans sit at
            // the browser default (opacity 1, no transform, i.e. "fully
            // assembled") from the moment they're split until the first
            // animation frame runs. On a fresh mount that gap is one frame and
            // invisible, but it's exactly the bug reported 2026-08-02: Home
            // remounting (e.g. navigating back from a case page) showed the
            // Hero text looking already-assembled for a beat before visibly
            // re-scattering, reading as a spurious "reload." Setting the
            // scattered look up front means the only visible motion is the
            // real reassembly, never a flash of the opposite.
            sp.style.opacity = '0';
            sp.style.transform =
              'translate(' + (d.dx * vw0 * 0.13).toFixed(2) + 'px,' + (d.dy * vh0 * 0.17).toFixed(2) + 'px) rotate(' + (d.rot * 12).toFixed(2) + 'deg) scale(' + (1 - (1 - d.sc) * 0.55).toFixed(4) + ')';
            spans.push(sp);
            return sp;
          };
          parts.forEach((part) => {
            if (!part.trim().length) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            if (byWord) {
              frag.appendChild(mk(part));
              return;
            }
            const wrap = document.createElement('span');
            wrap.style.display = 'inline-block';
            part.split('').forEach((ch) => wrap.appendChild(mk(ch)));
            frag.appendChild(wrap);
          });
          if (!spans.length) return;
          el.textContent = '';
          el.appendChild(frag);
          el.dataset.asmSplit = '1';
          const blk = el.closest('[data-reveal-id]') || sec;
          const panelEl = el.closest('[data-pl-panel]');
          const panel = panelEl ? parseInt(panelEl.getAttribute('data-pl-panel') || '0', 10) : null;
          const stepEl = el.closest('[data-pl-step]');
          const step = stepEl ? parseInt(stepEl.getAttribute('data-pl-step') || '0', 10) : null;
          const latch = !!el.closest('[data-pl-fixed]');
          const syncEl = el.closest('[data-asm-sync]') as HTMLElement | null;
          unitsRef.current.push({ el, blk, spans, hero, panel, step, latch, syncEl, t: -1, top: 0 });
        });
      });
      measureUnits();
    };

    const measureUnits = () => {
      unitsRef.current = unitsRef.current.filter((u) => u.el.isConnected);
      const vh = window.innerHeight;
      for (const u of unitsRef.current) {
        const own = docTop(u.el);
        const base = u.blk.isConnected ? docTop(u.blk as HTMLElement) : own;
        u.top = base + Math.min(own - base, vh * 1.2) * 0.85;
      }
    };

    let loadT = 0;
    const t0 = performance.now();
    let clockRaf = 0;
    const tickClock = () => {
      const now = performance.now();
      loadT = Math.min(1, (now - t0) / 2600);
      if (loadT < 1) clockRaf = requestAnimationFrame(tickClock);
    };

    let raf = 0;
    let last = performance.now();
    // Two passes, deliberately: pass 1 only *reads* layout (getBoundingClientRect
    // for syncEl units), pass 2 only *writes* styles. Smoothness pass (2026-08-02):
    // these used to run interleaved in a single loop — a card's rect() read would
    // force the browser to flush the PREVIOUS unit's just-written style changes
    // and recompute layout synchronously before it could answer, once per synced
    // card, every single frame (classic layout thrashing). Splitting into a
    // read-phase then a write-phase means every read happens against a layout
    // that's already settled, with zero forced recalculation in between.
    const driveAsm = (dt: number) => {
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const vw = window.innerWidth;
      const atBottom = sy + vh >= document.documentElement.scrollHeight - 4;
      const le = loadT * loadT * (3 - 2 * loadT);
      const ease = 1 - Math.pow(0.02, Math.min(0.05, (dt || 16) / 1000));

      const live: AsmUnit[] = [];
      const targets: number[] = [];
      for (const u of unitsRef.current) {
        if (!u.el.isConnected) continue;
        let t: number;
        if (u.syncEl) {
          // Card-level trigger: t=1 once the card's own vertical center has
          // reached the viewport's center, regardless of viewport height.
          const r = u.syncEl.getBoundingClientRect();
          const raw = (vh - r.top) / (vh / 2 + r.height / 2);
          t = Math.max(0, Math.min(1, raw));
        } else if (u.step != null) {
          t = pipelineSync.stepT[u.step] ?? 0;
        } else if (u.panel != null) {
          t = pipelineSync.panelT[u.panel] ?? 0;
        } else if (u.hero) {
          t = le;
        } else {
          const raw = (sy + vh * 0.98 - u.top) / (vh * 0.62);
          t = Math.max(0, Math.min(1, raw));
          if (atBottom) t = 1;
        }
        // `latch` (data-pl-fixed) is a blanket "use the fast, shared leftT"
        // signal — but AGENT SESSION's per-step labels sit *inside*
        // data-pl-fixed too (Pipeline's left column) while wanting their own
        // per-step timing, not the heading's shared one. `panel`/`step` above
        // are strictly more specific than the ancestor-based `latch`, so they
        // win when both are set.
        if (u.latch && u.panel == null && u.step == null) t = pipelineSync.leftT;
        live.push(u);
        targets.push(t);
      }

      for (let i = 0; i < live.length; i++) {
        const u = live[i];
        const t = targets[i];
        if (u.cur == null) u.cur = t;
        u.cur += (t - u.cur) * ease;
        if (Math.abs(t - u.cur) < 0.0015) u.cur = t;
        const q = Math.round(u.cur * 240) / 240;
        if (q === u.t) continue;
        u.t = q;

        const n = u.spans.length;
        const stagger = n > 1 ? Math.min(0.55 / (n - 1), 0.045) : 0;
        const span = 1 - stagger * (n - 1);
        for (let j = 0; j < n; j++) {
          const sp = u.spans[j];
          const d = sp.__d!;
          const cT = Math.max(0, Math.min(1, (q - j * stagger) / span));
          const eT = 1 - Math.pow(1 - cT, 5);
          const k = 1 - eT;
          if (k < 0.002) {
            sp.style.opacity = '';
            sp.style.transform = '';
            sp.style.willChange = '';
            continue;
          }
          sp.style.willChange = 'transform, opacity';
          sp.style.opacity = Math.min(1, eT * 1.45).toFixed(3);
          sp.style.transform =
            'translate(' +
            (d.dx * vw * 0.13 * k).toFixed(2) +
            'px,' +
            (d.dy * vh * 0.17 * k).toFixed(2) +
            'px) rotate(' +
            (d.rot * 12 * k).toFixed(2) +
            'deg) scale(' +
            (1 - (1 - d.sc) * k * 0.55).toFixed(4) +
            ')';
        }
      }
    };

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      driveAsm(dt);
      raf = requestAnimationFrame(loop);
    };

    buildUnits();
    const startRaf = requestAnimationFrame(() => {
      loadT = 0;
      tickClock();
      raf = requestAnimationFrame(loop);
    });

    const onResize = () => measureUnits();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(startRaf);
      if (raf) cancelAnimationFrame(raf);
      if (clockRaf) cancelAnimationFrame(clockRaf);
    };
  }, [rootRef, enabled]);
}
