/**
 * Fixed-position noise texture, visible only while `data-theme="mono"` is
 * active (see tokens/theme-mono.css — `.grainOverlay`'s own opacity is 0
 * outside that theme, so mounting this unconditionally on every page costs
 * nothing on the default site). `aria-hidden` + `pointer-events: none`:
 * purely decorative, never intercepts input.
 *
 * `.grainOverlay` is a *global* class name (defined in tokens/theme-mono.css,
 * a plain CSS file, not a `.module.css`) rather than a CSS-module import —
 * it needs to be selectable from that shared token file via a stable,
 * unhashed name, the same reason design tokens live outside the module
 * system everywhere else in this codebase.
 */
export function GrainOverlay() {
  return <div className="grainOverlay" aria-hidden="true" />;
}
