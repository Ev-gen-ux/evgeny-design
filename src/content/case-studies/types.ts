/**
 * 1:1 with the STUDIES shape in Case Study.dc.html. Two content shapes share
 * one type: `hasMatrix` studies (currently only log-service) get the fixed
 * matrix/personas/scenario/metrics layout; everything else uses the flexible
 * `sections[]` array (paras/defs/pairs/groups/code/steps/note per section).
 */

export interface MetaItem {
  label: string;
  value: string;
}

export interface PersonaItem {
  name: string;
  rank: 'primary' | 'secondary';
  jtbd: string;
  frequency: string;
  fear: string;
}

export interface DefItem {
  name: string;
  text: string;
}

export interface PairItem {
  was: string;
  should: string;
}

export interface GroupItem {
  name: string;
  items: string[];
}

export interface GenericSection {
  tag: string;
  title: string;
  /** "you" question for this section's prompt head (About/Pipeline-style you/agent dots) — tailored per section, not a generic placeholder. */
  promptQuestion?: string;
  paras?: string[];
  defs?: DefItem[];
  pairs?: PairItem[];
  pairHead?: [string, string];
  groups?: GroupItem[];
  steps?: string[];
  code?: string;
  note?: string;
}

export interface MetricItem {
  value: string;
  text: string;
}

export interface CaseLink {
  label: string;
  url: string;
}

export interface CaseStudyDetail {
  title: string;
  /** Short label for the sibling-case nav link at the bottom of other case pages — falls back to `title` when unset. */
  navLabel?: string;
  subtitle: string;
  tags: string[];
  meta: MetaItem[];
  problemTitle: string;
  problem: string[];
  problemSteps?: string[];
  /** log-service only. */
  insight?: string[];
  solutionParts?: { name: string; text: string }[];
  scenario?: string[];
  metrics?: MetricItem[];
  /** ai-pdp-ds / lindausugar: flexible section list instead of the fixed matrix layout. */
  sections?: GenericSection[];
  personas?: PersonaItem[];
  outcome: string;
  hasMatrix: boolean;
  hasNda: boolean;
  links: CaseLink[];
}
