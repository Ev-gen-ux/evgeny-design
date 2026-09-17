/** 1:1 with Portfolio.dc.html — hero section markup + HERO_HEADLINE/HERO_CTAS/TYPE_TAGS. */
export const hero = {
  eyebrow: 'senior product / design engineer',
  headline: 'Дизайн-пайплайн, который запускают AI-агенты — чтобы решать реальные бизнес-задачи.',
  sub: 'Веду продуктовый дизайн enterprise fintech и строю AI Design Pipeline — систему из 27 инструкций, покрывающую путь от брифа до готового прототипа.',
} as const;

export const heroCtas = [
  { id: 'hero-email', label: 'email →', url: 'mailto:evgeniyakovenko84@gmail.com', external: false },
  { id: 'hero-telegram', label: 'telegram →', url: 'https://t.me/EvgeniYakovenko84', external: true },
  { id: 'hero-site', label: 'резюме-сайт →', url: 'https://evgeniyakovenko-resumewebsite.netlify.app', external: true },
] as const;

/** Type-spec tags rendered like a Figma inspect-panel annotation next to the headline. */
export const typeTags = [
  { k: 'face', v: 'Space Grotesk' },
  { k: 'size', v: 'clamp(48,9vw,120px)' },
  { k: 'weight', v: '700' },
  { k: 'tracking', v: '-0.02em' },
] as const;
