import { useLayoutEffect, type RefObject } from 'react';
import { updateAgentStepProgress } from './agentStepVisual';
import headerStyles from '../sections/Header/Header.module.css';

/** Same native sticky positioning, overlap mask and last-item release as Experience.
 * Stages keep their existing flow and typography; the visible agent row follows them.
 */
export function useMobilePipelineSticky(sectionRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!enabled || !section) return;
    const header = document.querySelector<HTMLElement>(`nav.${headerStyles.nav}`);
    const heading = section.querySelector<HTMLElement>('[data-mobile-pipeline-heading]');
    const panels = section.querySelector<HTMLElement>('[data-mobile-pipeline-panels]');
    const entries = Array.from(section.querySelectorAll<HTMLElement>('[data-pl-panel]'));
    const rows = Array.from(heading?.querySelectorAll<HTMLElement>('[data-pl-step]') ?? []);
    if (!header || !heading || !panels || !entries.length) return;
    let raf = 0;
    let shift = 0;
    let disposed = false;
    const update = () => {
      raf = 0;
      if (disposed) return;
      const computed = getComputedStyle(section);
      const gap = parseFloat(computed.getPropertyValue('--space-16')) || 16;
      const releaseGap = parseFloat(computed.getPropertyValue('--space-24')) || 24;
      const top = Math.max(0, header.getBoundingClientRect().bottom) + gap;
      section.style.setProperty('--mobile-pipeline-top', `${top}px`);
      // Keep room to read a stage on short screens instead of covering it with the heading.
      const bottomReserve = parseFloat(computed.getPropertyValue('--space-80')) || 80;
      const pinned = heading.offsetHeight + top + bottomReserve + 160 < window.innerHeight;
      section.dataset.pipelineSticky = String(pinned);
      const rect = heading.getBoundingClientRect();
      const nativeTop = rect.top + shift;
      const nativeBottom = rect.bottom + shift;
      const last = entries[entries.length - 1].getBoundingClientRect();
      const nextShift = pinned ? Math.max(0, nativeBottom + releaseGap - last.top) : 0;
      heading.style.transform = nextShift ? `translateY(${-nextShift}px)` : '';
      shift = nextShift;
      const edge = pinned ? Math.max(0, nativeBottom - nextShift + gap - panels.getBoundingClientRect().top) : 0;
      panels.style.setProperty('--mobile-pipeline-mask-edge', `${edge}px`);
      panels.dataset.overlap = String(edge > 0);
      let active = 0;
      const readingLine = (pinned ? nativeTop + rect.height : top) + releaseGap;
      entries.forEach((entry, index) => {
        if (entry.getBoundingClientRect().top <= readingLine) active = index;
      });
      rows.forEach((row, index) => {
        const current = index === active;
        row.dataset.current = String(current);
        row.setAttribute('aria-hidden', String(!current));
        row.inert = !current;
        const entry = entries[index].getBoundingClientRect();
        const distance = index + 1 < entries.length
          ? entries[index + 1].getBoundingClientRect().top - entry.top
          : entry.height;
        const progress = Math.max(0, Math.min(1, (readingLine - entry.top) / Math.max(1, distance)));
        // Desktop's reveal reaches full size after the first 42% of a stage.
        const t = Math.max(0, Math.min(1, progress / 0.42));
        const state = progress >= 0.84 ? 'done' : readingLine >= entry.top ? 'active' : 'pending';
        const dot = row.firstElementChild as HTMLElement | null;
        const outcome = row.querySelector<HTMLElement>('[data-outcome]');
        updateAgentStepProgress(dot, row, t);
        if (dot) dot.dataset.state = state;
        if (outcome) outcome.dataset.state = state;
      });
      section.dataset.activeStage = String(active);
    };
    const schedule = () => { if (!raf && !disposed) raf = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    observer.observe(heading);
    observer.observe(panels);
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      heading.style.removeProperty('transform');
      section.style.removeProperty('--mobile-pipeline-top');
      delete section.dataset.pipelineSticky;
      delete section.dataset.activeStage;
      panels.style.removeProperty('--mobile-pipeline-mask-edge');
      delete panels.dataset.overlap;
      rows.forEach(row => {
        delete row.dataset.current;
        row.removeAttribute('aria-hidden');
        row.inert = false;
        row.style.removeProperty('--agent-dot-scale');
        row.style.removeProperty('--agent-line-progress');
      });
    };
  }, [sectionRef, enabled]);
}
