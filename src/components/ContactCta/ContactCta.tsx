import { Text } from '../Typography';
import { MagnetLink } from '../Link';
import { PromptSteps } from '../PromptSteps';
import { contact } from '../../content/contact';
import styles from './ContactCta.module.css';

export interface ContactCtaProps {
  reducedMotion: boolean;
}

/**
 * "How to reach me" block — you/agent prompt, eyebrow, big heading, email —
 * extracted from Contact.tsx (2026-08-03) once case-study pages needed the
 * exact same thing: a case page can be someone's only stop on the site (a
 * shared link, not a click-through from Home), so the actual invitation to
 * get in touch — not just the compact contact-links Footer, the real "I'm
 * open to work" CTA — was missing there. Deliberately doesn't own its own
 * `<Section>`/reveal wrapper: Home's Contact section drives its own
 * scroll-reveal fade-in around this, while CaseStudy pages don't use that
 * system at all (they rely on useCaseStudyAssembly's own text-scatter
 * instead, which picks this up automatically like any other text on the
 * page) — this component owns only the centered-column layout and content,
 * not the surrounding animation/section semantics.
 *
 * No page-specific content: same email, same question, same everywhere,
 * deliberately — this is "how to reach me," not something worth varying per
 * page.
 */
export function ContactCta({ reducedMotion }: ContactCtaProps) {
  return (
    <div className={styles.inner}>
      <PromptSteps question="как с тобой связаться" className={styles.prompt} />
      <Text variant="eyebrow" className={styles.eyebrow}>
        {contact.eyebrow}
      </Text>
      <Text variant="displayXl" as="h2" className={styles.title}>
        {contact.title}
      </Text>
      <MagnetLink href={`mailto:${contact.email}`} variant="email" reducedMotion={reducedMotion}>
        {contact.email}
      </MagnetLink>
    </div>
  );
}
