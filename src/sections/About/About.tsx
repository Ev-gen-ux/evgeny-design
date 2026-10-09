import { Section, Container, Text, PromptSteps } from '../../components';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice';
import { about, aboutDialog } from '../../content/about';
import { AboutReel } from './AboutReel';
import { AboutFigure } from './AboutFigure';
import { AboutDialog } from './AboutDialog';

/**
 * Which answer the About block shows (2026-09-26): 'carousel' = the saved carousel (AboutReel: phrase + explanation),
 * 'dialog' = the you / agent dialog with question buttons (chosen 2026-09-26), 'figure' = the figure-as-an-outline variant (AboutFigure: statements with leader lines to the hero figure, desktop
 * only; it falls back to the carousel where the figure is not shown).
 */
const VARIANT: 'carousel' | 'figure' | 'dialog' = 'dialog';
const FIGURE_MIN_WIDTH = 1025;
import styles from './About.module.css';

/** "you ask / agent replies" prompt (shared `PromptSteps`) + the answer: headline, a carousel of four slides (a phrase + its explanation). */
export function About() {
  const reveal = useScrollReveal('about');
  const reducedMotion = useReducedMotion();
  const width = useWindowWidth();
  const isTouch = useIsTouchDevice();
  const figureOn = VARIANT === 'figure' && !reducedMotion && !isTouch && width >= FIGURE_MIN_WIDTH;

  return (
    <Section id="about" stageAnchor={1} revealId="about" asmSync asmOwn asmSpan={1.2} paddingTop={100} paddingBottom={100} style={reveal}>
      <Container size="wide" className={styles.inner}>
        <div className={styles.label}>
          <PromptSteps question="кто ты?" />
          <Text variant="sectionHeading" as="h2" className={styles.promptAnswer}>
            {about.title}
          </Text>
        </div>
        <div className={styles.poster}>
          <div className={styles.headline}>
            <p className={styles.line}>{about.headline[0]}</p>
            <p className={`${styles.line} ${styles.accent}`}>{about.headline[1]}</p>
          </div>
          {VARIANT === 'dialog' ? (
            <AboutDialog items={aboutDialog} reducedMotion={reducedMotion} />
          ) : figureOn ? (
            <AboutFigure slides={about.slides} />
          ) : (
            <AboutReel slides={about.slides} reducedMotion={reducedMotion} />
          )}
        </div>
      </Container>
    </Section>
  );
}
