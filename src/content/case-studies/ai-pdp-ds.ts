import type { CaseStudyDetail } from './types';

/** 1:1 with STUDIES['ai-pdp-ds'] in Case Study.dc.html. */
export const aiPdpDs: CaseStudyDetail = {
  title: 'AI-PDP-DS',
  subtitle:
    'Дизайн-система с явным контрактом для AI-агентов — токен-first React-библиотека, которая не теряет согласованность с Figma, даже когда компоненты пишут разные AI-агенты без постоянного контроля человека.',
  tags: ['Design System', 'Open Source', 'React + TypeScript', 'Personal Project'],
  meta: [{ label: 'роль', value: 'Автор и владелец системы — архитектура контракта, токены, компоненты, governance' }],
  problemTitle: 'Дизайн-системы деградируют, когда их пишет больше одного автора',
  problem: [
    'Дизайн-системы обычно деградируют, когда их пишет больше одного человека без жёсткой дисциплины: хардкод-значения вместо токенов, размеры «на глаз» вместо чисел из Figma, разъезжающиеся имена токенов между дизайном и кодом.',
    'С приходом AI-агентов (Claude Code, Cursor, Copilot) риск вырастает на порядок.',
  ],
  problemSteps: [
    'Агенту говорят «сделай компонент X»',
    'Он берёт значение по аналогии с соседним компонентом, а не из точного Figma-узла',
    'Токен с похожим названием используется вместо точного (например 4xSmall, хотя по факту это не 8px)',
    'Через несколько таких компонентов дизайн-система в коде и дизайн-система в Figma — уже два разных источника правды',
  ],
  sections: [
    {
      tag: '02 · insight',
      promptQuestion: 'как это решить системно?',
      title: 'Контракт, который блокирует код до фиксации данных',
      paras: [
        'Проблему нельзя решить только инструментами (линтеры, Storybook, CI) — она решается явным протоколом, который блокирует написание кода до тех пор, пока не зафиксированы все необходимые данные.',
      ],
      defs: [
        { name: 'Variant Matrix Gate', text: 'Полная матрица вариантов компонента фиксируется до начала работы.' },
        {
          name: 'Before-Code Numeric Check',
          text: 'Числа (padding, gap, radius, font-size, line-height) выписываются из точного Figma-узла, без подбора по аналогии.',
        },
        {
          name: 'State Token Matrix',
          text: 'Все комбинации состояний (enabled / hover / active / focus / disabled / loading) с прослеживаемостью Figma raw → token → resolved value.',
        },
        { name: 'Component Fidelity Gate', text: 'Сверка master-состояний Figma 1:1.' },
        { name: 'Type Safety Gate', text: 'Токены вместо литералов, строгая типизация, transient-props ($prop).' },
        {
          name: 'Versioning Gate',
          text: 'Изменения публичного API проходят через Changesets с явным patch / minor / major.',
        },
      ],
      note: 'Всё фиксируется в едином артефакте Component Spec Document на компонент.',
    },
    {
      tag: '03 · proven effect',
      promptQuestion: 'что реально ловит система?',
      title: 'Реальные ошибки, которые ловит система',
      pairHead: ['было в figma', 'должно быть'],
      pairs: [
        { was: 'avatar/backgroun/enabled', should: 'background' },
        { was: 'notification/snackbar/border/ssuccess', should: 'success' },
        { was: 'notification/snackbar/discription/enabled', should: 'description' },
        { was: 'labelStatus/secondary/label/sucesse', should: 'success' },
        { was: 'ink/bakcground/calm/enabled', should: 'background' },
        { was: '_spacers/80 (фактическое значение 72)', should: '80' },
      ],
      note: 'Правило: ошибка сначала исправляется в Figma и только потом токены пересобираются в код — никаких временных алиасов для неверных имён.',
    },
    {
      tag: '04 · what’s built',
      promptQuestion: 'что уже собрано?',
      title: 'Что собрано',
      paras: [
        'Стек: React 18 · TypeScript 5 · Vite 5 · styled-components 6 · Storybook 8, токены как W3C DTCG JSON, синхронизированные с Figma Variables.',
      ],
      groups: [
        {
          name: 'atoms',
          items: ['Icon', 'Button', 'Spinner', 'Label', 'InputText', 'InlineMessage', 'Select', 'Multiselect', 'InputTel', 'ProgressBar'],
        },
        { name: 'molecules', items: ['Stepper', 'StepperGroup', 'Toggle'] },
        { name: 'layout primitives (в работе)', items: ['Stack', 'Cluster', 'Grid', 'Sidebar', 'Container', 'Center', 'Switcher'] },
      ],
      note: 'Toggle переименован из Switcher — управляемое breaking-изменение через Changesets. Каждый компонент — это 4 файла: Component.tsx · Component.stories.tsx · Component.figma.tsx · index.ts.',
    },
    {
      tag: '05 · architecture',
      promptQuestion: 'как это устроено?',
      title: 'Как это устроено под капотом',
      paras: [
        'Структура репозитория: tokens/ (примитивы — palette, spacers, typographyBase; семантика — colors.light/dark, typography.xl/md/xs, spacing, borderRadius), src/theme/ (генерируется Style Dictionary: tokens.ts для ThemeProvider, variables.css как CSS Custom Properties, styled.d.ts для типов темы), а также src/components/, src/patterns/, src/layouts/, src/templates/.',
        'Одна команда npm run tokens:build превращает единственный источник токенов одновременно в TS-объект темы, CSS Custom Properties и типы styled-components.',
        'Именование зеркалит Figma 1:1 и меняет только разделитель: button/primary/background/hover в Figma → theme.colors.button.primary.background.hover в коде → var(--color-button-primary-background-hover) в CSS.',
        'Цвета следуют схеме <element>/<role>/<property>/<state>. Отступы разделены по смыслу использования (inner — внутри компонента, outer — между компонентами, paddings — паддинг контейнера, height — фиксированные высоты), а не по абстрактной шкале. Радиусы следуют глубине вложенности: componentInner (4px) → componentBase (8px) → sectionInner (12px) → containerBase (16px) → sectionBase (24px) → rounded (999px).',
      ],
      code: 'const appearanceStyles = {\n  primary: css`\n    &:enabled {\n      background-color: ${({ theme }) => theme.colors.button.primary.background.enabled};\n      color: ${({ theme }) => theme.colors.button.primary.label.enabled};\n    }\n    &:hover:enabled {\n      background-color: ${({ theme }) => theme.colors.button.primary.background.hover};\n    }\n  `,\n  outline: css`/* ... */`,\n  flat: css`/* ... */`,\n} as const;\n\nconst StyledButton = styled.button`\n  border-radius: ${({ theme }) => theme.borderRadius.componentBase};\n  &:focus-visible { box-shadow: ${({ theme }) => theme.focus}; }\n  ${({ $appearance }) => appearanceStyles[$appearance]}\n  ${({ $size }) => sizeStyles[$size]};\n`;',
      note: 'Жёсткое правило: компоненты никогда не обращаются к сырой палитре напрямую (palette.blue.500) — только к семантическим токенам. Литералов нет нигде: меняешь theme.colors.button.primary.background.hover в одном месте — кнопка обновляется во всём приложении.',
    },
    {
      tag: '06 · reuse',
      promptQuestion: 'как переиспользуется css?',
      title: 'Как CSS переиспользуется и пересобирается',
      defs: [
        {
          name: 'Светлая и тёмная тема',
          text: 'Обёртка в <ThemeProvider theme={lightTheme}> или {darkTheme} мгновенно меняет все цвета во всех компонентах сразу, потому что каждый компонент ссылается на токен внутри активной темы, а не на сырой цвет.',
        },
        {
          name: 'Адаптивная типографика без re-render',
          text: 'Размеры шрифта переопределяются через CSS Custom Properties на брейкпоинтах (--font-size-heading-h1: 48px на XL, 40px на MD, 32px на XS); компоненты всегда читают var(...), поэтому пересчёт делает браузер без участия JS.',
        },
        {
          name: 'Внешнее управление видом',
          text: 'Transient-props ($appearance, $size, $loading) не утекают в DOM, а лишь выбирают ветку карты стилей — внешний код влияет на вид через проп, а не через переопределение CSS с !important, который в системе полностью запрещён.',
        },
      ],
      note: 'Итог: один компонент, один файл стилей — тема, брейкпоинт и переданные пропы вместе решают, как он выглядит в конкретном месте, без дублирования кода.',
    },
    {
      tag: '07 · figma ↔ code',
      promptQuestion: 'как связаны figma и код?',
      title: 'Связь через Code Connect',
      code: "figma.connect(Button, 'https://www.figma.com/design/.../?node-id=3001-15051', {\n  props: {\n    appearance: figma.enum('Appearance', { Primary: 'primary', Outline: 'outline', Flat: 'flat' }),\n    size: figma.enum('Size', { Large: 'large', Medium: 'medium' }),\n    text: figma.string('Label'),\n    disabled: figma.boolean('Disabled'),\n  },\n  example: ({ appearance, size, text, disabled }) => (\n    <Button appearance={appearance} size={size} text={text} disabled={disabled} />\n  ),\n});",
      note: 'Имена вариантов в figma.enum точно совпадают с именами вариантов Figma-компонента — расхождение здесь физически невозможно без явного изменения обеих сторон.',
    },
    {
      tag: '08 · governance',
      promptQuestion: 'как система живёт дальше?',
      title: 'Как система остаётся надёжной со временем',
      defs: [
        {
          name: 'Branch protection',
          text: 'На main нет прямых пушей: PR и минимум один аппрув, зелёный CI (lint, typecheck, test, build, Chromatic visual regression).',
        },
        { name: 'CODEOWNERS', text: 'Каждый PR требует ревью владельца системы.' },
        {
          name: 'Changesets',
          text: 'Версии библиотеки поднимаются через явный журнал изменений на уровне компонента, а не молча накопленными правками.',
        },
        {
          name: 'ThemeCheck',
          text: 'Отдельный сценарий Storybook, к которому обязан подключиться каждый новый или изменённый компонент — для визуальной сверки светлой и тёмной темы.',
        },
      ],
    },
  ],
  outcome:
    'Работающая, версионируемая open-source дизайн-система, которая растёт за счёт вклада и людей, и AI-агентов, не теряя согласованности между Figma и кодом — потому что согласованность здесь не результат аккуратности, а результат обязательного протокола, который делает иное физически невозможным.',
  hasMatrix: false,
  hasNda: false,
  links: [
    { label: 'github', url: 'https://github.com/Ev-gen-ux/AI-PDP-DS' },
    { label: 'figma', url: 'https://www.figma.com/design/i7T3ru2M0SyXgJeTda8f43/AI-PDP-DS' },
  ],
};
