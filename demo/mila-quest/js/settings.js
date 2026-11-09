/* Mila Quest v8 — player settings + difficulty progression (data-driven so new worlds
   added in config.WORLDS automatically get a harder profile). */

export const QTYPES = [
  // key in settings.types, internal runner mode, Hebrew label (settings + stage tiles)
  { key: "he2en", mode: "tr", label: "תרגום מעברית לאנגלית" },
  { key: "en2he", mode: "en2he", label: "תרגום מאנגלית לעברית" },
  { key: "listen", mode: "rev", label: "האזנה ופירוש" },
  { key: "build", mode: "build", label: "איסוף אותיות" },
  { key: "missing", mode: "let", label: "אות חסרה" }
];
export const MODE_LABEL = { tr: "תרגום לאנגלית", en2he: "תרגום לעברית", rev: "האזנה ופירוש", build: "איסוף אותיות", let: "אות חסרה" };

export const DIFFS = {
  easy: { label: "קל", mul: 0.85, hearts: 4, lead: 6, boss: -1, lvlShift: -0.15 },
  normal: { label: "רגיל", mul: 1, hearts: 3, lead: 0, boss: 0, lvlShift: 0 },
  hard: { label: "קשה", mul: 1.12, hearts: 3, lead: -3, boss: 1, lvlShift: 0.15 }
};
export const SPEEDS = [
  { v: 0.75, label: "איטי מאוד" },
  { v: 0.9, label: "איטי" },
  { v: 1, label: "רגיל" },
  { v: 1.15, label: "מהיר" }
];
export const GFX_OPTS = [
  { v: "auto", label: "אוטומטי" },
  { v: "low", label: "נמוכה (פיקסלים)" },
  { v: "medium", label: "בינונית" },
  { v: "high", label: "גבוהה" }
];

export const DEFAULT_SETTINGS = () => ({
  difficulty: "normal",
  types: { he2en: true, en2he: true, listen: true, build: true, missing: true },
  speed: 1,
  gfx: "auto",
  sfx: 0.8,
  voice: 1,
  hints: true,
  showAnswer: true
});

export function normSettings(s) {
  const d = DEFAULT_SETTINGS();
  const o = Object.assign(d, s || {});
  o.types = Object.assign(DEFAULT_SETTINGS().types, (s && s.types) || {});
  if (!DIFFS[o.difficulty]) o.difficulty = "normal";
  if (!SPEEDS.some((x) => x.v === o.speed)) o.speed = 1;
  if (!GFX_OPTS.some((x) => x.v === o.gfx)) o.gfx = "auto";
  o.sfx = Math.max(0, Math.min(1, +o.sfx || 0));
  o.voice = Math.max(0, Math.min(1, o.voice == null ? 1 : +o.voice));
  if (!QTYPES.some((q) => o.types[q.key])) o.types.he2en = true; // at least one type stays on
  return o;
}
export function enabledModes(set) {
  return QTYPES.filter((q) => set.types[q.key]).map((q) => q.mode);
}

/* Per-question modes for a stage.  stageMode = the stage's designed type from config.ST.
   - translation stage ("tr") mixes the enabled translation directions;
   - a disabled stage type is replaced by an enabled one (rotated by stage so stages differ);
   - boss cycles through every enabled type. */
