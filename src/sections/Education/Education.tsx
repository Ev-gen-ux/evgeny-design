import { Section, Container, Text, Link, PromptSteps } from '../../components';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { education } from '../../content/education';
import styles from './Education.module.css';

export function Education() {
  const reveal = useScrollReveal('education');

  return (
    <Section id="education" revealId="education" paddingTop={60} paddingBottom={100} style={reveal}>
      <Container size="narrow">
        <PromptSteps question="как ты учился" />
        <div className={styles.header}>
          <Text variant="sectionHeading" as="h2">
            Образование
          </Text>
          <Text variant="eyebrow" className={styles.eyebrow}>
            education.spec
          </Text>
        </div>
        <div className={styles.list}>
          {education.map((ed) => (
            <div key={ed.year + ed.title} className={styles.row}>
              <span className={styles.year}>{ed.year}</span>
              <span className={styles.title}>{ed.title}</span>
              <div className={styles.links}>
                {ed.links.map((l) => (
                  <Link key={l.url} href={l.url} variant="ghost" external>
                    {l.label} ↗
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
