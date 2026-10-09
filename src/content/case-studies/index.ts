import { logService } from './log-service';
import { aiPdpDs } from './ai-pdp-ds';
import { lindausugar } from './lindausugar';
import { uiConceptB2bSaas } from './ui-concept-b2b-saas';
import type { CaseStudyDetail } from './types';

export * from './types';
export { matrix, CELL_TEXT, CELL_COLOR } from './log-service';

/** 1:1 with STUDIES in Case Study.dc.html — key is the /work/:id slug. */
export const caseStudyDetails: Record<string, CaseStudyDetail> = {
  'log-service': logService,
  'ai-pdp-ds': aiPdpDs,
  lindausugar,
  'ui-concept-b2b-saas': uiConceptB2bSaas,
};

export function getCaseStudy(slug: string): CaseStudyDetail {
  return caseStudyDetails[slug] ?? caseStudyDetails['log-service'];
}

/** Other cases, for the "other case studies" nav at the bottom of the page. */
export function getSiblingCaseStudies(slug: string) {
  return Object.entries(caseStudyDetails)
    .filter(([key]) => key !== slug)
    .map(([key, s]) => ({ href: `/work/${key}`, label: s.navLabel ?? s.title }));
}
