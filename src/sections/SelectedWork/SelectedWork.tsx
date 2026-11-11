import { breakpoints } from '../../tokens';
import { Link as RouterLink } from 'react-router-dom';
import { Section, Container, Text, Tag, Card, MagnetLink, PromptSteps } from '../../components';
import type { CursorTracker } from '../../hooks/useCursorTracker';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { useCardTilt } from '../../hooks/useCardTilt';
import { saveScrollForReturn } from '../../hooks/useScrollRestoration';
import { caseStudies, type CaseStudySummary } from '../../content/caseStudies';
import { WorkWheel } from './WorkWheel';
import { WorkStack } from './WorkStack';
import { WorkCylinder } from './WorkCylinder';
import styles from './SelectedWork.module.css';

export interface SelectedWorkProps {
  cursor: CursorTracker;
}

/** Same breakpoint Pipeline uses for its sticky-pin fallback — both animated prototypes need the same horizontal room. */
const TABLET_BREAKPOINT = breakpoints.tablet;

/** Phones share the cylinder mechanics; reduced motion keeps the static phone cards. */
const PHONE_BREAKPOINT = breakpoints.phone;

/** Shared full-motion carousel; tablets retain the list layout. */
const VARIANT: 'wheel' | 'stack' | 'cylinder' | 'list' = 'cylinder';

export function SelectedWork({ cursor }: SelectedWorkProps) {
  const reducedMotion = useReducedMotion();
  const windowWidth = useWindowWidth();
  // Keep the tablet list and the static fallback for reduced motion.
  const variant =
    !reducedMotion && (windowWidth > TABLET_BREAKPOINT || windowWidth <= PHONE_BREAKPOINT)
      ? VARIANT
      : windowWidth <= PHONE_BREAKPOINT
        ? 'phone'
        : 'list';

  return (
    <Section id="work" className={variant === 'cylinder' && windowWidth <= PHONE_BREAKPOINT ? styles.mobileCylinder : undefined} stageAnchor={2} paddingTop="section-block" paddingBottom="section-block">
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
      </Container>

      {variant === 'wheel' && <WorkWheel cases={caseStudies} />}
      {variant === 'cylinder' && <WorkCylinder cases={caseStudies} cursor={cursor} phone={windowWidth <= PHONE_BREAKPOINT} />}
      {variant === 'stack' && (
        <Container size="wide">
          <WorkStack cases={caseStudies} cursor={cursor} />
        </Container>
      )}
      {variant === 'list' && (
        <Container size="wide">
          <div className={styles.list}>
            {caseStudies.map((cs) => (
              <CaseStudyCard key={cs.id} cs={cs} cursor={cursor} />
            ))}
          </div>
        </Container>
      )}
      {variant === 'phone' && (
        <Container size="wide">
          <div className={styles.phoneList}>
            {caseStudies.map((cs) => (
              <PhoneCaseStudyCard key={cs.id} cs={cs} cursor={cursor} />
            ))}
          </div>
        </Container>
      )}
    </Section>
  );
}

/** Static phone cards retained for prefers-reduced-motion. */
function PhoneCaseStudyCard({ cs, cursor }: { cs: CaseStudySummary; cursor: CursorTracker }) {
  const reveal = useScrollReveal(cs.id);
  const reducedMotion = useReducedMotion();

  return (
    <div data-reveal-id={cs.id} style={reveal}>
      <Card className={styles.phoneStaticCard} corners={false} onMouseEnter={cursor.onEnter} onMouseLeave={cursor.onLeave}>
        <RouterLink
          to={`/work/${cs.id}`}
          aria-label={cs.title}
          className={styles.cardOverlayLink}
          onClick={saveScrollForReturn}
        />
        <div className={styles.phoneTop}>
          <div className={styles.tagGroup}>
            <Tag tone="accent" className={styles.phoneTag}>
              {cs.tag}
            </Tag>
            {cs.extraTags?.map((t) => (
              <Tag key={t} tone="accent" className={styles.phoneTag}>
                {t}
              </Tag>
            ))}
          </div>
          <span className={styles.phoneType}>{cs.type}</span>
        </div>

        <h3 className={styles.phoneName}>{cs.title.split(' — ')[0]}</h3>

        <div className={styles.phoneMetrics}>
          {cs.metrics.map((m) => (
            <div key={m.label}>
              <div className={styles.phoneMetricLabel}>{m.label}</div>
              <div className={styles.phoneMetricValue}>{m.value}</div>
            </div>
          ))}
        </div>

        <p className={styles.phoneTeaser}>{cs.teaser}</p>

        <div className={styles.phoneFooter}>
          <MagnetLink icon="arrow-right"
            href={`/work/${cs.id}`}
            variant="plain"
            reducedMotion={reducedMotion}
            onMouseEnter={cursor.onEnter}
            onMouseLeave={cursor.onLeave}
            onClick={saveScrollForReturn}
          >
            open case
          </MagnetLink>
        </div>
      </Card>
    </div>
  );
}

/** Own component (not inlined in the .map() above) so useScrollReveal can be called per-card without breaking rules-of-hooks. */
function CaseStudyCard({ cs, cursor }: { cs: CaseStudySummary; cursor: CursorTracker }) {
  const reveal = useScrollReveal(cs.id);
  const reducedMotion = useReducedMotion();
  const tilt = useCardTilt(reducedMotion);

  return (
    <div data-reveal-id={cs.id} style={reveal}>
      <Card
        corners={false}
        onMouseEnter={() => {
          cursor.onEnter();
          tilt.onMouseEnter();
        }}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={() => {
          cursor.onLeave();
          tilt.onMouseLeave();
        }}
        style={{ transform: tilt.transform, boxShadow: 'var(--case-shadow, none)' }}
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
          <div className={styles.tagGroup}>
            <Tag tone="accent">{cs.tag}</Tag>
            {cs.extraTags?.map((t) => (
              <Tag key={t} tone="accent">
                {t}
              </Tag>
            ))}
          </div>
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

        <div className={styles.footerLinks}>
          <MagnetLink icon="arrow-right"
            href={`/work/${cs.id}`}
            variant="plain"
            reducedMotion={reducedMotion}
            onMouseEnter={cursor.onEnter}
            onMouseLeave={cursor.onLeave}
            onClick={saveScrollForReturn}
          >
            open case
          </MagnetLink>
        </div>
      </Card>
    </div>
  );
}
