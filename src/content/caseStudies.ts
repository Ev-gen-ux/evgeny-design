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
  /** Extra badges next to `tag`, same accent style — status/format markers. Optional, only set where it applies. */
  extraTags?: string[];
  type: string;
  title: string;
  /** One-sentence gist (≤2 lines on the 3D card) — shown under the stats in the cylinder variant; doesn't repeat the title or metrics. */
  teaser: string;
  metrics: { label: string; value: string }[];
  blocks: CaseStudyBlock[];
  links: CaseStudyLink[];
}

export const caseStudies: CaseStudySummary[] = [
  {
    id: 'log-service',
    tag: 'banking back office',
    type: 'внутренний B2B-продукт',
    title: 'Log-service — управление уровнями логирования',
    teaser: 'Инженеры банка меняют уровни логирования сервисов на трёх средах в реальном времени без перезапуска, а каждое изменение попадает в журнал.',
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
    links: [
      { label: 'prototype', url: 'https://log-service-ten.vercel.app/log-settings' },
      { label: 'PRD', url: 'https://volcano-cerise-e05.notion.site/PRD-v1-0-3473555dc07781f19d32fc372a0f51d2' },
    ],
  },
  {
    id: 'ai-pdp-ds',
    tag: 'design system from zero',
    type: 'дизайн-система · инструмент',
    title: 'AI-PDP-DS — дизайн-система с AI-agent контрактом',
    teaser: 'Библиотека компонентов остаётся согласованной, даже когда код пишут AI-агенты: перед работой они проходят обязательные проверки, а каждый компонент подключён через Code Connect.',
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
    id: 'lindausugar',
    tag: 'live product · DE market',
    type: 'landing page · full-cycle',
    title: 'LindauSugar — лендинг салона сахарной депиляции',
    teaser: 'Сайт салона в Германии с онлайн-записью через Treatwell на немецком языке. Контент правится через CMS, разработчик не нужен, cookie-баннер и Impressum соответствуют GDPR.',
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
      { label: 'visit site', url: 'https://lindausugar.vercel.app' },
      { label: 'PRD', url: 'https://volcano-cerise-e05.notion.site/LindauSugar-PRD-v4-0-3623555dc077810db5cde235024f730f' },
    ],
  },
  {
    id: 'ui-concept-b2b-saas',
    tag: 'concept',
    extraTags: ['web'],
    type: 'corporate bank',
    title: 'UI Concept B2B SaaS — банковский кабинет, который не выглядит как шаблон',
    teaser: 'Тёмная тема, своя палитра и переиспользуемые компоненты вместо светлых таблиц и синих акцентов. Акцентный градиент только в двух точках интерфейса.',
    metrics: [
      { label: 'экраны', value: '4' },
      { label: 'компоненты', value: '20+' },
      { label: 'токены палитры', value: '110+' },
    ],
    blocks: [
      {
        label: 'problem',
        text: 'Корпоративные банковские кабинеты почти всегда выглядят одинаково: светлые таблицы, синие акценты, дефолтные компоненты UI-кита — функционально решено, визуально неотличимо от десятков похожих продуктов.',
      },
      {
        label: 'solution',
        text: 'Тёмная тема как основа, а не декоративный режим сверху; акцентный градиент только в двух точках интерфейса. Вся палитра — примитивы из макета, переиспользуемые компоненты вместо разовой вёрстки под каждый экран.',
      },
      {
        label: 'result',
        text: 'Работающее React-приложение на четырёх экранах: главная, таблица платежей, платёжное поручение, дашборд операций — собранное по токенам и компонентам собственной системы.',
      },
    ],
    links: [
      { label: 'prototype', url: 'https://ui-concept-b2b-saas.vercel.app' },
    ],
  },
];
