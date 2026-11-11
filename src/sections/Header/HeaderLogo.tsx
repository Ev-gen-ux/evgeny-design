import { Link } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import './header-brand.css';

export function HeaderLogo({ onHome }: { onHome: boolean }) {
  const lenis = useLenis();
  const content = <span className="headerBrandLogoLetters" aria-hidden="true"><span>E</span><span>—</span><span>Y</span></span>;
  const props = { className: 'headerBrandLogo', 'aria-label': 'Евгений Яковенко — на главную', 'data-noasm': '1' };
  return onHome ? <a {...props} href="#hero" onClick={event => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    event.preventDefault();
    if (lenis) lenis.scrollTo(hero.getBoundingClientRect().top + window.scrollY, { immediate: true });
    else hero.scrollIntoView();
  }}>{content}</a> : <Link {...props} to="/#hero">{content}</Link>;
}
