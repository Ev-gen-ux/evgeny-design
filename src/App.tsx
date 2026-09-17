import { ReactLenis } from 'lenis/react';
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { CaseStudyRoute } from './pages/CaseStudyRoute';
import { useReducedMotion } from './hooks/useReducedMotion';

const routes = (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/work/:id" element={<CaseStudyRoute />} />
  </Routes>
);

/**
 * Lenis smooths the real page scroll (2026-08-02, per user request, after a
 * pass removing React-re-render/layout-thrashing bugs from the hand-rolled
 * scroll-tied hooks — see usePipelineScroll/useStageProgress/useScrollReveal/
 * useAssemblyAnimation docstrings). `root` mode scrolls the actual `window`
 * rather than hijacking a wrapper `<div>` via transform — the mode that stays
 * compatible with the Design Pipeline section's native `position: sticky`
 * (a transform-hijacked wrapper is the classic way to break sticky/fixed
 * descendants). One instance for the whole SPA lifetime, mounted above the
 * router so it survives Home ↔ CaseStudy navigation.
 *
 * No code changes were needed in any of the scroll-tied hooks: they all read
 * `window.scrollY` directly, and Lenis (in root mode) *is* that real scroll
 * position — once it's driving the page, every existing reader automatically
 * observes the smoothed trajectory instead of raw input. That includes
 * Design Pipeline and the stage-progress hue sweep, even though this pass was
 * scoped to scroll-reveal + text-assembly — there is only one real scroll
 * position on the page, so this isn't something a config option can scope
 * away. If Pipeline's pinned scrub ends up feeling laggy under live testing
 * (its own added lerp from the previous pass stacking on top of Lenis's own
 * smoothing — two cascaded dampers compound into more lag than either alone),
 * the fix is to lighten/remove that hook's own lerp now that Lenis is doing
 * the smoothing at the source, not to change anything here.
 *
 * `lerp: 0.04` (2026-08-02, per user request for a noticeably heavier/more
 * "viscous" scroll feel — first set to 0.06, then lowered further on request
 * for an even lazier feel) — down from Lenis's own default of 0.1. Lower
 * lerp = slower catch-up to the real scroll target = more syrupy. Deliberately
 * applies everywhere, Design Pipeline included, per explicit user choice
 * (they were offered the option to compensate Pipeline's own lerp back to
 * tight and declined — Pipeline should feel heavier too, uniformly). Going
 * much below this starts trading "smooth" for "sluggish/unresponsive" — if
 * that's the complaint after testing, the fix is to raise this back up a
 * little, not to keep lowering it.
 */
export default function App() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return routes;
  return (
    <ReactLenis root options={{ lerp: 0.04 }}>
      {routes}
    </ReactLenis>
  );
}
