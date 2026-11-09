import * as THREE from "../assets/lib/three.module.js";
import { GLTFLoader } from "../assets/lib/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "../assets/lib/jsm/utils/SkeletonUtils.js";
import { WORDS } from "./data.js";
import { KEY, NEED_CLEAN, PTS, HEROES, BOSSES, ST, WORLDS, ACH, INTRO } from "./config.js";
import { buildCourse, pathAt, pathFrame, worldOnPath, makeStoneTexture, makeDirtTexture, makeGrassTexture, makeValleyTexture, makeSmoothTree, makeMountains, makeMist, makeRibbonGeometry, makeSkirtGeometry, populateValley, scatterGroundDetails, plantCourseFlags, updateFlagWave, makeIsraelFlag } from "./worldkit.js";
import { themeOf, THEME_LOOK, THEME_MOUNTAINS, buildThemeCourse, buildThemeAmbience, makeThemeDecor, makeThemedHazard, fxTime } from "./themes.js";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) { return false; }
}
if (!hasWebGL()) {
  location.replace("./index-v1-quiz.html");
  throw new Error("No WebGL");
}

const $ = (id) => document.getElementById(id);
const MP = (p) => "./assets/models/" + p;
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ===== SAVE ===== */
const def = () => ({ prog: {}, hero: 0, coins: 0, stars: 0, notebook: {}, known: {}, best: 0, runs: 0, ach: [], free: false, muted: false, quality: "high" });
let S;
try { S = Object.assign(def(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { S = def(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ===== AUDIO ===== */
let muted = !!S.muted, ac = null;
function tone(f, d = .12, t = "sine", v = .07) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = t; o.frequency.value = f; g.gain.value = v;
    o.connect(g); g.connect(ac.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d); o.stop(ac.currentTime + d);
  } catch (e) {}
}
const sfx = {
  click: () => tone(420, .06, "triangle", .05),
  good: () => { tone(523, .08); setTimeout(() => tone(659, .08), 80); setTimeout(() => tone(784, .16), 160); },
  bad: () => tone(196, .28, "triangle", .06),
  coin: () => { tone(980, .06); setTimeout(() => tone(1320, .08), 60); },
  jump: () => tone(620, .07, "square", .03)
};
function say(w) {
  if (muted || !window.speechSynthesis) return;
  try {
    const u = new SpeechSynthesisUtterance(w);
    u.lang = "en-US"; u.rate = .82;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) {}
}
$("mute").textContent = muted ? "🔇" : "🔊";
$("mute").onclick = () => { muted = !muted; S.muted = muted; save(); $("mute").textContent = muted ? "🔇" : "🔊"; };

/* ===== PROGRESS HELPERS ===== */
const starSum = () => Object.values(S.prog).reduce((a, b) => a + b, 0);
const stDone = (w, t) => !!S.prog[w + "-" + t];
const bossDone = (wid) => !!S.prog[wid + "-4"];
const keysOwned = () => WORLDS.filter((w) => bossDone(w.id)).map((w) => w.id);
const wOpen = (i) => S.free || i === 0 || bossDone(WORLDS[i - 1].id);
const sOpen = (i, t) => wOpen(i) && (S.free || t === 0 || stDone(WORLDS[i].id, t - 1));
const nbs = () => WORDS.map((w) => ({ w, n: S.notebook[w.en] })).filter((x) => x.n);
const learnedCount = () => WORDS.filter((w) => (S.notebook[w.en] && S.notebook[w.en].learned) || S.known[w.en]).length;
const worldsDone = () => WORLDS.filter((w) => [0, 1, 2, 3, 4].every((t) => stDone(w.id, t))).length;
function grantAch(id) { if (!S.ach.includes(id)) { S.ach.push(id); save(); } }

function record(word, ok, hint, wrongHere) {
  S.known = S.known || {};
  if (ok) {
    const clean = !hint && !wrongHere;
    const n = S.notebook[word.en];
    if (n) {
      n.right = (n.right || 0) + 1;
      n.streak = clean ? (n.streak || 0) + 1 : 0;
      if (n.streak >= NEED_CLEAN) n.learned = true;
    }
    S.known[word.en] = n ? !!n.learned : clean;
    if (hint >= 3) {
      const m = S.notebook[word.en] || (S.notebook[word.en] = { wrong: 0, right: 0, streak: 0, learned: false });
      m.learned = false; m.streak = 0; S.known[word.en] = false;
    }
  } else {
    const m = S.notebook[word.en] || (S.notebook[word.en] = { wrong: 0, right: 0, streak: 0, learned: false });
    m.wrong = (m.wrong || 0) + 1; m.streak = 0; m.learned = false; S.known[word.en] = false;
  }
  save();
}

/* ===== UI ===== */
function hideAll() {
  ["s-load", "s-title", "s-help", "s-map", "hud", "modal", "s-nb", "s-jr", "s-end", "dev-panel"].forEach((id) => $(id) && $(id).classList.add("hidden"));
}
function isDev() { return typeof window !== "undefined" && window.MQ_DEV === true; }
function syncDevButton(id) {
  const btn = $("btn-dev");
  if (!btn) return;
  const menu = isDev() && (id === "s-title" || id === "s-map" || id === "s-help" || id === "s-jr" || id === "s-nb");
  btn.classList.toggle("hidden", !menu);
}
function showUI(id) { hideAll(); $(id).classList.remove("hidden"); syncDevButton(id); }
function showModal(html) {
  $("modal-box").innerHTML = html;
  $("modal").classList.remove("hidden");
}
function hideModal() { $("modal").classList.add("hidden"); }

function refreshMapStats() {
  S.stars = starSum();
  $("map-coins").textContent = S.coins;
  $("map-stars").textContent = S.stars;
  const ln = learnedCount();
  $("stat-learned").textContent = ln;
  $("stat-total").textContent = WORDS.length;
  $("stat-practice").textContent = nbs().filter((x) => !x.n.learned).length;
  $("stat-worlds").textContent = worldsDone();
  $("stat-bar").style.width = (ln / WORDS.length * 100).toFixed(1) + "%";
  const mk = $("map-keys");
  if (mk) mk.textContent = keysOwned().length;
}

function renderStages() {
  const i = selectedWorld;
  const w = WORLDS[i];
  $("stage-bar").innerHTML = ST[i].map((t, k) => {
    const op = sOpen(i, k);
    const n = S.prog[w.id + "-" + k] || 0;
    return `<button class="tile" data-st="${k}" ${op ? "" : "disabled"}>
      <small>${k === 4 ? "בוס" : "שלב " + (k + 1)}</small><div>${t[0]}</div>
      <div>${op ? (n ? "⭐".repeat(n) : "▶") : "🔒"}</div>
    </button>`;
  }).join("");
  $("stage-bar").onclick = (e) => {
    const b = e.target.closest("[data-st]");
    if (b && !b.disabled) startLevel(WORLDS[selectedWorld].id, +b.dataset.st);
  };
}

/* ===== THREE CORE ===== */
const canvas = $("c");
function isHigh() { return S.quality !== "low"; }
const renderer = new THREE.WebGLRenderer({ canvas, antialias: isHigh(), powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
function applyQuality() {
  const hi = isHigh();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? 1.5 : 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMappingExposure = hi ? 1.18 : 1.05;
  renderer.shadowMap.enabled = hi;
  const bq = $("btn-quality");
  if (bq) bq.textContent = hi ? "✨ גבוהה" : "💡 חסכונית";
}
applyQuality();
renderer.setClearColor(0x62c8ff);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 520);
const mapScene = new THREE.Scene();
const runScene = new THREE.Scene();
mapScene.fog = new THREE.Fog(0x8ec8ff, 22, 90);
runScene.fog = new THREE.Fog(0x8fd4a2, 16, 68);

function addLights(scene, world) {
  const hemi = new THREE.HemisphereLight(world ? world.hemiSky : 0xc4f0ff, world ? world.hemiGround : 0x3a7a40, 1.28);
  hemi.name = "hemi";
  const dir = new THREE.DirectionalLight(world ? world.sun : 0xfff1c2, 1.48);
  dir.position.set(10, 18, 8);
  dir.castShadow = true;
  dir.shadow.mapSize.set(512, 512);
  dir.shadow.camera.near = 1;
  dir.shadow.camera.far = 60;
  dir.shadow.camera.left = -22;
  dir.shadow.camera.right = 22;
  dir.shadow.camera.top = 22;
  dir.shadow.camera.bottom = -22;
  dir.name = "sun";
  const rim = new THREE.DirectionalLight(0xffe0b8, 1.08);
  rim.position.set(-10, 9, -8);
  rim.name = "rim";
  scene.add(hemi, dir, rim);
  scene.add(dir.target);
  scene.add(rim.target);
  return { hemi, dir, rim };
}
function makeSky() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 18),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  mesh.name = "sky";
  return mesh;
}
function paintSky(mesh, topHex, botHex) {
  if (!mesh || !mesh.material.map) return;
  const c = mesh.material.map.image;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  const top = "#" + topHex.toString(16).padStart(6, "0");
  const bot = "#" + botHex.toString(16).padStart(6, "0");
  const mid = "#" + ((((parseInt(top.slice(1), 16) & 0xfefefe) + (parseInt(bot.slice(1), 16) & 0xfefefe)) >> 1).toString(16).padStart(6, "0"));
  g.addColorStop(0, top);
  g.addColorStop(0.28, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(0.78, bot);
  g.addColorStop(1, bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  mesh.material.map.needsUpdate = true;
}
function addHills(scene, color) {
  const group = new THREE.Group();
  group.name = "hills";
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(7 + (i % 4) * 2.2, 5 + (i % 3) * 2.4, 28),
      new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: false })
    );
    const side = i < 6 ? -1 : 1;
    m.position.set(side * (16 + (i % 6) * 2.4), 1.2, -8 - (i % 6) * 14);
    m.receiveShadow = true;
    group.add(m);
  }
  scene.add(group);
  return group;
}
const mapLights = addLights(mapScene);
const runLights = addLights(runScene, WORLDS[0]);
const playerFill = new THREE.PointLight(0xffe6c4, 2.15, 20, 1.05);
playerFill.name = "playerFill";
runScene.add(playerFill);
const playerKey = new THREE.DirectionalLight(0xfff3e0, 0.98);
playerKey.name = "playerKey";
playerKey.position.set(2, 5, 6);
runScene.add(playerKey);
runScene.add(playerKey.target);
runLights.fill = playerFill;
runLights.key = playerKey;

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applyQuality();
});

