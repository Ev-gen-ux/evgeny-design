import { useLayoutEffect } from 'react';
import headerStyles from '../sections/Header/Header.module.css';

/** Position the existing heading below the real floating Header on every viewport. */
export function useExperienceSticky() {
  useLayoutEffect(() => {
    const section = document.getElementById('experience');
    const header = document.querySelector<HTMLElement>(`nav.${headerStyles.nav}`);
    const heading = section?.querySelector<HTMLElement>('.experienceStickyHeading');
    const titleRow = heading?.querySelector('h2')?.parentElement;
    const timeline = section?.querySelector<HTMLElement>('[data-experience-timeline]');
    const maskLayer = section?.querySelector<HTMLElement>('[data-experience-mask]');
    const lastEntry = timeline?.lastElementChild as HTMLElement | null;
    if (!section || !header || !heading || !titleRow || !timeline || !maskLayer || !lastEntry) return;
    let raf = 0;
    let inView = true;
    let releaseShift = 0;
    const mask = () => {
      raf = 0;
      if (!inView) return;
      const computed = getComputedStyle(section);
      const gap = parseFloat(computed.getPropertyValue('--space-16')) || 16;
      const releaseGap = parseFloat(computed.getPropertyValue('--experience-sticky-release-gap')) || 24;
      // Recover the native sticky position without accumulating our own translation.
      const headingRect = heading.getBoundingClientRect();
      const nativeTop = headingRect.top + releaseShift;
      const nativeTitleBottom = titleRow.getBoundingClientRect().bottom + releaseShift;
      // Once the last entry reaches its reading position, it carries the heading upward.
      const lastTop = lastEntry.getBoundingClientRect().top;
      const nextShift = Math.max(0, nativeTop + headingRect.height + releaseGap - lastTop);
      const cut = nativeTitleBottom - nextShift + gap - maskLayer.getBoundingClientRect().top;
      heading.style.transform = nextShift > 0 ? `translateY(${-nextShift}px)` : '';
      releaseShift = nextShift;
      maskLayer.dataset.headingOverlap = cut > 0 ? 'true' : 'false';
      maskLayer.style.setProperty('--experience-mask-edge', `${Math.max(0, cut)}px`);
    };
    const schedule = () => { if (!raf && inView) raf = requestAnimationFrame(mask); };
    const update = () => {
      const gap = parseFloat(getComputedStyle(section).getPropertyValue('--experience-sticky-header-gap')) || 16;
      section.style.setProperty('--experience-sticky-top', `${Math.max(0, header.getBoundingClientRect().bottom) + gap}px`);
      schedule();
    };
    const observer = new ResizeObserver(() => requestAnimationFrame(update));
    observer.observe(header);
    observer.observe(heading);
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    });
    visibility.observe(section);
    addEventListener('resize', update, { passive: true });
    addEventListener('scroll', schedule, { passive: true });
    document.fonts.ready.then(update);
    update();
    return () => {
      observer.disconnect();
      visibility.disconnect();
      cancelAnimationFrame(raf);
      removeEventListener('resize', update);
      removeEventListener('scroll', schedule);
      section.style.removeProperty('--experience-sticky-top');
      heading.style.removeProperty('transform');
      maskLayer.style.removeProperty('--experience-mask-edge');
      delete maskLayer.dataset.headingOverlap;
    };
  }, []);
}
