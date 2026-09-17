import { useParams } from 'react-router-dom';
import { CaseStudy } from './CaseStudy';

/**
 * Reads the `:id` route param and hands it to <CaseStudy> — getCaseStudy()
 * falls back to log-service for an unknown slug, matching the source's own
 * fallback. `key={id}` forces a full remount when navigating from one case to
 * another (e.g. the sibling-case nav links at the bottom of the page) — React
 * Router reuses the same component instance across a param-only change by
 * default, which would otherwise leave the assembly animation's already-split
 * spans and the scroll position stuck from the previous case.
 */
export function CaseStudyRoute() {
  const { id } = useParams<{ id: string }>();
  const slug = id ?? 'log-service';
  return <CaseStudy key={slug} slug={slug} />;
}