/* ===== LOADER ===== */
function normAsset(u) {
  try { u = decodeURI(u); } catch (e) {}
  return String(u || "").replace(/^\.\//, "").split("?")[0].replace(/\\/g, "/");
}
function resolveAsset(url) {
  if (!window.MQ_EMBED || !url) return url;
  const raw = String(url);
  const looksTex = raw.includes("Textures/") || raw.includes("colormap.png");
  if (raw.indexOf("data:") === 0 && !looksTex) return url;
  if (looksTex && loadCtx) {
    const dir = loadCtx.replace(/\/[^/]+$/, "/");
    const tex = normAsset(dir + "Textures/colormap.png");
    if (window.MQ_EMBED[tex]) return window.MQ_EMBED[tex];
  }
  const n = normAsset(raw);
  if (window.MQ_EMBED[n]) return window.MQ_EMBED[n];
  for (const k of Object.keys(window.MQ_EMBED)) {
    if (n.endsWith(k) || k.endsWith(n)) return window.MQ_EMBED[k];
  }
  return url;
}
let loadCtx = "";
const gltfManager = new THREE.LoadingManager();
gltfManager.setURLModifier((url) => resolveAsset(url));
const gltfLoader = new GLTFLoader(gltfManager);
const gltfCache = new Map();
let loadTotal = 1, loadDone = 0;
function setLoad(msg) {
  $("load-msg").textContent = msg || "טוענים…";
  $("loadbar-i").style.width = Math.round((loadDone / loadTotal) * 100) + "%";
}
function loadGLTF(path) {
  if (gltfCache.has(path)) return Promise.resolve(gltfCache.get(path));
  loadCtx = path;
  const url = resolveAsset(path);
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, (g) => { gltfCache.set(path, g); loadDone++; setLoad("טוענים מודלים"); resolve(g); }, undefined, reject);
  });
}
function normalize(model, height, maxWidth) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  let s = height / Math.max(size.y, 0.01);
  if (maxWidth) {
    const xz = Math.max(size.x, size.z);
    s = Math.min(s, maxWidth / Math.max(xz, 0.01));
  }
  model.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(model);
  model.position.y -= box2.min.y;
}
function prepMeshes(root, cast = true) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = true;
      if (o.geometry && o.geometry.computeVertexNormals) o.geometry.computeVertexNormals();
      const mats = [].concat(o.material || []);
      mats.forEach((m) => {
        if (!m) return;
        m.side = THREE.FrontSide;
        m.flatShading = false;
        if (m.normalizeNormalScale) {}
        m.needsUpdate = true;
      });
    }
  });
}
function isHeldWeapon(name) {
  return /knife|dagger|crossbow|throwable|wand|staff|spellbook|sword|axe|shield|1h_|2h_|mug|bow/.test(String(name || "").toLowerCase());
}
function hideHeldWeapons(root) {
  root.traverse((o) => {
    if (isHeldWeapon(o.name)) o.visible = false;
  });
}
function polishActorMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const list = [].concat(o.material || []);
    list.forEach((m) => {
      if (!m || !m.color || m.map) return;
      const n = (m.name || "").toLowerCase();
      if (n.includes("skin")) {
        m.color.setHex(0xf0b48c);
        m.metalness = 0.06;
        m.roughness = 0.58;
      } else if (n === "face") {
        m.color.setHex(0xfff3dc);
        m.metalness = 0.04;
        m.roughness = 0.5;
      } else {
        m.color.r = Math.pow(Math.max(m.color.r, 0), 0.6);
        m.color.g = Math.pow(Math.max(m.color.g, 0), 0.6);
        m.color.b = Math.pow(Math.max(m.color.b, 0), 0.6);
        if (n.includes("gold")) { m.metalness = 0.72; m.roughness = 0.34; }
        else { m.metalness = Math.min(m.metalness ?? 0.4, 0.14); m.roughness = Math.max(m.roughness ?? 0.5, 0.55); }
      }
    });
  });
}
async function createActor(file, height, faceNegZ = true, stripWeapons = false) {
  try {
    const gltf = await loadGLTF(file);
    const model = (gltf.animations && gltf.animations.length) ? SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
    prepMeshes(model);
    polishActorMaterials(model);
    if (stripWeapons) hideHeldWeapons(model);
    normalize(model, height);
    if (faceNegZ) model.rotation.y = Math.PI;
    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of gltf.animations || []) {
      const act = mixer.clipAction(clip);
      actions[clip.name] = act;
      const short = clip.name.split("|").pop().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!actions[short]) actions[short] = act;
    }
    return { model, mixer, actions };
  } catch (e) {
    console.warn("model fail", file, e);
    const model = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffc83d }));
    model.position.y = 0.7;
    return { model, mixer: null, actions: {} };
  }
}
async function createProp(file, height) {
  try {
    const gltf = await loadGLTF(file);
    const model = gltf.scene.clone(true);
    prepMeshes(model, true);
    if (height) normalize(model, height, 2.6);
    const wrap = new THREE.Group();
    wrap.add(model);
    return wrap;
  } catch (e) {
    const wrap = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, height || 1, 0.6), new THREE.MeshStandardMaterial({ color: 0x6aa84f }));
    m.position.y = (height || 1) / 2;
    wrap.add(m);
    return wrap;
  }
}
function resolveClip(actor, name) {
  if (!actor || !actor.actions) return null;
  if (actor.actions[name]) return name;
  const aliases = {
    sprint: ["running_a", "running_b", "run", "running", "walk", "walkcarry"],
    walk: ["walking_a", "walk"],
    idle: ["idle", "unarmed_idle"],
    jump: ["jump_full_short", "jump_start", "jump_full_long", "jump", "pickup"],
    crouch: ["sit_floor_idle", "crouch", "slide", "sitdown", "sit"],
    sit: ["sit_floor_idle", "sitdown", "sit"],
    fall: ["hit_a", "hit_b", "death_a", "recievehit", "receivehit", "defeat", "hit", "fall", "death"],
    "emote-yes": ["cheer", "victory", "emoteyes", "yes"]
  };
  const want = (aliases[name] || [name]).map((x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const a of want) {
    if (actor.actions[a]) return a;
    const k = Object.keys(actor.actions).find((x) => x.toLowerCase().replace(/[^a-z0-9]/g, "") === a);
    if (k) return k;
  }
  return null;
}
function playAnim(actor, name, fade = 0.16, once = false) {
  if (!actor || !actor.actions) return;
  const resolved = resolveClip(actor, name);
  if (!resolved) return;
  if (actor.current === resolved && name !== "jump") return;
  const next = actor.actions[resolved];
  const prev = actor.current && actor.actions[actor.current];
  if (prev && prev !== next) prev.fadeOut(fade);
  next.reset().fadeIn(fade);
  next.timeScale = (name === "sprint" && /walk/i.test(resolved)) ? 1.7 : 1;
  next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
  next.clampWhenFinished = once;
  next.play();
  actor.current = resolved;
}

/* ===== TEXT LABELS ===== */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function makeTextTexture(text, opt = {}) {
  const w = opt.w || 1024, h = opt.h || 384;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = opt.bg || "#ffe34a";
  ctx.fillRect(0, 0, w, h);
  roundRect(ctx, 10, 10, w - 20, h - 20, 44); ctx.fill();
  ctx.strokeStyle = opt.bd || "#140818";
  ctx.lineWidth = 22; ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.direction = /[\u0590-\u05FF]/.test(String(text)) ? "rtl" : "ltr";
  const raw = String(text || "");
  const maxW = w - 80;
  let font = opt.font || 168;
  const min = 28;
  ctx.font = `800 ${font}px Rubik, Fredoka, Arial, sans-serif`;
  while (font > min && ctx.measureText(raw).width + font * 0.16 > maxW) {
    font -= 4;
    ctx.font = `800 ${font}px Rubik, Fredoka, Arial, sans-serif`;
  }
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.min(14, Math.max(6, font * 0.08));
  ctx.strokeStyle = "#fff8dc";
  ctx.strokeText(raw, w / 2, h / 2);
  ctx.fillStyle = opt.fg || "#140818";
  ctx.fillText(raw, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.userData = { font, textW: ctx.measureText(raw).width, canvasW: w, raw };
  return tex;
}
function roundedBoardGeo(w, h, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2 });
}
function makeSign(text, big = true) {
  const g = new THREE.Group();
  const tw = big ? 1024 : 768;
  const th = big ? 360 : 280;
  const tex = makeTextTexture(text, { w: tw, h: th, font: big ? 176 : 140 });
  const span = (typeof laneXs === "function") ? (laneXs()[2] - laneXs()[1]) : 2;
  const W = big ? Math.min(1.86, span * 0.9) : 1.05;
  const H = W * (th / tw);
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.05, H + 0.05, 0.055),
    new THREE.MeshBasicMaterial({ color: 0xffe34a, toneMapped: false })
  );
  const matF = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false });
  const matB = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false });
  const faceF = new THREE.Mesh(new THREE.PlaneGeometry(W, H), matF);
  faceF.position.z = 0.03;
  faceF.renderOrder = 2;
  const faceB = new THREE.Mesh(new THREE.PlaneGeometry(W, H), matB);
  faceB.position.z = -0.03;
  faceB.rotation.y = Math.PI;
  faceB.renderOrder = 2;
  g.add(rim, faceF, faceB);
  g.userData.fit = tex.userData;
  g.userData.signSize = { W, H };
  return g;
}
function makeGoldKey() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.85, roughness: 0.22, emissive: 0xaa7700, emissiveIntensity: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 16), gold);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.58), gold);
  shaft.position.z = -0.4;
  const bit = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.14), gold);
  bit.position.set(0, -0.08, -0.64);
  const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.09), gold);
  bit2.position.set(0, -0.05, -0.5);
  g.add(ring, shaft, bit, bit2);
  return g;
}
function makeLockMesh() {
  const g = new THREE.Group();
  g.name = "lock";
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2438, metalness: 0.55, roughness: 0.35, emissive: 0x16101f, emissiveIntensity: 0.2 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.8, roughness: 0.25, emissive: 0xaa7700, emissiveIntensity: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 0.42), iron);
  body.position.y = 2.85;
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 16), gold);
  shackle.position.y = 3.55;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0x110814 }));
  hole.position.set(0, 2.75, 0.22);
  g.add(body, shackle, hole);
  g.position.set(0, 0.35, 1.85);
  return g;
}

/* ===== MAP / TITLE SCENE ===== */
let titleHeroes = [];
let islands = [];
let selectedWorld = 0;
let mapMixers = [];
const camGoal = new THREE.Vector3(0, 5.2, 12.5);
const lookGoal = new THREE.Vector3(0, 1.15, 0);
let appMode = "load"; // load | title | map | run

function makeIslandMesh(world) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.9, 1.15, 12), new THREE.MeshStandardMaterial({ color: world.ground, roughness: 0.82 }));
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 2.1, 2.5, 12), new THREE.MeshStandardMaterial({ color: 0x6a4322, roughness: 1 }));
  dirt.position.y = -1.7;
  top.receiveShadow = dirt.receiveShadow = true;
  top.castShadow = dirt.castShadow = true;
  g.add(dirt, top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.08, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0.0 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; ring.name = "ring";
  g.add(ring);
  return g;
}

async function buildMap() {
  const ocean = new THREE.Mesh(new THREE.CircleGeometry(80, 40), new THREE.MeshStandardMaterial({ color: 0x1f7caa, roughness: 0.35, metalness: 0.1 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -3.4; ocean.receiveShadow = true;
  mapScene.add(ocean);
  const sky = makeSky();
  paintSky(sky, 0x6ec8ff, 0xd8f3ff);
  mapScene.add(sky);
  for (let ci = 0; ci < 8; ci++) {
    const cl = new THREE.Mesh(
      new THREE.SphereGeometry(1.7 + (ci % 3) * 0.4, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: false })
    );
    cl.scale.y = 0.42;
    cl.position.set(((ci % 4) - 1.5) * 12, 9 + (ci % 3), -6 - ci * 3.5);
    mapScene.add(cl);
  }

  const positions = [
    [0, 0, -2],
    [-12, 0.4, -10],
    [12, 0.3, -10],
    [-8, 0.6, -22],
    [8, 0.5, -22]
  ];
  const showcase = [
    "nature/tree_detailed.glb",
    "pirate/palm-straight.glb",
    "platformer/tree.glb",
    "space/craft_speederA.glb",
    "holiday/tree-snow-a.glb"
  ];
  for (let i = 0; i < 5; i++) {
    const world = WORLDS[i];
    const isle = makeIslandMesh(world);
    isle.position.set(...positions[i]);
    isle.userData.worldIndex = i;
    const prop = await createProp(MP(showcase[i]), i === 3 ? 1.6 : 2.8);
    prop.position.set(0.6, 0.58, -0.4);
    isle.add(prop);
    const extras = world.decor.slice(1, 3);
    for (let e = 0; e < extras.length; e++) {
      const p2 = await createProp(MP(extras[e]), 1.5 + e * 0.35);
      p2.position.set(-1.7 + e * 2.2, 0.58, -1.5 + (e % 2) * 1.1);
      p2.rotation.y = e * 1.1;
      isle.add(p2);
    }
    // stage pins
    for (let k = 0; k < 5; k++) {
      const pin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 6), new THREE.MeshStandardMaterial({ color: k === 4 ? 0xe8553d : 0xffc83d }));
      pin.position.set(-1.6 + k * 0.8, 1.05, 1.5);
      pin.userData.pin = { world: i, stage: k };
      isle.add(pin);
    }
    isle.add(makeLockMesh());
    mapScene.add(isle);
    islands.push(isle);
  }
  refreshLocks();
  // title podium
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 0.45, 16), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.55 }));
  pod.position.set(0, 0.1, 3.2);
  pod.receiveShadow = true;
  mapScene.add(pod);

  for (let i = 0; i < HEROES.length; i++) {
    const actor = await createActor(MP(HEROES[i].file), 1.45, true, true);
    actor.model.position.set((i - 1) * 1.7, 0.32, 3.4);
    mapScene.add(actor.model);
    playAnim(actor, "idle");
    titleHeroes.push(actor);
    if (actor.mixer) mapMixers.push(actor.mixer);
  }
  highlightHero();
}

