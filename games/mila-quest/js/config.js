export const KEY = "milaQuestV2";
export const NEED_CLEAN = 3;
export const PTS = [100, 80, 60, 40];

export const HEROES = [
  { name: "ליאם", file: "heroes/hero-liam.glb" },
  { name: "מאיה", file: "heroes/hero-maya.glb" },
  { name: "נובה", file: "heroes/hero-nova.glb" }
];

export const BOSSES = [
  { name: "שומר הג'ונגל", file: "nature/tree_detailed.glb", height: 3.4, animated: false, tint: 0x5ac05a },
  { name: "קפטן הפיראטים", file: "heroes/boss-pirate.glb", height: 2.55, animated: true },
  { name: "הקוסם השומר", file: "heroes/boss-wizard.glb", height: 2.55, animated: true },
  { name: "חייל החלל", file: "heroes/boss-soldier.glb", height: 2.55, animated: true },
  { name: "מלכת הקרח", file: "holiday/snowman-hat.glb", height: 2.6, animated: false },
  { name: "אביר המדבר", file: "mini/character-knight.glb", height: 2.6, animated: true, tint: 0xe0b060 },
  { name: "רובוט המעמקים", file: "mini/character-robot.glb", height: 2.6, animated: true, tint: 0x40d0e0 },
  { name: "ענק הלבה", file: "mini/character-male-a.glb", height: 3.1, animated: true, tint: 0xff5a20 }
];

/* v8b: 7 stages per world — index 6 is the boss (BOSS_ST) */
export const NSTAGES = 7;
export const BOSS_ST = 6;
export const ST = [
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["איסוף אותיות", "build"], ["אות חסרה", "let"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]],
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["אות חסרה", "let"], ["איסוף אותיות", "build"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]],
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["אות חסרה", "let"], ["איסוף אותיות", "build"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]],
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["איסוף אותיות", "build"], ["אות חסרה", "let"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]],
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["אות חסרה", "let"], ["איסוף אותיות", "build"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]],
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["איסוף אותיות", "build"], ["אות חסרה", "let"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]],
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["אות חסרה", "let"], ["איסוף אותיות", "build"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]],
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["איסוף אותיות", "build"], ["אות חסרה", "let"], ["תמונה וחידה", "picw"], ["סיבוב מהיר", "mix"], ["אתגר הבוס", "boss"]]
];

