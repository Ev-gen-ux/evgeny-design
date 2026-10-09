/**
 * Bridge between the hero three.js figure (writes anchors, reads `highlight`) and the About block's
 * «figure as an outline» variant (2026-09-26): the block draws leader lines from its statements to the figure's
 * bands and lights a band while its statement is hovered. Module-level like `pipelineSync`: there is exactly one
 * figure on the page.
 */
export const figureSync = {
  /** Set by the About block while it is on screen, so the scene only projects the anchors when they are needed. */
  active: false,
  /** Index of the band (vertex group, 0 = top) to light up, or -1. */
  highlight: -1,
  /** Screen position (CSS px) of the left-most vertex of each band, refreshed every frame while `active`. */
  anchors: [] as Array<{ x: number; y: number }>,
};
