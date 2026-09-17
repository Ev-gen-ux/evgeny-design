import { useLayoutEffect, useRef, type RefObject } from 'react';
import { seedOf, asmSeed, type AsmSpan } from './asmMath';

/**
 * Letter-scatter morph for Header's `[ menu ]` / `[ close ]` trigger button
 * (2026-09-17) — same visual math as useMenuAssembly (seeded random scatter
 * offsets, quintic ease), but two-phase: on every `label` change, the
 * CURRENTLY shown letters scatter apart and fade first, then the new label
 * is split fresh and scatters back together — timed to roughly overlap
 * MobileNavOverlay's own slide transition, so the trigger visibly "falls
 * apart and reassembles" into its new label while the panel is sliding.
 *
 * Owns the element's text content entirely (never let the caller pass
 * `label` as React children) — if React and this hook both wrote to the
 * same text node, whichever went last would silently undo the other.
 */
export function useLabelMorph(ref: RefObject<HTMLElement | null>, label: string, reducedMotion: boolean) {
  const prevLabel = useRef<string | null>(null);
  const rafRef = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      el.textContent = label;
      prevLabel.current = label;
      return;
    }

    const assembleIn = (text: string) => {
      const frag = document.createDocumentFragment();
      const spans: AsmSpan[] = [];
      const seedI = seedOf('label:' + text);
      let idx = 0;
      text.split('').forEach((ch) => {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(ch));
          return;
        }
        const sp = document.createElement('span') as AsmSpan;
        sp.textContent = ch;
        sp.style.display = 'inline-block';
        sp.style.whiteSpace = 'pre';
        const r = asmSeed(seedI + idx++ * 37 + 11);
        sp.__d = { dx: (r.r1 - 0.5) * 2, dy: (r.r2 - 0.5) * 2, rot: (r.r3 - 0.5) * 2, sc: 0.4 + r.r4 * 0.5 };
        sp.style.opacity = '0';
        spans.push(sp);
        frag.appendChild(sp);
      });
      el.textContent = '';
      el.appendChild(frag);

      const t0 = performance.now();
      const DURATION = 350;
      const tick = () => {
        const raw = Math.min(1, (performance.now() - t0) / DURATION);
        const le = raw * raw * (3 - 2 * raw);
        for (const sp of spans) {
          const d = sp.__d!;
          const eT = 1 - Math.pow(1 - le, 5);
          const k = 1 - eT;
          if (k < 0.002) {
            sp.style.opacity = '1';
            sp.style.transform = 'none';
            continue;
          }
          sp.style.opacity = Math.min(1, eT * 1.3).toFixed(3);
          sp.style.transform =
            'translate(' + (d.dx * 14 * k).toFixed(2) + 'px,' + (d.dy * 10 * k).toFixed(2) + 'px) rotate(' + (d.rot * 14 * k).toFixed(2) + 'deg)';
        }
        if (raw < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const disassembleThenAssemble = (nextText: string) => {
      const spans = Array.from(el.querySelectorAll<AsmSpan>('span'));
      if (!spans.length) {
        assembleIn(nextText);
        return;
      }
      const t0 = performance.now();
      const OUT_DURATION = 150;
      const tickOut = () => {
        const raw = Math.min(1, (performance.now() - t0) / OUT_DURATION);
        for (const sp of spans) {
          const d = sp.__d ?? { dx: 1, dy: -1, rot: 1, sc: 1 };
          sp.style.opacity = (1 - raw).toFixed(3);
          sp.style.transform = 'translate(' + (d.dx * 14 * raw).toFixed(2) + 'px,' + (d.dy * 10 * raw).toFixed(2) + 'px) rotate(' + (d.rot * 14 * raw).toFixed(2) + 'deg)';
        }
        if (raw < 1) {
          rafRef.current = requestAnimationFrame(tickOut);
        } else {
          assembleIn(nextText);
        }
      };
      rafRef.current = requestAnimationFrame(tickOut);
    };

    if (prevLabel.current === null) {
      // First paint: plain text, no scatter-in — this is a small, always-
      // present chrome control, not a piece of page content "arriving," so
      // it shouldn't join the load-time assembly motion the rest of the
      // site does. Only actual toggles (menu open ↔ close) morph.
      el.textContent = label;
    } else if (prevLabel.current !== label) {
      disassembleThenAssemble(label);
    }
    prevLabel.current = label;

    return () => cancelAnimationFrame(rafRef.current);
  }, [ref, label, reducedMotion]);
}
