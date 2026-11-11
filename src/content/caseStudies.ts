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
  /** Full-width desktop paragraph with natural wrapping. */
  teaser: string;
  metrics: { label: string; value: string }[];
  blocks: CaseStudyBlock[];
  links: CaseStudyLink[];
}

export const caseStudies: CaseStudySummary[] = [
  {
    id: 'log-service',
    tag: 'back office',
    type: 'B2B',
    title: 'Log-service — управление уровнями логирования',
    teaser: 'Инженеры банка меняют уровни логирования сервисов на трёх средах в реальном времени без перезапуска, а каждое изменение попадает в журнал.',
    metrics: [
      { label: 'target', value: '≤3 клика' },
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
    tag: 'design system',
    type: 'инструмент',
    title: 'AI-PDP-DS — дизайн-система с AI-agent контрактом',
    teaser: 'React-библиотека с семантическими токенами, публичным Storybook и контрактом для AI-агентов. Поставка проверена в отдельном приложении.',
    metrics: [
      { label: 'components', value: '62' },
      { label: 'themes', value: '2' },
    ],
    blocks: [
      {
        label: 'problem',
        text: 'Сделать путь от макета до React-компонента проверяемым: связать варианты, состояния и токены и сократить число произвольных решений при работе с AI.',
      },
      {
        label: 'solution',
        text: 'React, TypeScript, styled-components и Storybook: спецификация до кода, семантические токены, светлая и тёмная темы, проверки поведения и версионирование через Changesets. Code Connect опубликован для Button; остальные сопоставления развиваются отдельно.',
      },
      {
        label: 'result',
        text: '62 компонента в публичном API, включая табличные элементы и примитивы компоновки; светлая и тёмная темы. Проверены упаковка библиотеки, типы, стили, серверный рендер и подключение в отдельном Vite-приложении.',
      },
    ],
    links: [
      { label: 'storybook', url: 'https://main--69f08a5c57bcf2747e61c70d.chromatic.com/' },
      { label: 'github', url: 'https://github.com/Ev-gen-ux/AI-PDP-DS' },
      { label: 'figma', url: 'https://www.figma.com/design/i7T3ru2M0SyXgJeTda8f43/AI-PDP-DS' },
    ],
  },
  {
    id: 'lindausugar',
    tag: 'DE-Market',
    type: 'full-cycle',
    title: 'LindauSugar — лендинг салона сахарной депиляции',
    teaser: 'Сайт салона в Германии с собственным виджетом записи на немецком языке. Контент правится через CMS, разработчик не нужен, cookie-баннер и Impressum соответствуют GDPR.',
    metrics: [
      { label: 'content update', value: '~60 сек' },
      { label: 'клиенты · 1 неделя', value: '+3%' },
    ],
    blocks: [
      {
        label: 'problem',
        text: 'У салона (Wangen im Allgäu, Германия) нет сайта и онлайн-записи. Нужен запуск за 1–2 недели, немецкий язык, соответствие GDPR, онлайн-запись — и управление контентом без разработчика.',
      },
      {
        label: 'process',
        text: 'Полный AI Design Pipeline: бриф → конкурентный анализ 11 референсов → сегментация аудитории и сценарии → wireframes → дизайн-система → сборка экранов → прототип → ревью → публикация.',
      },
      {
        label: 'solution',
        text: 'Next.js (App Router, SSR + ISR) на Vercel + Sanity CMS как headless-редактор контента. Светлый тёплый фон, serif-заголовки (Cormorant Garamond/Playfair Display), sans-serif текст. Собственный виджет онлайн-записи, cookie-banner и Impressum по требованиям DE.',
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
    tag: 'web',
    type: 'corporate bank',
    title: 'UI Concept B2B SaaS — банковский кабинет, который не выглядит как шаблон',
    teaser: 'Тёмная тема, своя палитра и переиспользуемые компоненты вместо светлых таблиц и синих акцентов. Акцентный градиент только в двух точках интерфейса.',
    metrics: [
      { label: 'экраны', value: '4' },
      { label: 'компоненты', value: '20+' },
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
