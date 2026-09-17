import { Link as RouterLink } from 'react-router-dom';
import { Section, Container, Text, Tag, Card, MagnetLink, PromptSteps } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useCardTilt } from '../../hooks/useCardTilt';
import { saveScrollForReturn } from '../../hooks/useScrollRestoration';
import { caseStudies, type CaseStudySummary } from '../../content/caseStudies';
import styles from './SelectedWork.module.css';

export interface SelectedWorkProps {
  cursor: CursorTracker;
}

export function SelectedWork({ cursor }: SelectedWorkProps) {
  return (
    <Section id="work" stageAnchor={2} paddingTop={60} paddingBottom={60}>
      <Container size="wide">
        <PromptSteps question="покажи, что ты уже сделал" />
        <div className={styles.header}>
          <div className={styles.headerRow}>
            <Text variant="displayLg" as="h2">
              Избранные кейсы
            </Text>
            <span className={styles.count}>{caseStudies.length} case studies</span>
          </div>
        </div>

        <div className={styles.list}>
          {caseStudies.map((cs) => (
            <CaseStudyCard key={cs.id} cs={cs} cursor={cursor} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

/** Own component (not inlined in the .map() above) so useScrollReveal can be called per-card without breaking rules-of-hooks. */
function CaseStudyCard({ cs, cursor }: { cs: CaseStudySummary; cursor: CursorTracker }) {
  const reveal = useScrollReveal(cs.id);
  const reducedMotion = useReducedMotion();
  const tilt = useCardTilt(reducedMotion);

  return (
    <div data-reveal-id={cs.id} data-asm-sync="1" style={reveal}>
      <Card
        onMouseEnter={() => {
          cursor.onEnter();
          tilt.onMouseEnter();
        }}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={() => {
          cursor.onLeave();
          tilt.onMouseLeave();
        }}
        style={{ transform: tilt.transform, boxShadow: tilt.boxShadow }}
        behindContent={
          <div className={styles.blob} style={{ left: tilt.lx, top: tilt.ly, opacity: tilt.blobOpacity }} aria-hidden="true" />
        }
      >
        <RouterLink
          to={`/work/${cs.id}`}
          aria-label={cs.title}
          className={styles.cardOverlayLink}
          onClick={saveScrollForReturn}
        />
        <div className={styles.cardTop}>
          <Tag tone="accent">{cs.tag}</Tag>
          <span className={styles.cardType}>{cs.type}</span>
        </div>

        <Text variant="cardTitle" as="h3" className={styles.cardTitle}>
          {cs.title}
        </Text>

        <div className={styles.flowRow}>
          {cs.blocks.map((b, i) => (
            <div key={b.label} className={styles.flowNode}>
              <div className={styles.flowDotWrap}>
                <span className={styles.flowDot} />
                <span className={styles.flowLabel}>{b.label}</span>
              </div>
              {i < cs.blocks.length - 1 && <div className={styles.flowLine} />}
            </div>
          ))}
        </div>

        <div className={styles.metrics}>
          {cs.metrics.map((m) => (
            <div key={m.label}>
              <div className={styles.metricLabel}>{m.label}</div>
              <div className={styles.metricValue}>{m.value}</div>
            </div>
          ))}
        </div>

        <div className={styles.blocks}>
          {cs.blocks.map((b) => (
            <div key={b.label} className={styles.block}>
              <div className={styles.blockLabel}>{b.label}</div>
              <p className={styles.blockText}>{b.text}</p>
            </div>
          ))}
        </div>

        <div className={styles.footerLinks}>
          <MagnetLink
            href={`/work/${cs.id}`}
            variant="accent"
            reducedMotion={reducedMotion}
            onMouseEnter={cursor.onEnter}
            onMouseLeave={cursor.onLeave}
            onClick={saveScrollForReturn}
          >
            Открыть кейс →
          </MagnetLink>
          {cs.links.map((l) => (
            <MagnetLink
              key={l.url}
              href={l.url}
              variant="underline"
              external
              reducedMotion={reducedMotion}
              onMouseEnter={cursor.onEnter}
              onMouseLeave={cursor.onLeave}
            >
              {l.label} ↗
            </MagnetLink>
          ))}
        </div>
      </Card>
    </div>
  );
}
