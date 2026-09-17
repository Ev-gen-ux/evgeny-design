/** 1:1 with PIPELINE_STAGES/OUTCOME_CLAIMS in Portfolio.dc.html — #pipeline section. */
export const pipelineHeader = {
  eyebrow: 'system · pipeline.spec',
  title: 'Design Pipeline',
  sub: 'Как размытый бриф превращается в живой прототип, который тестируют реальные пользователи.',
} as const;

/** `metric` per stage — added 2026-08-02 per user request ("у нас любят метрики все"). Illustrative/placeholder figures, not measured data — adjust to real numbers if/when known. */
export const pipelineStages = [
  {
    tag: 'discovery',
    title: 'Discovery',
    text: 'Размытая идея становится проверенной, ограниченной задачей.',
    steps: ['Recursive Briefing', 'Competitive Research', 'Simulated User Interview', 'Final PRD'],
    metric: { value: '6×', label: 'recursive briefing passes' },
  },
  {
    tag: 'architecture',
    title: 'Architecture',
    text: 'Задача превращается в структурную, системную дизайн-архитектуру.',
    steps: ['Sitemap', 'Wireframes', 'Design System (tokens + components)', 'Final Screen Assembly'],
    metric: { value: '40+', label: 'screens architected' },
  },
  {
    tag: 'visual language',
    title: 'Visual Language',
    text: 'Система получает собственный визуальный язык — не generic AI-вывод.',
    steps: ['Brand Visual Direction', 'Video Storyboard'],
    metric: { value: '3', label: 'visual directions tested' },
  },
  {
    tag: 'prototype & ship',
    title: 'Prototype & Ship',
    text: 'Рабочий прототип — задеплоенный и подключённый к аналитике для теста на реальных пользователях.',
    steps: ['React Base', 'Storybook + Handoff', 'Working Interface', 'Deploy + Live Analytics'],
    metric: { value: '<24h', label: 'code → live deploy' },
  },
] as const;

/**
 * "AGENT SESSION" timeline — added 2026-08-02 per user request: a simulated
 * agent tool-call log (Read/Write/Search/Edit/Handoff, in the same style this
 * very chat renders its own tool calls), replacing the plain "0X/05" counter +
 * progress bar as the way this section shows progress — one entry per stage
 * (4 stages + the outcome panel = 5), driven by the same panelT/activeIndex
 * that already drives everything else in Pipeline. No separate progress bar
 * needed: the dots (pending/active/done) already carry that.
 */
export const agentSessionSteps = [
  { verb: 'Read', target: 'client_brief.md', outcome: 'Resolved 4 open questions' },
  { verb: 'Write', target: 'sitemap.md', outcome: 'Mapped 6 core flows' },
  { verb: 'Generate', target: 'style-guide.md', outcome: '3 directions rendered' },
  { verb: 'Edit', target: 'App.tsx', outcome: 'Shipped working build' },
  { verb: 'Handoff', target: 'prototype.fig', outcome: 'Ready for user testing' },
] as const;

export const outcomeClaims = [
  'От размытого брифа — до живого, тестируемого прототипа.',
  'Настоящая аналитика от живых пользователей, а не только дизайн-ревью.',
  'Фикс и редеплой в тот же день, а не в следующий спринт.',
  'Каждый экран автоматически проверяется на соответствие дизайн-системе.',
] as const;
