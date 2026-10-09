/**
 * «О себе» (2026-09-26): headline + a carousel of 4 slides (a phrase and a short explanation under it).
 * Copy checked with ux-writing: phrases are nominative; the AI slide says «Построил сам» (the phrase above
 * is the name) and drops «и исследований» (the headline already says «от исследований до кода»);
 * U+2011 keeps «ДБО‑платформы», «B2B‑инструменты», «Token‑first» from breaking at the hyphen.
 */
export interface AboutSlide {
  title: string;
  text: string;
}

export const about = {
  title: 'О себе',
  headline: ['Продуктовый дизайнер,', 'от исследований до кода'],
  slides: [
    { title: 'Enterprise и fintech', text: 'Банковские ДБО‑платформы, кредитные конвейеры, CRM, внутренние B2B‑инструменты.' },
    { title: 'AI Design Pipeline', text: 'Построил сам: от брифа до готовых экранов в Figma и живого прототипа.' },
    { title: 'Дизайн-системы', text: 'Token‑first подход, строгая синхронизация Figma ↔ код, Code Connect, версионирование через Changesets.' },
    { title: 'Стык дизайна и разработки', text: 'Figma, Claude Code, Cursor AI, HTML/CSS, GitHub.' },
  ] satisfies AboutSlide[],
} as const;

/**
 * Dialog variant (2026-09-26): the visitor asks («you»), the agent answers. Questions follow the site's own
 * style (lower case, «ты», short); answers are the user's facts, almost verbatim. Copy checked with ux-writing:
 * one verb form in the AI answer (no «строю… построил»), the tools answer opens with the topic like the first
 * one so it does not repeat the question's verb; U+2011 in hyphenated words.
 */
export interface AboutQA {
  question: string;
  answer: string;
  /** Small grey explanation under the answer (2–3 lines), agreed with the user 2026-09-26; facts from experience / Pipeline / the AI-PDP-DS case, no company names. */
  note: string;
}

export const aboutDialog: readonly AboutQA[] = [
  { question: 'чем занимаешься?', answer: 'Enterprise и fintech: банковские ДБО\u2011платформы, кредитные конвейеры, CRM, внутренние B2B\u2011инструменты.', note: 'Досье клиента, запрос и обработка пакетов документов. Работаю по бизнес-требованиям: User Flow и прототипы для тестирования.' },
  { question: 'как работаешь с AI?', answer: 'Построил собственный AI Design Pipeline: от брифа до готовых экранов в Figma и живого прототипа.', note: 'Размытая идея становится проверенной задачей, затем экранами и прототипом. Исследование с Gemini Deep Research и синтетическими персонами.' },
  { question: 'что с дизайн-системами?', answer: 'Token\u2011first подход, строгая синхронизация Figma ↔ код, Code Connect, версионирование через Changesets.', note: 'От токенов до составных компонентов, единый источник правды для дизайна и кода. Storybook и обязательные проверки перед кодом для AI-агентов.' },
  { question: 'на чём работаешь?', answer: 'На стыке дизайна и разработки: Figma, Claude Code, Cursor AI, HTML/CSS, GitHub.', note: 'Довожу прототипы до рабочего React-кода и передачи через Storybook. Работаю в связке с разработчиками и аналитиками.' },
];
