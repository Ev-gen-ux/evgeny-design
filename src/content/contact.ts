/** 1:1 with Portfolio.dc.html #contact section — CONTACT_LINKS + surrounding copy. */
export const contact = {
  eyebrow: 'contact.spec',
  title: 'Открыт к новым системам.',
  email: 'evgeniyakovenko84@gmail.com',
  footer: '© 2026 Евгений Яковенко',
  footerExtra: ' — index построен через AI Design Pipeline',
  /** The giant full-width word in the footer (links to mailto) — 2026-09-26. */
  giant: 'CONTACT',
} as const;

export const contactLinks = [
  { id: 'contact-phone', label: '+7 (926) 936-33-29', url: 'tel:+79269363329', external: false },
  { id: 'contact-tg', label: 'telegram', url: 'https://t.me/EvgeniYakovenko84', external: true },
  { id: 'contact-site', label: 'резюме-сайт', url: 'https://evgeniyakovenko-resumewebsite.netlify.app', external: true },
  { id: 'contact-gh', label: 'github', url: 'https://github.com/Ev-gen-ux/AI-PDP-DS', external: true },
] as const;

interface FooterLink {
  id: string;
  label: string;
  url: string;
  external: boolean;
}

const linkById = (id: string): FooterLink => {
  const l = contactLinks.find((x) => x.id === id);
  if (!l) throw new Error(`contactLinks: unknown id ${id}`);
  return l;
};

/** Footer link columns (2026-09-26) — same links as `contactLinks` plus the email, regrouped by what you'd do with them. */
export const contactColumns: { head: string; links: FooterLink[] }[] = [
  {
    head: 'написать',
    links: [
      { id: 'contact-email', label: contact.email, url: `mailto:${contact.email}`, external: false },
      linkById('contact-tg'),
      linkById('contact-phone'),
    ],
  },
  { head: 'смотреть', links: [linkById('contact-site'), linkById('contact-gh')] },
];
