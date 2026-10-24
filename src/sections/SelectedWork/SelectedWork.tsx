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
const TABLET_BREAKPOINT = 768;

/** The site's one phone breakpoint — below this, the cylinder's 3D/scroll-pin rig is replaced by a static card (see PhoneCaseStudyCard) that mirrors its face visually, not its mechanics. */
const PHONE_BREAKPOINT = 640;

/** Prototype switch (2026-09-23, not committed to prod) — flip to compare the two animation candidates against the plain list; 'list' is the current prod behavior. */
const VARIANT: 'wheel' | 'stack' | 'cylinder' | 'list' = 'cylinder';

export function SelectedWork({ cursor }: SelectedWorkProps) {
  const reducedMotion = useReducedMotion();
  const windowWidth = useWindowWidth();
  // Both prototypes need real desktop width + full motion; plain card list
  // on tablet; phone (2026-10-09, explicit user request: cards should look
  // like the desktop cylinder's face, scaled down) gets its own static variant
  // instead of falling through to the list.
  const variant =
    !reducedMotion && windowWidth > TABLET_BREAKPOINT
      ? VARIANT
      : windowWidth <= PHONE_BREAKPOINT
        ? 'phone'
        : 'list';

  return (
    <Section id="work" stageAnchor={2} paddingTop={60} paddingBottom={variant === 'list' || variant === 'phone' ? 60 : undefined}>
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
      {variant === 'cylinder' && <WorkCylinder cases={caseStudies} cursor={cursor} />}
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

/**
 * Phone-only (≤640px, see PHONE_BREAKPOINT), static replica of WorkCylinder's
 * card face (2026-10-09, explicit user request: "карточки на мобилке должны
 * визуально выглядеть так же, как и на десктопе... только уменьшенной
 * версией") — same anatomy (tag+type, title with subtitle dropped after the
 * em-dash, metrics, teaser, "open case →" footer), none of the 3D/scroll-pin
 * rig (that's desktop-only, fixed at 440×300 and tuned for perspective —
 * see WorkCylinder.tsx/.module.css). Sizes here are tuned fresh for a
 * ~330px-wide phone card, not copied from the 440×300 desktop values.
 */
function PhoneCaseStudyCard({ cs, cursor }: { cs: CaseStudySummary; cursor: CursorTracker }) {
  const reveal = useScrollReveal(cs.id);
  const reducedMotion = useReducedMotion();

  return (
    <div data-reveal-id={cs.id} style={reveal}>
      <Card onMouseEnter={cursor.onEnter} onMouseLeave={cursor.onLeave}>
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
          <MagnetLink
            href={`/work/${cs.id}`}
            variant="underline"
            reducedMotion={reducedMotion}
            onMouseEnter={cursor.onEnter}
            onMouseLeave={cursor.onLeave}
            onClick={saveScrollForReturn}
          >
            open case →
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

/** Own component (not inlined in the .map() above) so useScrollReveal can be called per-card without breaking rules-of-hooks. */
function CaseStudyCard({ cs, cursor }: { cs: CaseStudySummary; cursor: CursorTracker }) {
  const reveal = useScrollReveal(cs.id);
  const reducedMotion = useReducedMotion();
  const tilt = useCardTilt(reducedMotion);

  return (
    <div data-reveal-id={cs.id} style={reveal}>
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
          <MagnetLink
            href={`/work/${cs.id}`}
            variant="underline"
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
