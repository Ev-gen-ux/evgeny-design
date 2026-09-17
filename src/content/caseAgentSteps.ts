import type { AgentSessionStep } from '../components';

/**
 * Maps a case-study section's own short tag (e.g. "01 · problem", read
 * straight off its `.sectionTag` div — see useCaseTimeline) to an
 * AgentSessionTimeline step. Added 2026-08-02: the case pages' scroll
 * timeline reuses Pipeline's exact AGENT SESSION component per user request,
 * so it needs the same {verb, target, outcome} shape instead of a plain
 * label. Illustrative content, not measured — covers every section tag
 * currently used across all 3 case studies (log-service, ai-pdp-ds,
 * lindausugar); DEFAULT_STEP is a safety net if a future case introduces a
 * new tag this map doesn't know about yet.
 */
const STEP_BY_TAG: Record<string, AgentSessionStep> = {
  problem: { verb: 'Read', target: 'client_brief.md', outcome: 'Scoped the real problem' },
  insight: { verb: 'Search', target: 'competitors/*', outcome: 'Mapped competitive gaps' },
  'whos for': { verb: 'Write', target: 'personas.md', outcome: 'Modeled key user roles' },
  solution: { verb: 'Edit', target: 'solution_spec.md', outcome: 'Shipped module design' },
  'goals & metrics': { verb: 'Write', target: 'metrics.md', outcome: 'Defined success criteria' },
  goals: { verb: 'Write', target: 'goals.md', outcome: 'Defined success criteria' },
  outcome: { verb: 'Handoff', target: 'case_study.md', outcome: 'Ready for review' },
  'proven effect': { verb: 'Generate', target: 'impact_report.md', outcome: 'Quantified real results' },
  'whats built': { verb: 'Edit', target: 'component_list.md', outcome: 'Catalogued shipped components' },
  architecture: { verb: 'Write', target: 'architecture.md', outcome: 'Structured system contract' },
  reuse: { verb: 'Search', target: 'reuse_map.md', outcome: 'Traced adoption across teams' },
  'figma ↔ code': { verb: 'Sync', target: 'code-connect.json', outcome: 'Linked Figma to code 1:1' },
  governance: { verb: 'Write', target: 'governance.md', outcome: 'Defined versioning rules' },
  'brand book': { verb: 'Generate', target: 'brand-book.pdf', outcome: 'Locked visual direction' },
  'design system': { verb: 'Edit', target: 'design-system.md', outcome: 'Tokenized the UI kit' },
};

const DEFAULT_STEP: AgentSessionStep = { verb: 'Process', target: 'section.md', outcome: 'Synced with design system' };

function normalizeTag(tag: string): string {
  return tag
    .replace(/^\d+\s*·\s*/, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .trim();
}

export function getCaseAgentStep(tag: string): AgentSessionStep {
  return STEP_BY_TAG[normalizeTag(tag)] ?? DEFAULT_STEP;
}
