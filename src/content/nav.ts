/** 1:1 with Site Header.dc.html — ITEMS/ANCHOR. */
export const navLinks = [
  { label: 'work', href: '#work' },
  { label: 'experience', href: '#experience' },
  { label: 'process', href: '#pipeline' },
  { label: 'skills', href: '#skills' },
  { label: 'contact', href: '#contact' },
] as const;

/** `tag` changed 2026-08-02 per user request — simulated "agent session" indicator (pulsing dot + label), same concept as Pipeline's AGENT SESSION timeline, now in the header on every page. */
export const wordmark = {
  name: 'Евгений Яковенко',
  tag: 'session #2026 · agent-built',
} as const;
