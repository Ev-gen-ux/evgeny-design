import { useEffect, useRef } from 'react';
import { useLenis } from 'lenis/react';
import { CursorOverlay, PageBackdrop, ChatBar, GrainOverlay, ThemeToggle } from '../components';
import { useCursorTracker } from '../hooks/useCursorTracker';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAssemblyAnimation } from '../hooks/useAssemblyAnimation';
import { useChatBar } from '../hooks/useChatBar';
import { useHomeEntryScroll } from '../hooks/useScrollRestoration';
import { useWindowWidth } from '../hooks/useWindowWidth';
import { ScrollRevealProvider } from '../hooks/useScrollReveal';
import { Header } from '../sections/Header';
import { Hero } from '../sections/Hero';
import { About } from '../sections/About';
import { SelectedWork } from '../sections/SelectedWork';
import { Pipeline } from '../sections/Pipeline';
import { Projects } from '../sections/Projects';
import { Experience } from '../sections/Experience';
import { Skills } from '../sections/Skills';
import { Education } from '../sections/Education';
import { Contact } from '../sections/Contact';
import styles from './Home.module.css';

/**
 * 1:1 section order with Portfolio.dc.html: header (dc-import) → hero → about →
 * work → pipeline → projects → experience → skills → education → contact.
 * `rootRef` is scanned once by useAssemblyAnimation (the letter/word-scatter
 * text effect) the same way the source scans its own root wrapper div.
 * useHomeEntryScroll is the single source of truth for where the page lands
 * on mount (see that hook for why this used to be two competing effects).
 */
export function Home() {
  const cursor = useCursorTracker();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  useAssemblyAnimation(rootRef, !reducedMotion);
  useHomeEntryScroll();

  // Lenis caches document scroll height for its own clamping/limit math and
  // only refreshes it via its own ResizeObserver, asynchronously (same
  // caveat already documented at CaseStudy.tsx's own lenis.resize() call) —
  // too late for useAssemblyAnimation's continuous scroll-position formula
  // and its `atBottom` failsafe to ever line up with the *real* scrollable
  // height on a viewport whose mobile-only CSS (Footer/Hero/Pipeline
  // padding, 2026-09-17 responsive pass) changed the page's total height.
  // Reported by the user as Contact/Footer's letter-scatter text looking
  // permanently stuck mid-assembly on phone, even after scrolling to the
  // true bottom — a manual nudge on every width change is cheap insurance
  // against Lenis's limit staying stale.
  const lenis = useLenis();
  const windowWidth = useWindowWidth();
  useEffect(() => {
    lenis?.resize();
  }, [lenis, windowWidth]);

  const chatBarRef = useRef<HTMLDivElement>(null);
  const chatTextRef = useRef<HTMLSpanElement>(null);
  const chatStatusDotRef = useRef<HTMLSpanElement>(null);
  const chatStatusTextRef = useRef<HTMLSpanElement>(null);
  useChatBar(rootRef, chatBarRef, chatTextRef, chatStatusDotRef, chatStatusTextRef, !reducedMotion);

  return (
    <div ref={rootRef} className={styles.root}>
      <ScrollRevealProvider>
        <PageBackdrop />
        <CursorOverlay cursor={cursor} />
        <Header cursor={cursor} />
        <Hero cursor={cursor} />
        <About />
        <SelectedWork cursor={cursor} />
        <Pipeline />
        <Projects cursor={cursor} />
        <Experience />
        <Skills />
        <Education />
        <Contact />
      </ScrollRevealProvider>
      <ChatBar barRef={chatBarRef} textRef={chatTextRef} statusDotRef={chatStatusDotRef} statusTextRef={chatStatusTextRef} />
      <GrainOverlay />
      <ThemeToggle />
    </div>
  );
}
