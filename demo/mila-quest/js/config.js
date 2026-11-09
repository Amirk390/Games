export const KEY = "milaQuestV2";
export const NEED_CLEAN = 3;
export const PTS = [100, 80, 60, 40];

export const HEROES = [
  { name: "ליאם", file: "heroes/hero-liam.glb" },
  { name: "מאיה", file: "heroes/hero-maya.glb" },
  { name: "נובה", file: "heroes/hero-nova.glb" }
];

export const BOSSES = [
  { name: "שומר הג'ונגל", file: "nature/tree_detailed.glb", height: 3.4, animated: false },
  { name: "קפטן הפיראטים", file: "heroes/boss-pirate.glb", height: 2.55, animated: true },
  { name: "הקוסם השומר", file: "heroes/boss-wizard.glb", height: 2.55, animated: true },
  { name: "חייל החלל", file: "heroes/boss-soldier.glb", height: 2.55, animated: true },
  { name: "מלכת הקרח", file: "holiday/snowman-hat.glb", height: 2.6, animated: false }
];

export const ST = [
  [["תרגום מילים", "tr"], ["האזנה ופירוש", "rev"], ["איסוף אותיות", "build"], ["אות חסרה", "let"], ["אתגר הבוס", "boss"]],
  [["תרגום על הסיפון", "tr"], ["האזנה ופירוש", "rev"], ["אות חסרה", "let"], ["איסוף אותיות", "build"], ["אתגר הבוס", "boss"]],
  [["תרגום על הגגות", "tr"], ["האזנה ופירוש", "rev"], ["אות חסרה", "let"], ["איסוף אותיות", "build"], ["אתגר הבוס", "boss"]],
  [["תרגום בחלל", "tr"], ["האזנה ופירוש", "rev"], ["איסוף אותיות", "build"], ["אות חסרה", "let"], ["אתגר הבוס", "boss"]],
  [["תרגום בשלג", "tr"], ["האזנה ופירוש", "rev"], ["אות חסרה", "let"], ["איסוף אותיות", "build"], ["אתגר הבוס", "boss"]]
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
  }
];

export const ACH = [
  { id: "first_run", name: "צעד ראשון", desc: "יצאתם להרפתקה הראשונה!" },
  { id: "stars3", name: "כוכב על", desc: "השגתם שלושה כוכבים בשלב" },
  { id: "boss1", name: "ציידי בוסים", desc: "ניצחתם בוס ראשון" },
  { id: "world1", name: "מלכי הג'ונגל", desc: "סיימתם את אי הג'ונגל" },
  { id: "worlds5", name: "גיבורי המסע", desc: "סיימתם את כל חמשת העולמות" },
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
  "תרגמו על דרך הקרח החלקה. מלכת הקרח מחכה בסוף הדרך!"
];
