import { useLayoutEffect, useRef, type RefObject } from 'react';
import { seedOf, asmSeed, docTop, type AsmSpan } from './asmMath';

/**
 * 1:1 with buildAsmUnits/measureAsmUnits/driveAsm/startAsm in Case Study.dc.html
 * — a SEPARATE assembly implementation from the home page's (different class,
 * different tuning), not a reuse of useAssemblyAnimation. Differences from the
 * home-page version:
 *  - scoped to `main …` (not `section …`), and skips `<nav>` explicitly (the
 *    home page's hook never sees the nav at all, since it's outside any
 *    `<section>` — this page's `main` selector would include it if present).
 *  - "intro" units (inside `<header>`, OR anywhere else already sitting inside
 *    the viewport at mount — see the startRaf callback below) reveal via the
 *    2.6s load clock — this is the case page's hero equivalent — instead of
 *    `hero: true` id-matching. The viewport-at-mount check is a deliberate
 *    deviation from source (user request, 2026-08-02): any text already inside
 *    the viewport bounds when a case page loads must appear assembled without
 *    requiring a scroll to "discover" it — only content genuinely below the
 *    fold should still wait for the scroll-driven reveal.
 *  - much smaller scatter distances (vw*0.035/vh*0.05 vs vw*0.13/vh*0.17) and a
 *    different easing curve (quartic vs quintic, 0.05^x vs 0.02^x ease-in) —
 *    tuned for this page's denser, narrower (840px) column instead of the
 *    hero's full-bleed layout.
 *  - tighter caps (600 units / 460 chars / 280 parts vs 420 / 1400 / 460).
 *  - supports `[data-asm-sync]` block convergence (added 2026-08-02, ported
 *    from useAssemblyAnimation's `syncEl` — see that hook's docstring): text
 *    inside a marked block (a persona card, e.g.) all reaches fully-assembled
 *    together, timed to that block's own center-crossing, instead of each
 *    element's individual position — generalizes the fix originally built
 *    only for the home page's Selected Work cards to any card-like block.
 */

interface AsmUnit {
  el: HTMLElement;
  blk: Element;
  spans: AsmSpan[];
  intro: boolean;
  /** Nearest `[data-asm-sync]` ancestor, if any — see the docstring above. */
  syncEl: HTMLElement | null;
  /** Inside `[data-asm-own]` (the ContactFooter): on desktop it opts out of `syncEl` and uses the per-element position formula, so the giant word assembles on screen instead of being already assembled when it appears (same rule as useAssemblyAnimation). */
  own: boolean;
  t: number;
  top: number;
  cur?: number;
}

const SKIP_TAGS = new Set(['CANVAS', 'SVG', 'SCRIPT', 'STYLE', 'IMG', 'INPUT', 'TEXTAREA', 'BR', 'NAV']);

