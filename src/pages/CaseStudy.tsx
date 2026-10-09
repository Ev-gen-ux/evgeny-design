import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { Tag, MagnetLink, CodeBlock, CursorOverlay, PromptSteps, ContactFooter, ChatBar, GrainOverlay } from '../components';
import { Header } from '../sections/Header';
import type { CursorTracker } from '../hooks/useCursorTracker';
import { useCursorTracker } from '../hooks/useCursorTracker';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMagnetHover } from '../hooks/useMagnetHover';
import { useCaseStudyAssembly } from '../hooks/useCaseStudyAssembly';
import { useMatrixReveal } from '../hooks/useMatrixReveal';
import { useCaseTimelineDrive } from '../hooks/useCaseTimelineDrive';
import { useChatBar } from '../hooks/useChatBar';
import { useSpotGlow } from '../hooks/useSpotGlow';
import {
  getCaseStudy,
  getSiblingCaseStudies,
  matrix,
  CELL_TEXT,
  CELL_COLOR,
  type GenericSection,
  type PersonaItem,
} from '../content/case-studies';
import styles from './CaseStudy.module.css';

export interface CaseStudyPageProps {
  slug: string;
}

/**
 * 1:1 layout/content with Case Study.dc.html, plus this page's own copy-
 * assembly animation (useCaseStudyAssembly) and the matrix bar-reveal scroll
 * animation (useMatrixReveal). Canvas particle-field background is still
 * deferred (per user decision, kept separate).
 *
 * The custom cursor (ring/dot/coordinate readout) was originally left out
 * here (source's Case Study.dc.html imports Site Header without on-enter/
 * on-leave, so Header got a no-op tracker) — added for real per user request
 * (2026-08-02): same `useCursorTracker`/`CursorOverlay` as Home, wired onto
 * this page's own interactive links (back-link, sibling nav, outcome links).
 *
 * Background-grid cursor glow (`.spot`) added 2026-08-02 per user request:
 * same mechanic as Hero's spot glow (now shared as `useSpotGlow`), scoped to
 * the whole page instead of one section. Active only over the bare grid —
 * the `onMouseMove` check below (`e.target === e.currentTarget`) detects
 * whether the cursor is directly over the root background or over some
 * nested content element (a card, a paragraph, the header...) and hides the
 * glow the instant it's the latter, matching the requested "disappears over
 * cards/text" behavior without needing per-element hover wiring everywhere.
 */
