/** 1:1 with Portfolio.dc.html #contact section — CONTACT_LINKS + surrounding copy. */
export const contact = {
  eyebrow: 'contact.spec',
  title: 'Открыт к новым системам.',
  email: 'evgeniyakovenko84@gmail.com',
  footer: '© 2026 Евгений Яковенко — index построен через AI Design Pipeline',
} as const;

export const contactLinks = [
  { id: 'contact-phone', label: '+7 (926) 936-33-29', url: 'tel:+79269363329', external: false },
  { id: 'contact-tg', label: 'telegram', url: 'https://t.me/EvgeniYakovenko84', external: true },
  { id: 'contact-site', label: 'резюме-сайт', url: 'https://evgeniyakovenko-resumewebsite.netlify.app', external: true },
  { id: 'contact-gh', label: 'github', url: 'https://github.com/Ev-gen-ux/AI-PDP-DS', external: true },
] as const;
