import { Link } from '../Link';
import { contact, contactLinks } from '../../content/contact';
import styles from './Footer.module.css';

/**
 * Global footer row — contact links (phone/telegram/site/github) + copyright,
 * shared between the home page (Contact section) and every case-study page
 * (added 2026-08-03, per explicit request): a case-study page can be
 * someone's first and only stop on the site (a shared link, not a click-through
 * from Home), so contact info being reachable only from Home was real friction
 * right at the moment someone's actually interested. Deliberately just this
 * compact row, not the whole Contact section (heading, big email link, chat
 * prompt) — that would be too heavy to repeat as a closing note on every case
 * page.
 *
 * Extracted from Contact.module.css's original `.footerRow` (itself already
 * merged from a separate `.footer` block into the links row, see that
 * file's history) once CaseStudy needed the identical thing — same
 * `padding-bottom` reservation for the fixed ChatBar on both pages.
 */
export function Footer() {
  return (
    <div className={styles.footerRow}>
      <div className={styles.linksRow}>
        {contactLinks.map((l) => (
          <Link key={l.id} href={l.url} variant="contactNav" external={l.external}>
            {l.label}
          </Link>
        ))}
      </div>
      <span className={styles.copyright}>{contact.footer}</span>
    </div>
  );
}