function highlightHero() {
  titleHeroes.forEach((h, i) => {
    h.model.position.y = 0.32 + (S.hero === i ? 0.12 : 0);
    playAnim(h, S.hero === i ? "idle" : "sit");
  });
}
function highlightIsland() {
  islands.forEach((isle, i) => {
    const ring = isle.getObjectByName("ring");
    if (ring) ring.material.opacity = i === selectedWorld ? 0.95 : 0.0;
  });
  refreshLocks();
}
function refreshLocks() {
  islands.forEach((isle, i) => {
    const lock = isle.getObjectByName("lock");
    if (lock) lock.visible = !wOpen(i);
  });
}
let keyFx = null, unlockFx = null, pendingUnlock = null, trailAcc = 0;
function startKeyReward() {
  if (!player || !runScene) return;
  const key = makeGoldKey();
  key.scale.setScalar(1.8);
  key.position.copy(player.group.position).add(new THREE.Vector3(0, 1.7, -1.1));
  runScene.add(key);
  keyFx = { mesh: key, t: 0, mode: "spin" };
  burst(key.position.clone(), 0xffc83d);
}
function playIslandUnlock(i) {
  if (!islands[i]) return;
  const isle = islands[i];
  selectedWorld = i;
  highlightIsland();
  focusIslandCam(i);
  const lock = isle.getObjectByName("lock");
  if (lock) { lock.visible = true; lock.scale.setScalar(1); lock.rotation.z = 0; }
  const key = makeGoldKey();
  key.scale.setScalar(2.1);
  key.position.set(0, 3.4, 0);
  isle.add(key);
  unlockFx = { isle, lock, key, t: 0 };
}
function updateKeyFx(dt) {
  if (keyFx) {
    keyFx.t += dt;
    keyFx.mesh.rotation.y += dt * 4.2;
    keyFx.mesh.rotation.x = Math.sin(keyFx.t * 3) * 0.25;
    if (keyFx.mode === "spin") {
      keyFx.mesh.position.y += dt * 0.9;
      if (keyFx.t > 0.85) keyFx.mode = "fly";
    } else {
      const target = camera.position.clone().add(new THREE.Vector3(-1.35, 0.9, -1.8));
      keyFx.mesh.position.lerp(target, Math.min(1, dt * 3.2));
      const s = Math.max(0.15, 1.8 - keyFx.t * 0.55);
      keyFx.mesh.scale.setScalar(s);
      if (keyFx.t > 2.3) {
        if (keyFx.mesh.parent) keyFx.mesh.parent.remove(keyFx.mesh);
        keyFx = null;
      }
    }
  }
  if (unlockFx) {
    unlockFx.t += dt;
    unlockFx.key.rotation.y += dt * 5;
    unlockFx.key.position.y = 3.2 + Math.sin(unlockFx.t * 5) * 0.18;
    if (unlockFx.lock && unlockFx.t > 0.45) {
      unlockFx.lock.scale.multiplyScalar(Math.max(0.82, 1 - dt * 2.4));
      unlockFx.lock.rotation.z += dt * 4;
      if (unlockFx.lock.scale.x < 0.1) {
        unlockFx.lock.visible = false;
        unlockFx.lock.scale.setScalar(1);
        unlockFx.lock.rotation.z = 0;
        unlockFx.lock = null;
      }
    }
    if (unlockFx.t > 2.5) {
      unlockFx.isle.remove(unlockFx.key);
      unlockFx = null;
      refreshLocks();
    }
  }
}
function focusTitleCam() {
  camGoal.set(0, 4.6, 11.2);
  lookGoal.set(0, 1.2, 2.6);
}
function focusMapCam() {
  camGoal.set(0, 16, 18);
  lookGoal.set(0, 0, -12);
}
function focusIslandCam(i) {
  const p = islands[i].position;
  camGoal.set(p.x, p.y + 8.5, p.z + 13);
  lookGoal.set(p.x, p.y + 1, p.z);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pick(ev) {
  if (appMode !== "title" && appMode !== "map") return;
  const r = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (appMode === "title") {
    const hits = raycaster.intersectObjects(titleHeroes.map((h) => h.model), true);
    if (hits.length) {
      // find which hero
      let obj = hits[0].object;
      while (obj.parent && !titleHeroes.some((h) => h.model === obj)) obj = obj.parent;
      const idx = titleHeroes.findIndex((h) => h.model === obj);
      if (idx >= 0) { S.hero = idx; save(); highlightHero(); drawHeroBtns(); sfx.click(); }
    }
    return;
  }
  const hits = raycaster.intersectObjects(islands, true);
  if (!hits.length) return;
  let obj = hits[0].object;
  while (obj && obj.userData.worldIndex === undefined && obj.userData.pin === undefined) obj = obj.parent;
  if (obj && obj.userData.pin) {
    const { world, stage } = obj.userData.pin;
    if (sOpen(world, stage)) startLevel(WORLDS[world].id, stage);
    else { selectedWorld = world; highlightIsland(); renderStages(); focusIslandCam(world); }
    return;
  }
  if (obj && obj.userData.worldIndex !== undefined) {
    selectedWorld = obj.userData.worldIndex;
    highlightIsland(); renderStages(); focusIslandCam(selectedWorld); sfx.click();
    if (!wOpen(selectedWorld)) {
      showModal(`<h2>🔒 העולם נעול</h2><p>נצחו את הבוס בעולם הקודם וקבלו מפתח זהב כדי לפתוח את האי הזה.</p><button class="btn" id="mgo">הבנתי</button>`);
      $("mgo").onclick = hideModal;
    }
  }
}
canvas.addEventListener("pointerdown", pick);

/* ===== RUNNER ===== */
const LANE_X = [-2, 0, 2];
const SEG_LEN = 3.6, NSEG = 42;
let player = null;
let bossActor = null;
let run = null; // gameplay state
let paused = true;
let holdCam = false;
let shakeT = 0;
const pathSegs = [];
const decors = [];
const coins = [];
const obstacles = [];
const gates = [];
const letters = [];
const particles = [];
let pathMat = null, stripeMat = null, sideMat = null, stoneMat = null;
let spaceStars = null;
let runSky = null, runHills = null, runSunDisk = null, runMist = null;
let themeAmb = null;

let courseVisual = null;
let skirtMat = null, railMat = null, valleyMat = null;
function buildPath() {
  pathMat = new THREE.MeshStandardMaterial({ map: makeDirtTexture(), color: 0xe8c888, roughness: 0.82, flatShading: false });
  stoneMat = new THREE.MeshStandardMaterial({ map: makeStoneTexture(), color: 0xffffff, roughness: 0.54, metalness: 0.08, flatShading: false });
  stripeMat = new THREE.MeshBasicMaterial({ color: WORLDS[0].pathB });
  sideMat = new THREE.MeshStandardMaterial({ map: makeGrassTexture(8, 36), color: WORLDS[0].ground, roughness: 0.92, flatShading: false });
  skirtMat = new THREE.MeshStandardMaterial({ color: 0x5a5348, roughness: 0.74, metalness: 0.06, flatShading: false, side: THREE.DoubleSide });
  railMat = new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.45, metalness: 0.18, flatShading: false });
  valleyMat = new THREE.MeshStandardMaterial({ map: makeValleyTexture(), color: 0xe6d7b4, roughness: 0.94, metalness: 0, emissive: 0x6a5a3c, emissiveIntensity: 0.24, flatShading: false });
  for (let i = 0; i < 56; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffc83d }));
    m.visible = false;
    runScene.add(m);
    particles.push({ mesh: m, v: new THREE.Vector3(), life: 0, kind: "burst" });
  }
}

function applyWorldTheme(world) {
  runScene.background = new THREE.Color(world.sky);
  runScene.fog.color.setHex(world.fog);
  renderer.setClearColor(world.sky);
  pathMat.color.setHex(world.pathA);
  stripeMat.color.setHex(world.pathB);
  sideMat.color.setHex(world.ground);
  runLights.hemi.color.setHex(world.hemiSky);
  runLights.hemi.groundColor.setHex(world.hemiGround);
  runLights.dir.color.setHex(world.sun);
  if (spaceStars) spaceStars.visible = false; // v7: space uses the themed star sky instead
  if (runSky) paintSky(runSky, world.sky, world.fog);
  if (runSky) runSky.visible = themeOf(world.id) !== "space";
  if (runSunDisk) runSunDisk.visible = THEME_LOOK[themeOf(world.id)] ? !!THEME_LOOK[themeOf(world.id)].showSun : true;
  if (run && run.layout) applyStageLook(world);
}
function applyStageLook(world) {
  const L = run && run.layout;
  if (!L) return;
  const look = THEME_LOOK[themeOf(world.id)];
  if (look) {
    renderer.toneMappingExposure = isHigh() ? look.exp : Math.min(look.exp, 1.05);
    runLights.hemi.intensity = look.hemi;
    runLights.hemi.color.setHex(look.hemiSky);
    runLights.hemi.groundColor.setHex(look.hemiGround);
    runLights.dir.intensity = look.dir;
    runLights.dir.color.setHex(look.sun);
    runScene.fog.color.setHex(look.fog);
    runScene.fog.near = look.fogNear;
    runScene.fog.far = look.fogFar;
    runScene.background = new THREE.Color(look.clear);
    renderer.setClearColor(look.clear);
    if (runSky) {
      runSky.visible = themeOf(world.id) !== "space";
      paintSky(runSky, look.skyTop, look.skyBot);
    }
    if (runSunDisk) {
      runSunDisk.visible = !!look.showSun;
      if (look.sunDisk) runSunDisk.material.color.setHex(look.sunDisk);
    }
    layoutPathFromCourse();
    return;
  }
  if (runSky) runSky.visible = true;
  if (runSunDisk) runSunDisk.visible = true;
  const tod = {
    morning: { exp: 1.22, hemi: 0.95, dir: 1.15, fogNear: 22, fogFar: 260 },
    noon: { exp: 1.18, hemi: 0.88, dir: 1.35, fogNear: 20, fogFar: 250 },
    sunset: { exp: 1.16, hemi: 0.86, dir: 1.25, fogNear: 18, fogFar: 290 },
    dusk: { exp: 0.98, hemi: 0.62, dir: 0.85, fogNear: 16, fogFar: 230 },
    storm: { exp: 0.9, hemi: 0.55, dir: 0.75, fogNear: 14, fogFar: 200 }
  }[L.tod] || { exp: 1.15, hemi: 0.85, dir: 1.2, fogNear: 14, fogFar: 56 };
  renderer.toneMappingExposure = isHigh() ? tod.exp : Math.min(tod.exp, 1.05);
  runLights.hemi.intensity = tod.hemi;
  runLights.dir.intensity = tod.dir;
  runScene.fog.near = tod.fogNear;
  runScene.fog.far = tod.fogFar;
  if (L.tod === "sunset") {
    runLights.dir.color.setHex(0xff9a5c);
    runLights.hemi.color.setHex(0xffc9a0);
    runLights.hemi.groundColor.setHex(0x6a3a28);
    runScene.fog.color.setHex(0xe8b888);
    renderer.setClearColor(0xff8a54);
    if (runSky) paintSky(runSky, 0xff7a3a, 0xffd2a0);
    if (runSunDisk) runSunDisk.material.color.setHex(0xff8a4a);
  } else if (L.tod === "dusk" || L.tod === "storm") {
    runLights.dir.color.setHex(0x9bb6ff);
    runLights.hemi.color.setHex(0x6a88c8);
    runScene.fog.color.setHex(world.id === 4 ? world.fog : 0x3a3a6a);
    if (runSunDisk) runSunDisk.material.color.setHex(0xc8d6ff);
  } else if (runSunDisk) runSunDisk.material.color.setHex(0xfff2b0);
  layoutPathFromCourse();
}

function makeStars() {
  const geo = new THREE.BufferGeometry();
  const n = 400;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 80;
    arr[i * 3 + 1] = Math.random() * 40 + 4;
    arr[i * 3 + 2] = -Math.random() * 90;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  spaceStars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
  spaceStars.visible = false;
  runScene.add(spaceStars);
}

function ensureRunAmbience() {
  if (!runSky) {
    runSky = makeSky();
    runScene.add(runSky);
    paintSky(runSky, WORLDS[0].sky, WORLDS[0].fog);
  }
  if (!runHills) runHills = makeMountains(WORLDS[0].ground);
  runScene.add(runHills);
  if (!runSunDisk) {
    runSunDisk = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false, depthWrite: false })
    );
    runSunDisk.position.set(18, 26, -22);
    runScene.add(runSunDisk);
  }
}

const CONFETTI = [0xffc83d, 0xff5b8a, 0x4ecdc4, 0x7cff6b, 0xfff1a8, 0x6a8cff, 0xffffff];
function burst(pos, color) {
  let used = 0;
  for (const p of particles) {
    if (p.life > 0) continue;
    p.life = 1.15;
    p.kind = "burst";
    p.mesh.visible = true;
    p.mesh.material.color.setHex(color || CONFETTI[used % CONFETTI.length]);
    p.mesh.position.copy(pos);
    p.v.set((Math.random() - 0.5) * 10, Math.random() * 10 + 3, (Math.random() - 0.5) * 10);
    p.mesh.scale.setScalar(0.65 + Math.random() * 0.7);
    if (++used >= 22) break;
  }
}
function emitTrail(dt) {
  trailAcc += dt;
  if (trailAcc < 0.07) return;
  trailAcc = 0;
  if (!player) return;
  for (const p of particles) {
    if (p.life > 0) continue;
    p.life = 0.5;
    p.kind = "trail";
    p.mesh.visible = true;
    p.mesh.material.color.setHex(Math.random() > 0.5 ? 0xfff2a0 : 0xffc83d);
    p.mesh.position.copy(player.group.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.35 + Math.random() * 0.45, 0.4));
    p.v.set((Math.random() - 0.5) * 0.5, 0.7, 1.4);
    p.mesh.scale.setScalar(0.45);
    break;
  }
}
function updateParticles(dt) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.life -= dt * (p.kind === "trail" ? 2.4 : 1.45);
    if (p.kind !== "trail") p.v.y -= 12 * dt;
    p.mesh.position.addScaledVector(p.v, dt);
    p.mesh.visible = p.life > 0;
    if (p.life <= 0) p.mesh.scale.setScalar(1);
  }
}

function recycleZ(obj, far = 16) {
  if (obj.position.z > player.z + far) obj.position.z -= NSEG * SEG_LEN;
}

