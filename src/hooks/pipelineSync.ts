/**
 * Shared mutable store bridging usePipelineScroll (writes) and
 * useAssemblyAnimation (reads) — 1:1 with the source's `this._plT`/`this._plLeftT`
 * instance properties, which drivePipeline() writes and driveAsm() reads every
 * frame. A module-level singleton is fine here: there is exactly one #pipeline
 * section on the page, same as the source's single Component instance.
 */
export const pipelineSync = {
  /** Per-panel "active-ness" 0..1, indexed like `data-pl-panel`. */
  panelT: [0, 0, 0, 0, 0] as number[],
  /** Left-column (`data-pl-fixed`) reveal progress — fast early-scroll trigger, distinct from panelT. */
  leftT: 0,
  /**
   * Whether the pinned sequence has ever been scrolled through to completion
   * (added 2026-08-02, for the "AGENT SESSION" step list) — one-way, never
   * reset back to false. `panelT` itself resets to all-zero the moment you
   * scroll past the section (see the `!started` branch in usePipelineScroll),
   * which is wrong for the agent-session steps: those should stay showing
   * "done" after you've left, not snap back to "not started."
   */
  completed: false,
  /**
   * Per-step assembly progress for the AGENT SESSION list's verb/target/
   * outcome text (added 2026-08-03; text-freezing bug fixed same day). Not a
   * reuse of `panelT`: `panelT` resets to all-zero the moment `!started`,
   * correct for the right-side stage panels (invisible anyway once you
   * leave) but not directly usable here, since the AGENT SESSION list's dot/
   * outcome colors follow `state` (see the dot-driving loop), not raw
   * `panelT` — `state` already correctly distinguishes "scrolled past the
   * end, stay done" from "back in the dead zone, not started" via
   * `completed && rawRatio >= 1`. `stepT[i]` mirrors that same `state` every
   * frame ('done'→1, 'pending'→0, 'active'→live `panelT[i]`) rather than
   * tracking its own separate memory — an earlier version used a one-way
   * "max ever reached" ratchet instead, which stayed permanently assembled
   * even after scrolling back well above the section, only resetting on a
   * hard reload (reported as a bug 2026-08-03, the ratchet was wrong, not
   * `panelT`'s resetting).
   */
  stepT: [0, 0, 0, 0, 0] as number[],
};