export const WORLDS = [
  {
    id: 1, name: "אי הג'ונגל", en: "Jungle Island", icon: "🌴",
    desc: "משפחה, חיות וטבע",
    sky: 0x62c8ff, fog: 0x8fd4a2, pathA: 0xd2a85c, pathB: 0xa57a38,
    ground: 0x2f9a4c, hemiSky: 0xc4f0ff, hemiGround: 0x1f6a32, sun: 0xfff1c2,
    decor: ["nature/tree_detailed.glb", "nature/tree_default.glb", "nature/tree_palm.glb", "nature/plant_bushLarge.glb", "nature/mushroom_red.glb"],
    obstacle: ["nature/log.glb"],
    extra: ["nature/flower_redA.glb"]
  },
  {
    id: 2, name: "אוקיינוס הפיראטים", en: "Pirate Ocean", icon: "🏴‍☠️",
    desc: "ים, צבעים ואוכל",
    sky: 0x4ec8e6, fog: 0x7ad4e6, pathA: 0x8b5a2b, pathB: 0x6b4018,
    ground: 0x1a88a8, hemiSky: 0xb8f4ff, hemiGround: 0x146888, sun: 0xffe6a0,
    decor: ["pirate/palm-straight.glb", "pirate/palm-detailed-straight.glb", "pirate/chest.glb", "pirate/flag-pirate.glb", "pirate/cannon.glb"],
    obstacle: ["pirate/barrel.glb", "pirate/crate.glb"],
    extra: ["pirate/ship-pirate-small.glb"]
  },
  {
    id: 3, name: "העיר הקסומה", en: "Magic City", icon: "🏰",
    desc: "בית ספר, בית והעיר",
    sky: 0xffb4de, fog: 0xd7b8f5, pathA: 0x7a6a9a, pathB: 0x5a4a7a,
    ground: 0x6b55ae, hemiSky: 0xffd8f0, hemiGround: 0x4a3878, sun: 0xffe0f2,
    decor: ["platformer/tree.glb", "platformer/flowers.glb", "platformer/chest.glb"],
    obstacle: ["platformer/crate.glb"],
    extra: []
  },
  {
    id: 4, name: "גלקסיית החלל", en: "Space Galaxy", icon: "🚀",
    desc: "חלל, מספרים וזמן",
    sky: 0x14102e, fog: 0x2a2460, pathA: 0x3a3478, pathB: 0x5a50b0,
    ground: 0x1a1448, hemiSky: 0x8a80e0, hemiGround: 0x0c0824, sun: 0xc8c0ff,
    decor: ["space/rock_crystalsLargeA.glb", "space/crater.glb", "space/astronautA.glb", "space/craft_speederA.glb"],
    obstacle: ["space/meteor.glb"],
    extra: ["space/alien.glb"]
  },
  {
    id: 5, name: "ממלכת הקרח", en: "Ice Kingdom", icon: "❄️",
    desc: "בגדים, מזג אוויר והגוף",
    sky: 0xd8f6ff, fog: 0xe8f8ff, pathA: 0xeaf7ff, pathB: 0xc5e4f4,
    ground: 0xb9def0, hemiSky: 0xf5fdff, hemiGround: 0x8ebbd0, sun: 0xffffff,
    decor: ["holiday/tree-snow-a.glb", "holiday/present-a-cube.glb", "holiday/sled.glb"],
    obstacle: ["holiday/rocks-large.glb"],
    extra: ["holiday/snowman-hat.glb"]
  },
  {
    id: 6, name: "מדבר הפירמידות", en: "Pyramid Desert", icon: "🐫",
    desc: "מדבר, היסטוריה וכיוונים",
    sky: 0x5ab0f0, fog: 0xf2d9a8, pathA: 0xe2bf7c, pathB: 0x8a5a28,
    ground: 0xe2b874, hemiSky: 0xfff0d0, hemiGround: 0xb08040, sun: 0xfff0c8,
    decor: ["pirate/palm-straight.glb", "pirate/palm-detailed-straight.glb", "platformer/chest.glb"],
    obstacle: ["platformer/crate.glb"],
    extra: []
  },
  {
    id: 7, name: "מעמקי הים", en: "Ocean Depths", icon: "🐠",
    desc: "חיים בים, מדע וסביבה",
    sky: 0x1a6a90, fog: 0x1a7aa0, pathA: 0xc9b98a, pathB: 0x7af0ff,
    ground: 0x2a8aa0, hemiSky: 0x9ff0ff, hemiGround: 0x0a4a6a, sun: 0xc8f4ff,
    decor: ["pirate/chest.glb", "pirate/barrel.glb", "pirate/ship-pirate-small.glb"],
    obstacle: ["pirate/chest.glb"],
    extra: []
  },
  {
    id: 8, name: "ארץ הר הגעש", en: "Volcano Land", icon: "🌋",
    desc: "כוחות הטבע, הצלה ודינוזאורים",
    sky: 0x4a1a14, fog: 0x5a2a20, pathA: 0x3a3030, pathB: 0xffb050,
    ground: 0x3a2a24, hemiSky: 0xffb890, hemiGround: 0x3a1408, sun: 0xffa060,
    decor: ["space/rock_crystalsLargeA.glb", "space/meteor.glb", "space/crater.glb"],
    obstacle: ["holiday/rocks-large.glb", "space/meteor.glb"],
    extra: []
  }
];

export const ACH = [
  { id: "first_run", name: "צעד ראשון", desc: "יצאתם להרפתקה הראשונה!" },
  { id: "stars3", name: "כוכב על", desc: "השגתם שלושה כוכבים בשלב" },
  { id: "boss1", name: "ציידי בוסים", desc: "ניצחתם בוס ראשון" },
  { id: "world1", name: "מלכי הג'ונגל", desc: "סיימתם את אי הג'ונגל" },
  { id: "worlds5", name: "גיבורי המסע", desc: "סיימתם את כל העולמות" },
  { id: "learn10", name: "עשר מילים", desc: "למדתם 10 מילים" },
  { id: "learn50", name: "חמישים מילים", desc: "למדתם 50 מילים" },
  { id: "learn100", name: "מאה מילים", desc: "למדתם 100 מילים" },
  { id: "score800", name: "אלופי הניקוד", desc: "הגעתם ל־800 נקודות בשלב" },
  { id: "hint", name: "חברים של הינשוף", desc: "השתמשתם ברמז" },
  { id: "perfect", name: "בול פגיעה", desc: "שלב מושלם בלי אף טעות" },
  { id: "library", name: "ספרנים", desc: "ביקרתם בספריית המילים האבודות" }
];

export const INTRO = [
  "תרגמו מילה מעברית לאנגלית ורצו אל השלט הנכון. קפצו מעל בורות ומכשולים!",
  "תרגמו על הסיפון ורצו בין השערים. זהרו מקירות וחביות מתגלגלות!",
  "תרגמו על גגות העיר הקסומה. המסלול מתעקל והתאורה משתנה!",
  "תרגמו בין הכוכבים. התחמקו ממטאורים ומקירות באור החלל!",
  "תרגמו על דרך הקרח החלקה. מלכת הקרח מחכה בסוף הדרך!",
  "רוצו בין הפירמידות והדיונות. היזהרו מחול טובעני ומגלגלי קוצים!",
  "צללו למעמקי הים! רוצו בין האלמוגים והתחמקו מדגי אבו־נפחא.",
  "העולם הכי קשה: נהרות לבה, אבני אש ודינוזאורים. בהצלחה, גיבורים!"
];