function layoutPath() { layoutPathFromCourse(); }
function disposeCourseVisual() {
  if (!courseVisual) return;
  runScene.remove(courseVisual);
  courseVisual.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  courseVisual = null;
}
function rebuildCourseRibbon() {
  if (!run || !run.course) return;
  disposeCourseVisual();
  const course = run.course;
  const narrow = !!(run.layout && run.layout.narrow);
  const th = themeOf(run.world);
  if (th !== "jungle") {
    const tg = buildThemeCourse(th, course, { narrow, high: isHigh() });
    tg.add(plantCourseFlags(course, isHigh()));
    courseVisual = tg;
    runScene.add(tg);
    if (tg.userData.ships && tg.userData.ships.length) spawnShips(tg);
    return;
  }
  const pathW = narrow ? 5.5 : 7.3;
  const group = new THREE.Group();
  group.name = "courseVisual";
  const dirt = new THREE.Mesh(makeRibbonGeometry(course, { width: pathW, yLift: 0.03, pred: (s) => s.kind !== "causeway", vScale: 0.1 }), pathMat);
  dirt.receiveShadow = true;
  dirt.name = "ribbonDirt";
  const grass = new THREE.Mesh(makeRibbonGeometry(course, { width: 14, yLift: -0.05, pred: (s) => s.kind !== "causeway" && s.kind !== "turn", vScale: 0.07 }), sideMat);
  grass.receiveShadow = true;
  grass.name = "ribbonGrass";
  const turnGrass = new THREE.Mesh(makeRibbonGeometry(course, { width: 8.6, yLift: -0.05, pred: (s) => s.kind === "turn", vScale: 0.07 }), sideMat);
  turnGrass.receiveShadow = true;
  const stone = new THREE.Mesh(makeRibbonGeometry(course, { width: 6.8, yLift: 0.05, pred: (s) => s.kind === "causeway", vScale: 0.4, uRepeat: 3 }), stoneMat);
  stone.receiveShadow = true;
  stone.name = "ribbonStone";
  const skirt = new THREE.Mesh(makeSkirtGeometry(course, { width: 6.8, depth: 4.4, pred: (s) => s.kind === "causeway" }), skirtMat);
  skirt.name = "ribbonSkirt";
  const valley = new THREE.Mesh(makeRibbonGeometry(course, { width: 92, yLift: -6.4, pred: (s) => s.kind === "causeway", vScale: 0.04 }), valleyMat);
  valley.receiveShadow = true;
  valley.name = "ribbonValley";
  const railL = new THREE.Mesh(makeRibbonGeometry(course, { width: 0.16, yLift: 0.56, xOffset: -3.32, pred: (s) => s.kind === "causeway" }), railMat);
  const railR = new THREE.Mesh(makeRibbonGeometry(course, { width: 0.16, yLift: 0.56, xOffset: 3.32, pred: (s) => s.kind === "causeway" }), railMat);
  railL.castShadow = railR.castShadow = true;
  const stripeL = new THREE.Mesh(makeRibbonGeometry(course, { width: 0.1, yLift: 0.058, xOffset: -1.05, pred: (s) => s.kind !== "causeway" }), stripeMat);
  const stripeR = new THREE.Mesh(makeRibbonGeometry(course, { width: 0.1, yLift: 0.058, xOffset: 1.05, pred: (s) => s.kind !== "causeway" }), stripeMat);
  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.95, 6);
  for (let i = 0; i < course.samples.length; i += 2) {
    const s = course.samples[i];
    if (s.kind !== "causeway") continue;
    const rx = Math.cos(s.heading), rz = Math.sin(s.heading);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, railMat);
      post.position.set(s.x + side * rx * 3.32, s.y + 0.52, s.z + side * rz * 3.32);
      post.castShadow = true;
      group.add(post);
    }
  }
  const follow = new THREE.Mesh(
    new THREE.CircleGeometry(220, 64),
    new THREE.MeshStandardMaterial({ map: makeGrassTexture(30, 30), color: sideMat.color, roughness: 0.94, flatShading: false })
  );
  follow.rotation.x = -Math.PI / 2;
  follow.position.y = -0.32;
  follow.name = "followGround";
  follow.receiveShadow = true;
  const haze = new THREE.Mesh(
    makeRibbonGeometry(course, { width: 58, yLift: -3.15, pred: (s) => s.kind === "causeway", vScale: 0.05 }),
    new THREE.MeshBasicMaterial({ color: 0xffe6c2, transparent: true, opacity: 0.32, depthWrite: false, fog: true, side: THREE.DoubleSide })
  );
  haze.name = "valleyHaze";
  const theme = ["jungle", "pirate", "magic", "space", "ice"][(run.world || 1) - 1] || "jungle";
  const valleyBits = populateValley(course, theme, isHigh());
  const scatter = scatterGroundDetails(course, theme, isHigh());
  const flags = plantCourseFlags(course, isHigh());
  group.add(follow, scatter, grass, turnGrass, dirt, stripeL, stripeR, valley, valleyBits, haze, skirt, stone, railL, railR, flags);
  courseVisual = group;
  runScene.add(courseVisual);
}
async function spawnShips(tg) {
  const bobbing = [];
  for (const sp of tg.userData.ships) {
    const ship = await createProp(MP("pirate/ship-pirate-small.glb"), 2.6);
    if (courseVisual !== tg) return;
    ship.scale.setScalar(4.2);
    ship.position.set(sp.x, sp.y - 0.2, sp.z);
    ship.rotation.y = -sp.heading + Math.PI;
    ship.userData.baseY = ship.position.y;
    ship.userData.ph = Math.random() * 6;
    tg.add(ship);
    bobbing.push(ship);
  }
  const prev = tg.userData.update;
  tg.userData.update = (dt, t, ctx) => {
    if (prev) prev(dt, t, ctx);
    bobbing.forEach((s) => {
      s.position.y = s.userData.baseY + Math.sin(t * 0.9 + s.userData.ph) * 0.25;
      s.rotation.z = Math.sin(t * 0.7 + s.userData.ph) * 0.04;
    });
  };
}
function layoutPathFromCourse() {
  if (!run || !run.course || !player) return;
  if (!courseVisual) rebuildCourseRibbon();
}
function trackHalfWidth() {
  const narrow = !!(run && run.layout && run.layout.narrow);
  return (narrow ? 5.5 : 7.3) * 0.5;
}
function laneLateral(lane) {
  if (lane === 0 || lane === 1 || lane === 2) return laneXs()[lane];
  if (typeof lane === "number" && Number.isFinite(lane)) return lane;
  return 0;
}
function trackFrameAt(s) {
  return pathFrame(run.course, s);
}
function trackPoint(s, lateral, yOff = 0) {
  const f = trackFrameAt(s);
  return f.pos.clone().addScaledVector(f.right, lateral).addScaledVector(f.up, yOff);
}
function trackLateralOf(pos, s) {
  const f = trackFrameAt(s);
  return new THREE.Vector3().subVectors(pos, f.pos).dot(f.right);
}
function playerLaneNow() {
  if (!player) return 1;
  const lat = player.laneShift != null ? player.laneShift : laneLateral(player.lane);
  const xs = laneXs();
  let best = player.lane || 0, bestD = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(lat - xs[i]);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
function placeOnCourse(obj, s, lane, upright) {
  const off = laneLateral(lane);
  if (!run || !run.course) {
    obj.position.set(off, 0, -s);
    return;
  }
  const f = trackFrameAt(s);
  obj.position.copy(f.pos).addScaledVector(f.right, off);
  obj.rotation.order = "YXZ";
  obj.rotation.y = upright ? -f.heading : f.heading;
  obj.rotation.x = upright ? 0 : (f.pitch || 0);
  obj.rotation.z = 0;
  obj.userData.pathS = s;
}
function syncPlayerPose() {
  if (!player || !run || !run.course) return;
  const f = pathFrame(run.course, player.s);
  const x = player.laneShift != null ? player.laneShift : laneXs()[player.lane];
  player.group.position.copy(f.pos).addScaledVector(f.right, x).addScaledVector(f.up, player.y || 0);
  player.group.rotation.order = "YXZ";
  player.group.rotation.y = -f.heading;
  player.group.rotation.x = (f.pitch || 0) * 0.45;
  player.z = -player.s;
}

async function ensureWorldAssets(world) {
  const files = [...world.decor, ...world.obstacle, ...world.extra, "platformer/coin-gold.glb", BOSSES[world.id - 1].file];
  for (const f of files) {
    try { await loadGLTF(MP(f)); } catch (e) { console.warn(e); }
  }
}

function placeDecor(d) {
  if (!run || !run.course || d.userData.pathS == null) return;
  const df = pathFrame(run.course, d.userData.pathS);
  const side = d.userData.side || 1;
  const spec = d.userData.spec;
  d.position.copy(df.pos).addScaledVector(df.right, side * (d.userData.sideOff || 6));
  if (spec) {
    if (spec.align) d.rotation.y = -df.heading + (spec.outward ? side * Math.PI / 2 : 0);
    if (spec.float) d.position.y += spec.float + Math.sin(performance.now() * 0.0012 + d.userData.pathS) * 0.25;
    if (spec.spin) { d.rotation.x += 0.004; d.rotation.y += 0.006; }
    d.visible = !(spec.align && df.kind === "turn");
  } else {
    d.visible = df.kind !== "causeway";
  }
}
async function spawnDecor(world) {
  decors.forEach((d) => runScene.remove(d));
  decors.length = 0;
  const theme = themeOf(world.id);
  const n = isHigh() ? 26 : 16;
  for (let i = 0; i < n; i++) {
    const spec = theme === "jungle" ? null : makeThemeDecor(theme, i, isHigh());
    let m;
    if (spec) m = spec.obj || await createProp(MP(spec.glb), spec.height);
    else m = makeSmoothTree(theme);
    if (spec && spec.glb && theme === "space") {
      m.traverse((o) => {
        if (!o.isMesh || !o.material || !o.material.color) return;
        const nrm = o.geometry && o.geometry.attributes.normal;
        if (nrm) {
          const a = nrm.array;
          for (let k = 0; k + 2 < a.length; k += 3) {
            const x = a[k], y = a[k + 1], z = a[k + 2];
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || x * x + y * y + z * z < 1e-8) {
              a[k] = 0; a[k + 1] = 1; a[k + 2] = 0;
            }
          }
          nrm.needsUpdate = true;
        }
        o.material = o.material.clone();
        o.material.metalness = Math.min(o.material.metalness || 0, 0.25);
        o.material.roughness = Math.max(o.material.roughness || 0, 0.45);
        o.material.emissive = o.material.color.clone().multiplyScalar(0.6);
        o.material.emissiveIntensity = 1;
      });
    }
    m.userData.pathS = 6 + i * 10;
    m.userData.side = i % 2 === 0 ? -1 : 1;
    m.userData.sideOff = spec ? spec.sideOff : 6.9 + (i % 5) * 0.4;
    m.userData.spec = spec;
    if (!spec || !spec.align) m.rotation.y = (i % 5) * 0.4 + (run && run.course ? pathFrame(run.course, m.userData.pathS).heading : 0);
    placeDecor(m);
    runScene.add(m);
    decors.push(m);
  }
}

function buildGate(options) {
  const g = new THREE.Group();
  const halfW = trackHalfWidth();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe0b15a, roughness: 0.42, metalness: 0.12, emissive: 0xc48a28, emissiveIntensity: 0.18 });
  [-halfW, halfW].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 4.4, 10), mat);
    post.position.set(x, 2.2, 0);
    post.name = "gatePost";
    post.userData.side = x < 0 ? -1 : 1;
    post.castShadow = true;
    g.add(post);
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, halfW * 2, 10), mat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, 4.35, 0); beam.castShadow = true; g.add(beam);
  const xs = laneXs();
  options.forEach((opt, i) => {
    const sign = makeSign(opt, true);
    sign.position.set(xs[i], 2.32, 0.2);
    sign.name = "laneSign";
    sign.userData.lane = i;
    g.add(sign);
  });
  if (!run || run.i % 2 === 0) {
    const hi = typeof isHigh === "function" ? isHigh() : true;
    [-1, 1].forEach((side) => {
      const fl = makeIsraelFlag({ size: 0.48, poleHeight: 0.92, high: hi });
      fl.position.set(side * halfW, 4.42, 0);
      fl.name = "gateFlag";
      if (side < 0) fl.scale.x = -1;
      g.add(fl);
    });
  }
  return g;
}

function clearDyn() {
  [...gates, ...coins, ...obstacles, ...letters].forEach((o) => {
    if (o.mesh) runScene.remove(o.mesh);
    if (o.group) runScene.remove(o.group);
  });
  gates.length = coins.length = obstacles.length = letters.length = 0;
}

function runnerModeOf(mode) {
  if (mode === "match") return "tr";
  if (mode === "memory" || mode === "pic") return "rev";
  return mode;
}
function laneXs() {
  const span = (run && run.layout && run.layout.narrow) ? 1.7 : 2;
  return [-span, 0, span];
}
function pathBend(z) {
  if (run && run.course) return pathAt(run.course, Math.max(0, -z)).x;
  if (!run || !run.layout || !run.layout.curve) return 0;
  return Math.sin(z * 0.085) * run.layout.curve;
}
function laneWorldX(lane, z) {
  if (run && run.course) return worldOnPath(run.course, Math.max(0, -z), laneXs()[lane]).x;
  return laneXs()[lane] + pathBend(z);
}
function stageProfile(st, boss, wid) {
  const i = boss ? 4 : st;
  const table = [
    { speed: 7.5, curve: 1.15, hillAmp: 5.8, turnDir: -1, bridge: 0, narrow: 0, tod: "sunset", density: 0.32, types: ["wall", "low"] },
    { speed: 8.0, curve: 1.35, hillAmp: 6.0, turnDir: 1, bridge: 0, narrow: 0, tod: "sunset", density: 0.52, types: ["wall", "hole", "low"] },
    { speed: 8.35, curve: 1.2, hillAmp: 5.4, turnDir: -1, bridge: 1, narrow: 0, tod: "sunset", density: 0.68, types: ["wall", "hole", "beam", "low"] },
    { speed: 8.7, curve: 1.4, hillAmp: 6.2, turnDir: 1, bridge: 0, narrow: 1, tod: "dusk", density: 0.82, types: ["wall", "hole", "beam", "roll"] },
    { speed: 8.15, curve: 1.05, hillAmp: 5.5, turnDir: -1, bridge: 0, narrow: 0, tod: "storm", density: 0.62, types: ["wall", "hole", "beam", "roll"] }
  ];
  const L = Object.assign({}, table[Math.max(0, Math.min(4, i))]);
  L.causeway = wid === 1;
  if (wid === 1) L.tod = "sunset";
  else L.tod = themeOf(wid);
  return L;
}

function pickWords(wid, st, lost, n = 8) {
  if (lost) {
    const hard = shuffle(nbs().filter((x) => !x.n.learned).map((x) => x.w));
    return hard.slice(0, Math.min(10, Math.max(hard.length, 0)));
  }
  const arr = WORDS.filter((w) => w.w === wid);
  const start = (st * 8) % arr.length;
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[(start + i) % arr.length]);
  return shuffle(out);
}
function distractors(word, field, k) {
  const same = shuffle(WORDS.filter((x) => x.en !== word.en && x.w === word.w));
  const others = shuffle(WORDS.filter((x) => x.en !== word.en && x.w !== word.w));
  return same.concat(others).slice(0, k).map((x) => x[field]);
}
function spellable(list) {
  return list.filter((w) => /^[A-Za-z]+$/.test(w.en) && w.en.length >= 3 && w.en.length <= 10);
}

