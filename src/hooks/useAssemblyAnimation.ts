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
 *
 * Lazy split/reclaim (2026-09-19, real-device performance fix) — see the
 * `candidatesRef`/`splitCandidate`/`reclaimUnit` trio below for the full
 * story. Short version: this used to split EVERY matching element on the
 * whole page into spans eagerly, at mount — on Home that's ~280 elements
 * (thousands of individual `<span>`s) all standing in the DOM permanently,
 * whether or not they're anywhere near the viewport. Confirmed live (two
 * paired diagnostic tests on a real Android phone) that this standing DOM
 * complexity, not this hook's own per-frame JS cost, is what was making a
 * `position: sticky` header stutter/disappear during scroll: disabling
 * Lenis entirely didn't fix it, disabling this whole hook did. A pure
 * compute-cost optimization (skip far-off-screen units in `driveAsm`) had
 * no effect either — confirming the bottleneck really is standing DOM/paint
 * complexity, not per-frame arithmetic. Now only elements near the current
 * scroll position are actually split into spans at any given time; ones
 * scrolled far past (and fully settled) get reverted back to plain text,
 * keeping the live span count bounded regardless of how far down the page
 * someone has scrolled — matching the case-study page's own naturally
 * small footprint (one article's worth of content) instead of the whole
 * site's at once.
 */

interface AsmUnit {
  el: HTMLElement;
  spans: AsmSpan[];
  hero: boolean;
  /**
   * Header wordmark/nav-link units (2026-09-18) — unlike `hero`, this NEVER
   * falls through to the scroll formula after the initial reveal: the
   * header is `position: fixed` and permanently on screen, so there is no
   * "scrolled away from it" state to scatter back into in the first place.
   */
  navFixed: boolean;
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
  /**
   * Inside a `[data-asm-own]` subtree (2026-09-26, the Contact footer): on
   * desktop it opts OUT of `syncEl` and uses the normal per-element position
   * formula. Reason: a synced section reaches fully-assembled once its TOP is
   * ~0.3vh into the viewport, but the footer's giant word sits at the bottom of
   * a tall section, so by the time it scrolled into view it was already
   * assembled and its letters never visibly came together. Not applied at
   * `vw <= 768`: the sync was introduced precisely because the scrollY-based
   * formula left the footer permanently mid-scatter on phones (see Contact.tsx).
   */
  own: boolean;
  /** Desktop only: scroll-distance multiplier from the nearest `[data-asm-span]` (1 = default); a longer window makes the assembly easier to see. */
  spanK: number;
  t: number;
  top: number;
  cur?: number;
}

/** A matched candidate not yet split into spans — see the lazy split/reclaim docstring above `AsmUnit`. */
interface Candidate {
  el: HTMLElement;
  sec: Element;
  top: number;
}

const SKIP_TAGS = new Set(['CANVAS', 'SVG', 'SCRIPT', 'STYLE', 'IMG', 'INPUT', 'TEXTAREA', 'BR']);

export function useAssemblyAnimation(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  const unitsRef = useRef<AsmUnit[]>([]);
  const candidatesRef = useRef<Candidate[]>([]);

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

    const vw0 = window.innerWidth;
    const vh0 = window.innerHeight;
    // Mobile-only (2026-09-19, explicit user request — "только мобильную
    // версию правишь, десктоп не трогаешь") — snapshot at mount, matching
    // the pattern already used elsewhere (e.g. Header's own breakpoint
    // checks) rather than re-derived every frame: desktop was never
    // reported broken, so it keeps the original eager-split-everything-
    // at-once behavior below, completely unaffected by the lazy
    // split/reclaim machinery.
    const lazyMobile = vw0 <= 640;

    // Splits one already-validated candidate element's text into scattered
    // spans and pushes the resulting unit into `unitsRef` — extracted out of
    // the old single-pass `buildUnits` so it can run either eagerly (mount,
    // for `hero`/`navFixed`) or lazily (first time a regular candidate
    // approaches the viewport, from `driveAsm`'s own reclaim/split check).
    const splitCandidate = (el: HTMLElement, sec: Element, hero: boolean, navFixed: boolean) => {
      const text = el.textContent || '';
      if (!text || !text.trim()) return;
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
          // Split further on hyphens/dots/slashes (2026-09-19) — see
          // useCaseStudyAssembly.ts's identical fix for the full reasoning:
          // a plain `mk(part)` treats the whole space-delimited "word" as
          // one `white-space: pre` span, exactly as unbreakable as `nowrap`
          // — fine for a real word, but a code-style compound token (e.g.
          // "theme.colors.button.primary.background.hover") is *also* just
          // one "word" by this split, so it rendered as a single
          // unbreakable run that overflowed the container instead of
          // wrapping. A real word with none of these characters passes
          // through unchanged.
          part.split(/([-./])/).forEach((sub) => {
            if (!sub.length) return;
            frag.appendChild(mk(sub));
          });
          return;
        }
        // Split further on hyphens (2026-09-18, mobile bug fix) — each
        // hyphen-delimited fragment gets its own `white-space: nowrap`
        // wrapper (below) so its letters can't line-wrap *inside* it:
        // `display: inline-block` only makes a wrapper an atomic box for
        // the PARENT's line layout, it doesn't stop the wrapper's own
        // content from breaking between its children. Each letter is its
        // own inline-block span, and CSS always allows a break between two
        // adjacent inline-level boxes regardless of word-break/hyphens
        // settings (those rules only govern real text runs) — so a long
        // word like "Дизайн-пайплайн" could split mid-syllable
        // ("Дизайн-пайпла" / "йн,") wherever it happened to overflow, with
        // no relation to the hyphen or any real word boundary. The hyphen
        // character itself is emitted as its own plain (non-nowrap-wrapped)
        // letter span, so a line break right after it — the one place a
        // real hyphenated word is actually allowed to wrap — still works;
        // only splitting *inside* "Дизайн" or "пайплайн" is now prevented.
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
      const panelEl = el.closest('[data-pl-panel]');
      const panel = panelEl ? parseInt(panelEl.getAttribute('data-pl-panel') || '0', 10) : null;
      const stepEl = el.closest('[data-pl-step]');
      const step = stepEl ? parseInt(stepEl.getAttribute('data-pl-step') || '0', 10) : null;
      const latch = !!el.closest('[data-pl-fixed]');
      const syncEl = el.closest('[data-asm-sync]') as HTMLElement | null;
      const own = !!el.closest('[data-asm-own]');
      const spanK = Number((el.closest('[data-asm-span]') as HTMLElement | null)?.dataset.asmSpan) || 1;
      unitsRef.current.push({ el, spans, hero, navFixed, panel, step, latch, syncEl, own, spanK, t: -1, top: docTop(el) });
    };

    // Reverts an already-split unit back to plain text (its spans'
    // concatenated text content, byte-identical to the original — none of
    // the actual characters were ever changed, only wrapped) and drops it
    // from `unitsRef`, freeing its DOM complexity. Only called from
    // `driveAsm`'s own reclaim check, and only once a unit is both fully
    // settled (not mid-transition) and far outside the active window — see
    // that check for the exact thresholds.
    const reclaimUnit = (u: AsmUnit) => {
      const text = u.el.textContent;
      u.el.textContent = text;
      delete u.el.dataset.asmSplit;
      candidatesRef.current.push({ el: u.el, sec: u.el.closest('section') || root, top: u.top });
    };

    const buildUnits = () => {
      const sections = root.querySelectorAll('section');
      // Site header (2026-09-18, global-audit fix — "не все тексты
      // заанимированы", the header's wordmark + nav links were the one
      // real gap on this page: `<nav>` sits outside every `<section>`, so
      // the scan below never reached it at all, not even by accident).
      // Scanned the same way as every `<section>`, but flagged `navFixed`
      // (a permanent, load-once reveal, never re-triggered by scroll — see
      // that field's own docstring) rather than `hero` or the scroll
      // formula: the header is `position: fixed` and permanently on
      // screen, so there's no "scroll it into view" moment to animate
      // against.
      const navEl = root.querySelector('nav');
      const scanRoots: Element[] = navEl ? [...Array.from(sections), navEl] : Array.from(sections);
      let candidateCount = 0;
      scanRoots.forEach((sec) => {
        const hero = sec.id === 'hero';
        const navFixed = sec === navEl;
        const cands = sec.querySelectorAll('h1,h2,h3,h4,p,span,div,a,li,strong,em,td,th');
        cands.forEach((node) => {
          const el = node as HTMLElement;
          if (el.dataset.ac === '1') return;
          if (el.dataset.asmSplit === '1') return;
          if (el.parentElement && el.parentElement.closest('[data-asm-split="1"]')) return;
          if (candidateCount > 420) return;
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
          candidateCount++;
          if (hero || navFixed || !lazyMobile) {
            // Always eagerly split — small in count (Hero + the fixed
            // header), always relevant near the top of the page, and both
            // have their own permanent/hybrid reveal semantics that don't
            // fit the lazy split/reclaim model below. Desktop/tablet
            // (`!lazyMobile`) also always eagerly splits everything, same
            // as before this pass — see `lazyMobile`'s own comment.
            splitCandidate(el, sec, hero, navFixed);
          } else {
            candidatesRef.current.push({ el, sec, top: docTop(el) });
          }
        });
      });
      measureUnits();
    };

    const measureUnits = () => {
      unitsRef.current = unitsRef.current.filter((u) => u.el.isConnected);
      candidatesRef.current = candidatesRef.current.filter((c) => c.el.isConnected);
      // Each element's own true document position (2026-09-19, explicit user
      // request — "перекалибровано появление и сборка текста"). Previously
      // `u.top` blended an element's real position toward its containing
      // block's own top, compressing how far "into" a tall section an
      // element actually reads as being. `useCaseStudyAssembly.ts` never did
      // this blending and reads as calibrated correctly — this matches that
      // exact approach.
      for (const u of unitsRef.current) {
        u.top = docTop(u.el);
      }
      for (const c of candidatesRef.current) {
        c.top = docTop(c.el);
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
    // Scroll-jank fix (2026-10-24): this used to run `loop`/`driveAsm` in a
    // perpetual, ungated `requestAnimationFrame` loop for the entire page
    // lifetime — every frame, forever, regardless of scroll — doing a forced
    // `getBoundingClientRect()` read per `syncEl` unit (About/SelectedWork
    // card-synced text) and writing transform/opacity to every live span.
    // With hundreds of text units across the page this is real per-frame
    // cost paid even while sitting still, which is what made the Hero↔About
    // and About↔SelectedWork boundaries (the sections with the heaviest
    // synced text) stutter on repeated scroll back and forth. Same pattern
    // as `useStageProgress`'s fix: `driveAsm` now reports whether anything is
    // still mid-transition (eased units not yet snapped to target, or
    // pending lazy split/reclaim candidates) and the loop stops itself once
    // nothing is, restarting on the next scroll/resize.
    const driveAsm = (dt: number): boolean => {
      const vh = window.innerHeight;
      const sy = window.scrollY;
      const vw = window.innerWidth;
      const atBottom = sy + vh >= document.documentElement.scrollHeight - 60;
      const le = loadT * loadT * (3 - 2 * loadT);
      const mobile = vw <= 768;
      const winStart = mobile ? 1.0 : 0.95;
      const winSpan = mobile ? 0.45 : 0.3;
      const ease = 1 - Math.pow(0.08, Math.min(0.05, (dt || 16) / 1000));

      // Lazy split-in (2026-09-19) — see the top-of-file docstring for the
      // full story. Cheap pass over `candidatesRef` (plain arithmetic on
      // cached `top` values, no layout reads): anything approaching the
      // viewport gets split into spans right now, joining `unitsRef` for
      // this same frame's normal drive pass below. Threshold matches the
      // widest margin `driveAsm`'s own reveal formulas ever need (mobile's
      // `winStart*vh` window starts at a full `vh` below the fold) plus
      // slack, so nothing is ever visibly still-plain-text at the moment
      // it should already be mid-reveal.
      //
      // Per-frame cap (2026-09-19, same-day follow-up — real-device report:
      // a brief page-wide "pop"/jank right at the top of each major
      // section, About and Projects both named live). A section boundary
      // is exactly where a whole batch of candidates can cross this
      // threshold in the same frame at once (a normal scroll covers this
      // gradually, but a fast real flick can jump the effective distance
      // in far fewer frames than this emulator's own step-by-step testing
      // ever did) — `splitCandidate` isn't free (DOM surgery: clearing and
      // rebuilding an element's children), and doing a dozen-plus of them
      // synchronously in one frame is a plausible, concrete source of a
      // visible hitch, distinct from (and layered on top of) anything
      // already chased in ChatBar itself. Capping how many run per frame
      // spreads a big batch across a handful of frames instead — at 60fps
      // that's still well under 100ms end-to-end for a large batch,
      // imperceptible as a delay, but each individual frame's own DOM work
      // stays small.
      const MAX_SPLITS_PER_FRAME = 6;
      let splitsThisFrame = 0;
      if (candidatesRef.current.length) {
        const stillPending: Candidate[] = [];
        for (const c of candidatesRef.current) {
          if (splitsThisFrame < MAX_SPLITS_PER_FRAME && c.top < sy + vh * 2.5 && c.top > sy - vh * 2) {
            splitCandidate(c.el, c.sec, false, false);
            splitsThisFrame++;
          } else {
            stillPending.push(c);
          }
        }
        candidatesRef.current = stillPending;
      }

      const live: AsmUnit[] = [];
      const targets: number[] = [];
      const toReclaim: AsmUnit[] = [];
      for (const u of unitsRef.current) {
        if (!u.el.isConnected) continue;
        let t: number;
        if (u.syncEl && !(u.own && !mobile)) {
          const r = u.syncEl.getBoundingClientRect();
          const raw = (vh * winStart - r.top) / (vh * winSpan);
          t = Math.max(0, Math.min(1, raw));
          if (atBottom) t = 1;
        } else if (u.step != null && vw > 768) {
          t = pipelineSync.stepT[u.step] ?? 0;
        } else if (u.panel != null && vw > 768) {
          t = pipelineSync.panelT[u.panel] ?? 0;
        } else if (u.navFixed) {
          // Permanent — plays the load-in once and never scatters again,
          // see `navFixed`'s own docstring.
          t = le;
        } else if (u.hero) {
          t = loadT < 1 ? le : Math.max(0, Math.min(1, 1 - sy / (vh * 0.5)));
        } else {
          const raw = (sy + vh * winStart - u.top) / (vh * winSpan * (mobile ? 1 : u.spanK));
          t = Math.max(0, Math.min(1, raw));
          if (atBottom) t = 1;
        }
        if (u.latch && u.panel == null && u.step == null && vw > 768) t = pipelineSync.leftT;

        // Reclaim (2026-09-19, mobile-only — same `lazyMobile` gate as the
        // split-in above; desktop's units were all eagerly split and stay
        // that way, untouched) — the flip side of the lazy split-in above:
        // once a regular unit is both fully settled (not mid-transition —
        // never interrupt an actual animation) and well outside even the
        // generous split-in window, revert it to plain text and drop it
        // from the live set. Margin is wider than the split-in threshold
        // on purpose (hysteresis) so a unit sitting right at the boundary
        // can't flicker split/unsplit on small scroll jitter. `hero`/
        // `navFixed` are exempt — they're never lazy in the first place.
        if (
          lazyMobile &&
          !u.hero &&
          !u.navFixed &&
          u.cur != null &&
          (u.cur < 0.001 || u.cur > 0.999) &&
          (u.top > sy + vh * 4 || u.top < sy - vh * 3) &&
          toReclaim.length < MAX_SPLITS_PER_FRAME
        ) {
          // Capped the same way and for the same reason as the split-in
          // pass above — a section boundary can also leave a whole batch
          // of units simultaneously eligible for reclaim in one frame.
          toReclaim.push(u);
          continue;
        }

        live.push(u);
        targets.push(t);
      }
      if (toReclaim.length) {
        const reclaimSet = new Set(toReclaim);
        unitsRef.current = unitsRef.current.filter((u) => !reclaimSet.has(u));
        for (const u of toReclaim) reclaimUnit(u);
      }

      let unsettled = splitsThisFrame > 0 || toReclaim.length > 0;
      for (let i = 0; i < live.length; i++) {
        const u = live[i];
        const t = targets[i];
        if (u.cur == null) u.cur = t;
        if (atBottom) {
          const bottomEase = 0.35;
          u.cur += (t - u.cur) * bottomEase;
          if (Math.abs(t - u.cur) < 0.0015) u.cur = t;
        } else if (mobile) {
          const mobileEase = 0.06;
          u.cur += (t - u.cur) * mobileEase;
          if (Math.abs(t - u.cur) < 0.0015) u.cur = t;
        } else {
          u.cur += (t - u.cur) * ease;
          if (Math.abs(t - u.cur) < 0.0015) u.cur = t;
        }
        if (u.cur !== t) unsettled = true;
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
      return !unsettled;
    };

    let running = false;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    };

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      const settled = driveAsm(dt) && loadT >= 1;
      if (settled) {
        stop();
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const ensureRunning = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    buildUnits();
    const startRaf = requestAnimationFrame(() => {
      loadT = 0;
      tickClock();
      ensureRunning();
    });

    const onScroll = () => ensureRunning();
    const onResize = () => {
      measureUnits();
      ensureRunning();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(startRaf);
      stop();
      if (clockRaf) cancelAnimationFrame(clockRaf);
    };
  }, [rootRef, enabled]);
}
