/**
 * Homepage "Selected work" card summaries — 1:1 with CASE_STUDIES in Portfolio.dc.html.
 * The full case-study article content (used by the /work/:id template, step 11) is
 * separate and lives under content/case-studies/*.ts — this is only the card data.
 */
export interface CaseStudyBlock {
  label: string;
  text: string;
}

export interface CaseStudyLink {
  label: string;
  url: string;
}

export interface CaseStudySummary {
  id: string;
  tag: string;
  type: string;
  title: string;
  metrics: { label: string; value: string }[];
  blocks: CaseStudyBlock[];
  links: CaseStudyLink[];
}

export const caseStudies: CaseStudySummary[] = [
  {
    id: 'ai-pdp-ds',
    tag: 'design system from zero',
    type: 'дизайн-система · инструмент',
    title: 'AI-PDP-DS — дизайн-система с AI-agent контрактом',
    metrics: [
      { label: 'ai gate-checks', value: '4' },
      { label: 'components shipped', value: '8+' },
      { label: 'sync', value: 'figma ↔ code 1:1' },
    ],
    blocks: [
      {
        label: 'problem',
        text: 'Построить production-ready дизайн-систему — единый источник правды для дизайна и кода, — которая остаётся согласованной, даже когда компоненты создают AI-агенты (Claude Code, Cursor, Copilot) без постоянного контроля человека.',
      },
      {
        label: 'solution',
        text: 'Token-first React-библиотека (TypeScript, styled-components, Storybook) с жёстким контрактом для AI-агентов: обязательные gate-проверки перед написанием кода (Variant Matrix, Numeric Map, State Token Matrix, Hard Constraints), синхронизация имён токенов 1:1 между Figma и кодом, Code Connect для каждого компонента, версионирование через Changesets, CI с lint/typecheck/test/visual regression.',
      },
      {
        label: 'result',
        text: 'Растущая, полностью типизированная библиотека компонентов (Button, InputText, Select, Multiselect, Stepper, Toggle, ProgressBar, InlineMessage и др.) с задокументированным процессом добавления новых компонентов — воспроизводимым любым агентом без потери качества.',
      },
    ],
    links: [
      { label: 'github', url: 'https://github.com/Ev-gen-ux/AI-PDP-DS' },
      { label: 'figma', url: 'https://www.figma.com/design/i7T3ru2M0SyXgJeTda8f43/AI-PDP-DS' },
    ],
  },
  {
    id: 'log-service',
    tag: 'banking back office',
    type: 'внутренний B2B-продукт · ПАО Промсвязьбанк',
    title: 'Log-service — управление уровнями логирования',
    metrics: [
      { label: 'target', value: '≤3 клика' },
      { label: 'services table', value: '~120 строк' },
      { label: 'audit log', value: '30 дней' },
    ],
    blocks: [
      {
        label: 'problem',
        text: 'DevOps-инженеры, разработчики и тестировщики банка меняют уровни логирования (VERBOSE → DEBUG → INFO → WARN → ERROR → FATAL) на трёх независимых средах в реальном времени, без перезапуска сервиса — и не имеют для этого понятного интерфейса.',
      },
      {
        label: 'role',
        text: 'Полный цикл продуктового дизайна: сбор требований, сценарии, спецификация состояний, UI на базе банковской дизайн-системы UI-Library.',
      },
      {
        label: 'solution',
        text: 'Три экрана: настройка изменений (таблица ~120 сервисов с виртуальным скроллом, поиском, bulk-редактированием), история изменений (read-only аудит-лог за 30 дней, фильтры, экспорт в CSV), профиль по умолчанию (глобальный шаблон уровней). Проработаны edge cases: конкурентное редактирование, авто-откат к дефолту, hot-reload с индикацией на уровне строки.',
      },
      {
        label: 'result',
        text: 'Целевая метрика — смена уровня логирования одного сервиса за ≤3 клика от входа на экран; bulk-изменение 10+ сервисов без ошибок.',
      },
    ],
    links: [],
  },
  {
    id: 'lindausugar',
    tag: 'live product · DE market',
    type: 'landing page · full-cycle',
    title: 'LindauSugar — лендинг салона сахарной депиляции',
    metrics: [
      { label: 'content update', value: '~60 сек' },
      { label: 'target bookings', value: '30+/мес' },
      { label: 'target conversion', value: '≥3%' },
    ],
    blocks: [
      {
        label: 'problem',
        text: 'У салона (Wangen im Allgäu, Германия) нет сайта и онлайн-записи. Нужен запуск за 1–2 недели, немецкий язык, соответствие GDPR, интеграция с Treatwell — и управление контентом без разработчика.',
      },
      {
        label: 'process',
        text: 'Полный AI Design Pipeline: бриф → конкурентный анализ 11 референсов → сегментация аудитории и сценарии → wireframes → дизайн-система → сборка экранов → прототип → ревью → публикация.',
      },
      {
        label: 'solution',
        text: 'Next.js (App Router, SSR + ISR) на Vercel + Sanity CMS как headless-редактор контента. Светлый тёплый фон, serif-заголовки (Cormorant Garamond/Playfair Display), sans-serif текст. Интеграция Treatwell-виджета, cookie-banner и Impressum по требованиям DE.',
      },
      {
        label: 'result',
        text: 'Сайт live, контент обновляется через Sanity Studio за 60 секунд без передеплоя.',
      },
    ],
    links: [
      { label: 'сайт', url: 'https://lindausugar.vercel.app' },
      { label: 'sanity studio', url: 'https://lindausugar.sanity.studio' },
    ],
  },
];