function popEl(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}
function flashHearts() {
  popEl("hud-hearts");
}
function setLaneOpts(opts) {
  const row = $("lane-opts");
  if (!row) return;
  if (!opts || !opts.length) { row.classList.add("hidden"); return; }
  row.classList.remove("hidden");
  opts.forEach((o, i) => {
    const el = $("lane-opt-" + i);
    if (!el) return;
    el.textContent = o;
    const n = String(o).length;
    el.style.fontSize = n >= 12 ? "18px" : n >= 10 ? "22px" : n >= 8 ? "26px" : n >= 6 ? "30px" : "";
  });
}
function setPrompt(sub, q, emoji) {
  $("prompt-sub").textContent = sub || "";
  const deco = emoji ? `<span class="deco-emoji">${emoji}</span>` : "";
  $("prompt-q").innerHTML = q ? `${deco}${q}` : "";
  $("prompt-emoji").textContent = "";
  popEl("prompt");
}
function updateHud() {
  if (!run) return;
  $("hud-hearts").textContent = "❤️".repeat(run.hearts) + "🖤".repeat(Math.max(0, 3 - run.hearts));
  $("hud-score").textContent = "⭐ " + run.score;
  $("hud-combo").textContent = "🔥 " + run.combo;
  $("hud-coins").textContent = "🪙 " + S.coins;
  if (run.boss) $("hud-prog").textContent = BOSSES[run.world - 1].name + " " + "❤️".repeat(run.bossHP) + "🖤".repeat(Math.max(0, run.bossMax - run.bossHP));
  else $("hud-prog").textContent = `${Math.min(run.i + 1, run.queue.length)}/${run.queue.length}`;
}

function clearLetters() {
  letters.forEach((L) => { if (L.mesh && L.mesh.parent) runScene.remove(L.mesh); });
  letters.length = 0;
}
function setupQuestion() {
  if (!run || run.i >= run.queue.length) return;
  clearLetters();
  const w = run.queue[run.i];
  run.cur = w; run.hint = 0; run.wrongHere = false;
  let mode = run.qmode;
  if (run.boss) {
    mode = ["tr", "rev", "let", "build"][run.i % 4];
  }
  run.activeMode = mode;
  if (mode === "build") {
    setLaneOpts(null);
    setPrompt("אספו את האותיות לפי הסדר", w.he, w.pic);
    spawnLetterWord(w);
    return;
  }
  let opts, ans, sub, q, emoji = "";
  if (mode === "let") {
    const E = w.en.toUpperCase();
    const k = E.length <= 3 ? 1 : 1 + Math.floor(Math.random() * (E.length - 2));
    const c = E[k];
    const lettersSet = new Set([c]);
    while (lettersSet.size < 3) lettersSet.add(String.fromCharCode(65 + Math.floor(Math.random() * 26)));
    opts = shuffle([...lettersSet]);
    ans = opts.indexOf(c);
    sub = "איזו אות חסרה?";
    q = `<span class="en">${esc(E.slice(0, k))}_${esc(E.slice(k + 1))}</span>`;
    emoji = w.pic;
  } else if (mode === "rev") {
    opts = shuffle([w.he, ...distractors(w, "he", 2)]);
    ans = opts.indexOf(w.he);
    sub = "הקשיבו למילה באנגלית — רצו אל הפירוש בעברית";
    q = `<span class="en">${esc(w.en)}</span>`;
    say(w.en);
  } else {
    opts = shuffle([w.en, ...distractors(w, "en", 2)]);
    ans = opts.indexOf(w.en);
    sub = "איך אומרים באנגלית? רצו אל השער";
    q = esc(w.he);
  }
  run.opts = opts; run.ans = ans;
  setLaneOpts(opts);
  setPrompt(sub, q, emoji);
  const s = player.s + (gates.length ? 20 : 12);
  const group = buildGate(opts);
  placeOnCourse(group, s, null, true);
  runScene.add(group);
  gates.push({ group, s, z: -s, ans, word: w, resolved: false });
}

function spawnLetterWord(w) {
  const E = w.en.toUpperCase().replace(/[^A-Z]/g, "");
  run.spell = { rest: E, idx: 0 };
  const s0 = player.s + 12;
  E.split("").forEach((ch, idx) => {
    const correctLane = Math.floor(Math.random() * 3);
    const s = s0 + idx * 8;
    for (let lane = 0; lane < 3; lane++) {
      let glyph = ch;
      if (lane !== correctLane) {
        do { glyph = String.fromCharCode(65 + Math.floor(Math.random() * 26)); } while (glyph === ch);
      }
      const sign = makeSign(glyph, false);
      sign.scale.setScalar(1.15);
      placeOnCourse(sign, s, lane);
      sign.position.y += 1.25 + Math.sin(idx) * 0.08;
      runScene.add(sign);
      letters.push({ mesh: sign, lane, ch: glyph, need: ch, index: idx, taken: false, s });
    }
  });
}

function spawnCoinRow(s) {
  const lane = Math.floor(Math.random() * 3);
  const mesh = run.coinProto ? run.coinProto.clone(true) : new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xffd24a, metalness: 0.6, roughness: 0.3 }));
  placeOnCourse(mesh, s, lane);
  mesh.position.y += 0.7;
  mesh.rotation.x = Math.PI / 2;
  runScene.add(mesh);
  coins.push({ mesh, taken: false, s, lane });
}
function cautionTex() {
  if (cautionTex._t) return cautionTex._t;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1a1208"; ctx.fillRect(0, 0, 256, 64);
  for (let i = -1; i < 12; i++) {
    ctx.fillStyle = i % 2 ? "#ffd000" : "#1a1208";
    ctx.beginPath();
    ctx.moveTo(i * 28, 0); ctx.lineTo(i * 28 + 22, 0);
    ctx.lineTo(i * 28 + 6, 64); ctx.lineTo(i * 28 - 16, 64);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cautionTex._t = t;
  return t;
}
function hazardMark(kind) {
  const th = run ? themeOf(run.world) : "jungle";
  if (th !== "jungle") return makeThemedHazard(th, kind, cautionTex());
  const g = new THREE.Group();
  if (kind === "hole") {
    const pit = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 2.3), new THREE.MeshStandardMaterial({ color: 0x0a0610, roughness: 1, emissive: 0x220814, emissiveIntensity: 0.28 }));
    pit.position.y = -0.08;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 2.45), new THREE.MeshBasicMaterial({ map: cautionTex() }));
    rim.position.y = 0.04;
    g.add(pit, rim);
  } else if (kind === "wall") {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.38), new THREE.MeshStandardMaterial({ color: 0xc4482a, roughness: 0.48, metalness: 0.14, emissive: 0x4a1208, emissiveIntensity: 0.18 }));
    wall.position.y = 0.78; wall.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.28), new THREE.MeshBasicMaterial({ map: cautionTex() }));
    stripe.position.set(0, 1.28, 0.21);
    g.add(wall, stripe);
  } else if (kind === "beam") {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.72, 10), new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.32, emissive: 0xffaa00, emissiveIntensity: 0.4 }));
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 1.18; beam.castShadow = true;
    [-0.78, 0.78].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.22, 8), new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.6 }));
      post.position.set(x, 0.61, 0);
      g.add(post);
    });
    g.add(beam);
  } else {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.55, 12), new THREE.MeshStandardMaterial({ color: 0x8b4a1e, roughness: 0.68 }));
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.44; log.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.18, 12), new THREE.MeshBasicMaterial({ color: 0xffd000 }));
    stripe.rotation.z = Math.PI / 2; stripe.position.y = 0.44;
    g.add(log, stripe);
  }
  return g;
}
function hitObstacle(o) {
  if (o.hit) return;
  o.hit = true;
  if (o.mesh && o.mesh.parent) runScene.remove(o.mesh);
  if (!run || run.iFrames > 0) return;
  run.stumbleT = 0.55;
  run.iFrames = 1.15;
  shakeT = 0.22;
  sfx.bad();
  playAnim(player, "fall", 0.08, true);
  run.hearts--;
  run.wrong++;
  run.combo = 0;
  flashHearts();
  updateHud();
  if (run.hearts <= 0) finishLevel(false);
}
function spawnObstacle(s) {
  const L = (run && run.layout) || stageProfile(run ? run.st : 0, run && run.boss, run && run.world);
  if (Math.random() > L.density) return;
  const type = L.types[Math.floor(Math.random() * L.types.length)];
  const blocked = type === "beam" ? [0, 1, 2] : shuffle([0, 1, 2]).slice(0, (Math.random() < 0.28 && L.density > 0.5) ? 2 : 1);
  blocked.forEach((lane) => {
    let mesh;
    if (type === "low") {
      const world = WORLDS[run.world - 1];
      const file = world.obstacle[Math.floor(Math.random() * world.obstacle.length)];
      const proto = run.obsProtos && run.obsProtos[file];
      mesh = proto ? proto.clone(true) : hazardMark("wall");
    } else mesh = hazardMark(type);
    placeOnCourse(mesh, s, lane);
    runScene.add(mesh);
    obstacles.push({ mesh, lane, type, hit: false, spin: type === "roll" ? 4 : 0, s });
  });
}

function nextAfterResolve() {
  run.i++;
  if (run.boss && run.bossHP <= 0) return finishLevel(true);
  if (run.i >= run.queue.length) {
    if (run.boss && run.bossHP > 0) {
      run.queue = run.queue.concat(shuffle(run.queue.slice(0, 6)));
      setupQuestion(); updateHud(); return;
    }
    return finishLevel(true);
  }
  setupQuestion(); updateHud();
}

function onCorrect() {
  const w = run.cur;
  const p = PTS[Math.min(run.hint, 3)] * (run.wrongHere ? 0.5 : 1) | 0;
  run.score += p; run.combo++;
  const c = Math.max(1, Math.round(p / 20) + Math.min(3, run.combo >> 1));
  S.coins += c; run.coins += c;
  if (!run.hint && !run.wrongHere) run.firstTry++;
  if (run.boss) run.bossHP = Math.max(0, run.bossHP - 1);
  record(w, true, run.hint, run.wrongHere);
  sfx.good();
  const bp = player.group.position.clone().add(new THREE.Vector3(0, 1.35, -1));
  burst(bp);
  burst(bp.clone().add(new THREE.Vector3(0.4, 0.3, 0)));
  popEl("prompt");
  popEl("hud-combo");
  say(w.en);
  nextAfterResolve();
}
function onWrong() {
  const w = run.cur;
  run.wrong++; run.wrongHere = true; run.combo = 0; run.hearts = Math.max(0, run.hearts - 1);
  record(w, false, run.hint, true);
  sfx.bad(); shakeT = 0.28;
  playAnim(player, "fall", 0.08, true);
  run.stumbleT = 0.7;
  setPrompt("כמעט! התשובה היא", `<span class="en">${esc(w.en)}</span> — ${esc(w.he)}`, w.pic);
  say(w.en);
  updateHud();
  if (run.hearts <= 0) return finishLevel(false);
  // requeue word and continue shortly
  run.queue.splice(Math.min(run.i + 3, run.queue.length), 0, w);
  setTimeout(() => { if (run && !paused) { run.i++; setupQuestion(); updateHud(); } }, 900);
}

function resolveGate(g) {
  if (g.resolved) return;
  g.resolved = true;
  if (playerLaneNow() === g.ans) onCorrect();
  else onWrong();
}

function showEndScreen(ok, st, title, nx) {
  showUI("s-end");
  $("s-end").innerHTML = `<div class="glass pop" style="padding:22px;max-width:640px">
    <h2>${title}</h2>
    <div style="font-size:48px">${"⭐".repeat(st)}${"☆".repeat(3 - st)}</div>
    <p>ניקוד: <b>${run.score}</b> · 🪙 +${run.coins} · נכון בניסיון ראשון: ${run.firstTry}/${run.queue.length}</p>
    ${ok && run.boss && run.bossHP <= 0 && run.world < 5 ? "<p>🔑 קיבלתם מפתח זהב! העולם הבא נפתח.</p>" : ""}
  </div>
  <div class="row" style="margin-top:12px">${nx}
    <button class="btn" id="again">שוב</button>
    <button class="btn" id="to-map">למפה</button>
  </div>`;
  $("to-map").onclick = () => goMapMode();
  $("again").onclick = () => startLevel(run.world, run.st, run.lost);
  const nxb = $("nx");
  if (nxb) nxb.onclick = () => {
    if (run.st < 4) startLevel(run.world, run.st + 1);
    else startLevel(run.world + 1, 0);
  };
}
function finishLevel(ok) {
  paused = true;
  if (player) playAnim(player, ok ? "emote-yes" : "idle");
  const acc = run.queue.length ? run.firstTry / Math.max(1, run.queue.length) : 0;
  const st = !ok ? 1 : acc >= .85 ? 3 : acc >= .6 ? 2 : 1;
  if (ok && !run.lost) {
    const key = run.world + "-" + run.st;
    if (st > (S.prog[key] || 0)) S.prog[key] = st;
  }
  S.stars = starSum(); S.best = Math.max(S.best, run.score); save();
  if (S.runs >= 1) grantAch("first_run");
  if (st === 3) grantAch("stars3");
  const bossWin = !!(ok && run.boss && run.bossHP <= 0);
  if (bossWin) {
    grantAch("boss1");
    if (run.world < 5) pendingUnlock = run.world;
    startKeyReward();
    appMode = "run";
  } else {
    appMode = "map";
  }
  if (stDone(1, 4)) grantAch("world1");
  if (worldsDone() >= 5) grantAch("worlds5");
  const ln = learnedCount();
  if (ln >= 10) grantAch("learn10");
  if (ln >= 50) grantAch("learn50");
  if (ln >= 100) grantAch("learn100");
  if (run.score >= 800) grantAch("score800");
  if (ok && run.wrong === 0) grantAch("perfect");

  const title = !ok ? "💪 נסו שוב — הלבבות נגמרו" :
    (bossWin ? "🏆 ניצחתם את " + BOSSES[run.world - 1].name + "!" : "🏁 השלב הושלם!");
  let nx = "";
  if (ok && !run.lost) {
    if (run.st < 4) nx = `<button class="btn g" id="nx">לשלב הבא ▶</button>`;
    else if (WORLDS[run.world]) nx = `<button class="btn g" id="nx">לעולם הבא ▶</button>`;
  }
  if (bossWin) {
    setTimeout(() => showEndScreen(ok, st, title, nx), 1600);
  } else {
    showEndScreen(ok, st, title, nx);
  }
}

