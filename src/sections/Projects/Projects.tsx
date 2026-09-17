import { Section, Container, Text, Link, PromptSteps } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { otherProjects } from '../../content/projects';
import styles from './Projects.module.css';

export interface ProjectsProps {
  cursor: CursorTracker;
}

export function Projects({ cursor }: ProjectsProps) {
  const reveal = useScrollReveal('projects');

  return (
    <Section id="projects" revealId="projects" paddingTop={60} paddingBottom={100} style={reveal}>
      <Container size="wide">
        <PromptSteps question="что ещё есть в портфолио, кроме кейсов" />
        <Text variant="eyebrow" className={styles.eyebrow}>
          other.projects
        </Text>
        <div className={styles.grid}>
          {otherProjects.map((p) => (
            <div key={p.title} data-asm-sync="1" className={styles.card} onMouseEnter={cursor.onEnter} onMouseLeave={cursor.onLeave}>
              <div className={styles.title}>{p.title}</div>
              <div className={styles.desc}>{p.desc}</div>
              <div className={styles.links}>
                {p.links.map((l) => (
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
