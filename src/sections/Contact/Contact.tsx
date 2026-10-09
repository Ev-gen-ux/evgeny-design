import { Section, ContactFooter } from '../../components';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * `asmSync` (2026-09-17 follow-up) — without it, every text unit here
 * (email/phone/telegram/github/footer credit) used useAssemblyAnimation's
 * generic scroll-position fallback: `t = (scrollY + vh*0.98 - top) / (vh*0.62)`,
 * with an `atBottom` failsafe (`scrollY + vh >= document.documentElement.
 * scrollHeight - 4`) meant to force full assembly once you've scrolled to
 * the true page bottom. Reported by the user as permanently stuck
 * mid-scatter on mobile even after scrolling all the way down — an earlier
 * fix (defensive `lenis.resize()` in Home.tsx, since Lenis caches document
 * height for its own scrollY math and this site's mobile-only CSS changes
 * page height) didn't resolve it, meaning the live `scrollY`/`scrollHeight`
 * comparison itself just isn't reliably reaching "true bottom" on this
 * viewport for whatever exact reason. `asmSync` sidesteps that whole
 * scrollY-based formula: it reads the section's own `getBoundingClientRect()`
 * every frame instead (see useAssemblyAnimation's `syncEl` branch) — always
 * live, never dependent on any cached scroll-height/limit value — and
 * reaches `t=1` once the section's own center has crossed the viewport's
 * center, well before you'd need to scroll all the way to the document's
 * literal bottom edge. Same mechanism Selected Work's cards already use.
 */
export function Contact() {
  const reveal = useScrollReveal('contact');
  const reducedMotion = useReducedMotion();

  return (
    <Section
      id="contact"
      revealId="contact"
      asmSync
      style={{ ...reveal, position: 'relative', overflow: 'hidden' }}
    >
      <ContactFooter reducedMotion={reducedMotion} />
    </Section>
  );
}
