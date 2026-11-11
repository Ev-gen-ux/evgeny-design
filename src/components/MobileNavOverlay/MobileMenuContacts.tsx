import { MagnetLink } from '../Link/MagnetLink';
import { contactColumns } from '../../content/contact';
import footerStyles from '../ContactFooter/ContactFooter.module.css';
import styles from './MobileMenuContacts.module.css';

/** Reuse the footer's contact column and links, without its heading. */
export function MobileMenuContacts({ reducedMotion, onClose }: { reducedMotion: boolean; onClose: () => void }) {
  return (
    <div className={`${footerStyles.col} ${styles.contacts}`} data-mobile-menu-contacts="1" data-noasm="1" aria-label="Контакты">
      {contactColumns[0].links.map(link => (
        <MagnetLink key={link.id} href={link.url} external={link.external} icon="arrow-right"
          variant="contactNav" reducedMotion={reducedMotion} onClick={onClose}>
          <span data-menu-asm="1">{link.label}</span>
        </MagnetLink>
      ))}
    </div>
  );
}
