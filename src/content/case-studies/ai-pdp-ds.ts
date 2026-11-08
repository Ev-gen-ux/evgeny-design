import type { CaseStudyDetail } from './types';

/** Updated from the project README and published Storybook Introduction, 2026-11-08. */
export const aiPdpDs: CaseStudyDetail = {
  title: 'AI-PDP-DS',
  subtitle:
    'Открытая React-библиотека и процесс разработки с AI: от мастер-компонента Figma и семантических токенов до интерактивной документации, проверок и подключения к приложению.',
  tags: ['Design System', 'Open Source', 'React + TypeScript', 'Personal Project'],
  meta: [{ label: 'роль', value: 'Автор и владелец системы — архитектура контракта, токены, компоненты, governance' }],
  problemTitle: 'Дизайн-системы деградируют, когда их пишет больше одного автора',
  problem: [
    'Дизайн-системы обычно деградируют, когда их пишет больше одного человека без жёсткой дисциплины: хардкод-значения вместо токенов, размеры «на глаз» вместо чисел из Figma, разъезжающиеся имена токенов между дизайном и кодом.',
    'При работе с AI-агентами появляется дополнительный риск: агент может правдоподобно воспроизвести внешний вид, но придумать размеры, свойства или поведение, которых нет в исходном компоненте.',
  ],
  problemSteps: [
    'Агенту говорят «сделай компонент X»',
    'Он берёт значение по аналогии с соседним компонентом, а не из точного Figma-узла',
    'Токен с похожим названием используется вместо точного (например 4xSmall, хотя по факту это не 8px)',
    'Через несколько таких компонентов дизайн-система в коде и дизайн-система в Figma — уже два разных источника правды',
  ],
  sections: [
    {
      tag: '01 · market',
      promptQuestion: 'это уже где-то решено?',
      title: 'Откуда берётся разрыв между дизайном и кодом',
      paras: [
        'В проекте я связал визуальные требования, токены и публичный API компонента общим процессом. Задача — сделать решения прослеживаемыми: от конкретного мастер-узла Figma до реализации и примера в Storybook.',
        'Боль за этим — известная и воспроизводимая: архитектура компонента живёт в дизайне своей жизнью (слой называется «норма», «вкл»), а в коде — своей (enabled, default, как буквально записано в CSS-классах). Для разработчика это означает двойной перевод на каждый компонент и источник расхождений, которые всплывают только в проде.',
      ],
      note: 'Подтверждено собственными логами проекта: в сессии Modal (dx-friction-2026-05-02, находка U3) код использовал слоты beforeTitle/afterTitle, а Figma — contentBefore/contentAfter — разработчику казалось, что нужных слотов в компоненте просто нет. Это тот самый разрыв «два разных мира», не абстрактный пример, а зафиксированный инцидент.',
    },
    {
      tag: '02 · process',
      promptQuestion: 'как создаётся компонент?',
      title: 'От макета до выпуска — один процесс',
      steps: [
        'Figma: определить мастер-компонент, варианты, состояния и критерии готовности.',
        'Спецификация: зафиксировать Variant Matrix, Numeric Map, State Token Matrix и Hard Constraints.',
        'Реализация: описать типизированный API, поведение и стили на семантических токенах.',
        'Storybook: подготовить Controls и примеры вариантов, состояний и тем.',
        'Проверки: выполнить автоматические команды и сверить результат с макетом.',
        'Review и выпуск: провести изменения через PR, описать изменения публичного API в Changeset и опубликовать Storybook.',
      ],
      note: 'Для визуальных изменений нужна сверка с Figma и просмотр сценариев. Матрицы состояний не создаются формально для каждой правки документации.',
    },
    {
      tag: '03 · insight',
      promptQuestion: 'как это решить системно?',
      title: 'Контракт: сначала данные, затем реализация',
      paras: [
        'В CLAUDE.md закреплён порядок работы: перед реализацией определить источник в Figma, варианты, точные значения и токены состояний. Контракт сокращает число решений на усмотрение агента; TypeScript, тесты и CI проверяют часть требований, а соответствие макету и качество состояний требуют review.',
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
      note: 'Данные фиксируются в Component Spec Document. Контракт задаёт требования к процессу, но его прочтение не является технической гарантией соблюдения каждого правила.',
    },
    {
      tag: '04 · proven effect',
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
      tag: '05 · what’s built',
      promptQuestion: 'что уже собрано?',
      title: 'Что собрано',
      paras: [
        'Библиотека находится в активной разработке. Стек: React 19 · TypeScript 5 · Vite 6 · styled-components 6 · Storybook 8. Публичный каталог показывает реализованные компоненты и их доступные свойства.',
      ],
      groups: [
        {
          name: 'основные элементы',
          items: ['Button', 'ButtonIcon', 'ButtonLink', 'Icon', 'Avatar', 'Label', 'Divider'],
        },
        { name: 'формы и выбор', items: ['InputText', 'InputSearch', 'InputEmail', 'InputTel', 'InputDate', 'DatePicker', 'Checkbox', 'Radio', 'Toggle', 'Select', 'Multiselect', 'SelectButton', 'FileUpload', 'InputFile'] },
        { name: 'навигация', items: ['Breadcrumbs', 'Sidebar', 'SidebarNavigationItem', 'TabGroup', 'TabItem', 'Accordion', 'Pagination', 'Stepper', 'StepperGroup'] },
        { name: 'обратная связь', items: ['InlineMessage', 'NotificationSnackbar', 'StatusLabel', 'StatusMark', 'Counter', 'Spinner', 'ProgressBar'] },
        { name: 'составные элементы и таблицы', items: ['Modal', 'ModalDialog', 'BenefitCard', 'SplitButton', 'ToggleButton', 'Chips', 'TableRow', 'TableColumn', 'TableCell'] },
        { name: 'компоновка', items: ['Stack', 'Cluster', 'Grid'] },
      ],
      note: 'Полнота состояний и проверок различается по компонентам. В Storybook можно менять свойства через Controls, исследовать поведение и переключать тему; Foundation/ThemeCheck помогает сравнивать компоненты вместе.',
    },
    {
      tag: '06 · architecture',
      promptQuestion: 'как это устроено?',
      title: 'Как это устроено под капотом',
      paras: [
        'Мастер-компоненты Figma задают визуальные требования. В tokens/primitives/ хранятся базовые значения, в tokens/semantic/ — значения с назначением. Сохранённые JSON позволяют воспроизвести тему без обращения к Figma при каждой сборке.',
        'Команда npm run tokens:build запускает Style Dictionary: генерирует объект theme и его TypeScript-тип, CSS-переменные светлой темы и цветовые переопределения тёмной. Сгенерированные файлы не редактируются вручную.',
        'Именование зеркалит Figma 1:1 и меняет только разделитель: button/primary/background/hover в Figma → theme.colors.button.primary.background.hover в коде → var(--color-button-primary-background-hover) в CSS.',
        'Изменение в Figma не обновляет библиотеку автоматически: токены нужно получить через интеграцию или согласованный перенос, проверить diff, пересобрать тему и проверить компоненты.',
      ],
      code: 'const appearanceStyles = {\n  primary: css`\n    &:enabled {\n      background-color: ${({ theme }) => theme.colors.button.primary.background.enabled};\n      color: ${({ theme }) => theme.colors.button.primary.label.enabled};\n    }\n    &:hover:enabled {\n      background-color: ${({ theme }) => theme.colors.button.primary.background.hover};\n    }\n  `,\n  outline: css`/* ... */`,\n  flat: css`/* ... */`,\n} as const;\n\nconst StyledButton = styled.button`\n  border-radius: ${({ theme }) => theme.borderRadius.componentBase};\n  &:focus-visible { box-shadow: ${({ theme }) => theme.focus}; }\n  ${({ $appearance }) => appearanceStyles[$appearance]}\n  ${({ $size }) => sizeStyles[$size]};\n`;',
      note: 'Контракт требует использовать семантические токены вместо обращения к сырой палитре. Правильность выбора токена проверяется отдельно: успешная сборка сама по себе не подтверждает соответствие макету.',
    },
    {
      tag: '07 · reuse',
      promptQuestion: 'как переиспользуется css?',
      title: 'Как CSS переиспользуется и пересобирается',
      defs: [
        {
          name: 'Светлая и тёмная тема',
          text: 'ThemeProvider получает общий объект theme, который ссылается на CSS-переменные. Светлая и тёмная темы переключаются атрибутом data-theme. В приложении нужно подключить theme/variables.css: он содержит обе темы и шрифты.',
        },
        {
          name: 'Адаптивная типографика без re-render',
          text: 'Типографика предусматривает режимы XL, MD и XS с CSS-переопределениями на ширинах 1280 и 768px. Значения пересчитывает браузер; адаптивность конкретных сценариев проверяется отдельно.',
        },
        {
          name: 'Внешнее управление видом',
          text: 'Transient-props ($appearance, $size, $loading) не утекают в DOM, а лишь выбирают ветку карты стилей — внешний код влияет на вид через проп, а не через переопределение CSS с !important, который в системе полностью запрещён.',
        },
      ],
      note: 'Итог: один компонент, один файл стилей — тема, брейкпоинт и переданные пропы вместе решают, как он выглядит в конкретном месте, без дублирования кода.',
    },
    {
      tag: '08 · figma ↔ code',
      promptQuestion: 'как связаны figma и код?',
      title: 'Связь через Code Connect',
      paras: [
        'Для Button шаблон Code Connect подготовлен, протестирован и опубликован через CLI. Остальные сопоставления развиваются отдельно: наличие mapping-файла ещё не подтверждает опубликованную связь.',
      ],
      code: "figma.connect(Button, 'https://www.figma.com/design/.../?node-id=3001-15051', {\n  props: {\n    appearance: figma.enum('Appearance', { Primary: 'primary', Outline: 'outline', Flat: 'flat' }),\n    size: figma.enum('Size', { Large: 'large', Medium: 'medium' }),\n    text: figma.string('Label'),\n    disabled: figma.boolean('Disabled'),\n  },\n  example: ({ appearance, size, text, disabled }) => (\n    <Button appearance={appearance} size={size} text={text} disabled={disabled} />\n  ),\n});",
      note: 'Пример показывает явное сопоставление вариантов Figma со свойствами React. Его актуальность нужно поддерживать при изменениях компонента. Доступность Code Connect и Variables API зависит от плана и прав Figma.',
    },
    {
      tag: '09 · governance',
      promptQuestion: 'как система живёт дальше?',
      title: 'Как проверяются изменения',
      paras: [
        'В документации зафиксирован прогон на Node 20: 175 успешных тестов компонентов в 51 файле и 17 тестов инструментов. Это результат конкретного аудита; он не означает, что все состояния, темы и сценарии уже проверены полностью.',
      ],
      defs: [
        {
          name: 'Автоматические проверки',
          text: 'TypeScript проверяет типы, ESLint и Prettier — код и форматирование, Vitest и Testing Library — описанные сценарии поведения. addon-a11y помогает находить часть проблем доступности.',
        },
        {
          name: 'Changesets',
          text: 'Версии библиотеки поднимаются через явный журнал изменений на уровне компонента, а не молча накопленными правками.',
        },
        {
          name: 'ThemeCheck',
          text: 'Общий сценарий Storybook для просмотра светлой и тёмной тем. Контракт требует обновлять его при добавлении компонентов и изменении интерактивного поведения.',
        },
        {
          name: 'Chromatic',
          text: 'Сравнивает снимки stories. В текущей конфигурации визуальные отличия не блокируют CI, а изменения main автоматически принимаются как baseline; зелёный статус не заменяет просмотр изменений.',
        },
        {
          name: 'Отчёт качества',
          text: 'Команда quality:report собирает результаты проверок, покрытие и журналы. GitHub Actions сохраняет Summary и артефакты отчёта для разбора ошибок.',
        },
      ],
    },
    {
      tag: '10 · delivery',
      promptQuestion: 'можно подключить к приложению?',
      title: 'Библиотека проверена за пределами Storybook',
      paras: [
        'Пакет @evgeni_design_84/ai-pdp-ds можно установить через npm или собрать архив командой npm pack. В поставку включены код, типы, CSS обеих тем и шрифты.',
        'Проверка package:check устанавливает архив в отдельный проект и проверяет импорты, типы, серверный рендер и сборку Vite. Проверены ESM/CJS-экспорты; полная матрица совместимости версий React требует отдельных прогонов.',
      ],
      note: 'Исходники и публичный Storybook доступны для изучения. Проект продолжает развиваться: следующие задачи — расширять сопоставления Figma, проверку состояний, тем и адаптивности.',
    },
  ],
  outcome:
    'Я разработал открытую библиотеку компонентов и процесс её развития с AI: спецификации до реализации, семантические токены, интерактивная документация и проверки изменений. Библиотеку можно исследовать в Storybook и подключить к отдельному приложению. Проект находится в активной разработке; контракт и автоматические проверки дополняются сверкой с Figma и review.',
  hasMatrix: false,
  hasNda: false,
  links: [
    { label: 'github', icon: 'code', url: 'https://github.com/Ev-gen-ux/AI-PDP-DS' },
    { label: 'storybook', icon: 'book', url: 'https://main--69f08a5c57bcf2747e61c70d.chromatic.com/' },
    { label: 'figma', icon: 'design', url: 'https://www.figma.com/design/i7T3ru2M0SyXgJeTda8f43/AI-PDP-DS' },
  ],
};