async function startLevel(wid, st, lost, opt) {
  wid = wid || 1; st = st || 0;
  const world = WORLDS[wid - 1];
  if (!world) return false;
  const bypass = isDev() && opt && opt.bypassLock;
  if (!lost && !bypass && !sOpen(wid - 1, st)) return false;
  hideModal();
  showTurnCue(null);
  showUI("s-load");
  $("load-msg").textContent = "מכינים את המסלול…";
  await ensureWorldAssets(world);
  await ensurePlayer();
  if (bossActor && bossActor.model && bossActor.model.parent) bossActor.model.parent.remove(bossActor.model);
  bossActor = null;

  let mode = lost ? "tr" : ST[wid - 1][st][1];
  const boss = mode === "boss";
  mode = runnerModeOf(boss ? "tr" : mode);
  let queue = pickWords(wid, st, lost, mode === "build" ? 6 : 8);
  if (lost && queue.length < 2) {
    showUI("s-map"); refreshMapStats(); renderStages();
    showModal(`<h2>📚 ספריית המילים האבודות</h2><p>עדיין אין מילים קשות — כל הכבוד!</p><button class="btn" id="mgo">חזרה</button>`);
    $("mgo").onclick = hideModal;
    return;
  }
  if (mode === "build" || mode === "let") {
    const sp = spellable(queue);
    if (sp.length >= 4) queue = sp;
  }
  if (boss) queue = shuffle(WORDS.filter((w) => w.w === wid)).slice(0, 10);

  run = {
    world: wid, st, lost, mode, qmode: mode, boss, queue, i: 0, score: 0, coins: 0,
    hint: 0, wrong: 0, firstTry: 0, hearts: 3, combo: 0, stumbleT: 0, iFrames: 0,
    bossHP: boss ? 5 : 0, bossMax: 5, nextCoinS: 8, nextObsS: 18, glanceT: 0, forceGlance: false,
    layout: stageProfile(st, boss, wid)
  };
  run.course = buildCourse({
    curve: run.layout.curve,
    hillAmp: run.layout.hillAmp,
    turnDir: run.layout.turnDir,
    causeway: run.layout.causeway
  });
  S.runs++; save(); grantAch("first_run");

  applyWorldTheme(world);
  applyStageLook(world);
  if (runHills && runHills.parent) runScene.remove(runHills);
  runHills = null;
  const theme = themeOf(wid);
  if (theme === "jungle") {
    const hillCol = run.layout.tod === "sunset" ? 0x7a5a38
      : (run.layout.tod === "dusk" || run.layout.tod === "storm") ? 0x3a3a58
      : world.ground;
    runHills = makeMountains(hillCol, { count: isHigh() ? 12 : 8 });
  } else if (THEME_MOUNTAINS[theme]) {
    runHills = makeMountains(THEME_MOUNTAINS[theme].color, { count: isHigh() ? 12 : 8, top: THEME_MOUNTAINS[theme].top });
  }
  if (runHills) runScene.add(runHills);
  if (themeAmb) {
    runScene.remove(themeAmb);
    if (themeAmb.userData.far) runScene.remove(themeAmb.userData.far);
    themeAmb.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    themeAmb = null;
  }
  if (theme !== "jungle") {
    themeAmb = buildThemeAmbience(theme, isHigh());
    runScene.add(themeAmb);
    if (themeAmb.userData.far) runScene.add(themeAmb.userData.far);
  }
  if (runMist && runMist.parent) runScene.remove(runMist);
  runMist = makeMist();
  runScene.add(runMist);
  clearDyn();
  await spawnDecor(world);
  rebuildCourseRibbon();
  layoutPathFromCourse();
  run.coinProto = await createProp(MP("platformer/coin-gold.glb"), 0.42);
  run.obsProtos = {};
  for (const f of world.obstacle) run.obsProtos[f] = await createProp(MP(f), 0.7);

  player.lane = 1; player.s = 0; player.z = 0; player.y = 0; player.vy = 0;
  player.laneShift = 0;
  player.jumping = false; player.sliding = false;
  syncPlayerPose();
  syncWorldFollowers();
  playAnim(player, "sprint");
  runScene.add(player.group);

  if (boss) {
    const b = BOSSES[wid - 1];
    bossActor = await createActor(MP(b.file), b.height, true);
    placeOnCourse(bossActor.model, 0, 0);
    runScene.add(bossActor.model);
    playAnim(bossActor, "sprint");
  }

  camera.position.set(0, 3.6, 7.4);
  camera.lookAt(0, 1.1, -4);
  appMode = "run";
  setupQuestion();
  updateHud();
  const title = lost ? "📚 ספריית המילים האבודות" : (boss ? "⚔️ " + BOSSES[wid - 1].name : ST[wid - 1][st][0]);
  showUI("hud");
  showModal(`<h2>${title}</h2><p>${boss ? "הבוס רץ מאחוריכם! ענו נכון כדי להחליש אותו!" : (st === 0 && !lost ? INTRO[wid - 1] : "קדימה, אתם יכולים!")}</p>
    <button class="btn g" id="mgo">יוצאים לדרך ▶</button>`);
  $("mgo").onclick = () => { hideModal(); paused = false; playAnim(player, "sprint"); };
  return true;
}

async function ensurePlayer() {
  if (player && player.hero === S.hero) return;
  if (player && player.group.parent) player.group.parent.remove(player.group);
  const actor = await createActor(MP(HEROES[S.hero].file), 1.52, true, true);
  const group = new THREE.Group();
  group.add(actor.model);
  player = { ...actor, group, hero: S.hero, lane: 1, s: 0, z: 0, laneShift: 0, y: 0, vy: 0, jumping: false, sliding: false, slideT: 0, current: null };
}

/* ===== INPUT ===== */
function currentTurn(s) {
  if (!run || !run.course) return null;
  return run.course.turns.find((t) => s > t.sEnter - 4 && s < t.sExit + 1) || null;
}
function showTurnCue(t) {
  const el = $("turn-cue");
  if (!el) return;
  if (!t || t.committed) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  el.textContent = t.dir < 0 ? "⬅️ פנייה חדה שמאלה!" : "פנייה חדה ימינה! ➡️";
}
function missSharpTurn() {
  showTurnCue(null);
  if (!run || run.iFrames > 0) return;
  run.stumbleT = 0.7;
  run.iFrames = 1.2;
  shakeT = 0.28;
  sfx.bad();
  playAnim(player, "fall", 0.08, true);
  run.hearts--; run.wrong++; run.combo = 0;
  flashHearts(); updateHud();
  if (run.hearts <= 0) finishLevel(false);
}
function changeLane(dir) {
  if (!player || paused || appMode !== "run") return;
  const t = currentTurn(player.s);
  if (t && !t.committed && player.s < t.sApex + 1.4) {
    if (dir === t.dir) { t.committed = "ok"; showTurnCue(null); sfx.coin(); }
    else { t.committed = "miss"; missSharpTurn(); }
    return;
  }
  player.lane = Math.max(0, Math.min(2, player.lane + dir));
}
function jump() {
  if (!player || paused || appMode !== "run" || player.jumping) return;
  player.jumping = true; player.vy = 8.4; player.sliding = false;
  playAnim(player, "jump", 0.08, true); sfx.jump();
}
function slide() {
  if (!player || paused || appMode !== "run" || player.jumping) return;
  player.sliding = true; player.slideT = 0.62;
  playAnim(player, "crouch", 0.08);
}
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); changeLane(-1); }
  else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); changeLane(1); }
  else if (e.key === "ArrowUp" || e.key === " " ) { e.preventDefault(); jump(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); slide(); }
  else if (e.key === "Enter" && !$("modal").classList.contains("hidden")) {
    const b = $("mgo") || $("modal-box").querySelector("button");
    if (b) b.click();
  }
});
let tx = 0, ty = 0;
canvas.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
canvas.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 28) changeLane(dx > 0 ? 1 : -1);
  else if (dy < -28) jump();
  else if (dy > 28) slide();
});

/* ===== LOOP ===== */
let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  if (appMode === "title" || appMode === "map" || appMode === "load") {
    camera.position.lerp(camGoal, 1 - Math.pow(0.012, dt * 60));
    const lp = new THREE.Vector3().copy(lookGoal);
    const cur = new THREE.Vector3();
    camera.getWorldDirection(cur);
    camera.lookAt(lp);
    mapMixers.forEach((m) => m.update(dt));
    titleHeroes.forEach((h, i) => {
      if (S.hero === i) h.model.rotation.y = Math.PI + Math.sin(now * 0.001) * 0.15;
    });
    islands.forEach((isle, i) => { isle.position.y = (i % 2 ? 0.4 : 0) + Math.sin(now * 0.001 + i) * 0.18; });
    updateKeyFx(dt);
    renderer.render(mapScene, camera);
    return;
  }
  if (appMode === "run" && player) {
    updateFlagWave(now * 0.001);
    if (!paused) updateRunner(dt);
    else if (player.mixer) player.mixer.update(dt);
    updateKeyFx(dt);
    if (!holdCam) updateRunCamera(dt);
    if (runSky) runSky.position.copy(camera.position);
    updateThemeFx(dt, now * 0.001);
    renderer.render(runScene, camera);
  }
}

const _camDir = new THREE.Vector3();
function updateThemeFx(dt, t) {
  fxTime.value = t;
  camera.getWorldDirection(_camDir);
  _camDir.y = 0;
  if (_camDir.lengthSq() < 1e-6) _camDir.set(0, 0, -1);
  _camDir.normalize();
  const ctx = { center: player ? player.group.position : camera.position, fwd: _camDir };
  if (themeAmb) {
    themeAmb.position.copy(camera.position);
    if (themeAmb.userData.update) themeAmb.userData.update(dt, t, ctx);
  }
  if (courseVisual && courseVisual.userData.update) courseVisual.userData.update(dt, t, ctx);
}
function syncWorldFollowers() {
  if (!run || !run.course || !player) return;
  const f = pathFrame(run.course, player.s);
  if (runLights.fill) {
    runLights.fill.position.copy(player.group.position).addScaledVector(f.up, 2.5).addScaledVector(f.right, 1.05).addScaledVector(f.fwd, -1.2);
  }
  if (runLights.key) {
    runLights.key.position.copy(player.group.position).addScaledVector(f.up, 4.4).addScaledVector(f.fwd, -5.2).addScaledVector(f.right, 1.6);
    runLights.key.target.position.copy(player.group.position);
    runLights.key.target.updateMatrixWorld();
  }
  if (runLights.rim) {
    runLights.rim.position.copy(player.group.position).addScaledVector(f.up, 2.9).addScaledVector(f.right, -4.1).addScaledVector(f.fwd, 3.4);
    runLights.rim.target.position.copy(player.group.position);
    runLights.rim.target.updateMatrixWorld();
  }
  if (runLights.dir) {
    runLights.dir.position.copy(player.group.position).add(new THREE.Vector3(16, 24, 10));
    runLights.dir.target.position.copy(player.group.position);
    runLights.dir.target.updateMatrixWorld();
  }
  if (runSunDisk) {
    runSunDisk.position.copy(f.pos).addScaledVector(f.fwd, 48).addScaledVector(f.up, 16).addScaledVector(f.right, 30);
  }
  if (runMist) {
    const onCauseway = f.kind === "causeway";
    runMist.visible = onCauseway;
    runMist.position.copy(f.pos).addScaledVector(f.up, -3.2).addScaledVector(f.fwd, 4);
  }
  if (runHills) runHills.position.set(f.x, 0, f.z);
  if (courseVisual) {
    const gnd = courseVisual.getObjectByName("followGround");
    if (gnd) {
      const gy = gnd.userData.y != null ? gnd.userData.y : -0.32;
      gnd.position.set(f.x, gy, f.z);
      gnd.visible = f.kind !== "causeway";
      if (sideMat && gnd.userData.y == null) gnd.material.color.copy(sideMat.color);
    }
  }
  if (runSky) runSky.position.copy(camera.position);
  if (themeAmb) {
    themeAmb.position.copy(camera.position);
    if (themeAmb.userData.far) themeAmb.userData.far.position.set(f.x, 0, f.z);
  }
  if (bossActor && run.boss) {
    const bs = Math.max(0, player.s - 3.4);
    const bf = pathFrame(run.course, bs);
    const sideOff = 1.7 + Math.sin(performance.now() * 0.002) * 0.2;
    bossActor.model.position.copy(worldOnPath(run.course, bs, sideOff, 0));
    bossActor.model.rotation.order = "YXZ";
    bossActor.model.rotation.y = -bf.heading;
    bossActor.model.rotation.x = bf.pitch || 0;
  }
}
function updateRunner(dt) {
  const world = WORLDS[run.world - 1];
  const base = (run.layout && run.layout.speed) || 8.2;
  let speed = base * (1 + Math.min(0.42, run.combo * 0.028));
  if (run.stumbleT > 0) { run.stumbleT -= dt; speed *= 0.4; }
  if (run.iFrames > 0) run.iFrames -= dt;
  player.s = (player.s || 0) + speed * dt;
  player.z = -player.s;
  const want = laneXs()[player.lane];
  player.laneShift = (player.laneShift == null ? want : player.laneShift);
  player.laneShift += (want - player.laneShift) * Math.min(1, dt * 11);
  if (player.jumping) {
    player.vy += -26 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0; player.vy = 0; player.jumping = false;
      playAnim(player, player.sliding ? "crouch" : "sprint");
    }
  }
  if (player.sliding) {
    player.slideT -= dt;
    if (player.slideT <= 0) { player.sliding = false; if (!player.jumping) playAnim(player, "sprint"); }
  }
  syncPlayerPose();
  const turn = currentTurn(player.s);
  showTurnCue(turn && !turn.committed ? turn : null);
  if (turn && !turn.committed && player.s > turn.sApex) {
    turn.committed = "miss";
    missSharpTurn();
  }
  if (player.mixer) player.mixer.update(dt);
  if (player.current === "fall" && run.stumbleT <= 0 && !player.jumping) playAnim(player, "sprint");
  emitTrail(dt);
  for (const gt of gates) {
    if (gt.resolved || !gt.group) continue;
    const glow = gt.group.getObjectByName("gateGlow");
    if (glow) glow.material.opacity = 0.11 + Math.sin(performance.now() * 0.006) * 0.09;
    gt.group.children.forEach((ch) => {
      if (ch.name === "laneSign") ch.position.y = 2.32 + Math.sin(performance.now() * 0.005) * 0.06;
    });
  }

  const now = performance.now();
  if (bossActor && bossActor.mixer) bossActor.mixer.update(dt);
  syncWorldFollowers();

  layoutPathFromCourse();
  decors.forEach((d) => {
    if (d.userData.pathS != null && player.s - d.userData.pathS > 16) {
      d.userData.pathS += 220;
    }
    placeDecor(d);
  });

  if (player.s > run.nextCoinS) {
    spawnCoinRow(player.s + 16);
    run.nextCoinS += 5 + Math.random() * 4;
  }
  if (player.s > run.nextObsS) {
    spawnObstacle(player.s + 20);
    const dens = (run.layout && run.layout.density) || 0.5;
    run.nextObsS += (dens > 0.7 ? 7.2 : 10.5) + Math.random() * 4;
  }

  for (const c of coins) {
    if (c.taken) continue;
    c.mesh.rotation.z += dt * 3;
    if ((c.s != null ? c.s : 0) < player.s - 4) { c.taken = true; runScene.remove(c.mesh); continue; }
    if (Math.abs((c.s || 0) - player.s) < 0.6 && c.lane === playerLaneNow() && player.y < 1.2) {
      c.taken = true; runScene.remove(c.mesh);
      S.coins += 1; run.coins += 1; run.score += 10; sfx.coin(); updateHud();
    }
  }
  for (const o of obstacles) {
    if (o.hit) continue;
    if (o.spin) o.mesh.rotation.x += dt * o.spin;
    if ((o.s != null ? o.s : 0) < player.s - 4) { o.hit = true; runScene.remove(o.mesh); continue; }
    if (Math.abs((o.s || 0) - player.s) < 0.7 && o.lane === playerLaneNow()) {
      if ((o.type === "low" || o.type === "hole") && player.y > 0.48) continue;
      if (o.type === "beam" && player.sliding) continue;
      hitObstacle(o);
    }
  }
  for (const g of gates) {
    if (!g.resolved && player.s > (g.s != null ? g.s : -g.group.position.z) - 0.45) resolveGate(g);
    if (g.resolved && g.group.parent && (g.s != null ? g.s : 0) < player.s - 8) runScene.remove(g.group);
  }
  if (run.activeMode === "build") {
    for (const L of letters) {
      if (L.taken) continue;
      if ((L.s != null ? L.s : 0) < player.s - 4) continue;
      if (Math.abs((L.s || 0) - player.s) < 0.5 && L.lane === playerLaneNow() && player.y < 1.3) {
        L.taken = true; runScene.remove(L.mesh);
        const need = run.spell.rest[run.spell.idx];
        if (L.ch === need) {
          run.spell.idx++; sfx.coin(); burst(L.mesh.position, 0x4ecdc4);
          if (run.spell.idx >= run.spell.rest.length) onCorrect();
        } else {
          onWrong();
        }
      }
    }
  }
  updateParticles(dt);
}

