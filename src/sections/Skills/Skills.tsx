import { Section, Container, Text, Tag, PromptSteps } from '../../components';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { skills } from '../../content/skills';
import styles from './Skills.module.css';

export function Skills() {
  // Called individually (not inside the render loop below) — hooks can't run
  // inside .map() callbacks, even over a fixed-length array like this one.
  const hardReveal = useScrollReveal('skills-hard');
  const toolsReveal = useScrollReveal('skills-tools');
  const softReveal = useScrollReveal('skills-soft');

  const groups = [
    { key: 'hard', revealId: 'skills-hard', label: 'hard skills', items: skills.hard, reveal: hardReveal },
    { key: 'tools', revealId: 'skills-tools', label: 'tools & stack', items: skills.tools, reveal: toolsReveal },
    { key: 'soft', revealId: 'skills-soft', label: 'soft skills', items: skills.soft, reveal: softReveal },
  ] as const;

  return (
    <Section id="skills" stageAnchor={3} paddingTop={60} paddingBottom={100}>
      <div className={styles.content}>
        <Container size="wide">
          <PromptSteps question="какими инструментами и навыками владеешь" />
          <div className={styles.header}>
            <div className={styles.headerRow}>
              <Text variant="sectionHeading" as="h2">
                Навыки
              </Text>
              <Text variant="eyebrow" className={styles.eyebrow}>
                skills.spec
              </Text>
            </div>
          </div>
          <div className={styles.grid}>
            {groups.map((g) => (
              <div key={g.key} data-reveal-id={g.revealId} data-asm-sync="1" style={g.reveal} className={styles.card}>
                <div className={styles.cardLabel}>{g.label}</div>
                <div className={styles.chips}>
                  {g.items.map((item) => (
                    <Tag key={item} tone="chip">
                      {item}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </Section>
  );
}
