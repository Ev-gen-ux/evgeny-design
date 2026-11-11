/** Shared reversible dot/line animation for desktop and phone Pipeline. */
export function updateAgentStepProgress(dot: HTMLElement | null, row: HTMLElement | null, progress: number) {
  const scale = (0.35 + progress * 0.65).toFixed(3);
  if (dot) {
    dot.style.transform = `scale(${scale})`;
    dot.style.opacity = scale;
  }
  if (row) {
    row.style.setProperty('--agent-dot-scale', scale);
    row.style.setProperty('--agent-line-progress', progress.toFixed(3));
  }
}