function updateRunCamera(dt) {
  if (!player || !run || !run.course) return;
  const f = pathFrame(run.course, player.s);
  let glance = 0;
  if (run.forceGlance) glance = 1;
  else if (run.boss) {
    run.glanceT = (run.glanceT || 0) + dt;
    const w = Math.sin(run.glanceT * 0.48);
    glance = w > 0.58 ? (w - 0.58) / 0.42 : 0;
  }
  let sx = 0, sy = 0;
  if (shakeT > 0) { shakeT -= dt; sx = (Math.random() - 0.5) * 0.25; sy = (Math.random() - 0.5) * 0.18; }
  const bossBias = run.boss ? -2.05 : 0;
  const back = f.pos.clone()
    .addScaledVector(f.fwd, run.boss ? -8.6 : -7.7)
    .addScaledVector(f.up, 3.7 + player.y * 0.25 + sy)
    .addScaledVector(f.right, (player.laneShift || 0) * 0.42 + sx + bossBias);
  const side = f.pos.clone()
    .addScaledVector(f.right, -4.4)
    .addScaledVector(f.fwd, -8.4)
    .addScaledVector(f.up, 3.25);
  const ideal = back.lerp(side, glance);
  const look = f.pos.clone()
    .addScaledVector(f.fwd, 4.6)
    .addScaledVector(f.up, 1.15 + player.y)
    .addScaledVector(f.right, glance * 0.8);
  if (glance > 0.15 && bossActor) {
    const bp = bossActor.model.position.clone();
    bp.y += 1.2;
    look.lerp(bp, glance * 0.22);
  }
  camera.position.lerp(ideal, 1 - Math.pow(0.0008, dt));
  camera.lookAt(look);
}

/* ===== HINT / MENUS ===== */
function openHint() {
  if (!run || !run.cur) return;
  grantAch("hint");
  paused = true;
  helpCard(Math.max(run.hint, 1) || 1);
}
function helpCard(l) {
  const w = run.cur, e = w.en.toUpperCase();
  run.hint = Math.max(run.hint, l);
  let body;
  if (l === 1) body = `<div style="font-size:64px">${w.pic}</div><p>${esc(w.clue)}</p>`;
  else if (l === 2) {
    const sp = e.split("").map((c, i) => (i === 0 || i === e.length - 1) ? c : (i % 2 ? "_" : c)).join(" ");
    body = `<p>${e.replace(/ /g, "").length} אותיות. האות הראשונה: <b class="en">${esc(e[0])}</b></p><div class="en" style="font-size:36px;font-weight:800">${esc(sp)}</div>`;
  } else {
    body = `<p>התשובה:</p><div class="en" style="font-size:42px;font-weight:800">${esc(w.en)}</div><p>${w.pic} ${esc(w.he)}</p>
      <button class="btn s" id="hsay">🔊 שמעו איך אומרים</button>`;
    say(w.en);
  }
  showModal(`<h2>🦉 הינשוף החכם (רמז ${l}/3)</h2>${body}
    <div class="row" style="margin-top:10px">
      <button class="btn g" id="hback">חוזרים לריצה</button>
      ${l < 3 ? `<button class="btn s" id="hmore">עוד רמז</button>` : ""}
    </div>`);
  $("hback").onclick = () => { hideModal(); paused = false; };
  const more = $("hmore"); if (more) more.onclick = () => helpCard(l + 1);
  const hs = $("hsay"); if (hs) hs.onclick = () => say(w.en);
}

function goMapMode() {
  paused = true; appMode = "map";
  hideModal(); showUI("s-map");
  refreshMapStats(); renderStages(); highlightIsland(); refreshLocks();
  if (pendingUnlock != null) {
    const idx = pendingUnlock;
    pendingUnlock = null;
    playIslandUnlock(idx);
  } else {
    focusMapCam();
  }
}
function goTitle() {
  paused = true; appMode = "title";
  showUI("s-title"); highlightHero(); focusTitleCam();
}

function drawHeroBtns() {
  $("hero-btns").innerHTML = HEROES.map((h, i) =>
    `<button class="hero-btn ${S.hero === i ? "sel" : ""}" data-h="${i}">${esc(h.name)}</button>`).join("");
}
$("hero-btns").onclick = (e) => {
  const b = e.target.closest("[data-h]");
  if (!b) return;
  S.hero = +b.dataset.h; save(); highlightHero(); drawHeroBtns(); sfx.click();
};
$("btn-start").onclick = () => goMapMode();
$("btn-help").onclick = () => { showUI("s-help"); appMode = "title"; };
$("btn-help-back").onclick = () => goTitle();
if ($("btn-quality")) {
  $("btn-quality").onclick = () => {
    S.quality = isHigh() ? "low" : "high";
    save();
    applyQuality();
  };
  applyQuality();
}
$("btn-map-back").onclick = () => goTitle();
$("btn-hud-map").onclick = () => { if (confirm("לחזור למפה? ההתקדמות בשלב הזה לא תישמר.")) goMapMode(); };
$("btn-hint").onclick = openHint;
$("btn-journey").onclick = openJourney;
$("btn-library").onclick = () => { grantAch("library"); startLevel(1, 0, true); };
$("btn-review").onclick = () => {
  const hard = nbs().filter((x) => !x.n.learned);
  if (hard.length < 2) {
    showModal(`<h2>✨ כל הכבוד!</h2><p>אין כרגע מילים לתרגול.</p><button class="btn" id="mgo">סגור</button>`);
    $("mgo").onclick = hideModal;
  } else startLevel(1, 0, true);
};

function openNotebook() {
  const r = nbs();
  appMode = "map";
  showUI("s-nb");
  $("s-nb").innerHTML = `<div class="glass" style="padding:16px;max-width:860px;max-height:70vh;overflow:auto">
    <h2>📒 מחברת המילים שלי</h2>
    ${r.length ? `<table><tr><th>עברית</th><th>English</th><th></th><th>טעיתי</th><th>הצלחתי</th><th>סטטוס</th></tr>
      ${r.map(({ w, n }) => `<tr><td>${esc(w.he)}</td><td class="en"><b>${esc(w.en)}</b></td><td>${w.pic}</td><td>${n.wrong || 0}</td><td>${n.right || 0}</td><td>${n.learned ? "✅" : "🔁"}</td></tr>`).join("")}
    </table>` : "<p>עדיין ריק.</p>"}
  </div><button class="btn" id="nbback" style="margin-top:10px">חזרה למפה</button>`;
  $("nbback").onclick = goMapMode;
}
function openJourney() {
  const ln = learnedCount(), pr = nbs().filter((x) => !x.n.learned).length;
  const achHtml = ACH.map((a) => `<span class="pill" style="margin:3px;opacity:${S.ach.includes(a.id) ? 1 : .45}">${S.ach.includes(a.id) ? "🏅" : "▫️"} ${esc(a.name)}</span>`).join("");
  showUI("s-jr"); appMode = "map";
  $("s-jr").innerHTML = `<div class="glass" style="padding:18px;max-width:640px">
    <h2>🧭 המסע שלי</h2>
    <p>מילים שנלמדו: <b>${ln}</b> מתוך ${WORDS.length}</p>
    <div class="bar"><i style="width:${ln / WORDS.length * 100}%"></i></div>
    <p>לתרגול: <b>${pr}</b> · עולמות: <b>${worldsDone()}</b>/5 · שלבים: ${Object.keys(S.prog).length}/25</p>
    <p>🪙 ${S.coins} · ⭐ ${starSum()}</p>
    <div class="row">${achHtml}</div>
  </div>
  <div class="row" style="margin-top:10px">
    <button class="btn" id="jrback">חזרה למפה</button>
    <button class="btn s" id="jreset">איפוס</button>
    <button class="btn s" id="jnb">📒 מחברת</button>
  </div>`;
  $("jrback").onclick = goMapMode;
  $("jnb").onclick = openNotebook;
  $("jreset").onclick = () => {
    if (!confirm("למחוק את כל ההתקדמות?")) return;
    const hero = S.hero; S = def(); S.hero = hero; save(); goTitle();
  };
  bindTeacherUnlock($("s-jr").querySelector("h2"));
}
function bindTeacherUnlock(el) {
  if (!el) return;
  let timer = null;
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  el.addEventListener("pointerdown", () => { clear(); timer = setTimeout(askTeacherPin, 1500); });
  el.addEventListener("pointerup", clear);
  el.addEventListener("pointerleave", clear);
}
function askTeacherPin() {
  showModal(`<h2>👩‍🏫 כניסת מורה</h2><p>הזינו את הקוד</p>
    <input id="tpin" type="password" inputmode="numeric" maxlength="8" style="font-size:28px;padding:8px;text-align:center;width:180px;border-radius:12px;border:3px solid #8a5a2b">
    <div class="row" style="margin-top:10px"><button class="btn" id="mgo">אישור</button></div>`);
  const go = () => {
    if (($("tpin").value || "").trim() === "3141") {
      hideModal();
      showModal(`<h2>מצב מורה</h2><p>פתיחת כל העולמות לתרגול חופשי.</p>
        <div class="row"><button class="btn g" id="jfree">${S.free ? "לנעול בחזרה לפי המפתחות" : "לפתוח את כל העולמות"}</button>
        <button class="btn" id="mgo">סגור</button></div>`);
      $("jfree").onclick = () => { S.free = !S.free; save(); refreshLocks(); renderStages(); hideModal(); openJourney(); };
      $("mgo").onclick = hideModal;
    } else {
      $("tpin").style.outline = "3px solid #e8553d";
    }
  };
  $("mgo").onclick = go;
  $("tpin").onkeydown = (e) => { if (e.key === "Enter") go(); };
  setTimeout(() => { try { $("tpin").focus(); } catch (e) {} }, 50);
}