export function stageModes(stageMode, st, boss, set) {
  const en = enabledModes(set);
  if (boss) return en.length ? en : ["tr"];
  if (stageMode === "tr") {
    const tr = en.filter((m) => m === "tr" || m === "en2he");
    if (tr.length) return tr;
  } else if (en.includes(stageMode)) return [stageMode];
  const alt = en[st % en.length];
  return [alt || "tr"];
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* stage index 0..3 regular, 4 = boss */
const STAGE_BASE = [
  { spd: 0, dens: 0.30, types: ["wall", "low"] },
  { spd: 0.25, dens: 0.42, types: ["wall", "hole", "low"] },
  { spd: 0.5, dens: 0.52, types: ["wall", "hole", "beam", "low"] },
  { spd: 0.75, dens: 0.62, types: ["wall", "hole", "beam", "roll"] },
  { spd: 0.55, dens: 0.56, types: ["wall", "hole", "beam", "roll"] }
];
/* word-level mix (lvl 1 / 2 / 3) per world index 0..4 (worlds beyond 5 reuse the last row) */
const LVL_MIX = [
  [1, 0, 0],
  [0.75, 0.25, 0],
  [0.45, 0.4, 0.15],
  [0.3, 0.4, 0.3],
  [0.2, 0.35, 0.45]
];

export function difficultyFor(wid, st, boss, set) {
  const k = clamp((wid || 1) - 1, 0, 6); // progression index; capped for future worlds
  const D = DIFFS[set.difficulty] || DIFFS.normal;
  const i = boss ? 4 : clamp(st, 0, 3);
  const sb = STAGE_BASE[i];
  const m = D.mul;
  const speed = +((6.6 + 0.6 * k + sb.spd) * m).toFixed(2);
  const lead = Math.max(15, 26 - 1.5 * k + D.lead);            // metres from question to gate
  const density = +clamp(sb.dens * (0.7 + 0.12 * k) * m, 0.12, 0.95).toFixed(2);
  const spacing = +((12 - 0.6 * k) / m).toFixed(2);            // metres between obstacle rows (+0..4 random)
  const doubleBlock = +clamp(0.06 + 0.07 * k, 0, 0.45).toFixed(2);
  const similarity = +clamp((0.1 + 0.2 * k) * m + (i >= 3 ? 0.08 : 0), 0, 0.95).toFixed(2);
  const bossHP = Math.max(3, 4 + k + D.boss);
  let mix = LVL_MIX[Math.min(k, LVL_MIX.length - 1)].slice();
  const shift = D.lvlShift + 0.03 * i;
  if (k === 0 && D.lvlShift <= 0) mix = [1, 0, 0]; // world 1 stays basic unless HARD
  else if (k > 0 || shift > 0) {
    // move weight between lvl1 and the harder levels
    const move = clamp(shift, -mix[1] - mix[2], mix[0]);
    if (move >= 0) { mix[0] -= move; mix[1] += move * 0.6; mix[2] += move * 0.4; }
    else { const tot = mix[1] + mix[2] || 1; mix[0] -= move; mix[1] += move * mix[1] / tot; mix[2] += move * mix[2] / tot; }
  }
  mix = mix.map((x) => +Math.max(0, x).toFixed(2));
  // letter-collection stage: deliberately roomy (v8b) — tightens a little in later worlds / HARD
  const easy = set.difficulty === "easy", hard = set.difficulty === "hard";
  const letterSpeed = +clamp(0.78 + 0.03 * k + (hard ? 0.04 : 0) - (easy ? 0.04 : 0), 0.72, 0.92).toFixed(2); // runner slows down
  const letterGap = +clamp((15 - 0.6 * k) / m + (easy ? 2 : 0), 11, 18).toFixed(1);   // metres between letter rows
  const letterFirst = 18 + (easy ? 4 : 0);                                              // metres to the first row
  const letterClear = +clamp(8 - 0.5 * k, 5, 9).toFixed(1);                             // no obstacles this close to a row
  const letterObs = (k <= 1 || easy) ? 0 : +clamp(0.12 * (k - 1) * m, 0, 0.45).toFixed(2); // chance of an obstacle between rows
  const letterReach = +clamp(1.3 - 0.06 * k + (easy ? 0.2 : 0), 0.9, 1.5).toFixed(2);  // pickup window (metres along the track)
  const letterSim = +(similarity * 0.6).toFixed(2);
  const letterForgive = easy || (!hard && k <= 1) || k === 0;                            // a missed row re-spawns instead of costing a heart
  return { speed, lead, density, spacing, doubleBlock, similarity, bossHP, hearts: D.hearts, lvlMix: mix, types: sb.types.slice(),
    letterSpeed, letterGap, letterFirst, letterClear, letterObs, letterReach, letterSim, letterForgive };
}