export function CaseStudy({ slug }: CaseStudyPageProps) {
  const reducedMotion = useReducedMotion();
  const cursor = useCursorTracker();
  const { spot, onMove: onSpotMove, onLeave: onSpotLeave } = useSpotGlow();
  const backLinkMagnet = useMagnetHover(reducedMotion);
  const lenis = useLenis();
  const matrixRef = useRef<HTMLDivElement>(null);
  const matrixRows = useMatrixReveal(matrixRef, reducedMotion, matrix.cols.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const footerAreaRef = useRef<HTMLDivElement>(null);
  useCaseStudyAssembly(rootRef, !reducedMotion, footerAreaRef);
  const mainRef = useRef<HTMLElement>(null);
  const badgeTextRef = useRef<HTMLDivElement>(null);
  const timelineDotRefs = useRef<(HTMLElement | null)[]>([]);
  const timelineOutcomeRefs = useRef<(HTMLElement | null)[]>([]);
  useCaseTimelineDrive(mainRef, badgeTextRef, timelineDotRefs, timelineOutcomeRefs, !reducedMotion);
  const chatBarRef = useRef<HTMLDivElement>(null);
  const chatTextRef = useRef<HTMLSpanElement>(null);
  const chatStatusDotRef = useRef<HTMLSpanElement>(null);
  const chatStatusTextRef = useRef<HTMLSpanElement>(null);
  useChatBar(rootRef, chatBarRef, chatTextRef, chatStatusDotRef, chatStatusTextRef, !reducedMotion);
  const study = getCaseStudy(slug);
  const siblings = getSiblingCaseStudies(slug);
  const showPersonas = !study.hasMatrix && !!(study.personas && study.personas.length);
  const sections = study.sections ?? [];
  const sectionsBefore = showPersonas ? sections.slice(0, 1) : [];
  const sectionsAfter = showPersonas ? sections.slice(1) : sections;
  const outcomeTag = study.hasMatrix
    ? '06 · outcome'
    : sections.length
      ? `${String(sections.length + (showPersonas ? 3 : 2)).padStart(2, '0')} · outcome`
      : '03 · outcome';

  useEffect(() => {
    document.title = `${study.title} — Евгений Яковенко`;
  }, [study.title]);

  // Arriving here is a route change from Home, which by default keeps
  // whatever scrollY the browser already had (client-side routing doesn't
  // reset scroll like a real document navigation would) — without this, you
  // land wherever you happened to be scrolled to on the card, not at the top,
  // and never see the header's load-in animation. Runs once per mount, and
  // CaseStudyRoute forces a fresh mount per slug (see that file).
  //
  // Goes through Lenis's own scrollTo (2026-08-02, once Lenis was added):
  // a raw window.scrollTo() moves the real page but Lenis keeps its own
  // separate targetScroll/animatedScroll state, which it only resyncs to a
  // native scroll event while it isn't mid-inertia — right after the click
  // that navigated here, it usually still is — so its very next animation
  // frame carried on toward the stale (mid-page) target and silently undid
  // the jump. That was this exact regression. Falls back to the raw DOM API
  // when there's no Lenis instance (prefers-reduced-motion — see App.tsx).
  //
  // useLayoutEffect, not useEffect (2026-08-02, "jerky" page-transition fix):
  // useEffect runs *after* the browser paints, so the new page briefly
  // flashed at whatever scroll position carried over from the click before
  // snapping to top a frame later — exactly the visible "jerk" reported.
  // useLayoutEffect runs synchronously after the DOM commits but before
  // paint, so the correction is applied before anything is ever shown.
  // lenis.resize() first: Lenis caches document height for clamping/limit
  // math, and its own auto-resize (ResizeObserver) updates asynchronously —
  // too late for this synchronous check — so it needs a manual nudge to see
  // this page's actual height before scrollTo runs against it.
  useLayoutEffect(() => {
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [lenis]);

  const spotBackground =
    spot.active && !reducedMotion ? `radial-gradient(320px circle at ${spot.x}px ${spot.y}px, rgba(var(--color-accent-rgb),0.14), transparent 60%)` : 'transparent';

  return (
    <div
      ref={rootRef}
      style={{
        background: 'var(--color-bg-page)',
        color: 'var(--color-text-primary)',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'clip',
      }}
      onMouseMove={(e) => {
        if (e.target === e.currentTarget) onSpotMove(e);
        else onSpotLeave();
      }}
      onMouseLeave={onSpotLeave}
    >
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.spot} style={{ background: spotBackground }} aria-hidden="true" />

      <CursorOverlay cursor={cursor} />
      <Header cursor={cursor} />

      <main ref={mainRef} className={styles.main}>
        <header>
          <RouterLink
            to="/#work"
            className={styles.backLink}
            style={{ transform: backLinkMagnet.transform }}
            onMouseEnter={() => {
              cursor.onEnter();
              backLinkMagnet.onMouseEnter();
            }}
            onMouseMove={backLinkMagnet.onMouseMove}
            onMouseLeave={() => {
              cursor.onLeave();
              backLinkMagnet.onMouseLeave();
            }}
          >
            <span aria-hidden="true">←</span>
            <span>Вернуться к кейсам</span>
          </RouterLink>
          <div className={styles.tagsRow}>
            {study.tags.map((t) => (
              <Tag key={t} tone="accent">
                {t}
              </Tag>
            ))}
          </div>
          <h1 className={styles.title}>{study.title}</h1>
          <p className={styles.subtitle}>{study.subtitle}</p>
          <dl className={styles.metaGrid}>
            {study.meta.map((m) => (
              <div key={m.label}>
                <dt className={styles.metaLabel}>{m.label}</dt>
                <dd className={styles.metaValue}>{m.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section aria-labelledby="cs-problem" className={`${styles.section} ${styles.promptSection}`}>
          <PromptSteps tag="01 · problem" question="в чём проблема?" className={styles.promptStepsIndent} />
          <h2 id="cs-problem" className={styles.sectionTitle}>
            {study.problemTitle}
          </h2>
          {study.problem.map((p) => (
            <p key={p} className={styles.para}>
              {p}
            </p>
          ))}
          {!!study.problemSteps?.length && (
            <ol className={styles.numberedList}>
              {study.problemSteps.map((text, i) => (
                <li key={i} className={styles.numberedRow}>
                  <span className={styles.numberedNum}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.numberedText}>{text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {study.hasMatrix && (
          <>
            <section aria-labelledby="cs-insight" className={`${styles.section} ${styles.promptSection}`} style={{ marginTop: 112 }}>
              <PromptSteps tag="02 · insight" question="что показал анализ рынка?" className={styles.promptStepsIndent} />
              <h2 id="cs-insight" className={styles.sectionTitle}>
                Рынок решает анализ логов, но не управление конфигурацией
              </h2>
              {study.insight?.map((p) => (
                <p key={p} className={styles.para}>
                  {p}
                </p>
              ))}

              <div ref={matrixRef} className={styles.matrixBox}>
                <div className={styles.matrixBoxLabel}>feature coverage</div>
                <div className={styles.matrixBars}>
                  {matrix.cols.map((name, i) => {
                    const isUs = i === matrix.cols.length - 1;
                    const val = matrix.coverage[i];
                    const rowT = matrixRows[i] ?? 0;
                    const shown = Math.round(val * rowT);
                    return (
                      <div key={name} className={styles.matrixBarRow}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isUs ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: isUs ? 700 : 400 }}>
                          {name}
                        </span>
                        <span className={styles.matrixBarTrack}>
                          <span
                            className={styles.matrixBarFill}
                            style={{
                              width: `${val * rowT}%`,
                              background: isUs ? 'var(--color-accent)' : 'rgba(var(--color-slate-mist-rgb), 0.5)',
                              transition: reducedMotion ? 'none' : 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
                            }}
                          />
                        </span>
                        {/* data-noasm (2026-09-19) — this text is genuinely
                            dynamic: `shown` changes on every scroll-driven
                            re-render as the bar fills in, unlike everything
                            else on the page (static after mount, which is
                            the one assumption the whole assembly-animation
                            system relies on — see useCaseStudyAssembly's own
                            docstring). Without this, the animation engine
                            split the *initial* "0%" text (rendered before
                            any scroll progress) into its own permanent
                            letter-spans at mount, and every later React
                            re-render updating `shown` silently patched a
                            text node that was no longer attached to the
                            visible DOM — the bar width kept animating
                            correctly (a plain style attribute, untouched by
                            the split), but the "N%" readout stayed frozen
                            at "0%" forever. */}
                        <span
                          data-noasm="1"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: isUs ? 18 : 13,
                            fontWeight: isUs ? 700 : 400,
                            color: isUs ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            minWidth: 54,
                            textAlign: 'right',
                          }}
                        >
                          {shown}%
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className={styles.matrixNote}>
                  Две механики не существуют ни у одного игрока рынка: time-limited debug-сессии с авто-откатом и bulk fleet-управление через интерфейс.
                </p>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className={styles.tableCaption}>Покрытие по фичам</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={styles.tableHeadFeature}>
                        Фича
                      </th>
                      {matrix.cols.map((c, i) => (
                        <th
                          key={c}
                          scope="col"
                          className={styles.tableHeadCol}
                          style={{ color: i === matrix.cols.length - 1 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.rows.map((r) => (
                      <tr key={r.feature}>
                        <th scope="row" className={styles.tableRowFeature}>
                          {r.feature}
                        </th>
                        {r.cells.map((v, i) => {
                          const isUs = i === r.cells.length - 1;
                          return (
                            <td
                              key={i}
                              className={styles.tableCell}
                              style={{
                                color: isUs && v === 'yes' ? 'var(--color-accent)' : CELL_COLOR[v],
                                background: isUs ? 'rgba(var(--color-accent-rgb),0.05)' : 'transparent',
                              }}
                            >
                              {CELL_TEXT[v]}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="cs-personas" className={`${styles.section} ${styles.promptSection}`} style={{ marginTop: 112 }}>
              <PromptSteps tag="03 · who it's for" question="кто наши пользователи?" className={styles.promptStepsIndent} />
              <h2 id="cs-personas" className={styles.sectionTitle} style={{ marginBottom: 36 }}>
                Три роли, один инцидент
              </h2>
              <PersonaList personas={study.personas ?? []} jtbdLabel="jtbd" fearLabel="страх" freqLabel="частота" />
            </section>

            <section aria-labelledby="cs-solution" className={`${styles.section} ${styles.promptSection}`} style={{ marginTop: 112 }}>
              <PromptSteps tag="04 · solution" question="как это решить?" className={styles.promptStepsIndent} />
              <h2 id="cs-solution" className={styles.sectionTitle}>
                Admin-модуль из трёх разделов
              </h2>
              <div className={styles.solutionParts}>
                {study.solutionParts?.map((s) => (
                  <div key={s.name} className={styles.solutionPart}>
                    <div className={styles.solutionPartName}>{s.name}</div>
                    <p className={styles.solutionPartText}>{s.text}</p>
                  </div>
                ))}
              </div>

              <h3 className={styles.scenarioHeading}>Сценарий инцидента</h3>
              <p className={styles.scenarioSub}>Дежурный SRE, 03:30, деградация платежей</p>
              <ol className={styles.scenarioList}>
                {study.scenario?.map((text, i) => (
                  <li key={i} className={styles.scenarioItem}>
                    <span className={styles.scenarioDot} aria-hidden="true" />
                    <div className={styles.scenarioNum}>{String(i + 1).padStart(2, '0')}</div>
                    <div className={styles.scenarioText}>{text}</div>
                  </li>
                ))}
              </ol>
              <p className={styles.edgeCaseNote}>
                Проработанные edge cases: конкурентное редактирование («запись устарела» — toast и тихое обновление строки, без блокировок), авто-откат с
                in-app уведомлением о затронутых сервисах, hot-reload с индикацией загрузки на уровне строки.
              </p>
            </section>

            <section aria-labelledby="cs-metrics" className={`${styles.section} ${styles.promptSection}`} style={{ marginTop: 112 }}>
              <PromptSteps tag="05 · goals & metrics" question="как измерить успех?" className={styles.promptStepsIndent} />
              <h2 id="cs-metrics" className={styles.sectionTitle} style={{ marginBottom: 32 }}>
                Цели и метрики
              </h2>
              <div className={styles.northStar}>
                <div className={styles.northStarTag}>north star</div>
                <p className={styles.northStarText}>Среднее время от входа в модуль до применённого изменения — ≤ 60 секунд.</p>
              </div>
              <div className={styles.metricsList}>
                {study.metrics?.map((m) => (
                  <div key={m.text} className={styles.metricRow}>
                    <span className={styles.metricValue}>{m.value}</span>
                    <span className={styles.metricText}>{m.text}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {sectionsBefore.map((sec, i) => (
          <GenericSectionBlock key={sec.title} sec={sec} hid={`cs-sec-${i}`} />
        ))}

        {showPersonas && (
          <section aria-labelledby="cs-personas2" className={`${styles.section} ${styles.promptSection}`} style={{ marginTop: 112 }}>
            <PromptSteps tag="03 · who it's for" question="кто наши клиенты?" className={styles.promptStepsIndent} />
            <h2 id="cs-personas2" className={styles.sectionTitle} style={{ marginBottom: 36 }}>
              Кто приходит на сайт
            </h2>
            <PersonaList personas={study.personas ?? []} jtbdLabel="мотивация" fearLabel="барьер" freqLabel="путь" />
          </section>
        )}

        {sectionsAfter.map((sec, i) => (
          <GenericSectionBlock key={sec.title} sec={sec} hid={`cs-sec-${sectionsBefore.length + i}`} />
        ))}

        <section aria-labelledby="cs-outcome" className={`${styles.section} ${styles.promptSection}`} style={{ marginTop: 112 }}>
          <PromptSteps tag={outcomeTag} question="что в итоге?" className={styles.promptStepsIndent} />
          <h2 id="cs-outcome" className={styles.sectionTitle}>
            Итог
          </h2>
          <p className={styles.outcomeText}>{study.outcome}</p>
          {study.hasNda && (
            <div className={styles.ndaBox}>
              <span aria-hidden="true" className={styles.ndaTag}>
                NDA
              </span>
              <p className={styles.ndaText}>
                Внутренний банковский инструмент: публичное демо и исходные макеты не размещаются. Детали интерфейса и метрики приведены в объёме,
                согласованном для портфолио.
              </p>
            </div>
          )}
          {!!study.links.length && (
            <div className={styles.outcomeLinks}>
              {study.links.map((l) => (
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
          )}
        </section>

        <nav aria-label="Другие кейсы" className={styles.siblingsNav}>
          {siblings.map((s) => (
            <SiblingLink key={s.href} href={s.href} label={s.label} reducedMotion={reducedMotion} cursor={cursor} />
          ))}
        </nav>
      </main>

      {/* data-asm-sync (2026-09-17 follow-up) — same fix as sections/Contact/Contact.tsx's
          `asmSync` prop, same reasoning: the scroll-position fallback formula's
          `atBottom` failsafe wasn't reliably reaching "true bottom" on mobile,
          leaving this block's text permanently stuck mid-scatter. useCaseStudyAssembly
          supports the same `[data-asm-sync]` marker useAssemblyAnimation does. */}
      <div ref={footerAreaRef} data-asm-sync="1">
        <ContactFooter reducedMotion={reducedMotion} />
      </div>
      <ChatBar barRef={chatBarRef} textRef={chatTextRef} statusDotRef={chatStatusDotRef} statusTextRef={chatStatusTextRef} />
      <GrainOverlay />
      {/* Mono theme switcher hidden site-wide (2026-09-18, explicit user
          request) — component + hook are untouched, just not mounted here. */}
    </div>
  );
}

/** Own component (not inlined in the .map() above) so useMagnetHover can be called per-link without breaking rules-of-hooks — same magnet-follow displacement as the contact email link, per user request (2026-08-02). */
function SiblingLink({ href, label, reducedMotion, cursor }: { href: string; label: string; reducedMotion: boolean; cursor: CursorTracker }) {
  const magnet = useMagnetHover(reducedMotion);
  return (
    <RouterLink
      to={href}
      className={styles.siblingLink}
      style={{ transform: magnet.transform }}
      onMouseEnter={() => {
        cursor.onEnter();
        magnet.onMouseEnter();
      }}
      onMouseMove={magnet.onMouseMove}
      onMouseLeave={() => {
        cursor.onLeave();
        magnet.onMouseLeave();
      }}
    >
      {label} →
    </RouterLink>
  );
}

function PersonaList({
  personas,
  jtbdLabel,
  fearLabel,
  freqLabel,
}: {
  personas: PersonaItem[];
  jtbdLabel: string;
  fearLabel: string;
  freqLabel: string;
}) {
  return (
    <div className={styles.personaList}>
      {personas.map((p) => {
        const primary = p.rank === 'primary';
        return (
          <article
            key={p.name}
            data-asm-sync="1"
            className={styles.personaCard}
            style={{
              border: `1px solid ${primary ? 'rgba(var(--color-accent-rgb),0.35)' : 'rgba(var(--color-slate-mist-rgb),0.25)'}`,
              background: primary ? 'rgba(var(--color-accent-rgb),0.05)' : 'rgba(var(--color-graphite-rgb),0.3)',
            }}
          >
            <div className={styles.personaHead}>
              <h3 className={styles.personaName}>{p.name}</h3>
              <span
                className={styles.personaBadge}
                style={{
                  color: primary ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  borderColor: primary ? 'rgba(var(--color-accent-rgb),0.45)' : 'rgba(var(--color-slate-mist-rgb),0.35)',
                }}
              >
                {p.rank}
              </span>
            </div>
            <div className={styles.personaGrid}>
              <span className={styles.personaGridLabel}>{jtbdLabel}</span>
              <span className={styles.personaGridValue}>{p.jtbd}</span>
              <span className={styles.personaGridLabel}>{freqLabel}</span>
              <span className={styles.personaGridValue}>{p.frequency}</span>
              <span className={styles.personaGridLabel}>{fearLabel}</span>
              <span className={styles.personaGridValue}>{p.fear}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function GenericSectionBlock({ sec, hid }: { sec: GenericSection; hid: string }) {
  return (
    <section aria-labelledby={hid} className={`${styles.section} ${styles.promptSection}`} style={{ marginTop: 112 }}>
      <PromptSteps tag={sec.tag} question={sec.promptQuestion ?? 'что здесь важно?'} className={styles.promptStepsIndent} />
      <h2 id={hid} className={styles.sectionTitle}>
        {sec.title}
      </h2>
      {sec.paras?.map((p) => (
        <p key={p} className={styles.para}>
          {p}
        </p>
      ))}

      {!!sec.pairs?.length && (
        <div className={styles.pairsBox}>
          <div className={styles.pairsHead}>
            <div className={styles.pairsHeadCell}>{sec.pairHead?.[0]}</div>
            <div className={styles.pairsHeadCell}>{sec.pairHead?.[1]}</div>
          </div>
          {sec.pairs.map((pr, i) => (
            <div key={i} className={styles.pairRow}>
              {/* data-noasm (2026-09-18) — this cell's `text-decoration:
                  line-through` renders as literal dashes in the gaps
                  between words once the assembly animation splits the text
                  into per-word `inline-block` spans (confirmed live: the
                  strikethrough paints across each word's own box but not
                  across the plain-text space between boxes, leaving a
                  dash-like line sitting in every word gap — reported by the
                  user as "Нет-специалиста-по-сахарной-депиляции..."
                  instead of spaced-out words). Skipping the animation for
                  this cell only keeps the struck-through text as plain,
                  unsplit DOM text, where the native line-through renders
                  correctly. */}
              <div className={styles.pairWas} data-noasm="1">
                {pr.was}
              </div>
              <div className={styles.pairShould}>{pr.should}</div>
            </div>
          ))}
        </div>
      )}

      {!!sec.defs?.length && (
        <div className={styles.defsList}>
          {sec.defs.map((d) => (
            <div key={d.name} className={styles.defRow}>
              <div className={styles.defName}>{d.name}</div>
              <p className={styles.defText}>{d.text}</p>
            </div>
          ))}
        </div>
      )}

      {!!sec.steps?.length && (
        <ol className={styles.numberedList}>
          {sec.steps.map((text, i) => (
            <li key={i} className={styles.numberedRow}>
              <span className={styles.numberedNum}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.numberedText}>{text}</span>
            </li>
          ))}
        </ol>
      )}

      {!!sec.groups?.length && (
        <div className={styles.groupsList}>
          {sec.groups.map((g) => (
            <div key={g.name}>
              <div className={styles.groupName}>{g.name}</div>
              <div className={styles.groupItems}>
                {g.items.map((it) => (
                  <span key={it} className={styles.groupItem}>
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!!sec.code && <CodeBlock code={sec.code} />}

      {!!sec.note && <p className={styles.sectionNote}>{sec.note}</p>}
    </section>
  );
}

