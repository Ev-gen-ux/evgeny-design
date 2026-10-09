import { Text } from '../Typography';
import { MagnetLink } from '../Link';
import { PromptSteps } from '../PromptSteps';
import { contact, contactColumns } from '../../content/contact';
import styles from './ContactFooter.module.css';

export interface ContactFooterProps {
  reducedMotion: boolean;
}

/**
 * Full-bleed contact footer (2026-09-26, per user request, reference: a
 * fluid footer with link columns on top and one giant word across the whole
 * width). Replaces Contact's old ContactCta + Footer pair on Home; the case
 * pages still render the old pair until they're switched over. All copy and
 * links come from content/contact.ts. Nothing here touches the text-assembly
 * animation — it's the same generic letter-scatter engine plus the section's
 * own `asmSync`, applied to the new markup.
 */
export function ContactFooter({ reducedMotion }: ContactFooterProps) {
  return (
    <div className={styles.root} data-asm-own="1">
      <div className={styles.top}>
        <div className={styles.lead}>
          <PromptSteps question="как с тобой связаться" className={styles.prompt} />
          <Text variant="eyebrow" className={styles.eyebrow}>
            {contact.eyebrow}
          </Text>
          <Text variant="displayLg" as="h2" className={styles.title}>
            {contact.title}
          </Text>
        </div>

        <nav className={styles.cols} aria-label="Контакты и ссылки">
          {contactColumns.map((col) => (
            <div key={col.head} className={styles.col}>
              <span className={styles.colHead}>{col.head}</span>
              {col.links.map((l) => (
                <MagnetLink key={l.id} href={l.url} variant="contactNav" external={l.external} reducedMotion={reducedMotion}>
                  {l.label} →
                </MagnetLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.meta}>
        <span>{contact.footer}</span>
        <span className={styles.metaExtra}>{contact.footerExtra.replace(/^\s*—\s*/, '')}</span>
      </div>

      <a className={styles.giant} href={`mailto:${contact.email}`} aria-label={`Написать на ${contact.email}`}>
        {contact.giant}
      </a>
    </div>
  );
}