export function useCaseStudyAssembly(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  /**
   * Optional second scan root (2026-09-17, responsive-pass follow-up) —
   * `buildUnits` only ever looked inside `<main>`, so ContactCta/Footer
   * (rendered as siblings *after* `</main>` on this page, unlike Home where
   * the same components sit inside a `<section>`) were never picked up at
   * all: their text stayed plain, static React output, never split into
   * assembly spans. Passed in explicitly rather than widening the scan to
   * the whole page root, so Header's nav / ChatBar stay untouched.
   */
  extraRootRef?: RefObject<HTMLElement | null>,
) {
  const unitsRef = useRef<AsmUnit[]>([]);

  // useLayoutEffect, not useEffect — see useAssemblyAnimation's docstring
  // note by the same date: useEffect runs after paint, so React's plain,
  // never-split text was briefly visible before buildUnits split and hid it.
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    const main = root.querySelector('main');
    if (!main) return;
    const extraRoot = extraRootRef?.current ?? null;
    // Site header (2026-09-18, global-audit fix — "не все тексты
    // заанимированы"): `<nav>` sits outside `<main>` (a sibling, rendered
    // right before it — see CaseStudy.tsx), so it was never scanned here at
    // all. Included the same way as `main`/`extraRoot`; flagged `intro`
    // below (the same load-clock, assemble-once-on-mount reveal this page's
    // own `<header>` title block already gets) rather than the scroll
    // formula — the site nav is `position: fixed` and permanently on
    // screen, so there's no scroll-into-view moment for it.
    const navEl = root.querySelector('nav');

    const buildUnits = () => {
      const vw0 = window.innerWidth;
      const vh0 = window.innerHeight;
      const cands = [
        ...Array.from(main.querySelectorAll('h1,h2,h3,p,dt,dd,li,th,td,caption,span,div,a')),
        ...(extraRoot ? Array.from(extraRoot.querySelectorAll('h1,h2,h3,p,dt,dd,li,th,td,caption,span,div,a')) : []),
        ...(navEl ? Array.from(navEl.querySelectorAll('h1,h2,h3,p,dt,dd,li,th,td,caption,span,div,a')) : []),
      ];
      cands.forEach((node) => {
        const el = node as HTMLElement;
        if (el.dataset.ac === '1') return;
        if (el.dataset.asmSplit === '1') return;
        if (el.parentElement && el.parentElement.closest('[data-asm-split="1"]')) return;
        if (SKIP_TAGS.has(el.tagName)) return;
        if (el.closest('[aria-hidden="true"]')) return;
        if (el.closest('[data-noasm="1"]')) return;
        if (unitsRef.current.length > 600) return;
        const kids = Array.prototype.slice.call(el.childNodes) as ChildNode[];
        if (!kids.length) return;
        if (!kids.every((n) => n.nodeType === 3)) return;
        const text = el.textContent || '';
        // Cap raised from 460 to 900 (2026-09-18, global-audit fix — "не все
        // тексты заанимированы"): a real content paragraph (LindauSugar's
        // booking-widget note, 513 chars) was silently exceeding the old
        // cap and left permanently unsplit/static, with no visual sign
        // anything was wrong — it just never scattered or animated at all.
        // 900 comfortably covers this site's longest real paragraphs with
        // headroom, while still guarding against a pathological wall of text.
        if (!text || !text.trim() || text.length > 900) return;
        // A mobile-only per-word override was tried here (2026-09-18) as a
        // performance fix for a reported stutter, then reverted the same
        // day per explicit user feedback — it made the mobile experience
        // worse, not better. Back to the original length-based rule on
        // every viewport; the stutter needs a different real fix.
        const byWord = text.replace(/\s+/g, ' ').trim().length > 64;
        const parts = text.split(/(\s+)/).filter((x) => x.length);
        if (parts.length > 280) return;

        const frag = document.createDocumentFragment();
        const spans: AsmSpan[] = [];
        const seedI = seedOf(el.tagName + ':' + text.slice(0, 24));
        let idx = 0;
        const mk = (txt: string) => {
          const sp = document.createElement('span') as AsmSpan;
          sp.dataset.ac = '1';
          sp.textContent = txt;
          sp.style.display = 'inline-block';
          sp.style.whiteSpace = 'pre';
          const r = asmSeed(seedI + idx++ * 37 + 11);
          const d = { dx: (r.r1 - 0.5) * 2, dy: (r.r2 - 0.5) * 2, rot: (r.r3 - 0.5) * 2, sc: 0.55 + r.r4 * 0.35 };
          sp.__d = d;
          // Fully-scattered initial state set synchronously at creation — see
          // useAssemblyAnimation's mk() for why (2026-08-02 "looks already
          // loaded, then re-scatters" bug fix).
          sp.style.opacity = '0';
          sp.style.transform =
            'translate(' + (d.dx * vw0 * 0.035).toFixed(2) + 'px,' + (d.dy * vh0 * 0.05).toFixed(2) + 'px) rotate(' + (d.rot * 3.5).toFixed(2) + 'deg) scale(' + (1 - (1 - d.sc) * 0.28).toFixed(4) + ')';
          spans.push(sp);
          return sp;
        };
        parts.forEach((part) => {
          if (!part.trim().length) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          if (byWord) {
            // Split further on hyphens/dots/slashes (2026-09-19) — a plain
            // `mk(part)` treated the WHOLE space-delimited "word" as one
            // `white-space: pre` span, which is exactly as unbreakable as
            // `nowrap` (there's no line-break character inside it to break
            // at) — fine for a real word, but a code-style compound token
            // like "theme.colors.button.primary.background.hover" or
            // "button/primary/background/hover" is *also* just one
            // "word" by this split (`text.split(/(\s+)/)` only tokenizes
            // on whitespace), so it rendered as a single unbreakable run
            // that quietly overflowed the container on mobile instead of
            // wrapping — reported live, confirmed on a real device even
            // after a CSS-only `overflow-wrap` fix had zero effect (that
            // property can't override an element's own `white-space`).
            // Splitting at `-`/`.`/`/` — the same separators this kind of
            // token actually uses — gives the browser real break points
            // between the resulting spans (adjacent inline-level boxes can
            // always break between each other), while a real word with
            // none of these characters passes through as a single
            // untouched span, unchanged from before.
            part.split(/([-./])/).forEach((sub) => {
              if (!sub.length) return;
              frag.appendChild(mk(sub));
            });
            return;
          }
          // Split further on hyphens, same fix as useAssemblyAnimation's
          // identical wrapper (2026-09-18): each hyphen-delimited fragment
          // gets its own `white-space: nowrap` wrapper so its letters can't
          // line-wrap *inside* it (a long/hyphenated word split into
          // per-letter inline-block spans could otherwise break between
          // those letters wherever it overflowed, unrelated to the actual
          // word or hyphen boundary — CSS always allows a break between two
          // adjacent inline-level boxes, regardless of word-break/hyphens,
          // which only govern real text runs). The hyphen character itself
          // stays a plain, un-wrapped letter span so a line break right
          // after it — the one place a real hyphenated word is allowed to
          // wrap — still works.
          part.split(/(-)/).forEach((sub) => {
            if (!sub.length) return;
            if (sub === '-') {
              frag.appendChild(mk(sub));
              return;
            }
            const wrap = document.createElement('span');
            wrap.style.display = 'inline-block';
            wrap.style.whiteSpace = 'nowrap';
            sub.split('').forEach((ch) => wrap.appendChild(mk(ch)));
            frag.appendChild(wrap);
          });
        });
        if (!spans.length) return;
        el.textContent = '';
        el.appendChild(frag);
        el.dataset.asmSplit = '1';
        const blk = el.closest('section, header, article') || (extraRoot && extraRoot.contains(el) ? extraRoot : main);
        const syncEl = el.closest('[data-asm-sync]') as HTMLElement | null;
        const intro = !!el.closest('header') || (navEl ? navEl.contains(el) : false);
        const own = !!el.closest('[data-asm-own]');
        unitsRef.current.push({ el, blk, spans, intro, syncEl, own, t: -1, top: 0 });
      });
      measureUnits();
    };

    const measureUnits = () => {
      unitsRef.current = unitsRef.current.filter((u) => u.el.isConnected);
      for (const u of unitsRef.current) u.top = docTop(u.el);
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
    // Two passes, deliberately (matches useAssemblyAnimation's smoothness-pass
    // fix): pass 1 only *reads* layout (getBoundingClientRect for syncEl
    // units), pass 2 only *writes* styles — interleaving them forces the
    // browser to flush pending style writes and recompute layout synchronously
    // on every syncEl read, once per synced block, every frame.
    const driveAsm = (dt: number) => {
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const vw = window.innerWidth;
      // Tolerance widened from 4px to 60px (2026-09-18) — see
      // useAssemblyAnimation.ts's identical change for the full reasoning:
      // Lenis's own cached max-scroll `limit` can drift a little short of
      // the real document height after any layout change, refreshed only
      // asynchronously via its own ResizeObserver. Measured live: ~16px
      // short even seconds after scrolling settled, past the old 4px
      // slack, so `atBottom` never fired.
      const atBottom = sy + vh >= document.documentElement.scrollHeight - 60;
      // Ease base 0.08, not 0.05 (2026-09-18, explicit user request — "ещё
      // чуть-чуть сделать её плавнее" — and the same value as
      // useAssemblyAnimation.ts's own ease, raised from 0.02: the user
      // wants one consistent feel between the home page and case-study
      // pages, not two separately-tuned animations).
      const ease = 1 - Math.pow(0.08, Math.min(0.05, (dt || 16) / 1000));

      const live: AsmUnit[] = [];
      const targets: number[] = [];
      for (const u of unitsRef.current) {
        if (!u.el.isConnected) continue;
        let t: number;
        if (u.syncEl && !(u.own && vw > 768)) {
          // `atBottom` failsafe (2026-09-18) — see useAssemblyAnimation's
          // identical branch for the full reasoning: the centering formula
          // below is unreachable for a sync block shorter than the viewport
          // that's also pinned to the bottom of the page (this page's own
          // ContactCta+Footer wrapper), since `r.top` stops decreasing once
          // scroll hits its max and never gets low enough to satisfy the
          // centering condition. Reported stuck: the email's tail characters
          // never settling even scrolled all the way down.
          const r = u.syncEl.getBoundingClientRect();
          const raw = (vh - r.top) / (vh / 2 + r.height / 2);
          t = Math.max(0, Math.min(1, raw));
          if (atBottom) t = 1;
        } else if (u.intro) {
          t = loadT * loadT * (3 - 2 * loadT);
        } else {
          // Window shortened from `vh * 0.55` to `vh * 0.3`, completion
          // point moved from ~35% down from the viewport top to ~65%
          // (2026-09-18, explicit user request — "уже проскроллил, а текст
          // ещё не собрался"): text used to stay visibly unsettled for most
          // of its time on screen, only fully reassembling once its own top
          // had scrolled almost up to the header — well after a reader had
          // already reached it lower on the screen. Now it locks in shortly
          // after entering view. Same window as useAssemblyAnimation.ts's
          // own fallback branch, on purpose — one shared pace site-wide.
          const raw = (sy + vh * 0.95 - u.top) / (vh * 0.3);
          t = Math.max(0, Math.min(1, raw));
          if (atBottom) t = 1;
        }
        live.push(u);
        targets.push(t);
      }

      for (let i = 0; i < live.length; i++) {
        const u = live[i];
        const t = targets[i];
        if (u.cur == null) u.cur = t;
        if (atBottom) {
          // Fast eased catch-up at the true page bottom (2026-09-18,
          // replaces an instant `u.cur = t` snap from the same day) — see
          // useAssemblyAnimation's identical fix for the full reasoning: an
          // outright teleport was reported as a visible jerk (letters
          // sitting still, then popping into place all at once). This
          // closes most of the remaining distance within a handful of
          // frames instead of one — fast, but still an animated motion.
          const bottomEase = 0.35;
          u.cur += (t - u.cur) * bottomEase;
          if (Math.abs(t - u.cur) < 0.0015) u.cur = t;
        } else {
          u.cur += (t - u.cur) * ease;
          if (Math.abs(t - u.cur) < 0.0015) u.cur = t;
        }
        const q = Math.round(u.cur * 240) / 240;
        if (q === u.t) continue;
        u.t = q;

        const n = u.spans.length;
        const stagger = n > 1 ? Math.min(0.6 / (n - 1), 0.035) : 0;
        const span = 1 - stagger * (n - 1);
        for (let j = 0; j < n; j++) {
          const sp = u.spans[j];
          const d = sp.__d!;
          const cT = Math.max(0, Math.min(1, (q - j * stagger) / span));
          const eT = 1 - Math.pow(1 - cT, 4);
          const k = 1 - eT;
          if (k < 0.0015) {
            sp.style.opacity = '';
            sp.style.transform = '';
            sp.style.willChange = '';
            continue;
          }
          sp.style.willChange = 'transform, opacity';
          sp.style.opacity = Math.min(1, eT * 1.6).toFixed(3);
          sp.style.transform =
            'translate(' +
            (d.dx * vw * 0.035 * k).toFixed(2) +
            'px,' +
            (d.dy * vh * 0.05 * k).toFixed(2) +
            'px) rotate(' +
            (d.rot * 3.5 * k).toFixed(2) +
            'deg) scale(' +
            (1 - (1 - d.sc) * k * 0.28).toFixed(4) +
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
      // Anything already inside the viewport at mount (not just the header)
      // rides the same load clock as "intro" units instead of waiting for a
      // scroll it doesn't need — deferred to this rAF so it runs after any
      // scroll-to-top/scroll-restoration effects on the page have settled.
      const vh0 = window.innerHeight;
      const sy0 = window.scrollY;
      for (const u of unitsRef.current) {
        if (!u.intro && !u.syncEl && u.top < sy0 + vh0) u.intro = true;
      }
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
  }, [rootRef, enabled, extraRootRef]);
}
