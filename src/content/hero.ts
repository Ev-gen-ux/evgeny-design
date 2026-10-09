/** 1:1 with Portfolio.dc.html — hero section markup + HERO_HEADLINE/HERO_CTAS/TYPE_TAGS. */
export const hero = {
  eyebrow: 'senior product / design engineer',
  // "AI‑агенты" uses U+2011 (non-breaking hyphen), not a plain "-" (2026-09-18,
  // explicit user request, mobile only) — the hyphen-aware line-break fix in
  // useAssemblyAnimation.ts treats a real "-" as a valid wrap point (so long
  // compounds like "Дизайн-пайплайн" can still break there), but "AI-" alone
  // dangling at a line's end read badly to the user; a non-breaking hyphen
  // renders identically but is never a break opportunity, so "AI‑агенты"
  // now always moves to the next line as one unit instead of splitting.
  headline: 'Дизайн-пайплайн, который запускают AI‑агенты',
  // Second big line, bottom-right corner (2026-09-26) — a standalone secondary
  // thesis (the first version was the tail of the original headline and read as
  // a dangling fragment; the second repeated "дизайн" from the headline —
  // it must not reuse any word/root from the headline or the description). U+2011 in "бизнес‑задачи" for the
  // same reason as "AI‑агенты" above.
  goal: 'Цель — решать реальные бизнес‑задачи',
  // Two parts (2026-09-26, per user request): on desktop the line breaks before «AI Design Pipeline», so «AI» no
  // longer dangles at the end of the first line (Hero.tsx puts a desktop-only <br> between them; elsewhere the parts
  // read as one sentence). A non-breaking space does not work here: the assembly engine splits on it.
  sub: ['Веду продуктовый дизайн enterprise fintech и строю', 'AI Design Pipeline: путь от брифа до готового прототипа.'],
} as const;

export const heroCtas = [
  { id: 'hero-email', label: 'email →', url: 'mailto:evgeniyakovenko84@gmail.com', external: false },
  { id: 'hero-telegram', label: 'telegram →', url: 'https://t.me/EvgeniYakovenko84', external: true },
  { id: 'hero-site', label: 'резюме-сайт →', url: 'https://evgeniyakovenko-resumewebsite.netlify.app', external: true },
] as const;

/** Type-spec tags rendered like a Figma inspect-panel annotation next to the headline. */
export const typeTags = [
  { k: 'face', v: 'Space Grotesk' },
  { k: 'size', v: 'clamp(24,3.15vw,48px)' },
  { k: 'weight', v: '700' },
  { k: 'tracking', v: '0.01em' },
] as const;
