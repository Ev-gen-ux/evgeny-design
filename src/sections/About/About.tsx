import { Section, Container, Text, PromptSteps } from '../../components';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { about } from '../../content/about';
import styles from './About.module.css';

/**
 * "you ask / agent replies" prompt — reworked several times per user
 * feedback (2026-08-02/03), now using the shared `PromptSteps` component
 * (extracted 2026-08-03 from this section's own local version, once the
 * case-study pages and the rest of the home-page sections all needed the
 * exact same dot/line mechanic). The heading is its own block right after
 * `PromptSteps` (not merged inline with the agent dot as an earlier
 * iteration had it) — matches how every case-study section renders this.
 */
export function About() {
  const reveal = useScrollReveal('about');

  return (
    <Section id="about" stageAnchor={1} revealId="about" asmSync paddingTop={100} paddingBottom={100} style={reveal}>
      <Container size="default" className={styles.inner}>
        <div className={styles.label}>
          <PromptSteps question="кто ты?" />
          <Text variant="sectionHeading" as="h2" className={styles.promptAnswer}>
            {about.title}
          </Text>
        </div>
        <p className={styles.text}>{about.text}</p>
      </Container>
    </Section>
  );
}
