/* v8: shared graphics-quality state (read by game.js, themes.js, worldkit.js).
   level: "low" | "medium" | "high".  scale multiplies the medium ("!high") counts of
   scenery / particles / stars, so LOW gets roughly half of MEDIUM. */
export const GFX = { level: "high", scale: 1 };
export function setGfxLevel(level) {
  GFX.level = level === "low" || level === "medium" ? level : "high";
  GFX.scale = GFX.level === "low" ? 0.5 : 1;
}
/* N(high, highCount, mediumCount) -> count for the current level */
export function N(high, a, b) {
  return high ? a : Math.max(1, Math.round(b * GFX.scale));
}
/* shared uniform: point-sprite size multiplier = renderer pixel ratio (so stars keep their
   on-screen size when LOW renders at a fraction of the resolution). */
GFX.px = { value: 1 };
