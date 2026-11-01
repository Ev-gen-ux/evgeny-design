# UI-токены портфолио

Единственный редактируемый источник — [`design-tokens.json`](../../design-tokens.json).
Схема рядом с ним даёт подсказки редактору. `generated.css`, `generated.ts`,
`colors.ts`, `spacing.ts`, `typography.ts`, `motion.ts` генерируются: править их вручную нельзя.

## Уровни системы

1. **Примитивы:** `palette-*`, `space-24`, `fs-lg`, `duration-250` — шкалы значений.
2. **Семантика:** `space-section-desktop`, `space-case-section`, `space-stack-lg`,
   `color-text-primary`, `color-interactive`, `border-panel`, `radius-card` — назначение.
3. **Компоненты:** `header-*`, `chat-bar-*`, `case-card-*`, `case-study-*`,
   `pipeline-*`, `hero-*` — настройки конкретных частей интерфейса.

Значение может ссылаться на другой токен: `"var(--space-stack-lg)"`.
Так меняется общий ритм, а индивидуальное исключение остаётся управляемым.
Имена, содержащие desktop/phone/tablet/hover, обозначают отдельные варианты,
значения не следует склеивать только потому, что сегодня они совпадают.

## Что менять

| Задача | Токен/раздел источника |
| --- | --- |
| Отступ между блоками на десктопе | `space-section-desktop` |
| Отступы секций на телефоне | `space-section-mobile` |
| Особый зазор после Hero | `space-section-hero-following` |
| Отступ между разделами кейса | `space-case-section` |
| Обычный вертикальный интервал | `space-stack-*` |
| Интервал в строке | `space-inline-*` |
| Внутренние поля | `space-inset-*`, затем нужный компонент |
| Ширина контента/боковые поля | `container-*`, `space-page-gutter` |
| Текст и ссылки | `color-text-*`, `color-interactive*` |
| Цвет бюста | `color-bust` (по умолчанию ссылается на `color-glow`) |
| Цвет фонового свечения | `color-background-glow` |
| Скорость и зерно фона | `runtime.background` |
| Растворение нижнего края бюста | `runtime.bust` |
| Рамки/заливка/blur кейсов во всех вариантах | `case-card-*` |
| Стекло шапки и Chat Bar | `floating-glass-background`, `header-glass-blur`, `chatbar-glass-blur` |
| Мобильный вариант стекла | `contexts`, контекст с медиаусловием `viewport-phone` |
| Поля плавающих панелей | `floating-panel-*` |
| Шрифты, кегли, начертания | `font-*`, `fs-*`, `fw-*`, `lh-*`, `tracking-*` |
| Скругления | `radius-badge`, `radius-control`, `radius-card`, `radius-panel` |
| Магнитное наведение | `runtime.magnet` |
| Размеры 3D-карточек | `case-card-width`, `case-card-height`, `case-carousel-*` |
| Ширины переключения адаптива | `breakpoints` |
| Подсветка кода | `syntax-*` |
| Размер, толщина и зазор иконок Lucide | `icon-size-control`, `icon-stroke-width`, `icon-label-gap` |

`space-section-mobile` задаёт поля одной секции сверху/снизу: полный зазор между
двумя соседними секциями может состоять из двух полей. На десктопе принято одно
верхнее поле у следующей секции. Pipeline использует margin: его высота нужна для
scroll-driven анимации, добавлять к ней padding вместо margin нельзя.

## CSS и React

```css
.block {
  padding: var(--space-inset-lg);
  gap: var(--space-stack-lg);
  color: var(--color-text-primary);
}
@media (--viewport-phone) {
  .block { padding: var(--space-inset-md); }
}
```

Именованные media-условия раскрывает Vite-плагин из тех же `breakpoints`, которые
использует TypeScript. Нативные CSS-переменные внутри обычного `@media` не работают.

Имена локальных `@keyframes` должны оставаться в CSS-модуле. В токены выносятся
длительность, задержка и easing, но не весь shorthand `animation`: CSS Modules
не переименовывает имя анимации внутри значения глобальной CSS-переменной.
Компиляционный тест проверяет соответствие имён после обработки Vite.
Глобальные keyframes из `index.css` подключаются через `global-animation-*`,
чтобы CSS Modules не превратил ссылку на глобальную анимацию в локальное имя.

```tsx
import { token, breakpoints } from './tokens';
<Section paddingTop="section-block" paddingBottom="section-block">…</Section>
<Grid gap="stack-lg">…</Grid>
<div style={{ marginTop: token('space-case-section') }}>…</div>
```

Для CSS-полей использовать `token()`: это ссылка `var(--...)`, поэтому responsive
и scoped-переопределения продолжают действовать. Числовые props `Section`/`Grid`
оставлены для совместимости, но в новых блоках предпочтительны семантические роли.

Canvas/Three.js не понимают CSS `var()`. Для цвета сцена вызывает `readToken()`
в браузере; числовая геометрия получает `runtimeTokens`. В источнике числовой
runtime-параметр может ссылаться на тот же CSS-токен через
`{"token": "case-card-width", "as": "number"}`. Поэтому CSS и JS не расходятся.
RGB-тройки вычисляются из цвета через `{"rgbOf": "color-glow"}`.

## Обновление и проверки

- `npm run dev` — генерирует значения; изменение JSON в dev автоматически
  перегенерирует CSS/TS и перезапускает сервер.
- `npm run tokens:generate` — явная генерация без сервера.
- `npm run tokens:check` — проверяет актуальность генерации, неизвестные ссылки,
  жёстко заданные CSS-цвета/размеры и inline-размеры React.
- `npm run test:tokens` — проверяет распространение правок в CSS/JS,
  RGB-производные, брейкпоинты и отклонение некорректных связей.
- `npm run check` — полный контроль перед изменениями production.

В git нужно сохранять и JSON, и сгенерированные файлы. Генератор не требует
внешних сервисов, дополнительных пакетов или деплоя.

## Граница токенизации

Структурные значения `0`, `100%`, `auto`, `flex`, динамические координаты курсора,
scroll-progress и вычисленные размеры DOM не являются настройками дизайна.
`runtimeProperties` описывает переменные, заполняемые анимацией, а не константы UI.
Коэффициенты алгоритмов шума, матрицы камеры, геометрия SVG/GLB и кодовые примеры
в содержимом кейсов не заменяются тысячами декоративных токенов. Доступные настройки
внешнего вида этих эффектов вынесены в `runtime` и цветовые роли.

Скрытые по ранее принятому решению wash/mesh-слои сохранены; их настройки находятся
в `runtime.legacyBackdrop` и `legacy-mesh-*`. Активный фон — Harmonic Flux.

## Иконки контролов

Иконки подключены через `lucide-react` и общий компонент `components/Icon`.
Реестр содержит только используемые иконки; для новой иконки добавляйте явный
импорт, не импортируйте весь набор динамически.

```tsx
<Link href="/work/log-service" icon="arrow-right">Открыть кейс</Link>
<MagnetLink href="https://example.com" external icon="arrow-up-right" reducedMotion={reducedMotion}>
  Сайт проекта
</MagnetLink>
```

`Icon` декоративный: название действия остаётся в тексте или `aria-label`
контрола. SVG наследует `currentColor`, исключён из letter-assembly и скрыт
от скринридера. Текст и SVG находятся в отдельных узлах, поэтому анимация
букв не перезаписывает разметку иконки. Символы в обычном контенте и текстовые
метки терминального интерфейса не заменяются иконками автоматически.