function fillDevGrid() {
  const grid = $("dev-grid");
  if (!grid) return;
  grid.innerHTML = WORLDS.map((w, i) => {
    const stages = ST[i].map((t, k) => {
      const locked = !sOpen(i, k);
      const label = (k === 4 ? "⚔️ " : "") + t[0] + (k === 4 ? " (בוס)" : "");
      const extra = locked ? " 🔒" : "";
      return `<button class="btn s${k === 4 ? " boss" : ""}" data-dev-w="${w.id}" data-dev-st="${k}">${esc(label)}${extra}</button>`;
    }).join("");
    return `<div class="dev-world"><h3>${w.icon} ${esc(w.name)}</h3><div class="dev-stages">${stages}</div></div>`;
  }).join("");
}
function openDevPanel() {
  if (!isDev()) return false;
  fillDevGrid();
  const box = $("dev-unlock-all");
  if (box) box.checked = !!S.free;
  if ($("dev-panel")) $("dev-panel").classList.remove("hidden");
  return true;
}
function hideDevPanel() {
  if ($("dev-panel")) $("dev-panel").classList.add("hidden");
}
function initDevTools() {
  const btn = $("btn-dev");
  if (!btn || !isDev()) {
    if (btn) btn.classList.add("hidden");
    return;
  }
  btn.onclick = () => openDevPanel();
  const close = $("btn-dev-close");
  if (close) close.onclick = hideDevPanel;
  const grid = $("dev-grid");
  if (grid) {
    grid.onclick = (e) => {
      const b = e.target.closest("[data-dev-w]");
      if (!b) return;
      hideDevPanel();
      startLevel(+b.dataset.devW, +b.dataset.devSt, false, { bypassLock: true });
    };
  }
  const unlock = $("dev-unlock-all");
  if (unlock) {
    unlock.checked = !!S.free;
    unlock.onchange = () => {
      S.free = !!unlock.checked;
      save();
      refreshLocks();
      renderStages();
      fillDevGrid();
    };
  }
  const rst = $("btn-dev-reset");
  if (rst) {
    rst.onclick = () => {
      if (!confirm("לאפס את כל ההתקדמות השמורה? הפעולה הזו נשמרת.")) return;
      const hero = S.hero, quality = S.quality, wasMuted = S.muted;
      S = def();
      S.hero = hero;
      S.quality = quality;
      S.muted = wasMuted;
      save();
      refreshLocks();
      renderStages();
      refreshMapStats();
      drawHeroBtns();
      highlightHero();
      if (unlock) unlock.checked = false;
      fillDevGrid();
    };
  }
}

/* ===== BOOT ===== */
const ready = (async function boot() {
  initDevTools();
  $("wordcount").textContent = WORDS.length;
  drawHeroBtns();
  buildPath();
  makeStars();
  ensureRunAmbience();
  const bootFiles = [
    ...HEROES.map((h) => h.file),
    "nature/tree_detailed.glb", "nature/tree_default.glb", "nature/tree_palm.glb",
    "pirate/palm-straight.glb", "pirate/ship-pirate-small.glb",
    "platformer/tree.glb", "platformer/coin-gold.glb",
    "space/craft_speederA.glb", "holiday/tree-snow-a.glb", "holiday/snowman-hat.glb",
    "heroes/boss-wizard.glb", "heroes/boss-soldier.glb", "heroes/boss-pirate.glb"
  ];
  loadTotal = bootFiles.length + 3;
  loadDone = 0; setLoad("טוענים דמויות");
  for (const f of bootFiles) {
    try { await loadGLTF(MP(f)); } catch (e) { console.warn("skip", f, e); loadDone++; }
  }
  setLoad("בונים את המפה");
  await buildMap();
  await ensurePlayer();
  focusTitleCam();
  camera.position.copy(camGoal);
  camera.lookAt(lookGoal);
  appMode = "title";
  showUI("s-title");
  requestAnimationFrame(tick);
})();


function checkLaneAlignment() {
  if (!run) return { ok: false, error: "no run" };
  const saved = { course: run.course, layout: run.layout };
  const signErrs = [];
  const postErrs = [];
  const failures = [];
  let nGates = 0, nSigns = 0, nPosts = 0;
  const stages = [];
  try {
    for (let wi = 1; wi <= 5; wi++) {
      for (let st = 0; st <= 4; st++) {
        const layout = stageProfile(st, st === 4, wi);
        run.layout = layout;
        run.course = buildCourse({
          curve: layout.curve,
          hillAmp: layout.hillAmp,
          turnDir: layout.turnDir,
          causeway: layout.causeway
        });
        const xs = laneXs();
        const laneW = Math.abs(xs[1] - xs[0]);
        const signTol = 0.1 * laneW;
        const halfW = trackHalfWidth();
        const spots = [12, 28, 48, 90, 140];
        const lm = run.course.landmarks || {};
        ["curve", "hill", "turn", "causeway"].forEach((k) => {
          if (lm[k] != null) spots.push(lm[k]);
        });
        const uniq = [];
        spots.forEach((s) => {
          const v = Math.max(2, Math.min((run.course.length || 500) - 4, s));
          if (!uniq.some((u) => Math.abs(u - v) < 1)) uniq.push(v);
        });
        const stageFails = [];
        for (const s of uniq) {
          const group = buildGate(["L", "C", "R"]);
          placeOnCourse(group, s, null, true);
          group.updateMatrixWorld(true);
          nGates++;
          const f = trackFrameAt(s);
          const signs = group.children.filter((c) => c.name === "laneSign");
          signs.forEach((sign, i) => {
            const wp = new THREE.Vector3();
            sign.getWorldPosition(wp);
            const lat = new THREE.Vector3().subVectors(wp, f.pos).dot(f.right);
            const err = Math.abs(lat - xs[i]);
            signErrs.push(err);
            nSigns++;
            if (err >= signTol) {
              const rec = { world: wi, stage: st, s: +s.toFixed(2), kind: (f.kind || "?"), lane: i, expected: xs[i], lateral: +lat.toFixed(4), err: +err.toFixed(4) };
              failures.push(rec);
              stageFails.push(rec);
            }
          });
          group.children.filter((c) => c.name === "gatePost").forEach((post) => {
            const wp = new THREE.Vector3();
            post.getWorldPosition(wp);
            const lat = new THREE.Vector3().subVectors(wp, f.pos).dot(f.right);
            const exp = (post.userData.side || Math.sign(lat) || 1) * halfW;
            const err = Math.abs(lat - exp);
            postErrs.push(err);
            nPosts++;
            if (err >= signTol) {
              const rec = { world: wi, stage: st, s: +s.toFixed(2), kind: (f.kind || "?"), part: "post", expected: exp, lateral: +lat.toFixed(4), err: +err.toFixed(4) };
              failures.push(rec);
              stageFails.push(rec);
            }
          });
          group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        }
        stages.push({
          world: wi,
          stage: st,
          narrow: !!layout.narrow,
          causeway: !!layout.causeway,
          laneW: +laneW.toFixed(3),
          halfW: +halfW.toFixed(3),
          gates: uniq.length,
          fail: stageFails.length
        });
      }
    }
  } finally {
    run.course = saved.course;
    run.layout = saved.layout;
  }
  const maxSign = signErrs.length ? Math.max(...signErrs) : 0;
  const maxPost = postErrs.length ? Math.max(...postErrs) : 0;
  const meanSign = signErrs.length ? signErrs.reduce((a, b) => a + b, 0) / signErrs.length : 0;
  const meanPost = postErrs.length ? postErrs.reduce((a, b) => a + b, 0) / postErrs.length : 0;
  const laneW0 = 2;
  return {
    ok: failures.length === 0,
    threshold: 0.1,
    thresholdUnitsNote: "0.1 * lane width (lane width is distance between adjacent lane centers)",
    nWorlds: 5,
    nStages: 25,
    nGates,
    nSigns,
    nPosts,
    maxSignError: +maxSign.toFixed(5),
    meanSignError: +meanSign.toFixed(5),
    maxPostError: +maxPost.toFixed(5),
    meanPostError: +meanPost.toFixed(5),
    nSignFails: failures.filter((f) => f.lane != null).length,
    nPostFails: failures.filter((f) => f.part === "post").length,
    failures: failures.slice(0, 20),
    stages
  };
}

window.MQ = {
  ready,
  startLevel,
  goMapMode,
  goTitle,
  isDev,
  openDevPanel,
  checkLaneAlignment,
  getMode: () => appMode,
  getRun: () => run,
  getPlayer: () => player,
  getGates: () => gates,
  getBoss: () => bossActor,
  getLetters: () => letters,
  setLane: (i) => { if (player) player.lane = i; },
  setPaused: (v) => { paused = v; },
  getS: () => S,
  save,
  WORDS,
  camera,
  renderer,
  wOpen: (i) => wOpen(i),
  sOpen: (i, t) => sOpen(i, t),
  keysOwned: () => keysOwned(),
  getObstacles: () => obstacles,
  stageProfile,
  isHigh,
  measureSign: (text) => makeTextTexture(text).userData,
  buildTestGate: (opts) => {
    gates.forEach((g) => { if (g.group && g.group.parent) runScene.remove(g.group); });
    gates.length = 0;
    const s = (player.s || 0) + 11.5;
    const group = buildGate(opts);
    placeOnCourse(group, s, null, true);
    runScene.add(group);
    gates.push({ group, s, z: -s, ans: 0, word: run && run.cur, resolved: false });
    setLaneOpts(opts);
    return gates[0];
  },
  spawnHazardsAt: (s) => {
    ["hole", "wall", "beam", "roll"].forEach((type, i) => {
      const lane = i === 2 ? 1 : i % 3;
      const mesh = hazardMark(type);
      const ps = (s || player.s || 0) + i * 6;
      placeOnCourse(mesh, ps, lane);
      runScene.add(mesh);
      obstacles.push({ mesh, lane, type, hit: false, spin: type === "roll" ? 4 : 0, s: ps });
    });
  },
  hitObstacle,
  holdCam: (v) => { holdCam = !!v; },
  getCourse: () => run && run.course,
  teleportTo: (kind) => {
    if (!run || !run.course || !run.course.landmarks[kind]) return null;
    const s = run.course.landmarks[kind];
    const pad = { turn: 7, hill: 12, curve: 8, causeway: 7 };
    player.s = Math.max(0, s - (pad[kind] != null ? pad[kind] : 9));
    player.z = -player.s;
    syncPlayerPose();
    syncWorldFollowers();
    layoutPathFromCourse();
    if (kind === "turn") showTurnCue(currentTurn(player.s));
    updateRunCamera(1);
    if (runSky) runSky.position.copy(camera.position);
    return { kind, s, playerS: player.s };
  },
  teleportS: (s) => {
    if (!player || !run) return 0;
    player.s = Math.max(0, s);
    player.z = -player.s;
    syncPlayerPose();
    syncWorldFollowers();
    layoutPathFromCourse();
    updateRunCamera(1);
    if (runSky) runSky.position.copy(camera.position);
    return player.s;
  },
  frameLandmark: (kind) => {
    if (!run || !run.course || !run.course.landmarks[kind]) return null;
    showTurnCue(null);
    const s = run.course.landmarks[kind];
    const pad = { turn: 7, hill: 12, curve: 7, causeway: 6 };
    player.s = Math.max(0, s - (pad[kind] != null ? pad[kind] : 9));
    player.z = -player.s;
    syncPlayerPose();
    syncWorldFollowers();
    const f = pathFrame(run.course, player.s);
    if (kind === "hill") {
      const look = pathFrame(run.course, s + 8);
      camera.position.copy(f.pos).addScaledVector(f.fwd, -11).addScaledVector(f.up, 6.4).addScaledVector(f.right, 1.5);
      camera.lookAt(look.pos.clone().addScaledVector(look.up, 1.3));
    } else if (kind === "turn") {
      const apex = pathFrame(run.course, s);
      const t = run.course.turns[0];
      const out = t ? -t.dir : 1;
      camera.position.copy(f.pos).addScaledVector(f.fwd, -5.2).addScaledVector(f.up, 7.1).addScaledVector(f.right, out * 7.2);
      camera.lookAt(apex.pos.clone().addScaledVector(apex.up, 0.7));
      showTurnCue(currentTurn(player.s));
    } else if (kind === "causeway") {
      const look = pathFrame(run.course, player.s + 20);
      camera.position.copy(f.pos).addScaledVector(f.fwd, -8.4).addScaledVector(f.up, 4.8).addScaledVector(f.right, 2.1);
      camera.lookAt(look.pos.clone().addScaledVector(look.up, 0.35));
    } else if (kind === "curve") {
      const look = pathFrame(run.course, player.s + 18);
      camera.position.copy(f.pos).addScaledVector(f.fwd, -8.6).addScaledVector(f.up, 4.4).addScaledVector(f.right, 0.6);
      camera.lookAt(look.pos.clone().addScaledVector(look.up, 1.05));
    } else {
      updateRunCamera(1);
    }
    if (runSky) runSky.position.copy(camera.position);
    return { kind, s, playerS: player.s };
  },
  frameBossChase: () => {
    if (!run || !player) return null;
    showTurnCue(null);
    player.s = Math.max(player.s, 48);
    player.z = -player.s;
    syncPlayerPose();
    if (run) run.forceGlance = false;
    syncWorldFollowers();
    const f = pathFrame(run.course, player.s);
    camera.position.copy(f.pos)
      .addScaledVector(f.fwd, -9.1)
      .addScaledVector(f.right, -3.7)
      .addScaledVector(f.up, 3.35);
    const look = f.pos.clone().addScaledVector(f.fwd, 4.2).addScaledVector(f.up, 1.2).addScaledVector(f.right, 0.7);
    camera.lookAt(look);
    if (runSky) runSky.position.copy(camera.position);
    return {
      playerS: player.s,
      player: player.group.position.toArray(),
      boss: bossActor ? bossActor.model.position.toArray() : null,
      cam: camera.position.toArray()
    };
  },
  forceGlance: (v) => { if (run) run.forceGlance = !!v; },
  syncPlayerPose,
  syncWorldFollowers
};
