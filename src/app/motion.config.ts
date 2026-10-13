/**
 * Global knobs for the page-transition motion (atoms flying in and out, the
 * star warp) and the first-load intro. Edit the defaults here; in dev builds
 * (`npm start`) the Motion panel in the bottom-left corner tweaks them live and
 * can copy the values back for pasting here.
 */
export const MOTION = {
  /** Time scale: 2 = everything twice as fast, 0.5 = half speed. */
  speed: 1,
  /** Intensity: how far elements travel and how hard the stars streak.
   *  0 = none, 1 = default, 2 = double. */
  strength: 1,
  /** Page change: seconds the new page waits before its elements fly in, so the
   *  old page has mostly left first (scaled by speed). The route itself still
   *  switches at once, so clicks stay responsive and retargetable. */
  pageEnterDelay: 0.35,
};

/** A duration / delay / stagger (seconds) at the current speed. */
export const dur = (s: number) => s / MOTION.speed;
/** A travel distance (px) at the current strength. */
export const dist = (px: number) => px * MOTION.strength;

/** The shipped defaults (before any live tweaking in the dev Motion panel). */
export const MOTION_DEFAULTS = { ...MOTION };
