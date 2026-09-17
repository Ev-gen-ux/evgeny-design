import { Section, Container, Text, PromptSteps } from '../../components';
import { experience } from '../../content/experience';
import styles from './Experience.module.css';

export function Experience() {
  return (
    <Section id="experience" paddingTop={60} paddingBottom={100}>
      <Container size="narrow">
        <PromptSteps question="какой у тебя опыт работы" />
        <div className={styles.header}>
          <Text variant="sectionHeading" as="h2">
            Опыт работы
          </Text>
          <Text variant="eyebrow" className={styles.eyebrow}>
            experience.log
          </Text>
        </div>
        <div className={styles.timeline}>
          {experience.map((e, i) => (
            <div key={i} data-asm-sync="1" className={styles.item}>
              <span className={styles.dot} />
              <div className={styles.dates}>{e.dates}</div>
              <div className={styles.role}>{e.role}</div>
              <div className={styles.company}>{e.company}</div>
              <p className={styles.text}>{e.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
