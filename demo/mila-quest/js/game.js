import * as THREE from "../assets/lib/three.module.js";
import { GLTFLoader } from "../assets/lib/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "../assets/lib/jsm/utils/SkeletonUtils.js";
import { WORDS } from "./data.js";
import { KEY, NEED_CLEAN, PTS, HEROES, BOSSES, ST, WORLDS, ACH, INTRO } from "./config.js";

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
const def = () => ({ prog: {}, hero: 0, coins: 0, stars: 0, notebook: {}, known: {}, best: 0, runs: 0, ach: [], free: false, muted: false });
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
  ["s-load", "s-title", "s-help", "s-map", "hud", "modal", "s-nb", "s-jr", "s-end"].forEach((id) => $(id).classList.add("hidden"));
}
function showUI(id) { hideAll(); $(id).classList.remove("hidden"); }
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x62c8ff);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 120);
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
  scene.add(hemi, dir);
  scene.add(dir.target);
  return { hemi, dir };
}
function makeSky() {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(85, 20, 16),
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
      new THREE.ConeGeometry(7 + (i % 4) * 2.2, 5 + (i % 3) * 2.4, 6),
      new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
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

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
});

/* ===== LOADER ===== */
function normAsset(u) {
  try { u = decodeURI(u); } catch (e) {}
  return String(u || "").replace(/^\.\//, "").split("?")[0].replace(/\\/g, "/");
}
function resolveAsset(url) {
  if (!window.MQ_EMBED || !url) return url;
  if (String(url).indexOf("data:") === 0) return url;
  const n = normAsset(url);
  if (window.MQ_EMBED[n]) return window.MQ_EMBED[n];
  if ((n.includes("Textures/") || n.endsWith("colormap.png")) && loadCtx) {
    const tex = normAsset(loadCtx.replace(/\/[^/]+$/, "/") + "Textures/colormap.png");
    if (window.MQ_EMBED[tex]) return window.MQ_EMBED[tex];
  }
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
      if (o.material) {
        o.material.side = THREE.FrontSide;
      }
    }
  });
}
async function createActor(file, height, faceNegZ = true) {
  try {
    const gltf = await loadGLTF(file);
    const model = (gltf.animations && gltf.animations.length) ? SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
    prepMeshes(model);
    normalize(model, height);
    if (faceNegZ) model.rotation.y = Math.PI;
    const mixer = new THREE.AnimationMixer(model);
    const actions = {};
    for (const clip of gltf.animations || []) actions[clip.name] = mixer.clipAction(clip);
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
function playAnim(actor, name, fade = 0.16, once = false) {
  if (!actor || !actor.actions) return;
  if (!actor.actions[name]) {
    if (name === "sprint" && actor.actions.walk) name = "walk";
    else if (name === "crouch" && actor.actions.sit) name = "sit";
    else if (actor.actions.idle && name !== "idle") { /* keep request */ }
    if (!actor.actions[name]) return;
  }
  if (actor.current === name) return;
  const next = actor.actions[name];
  const prev = actor.current && actor.actions[actor.current];
  if (prev && prev !== next) prev.fadeOut(fade);
  next.reset().fadeIn(fade);
  next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
  next.clampWhenFinished = once;
  next.play();
  actor.current = name;
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
  const w = opt.w || 1024, h = opt.h || 448;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = opt.bg || "#ffe34a";
  roundRect(ctx, 8, 8, w - 16, h - 16, 48); ctx.fill();
  ctx.strokeStyle = opt.bd || "#140818";
  ctx.lineWidth = 36; ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.direction = /[\u0590-\u05FF]/.test(text) ? "rtl" : "ltr";
  let font = opt.font || 200;
  ctx.font = `800 ${font}px Rubik, Fredoka, Arial, sans-serif`;
  while (ctx.measureText(String(text)).width > w - 90 && font > 52) {
    font -= 8; ctx.font = `800 ${font}px Rubik, Fredoka, Arial, sans-serif`;
  }
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(12, font * 0.1);
  ctx.strokeStyle = "#fff8dc";
  ctx.strokeText(String(text), w / 2, h / 2, w - 90);
  ctx.fillStyle = opt.fg || "#140818";
  ctx.fillText(String(text), w / 2, h / 2, w - 90);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
function makeSign(text, big = true) {
  const g = new THREE.Group();
  const tex = makeTextTexture(text, big ? {} : { w: 640, h: 320, font: 180 });
  const W = big ? 2.24 : 1.2;
  const H = big ? 1.74 : 0.98;
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.14, H + 0.14, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x140818, roughness: 0.4, metalness: 0.25, emissive: 0x2a1848, emissiveIntensity: 0.22 })
  );
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.z = 0.09;
  g.add(back, face);
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.22), new THREE.MeshStandardMaterial({ color: 0x3a3550, metalness: 0.45, roughness: 0.45 }));
  body.position.y = 2.15;
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 8, 14), new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.75, roughness: 0.28, emissive: 0x886000, emissiveIntensity: 0.25 }));
  shackle.position.y = 2.48;
  g.add(body, shackle);
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
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true })
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
    const actor = await createActor(MP(HEROES[i].file), 1.45);
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
const SEG_LEN = 14, NSEG = 12;
let player = null;
let bossActor = null;
let run = null; // gameplay state
let paused = true;
let shakeT = 0;
const pathSegs = [];
const decors = [];
const coins = [];
const obstacles = [];
const gates = [];
const letters = [];
const particles = [];
let pathMat = null, stripeMat = null, sideMat = null;
let spaceStars = null;
let runSky = null, runHills = null, runSunDisk = null;

function buildPath() {
  pathMat = new THREE.MeshStandardMaterial({ color: WORLDS[0].pathA, roughness: 0.78 });
  stripeMat = new THREE.MeshBasicMaterial({ color: WORLDS[0].pathB });
  sideMat = new THREE.MeshStandardMaterial({ color: WORLDS[0].ground, roughness: 1 });
  for (let i = 0; i < NSEG; i++) {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.4, SEG_LEN), pathMat);
    mesh.position.y = -0.2; mesh.receiveShadow = true;
    const side = new THREE.Mesh(new THREE.BoxGeometry(22, 0.18, SEG_LEN), sideMat);
    side.position.y = -0.38; side.receiveShadow = true;
    g.add(side, mesh);
    [-1, 1].forEach((s) => {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, SEG_LEN * 0.92), stripeMat);
      stripe.position.set(s * 1.02, 0.02, 0);
      g.add(stripe);
    });
    runScene.add(g);
    pathSegs.push(g);
  }
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
  if (spaceStars) spaceStars.visible = world.id === 4;
  if (runSky) paintSky(runSky, world.sky, world.fog);
  if (runHills) runHills.children.forEach((h) => h.material.color.setHex(world.ground));
  if (runSunDisk) runSunDisk.visible = world.id !== 4;
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
  if (!runHills) runHills = addHills(runScene, WORLDS[0].ground);
  if (!runSunDisk) {
    runSunDisk = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 12, 12),
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

function layoutPath() {
  for (let i = 0; i < pathSegs.length; i++) pathSegs[i].position.z = -i * SEG_LEN;
}

async function ensureWorldAssets(world) {
  const files = [...world.decor, ...world.obstacle, ...world.extra, "platformer/coin-gold.glb", BOSSES[world.id - 1].file];
  for (const f of files) {
    try { await loadGLTF(MP(f)); } catch (e) { console.warn(e); }
  }
}

async function spawnDecor(world) {
  decors.forEach((d) => runScene.remove(d));
  decors.length = 0;
  for (let i = 0; i < 18; i++) {
    const f = world.decor[i % world.decor.length];
    const m = await createProp(MP(f), 1.9 + (i % 3) * 0.35);
    const side = i % 2 === 0 ? -1 : 1;
    m.position.set(side * (6.8 + (i % 4) * 0.4), 0, -6 - i * 7);
    m.rotation.y = Math.random() * Math.PI;
    runScene.add(m);
    decors.push(m);
  }
}

function buildGate(options) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b3a14, roughness: 0.42, metalness: 0.18, emissive: 0xffb020, emissiveIntensity: 0.22 });
  [-3.5, 3.5].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.44, 4.7, 0.44), mat);
    post.position.set(x, 2.35, 0); post.castShadow = true; g.add(post);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.4, 0.48), mat);
  beam.position.set(0, 4.62, 0); beam.castShadow = true; g.add(beam);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 5.0),
    new THREE.MeshBasicMaterial({ color: 0xffc83d, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  glow.position.set(0, 2.55, -0.06);
  glow.name = "gateGlow";
  g.add(glow);
  options.forEach((opt, i) => {
    const sign = makeSign(opt, true);
    sign.position.set(LANE_X[i], 2.58, 0.18);
    sign.name = "laneSign";
    g.add(sign);
  });
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
  if (mode === "memory") return "rev";
  return mode;
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
function setLaneOpts(opts) {
  const row = $("lane-opts");
  if (!row) return;
  if (!opts || !opts.length) { row.classList.add("hidden"); return; }
  row.classList.remove("hidden");
  opts.forEach((o, i) => {
    const el = $("lane-opt-" + i);
    if (el) el.textContent = o;
  });
}
function setPrompt(sub, q, emoji) {
  $("prompt-sub").textContent = sub || "";
  $("prompt-q").innerHTML = q || "";
  $("prompt-emoji").textContent = emoji || "";
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
    mode = ["tr", "pic", "let", "rev"][run.i % 4];
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
  } else if (mode === "pic") {
    opts = shuffle([w.en, ...distractors(w, "en", 2)]);
    ans = opts.indexOf(w.en);
    sub = "מה בתמונה? רצו אל השער הנכון";
    q = ""; emoji = w.pic;
  } else if (mode === "rev") {
    opts = shuffle([w.he, ...distractors(w, "he", 2)]);
    ans = opts.indexOf(w.he);
    sub = "מה פירוש המילה? האזינו";
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
  const z = player.z - (gates.length ? 20 : 12);
  const group = buildGate(opts);
  group.position.set(0, 0, z);
  runScene.add(group);
  gates.push({ group, z, ans, word: w, resolved: false });
}

function spawnLetterWord(w) {
  const E = w.en.toUpperCase().replace(/[^A-Z]/g, "");
  run.spell = { rest: E, idx: 0 };
  let z = player.z - 12;
  E.split("").forEach((ch, idx) => {
    const correctLane = Math.floor(Math.random() * 3);
    for (let lane = 0; lane < 3; lane++) {
      let glyph = ch;
      if (lane !== correctLane) {
        do { glyph = String.fromCharCode(65 + Math.floor(Math.random() * 26)); } while (glyph === ch);
      }
      const sign = makeSign(glyph, false);
      sign.scale.setScalar(1.15);
      sign.position.set(LANE_X[lane], 1.25 + Math.sin(idx) * 0.08, z);
      runScene.add(sign);
      letters.push({ mesh: sign, lane, ch: glyph, need: ch, index: idx, taken: false });
    }
    z -= 8;
  });
}

function spawnCoinRow(z) {
  const lane = Math.floor(Math.random() * 3);
  const mesh = run.coinProto ? run.coinProto.clone(true) : new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xffd24a, metalness: 0.6, roughness: 0.3 }));
  mesh.position.set(LANE_X[lane], 0.7, z);
  mesh.rotation.x = Math.PI / 2;
  runScene.add(mesh);
  coins.push({ mesh, taken: false });
}
function spawnObstacle(z) {
  const world = WORLDS[run.world - 1];
  const file = world.obstacle[Math.floor(Math.random() * world.obstacle.length)];
  const proto = run.obsProtos[file];
  const mesh = proto ? proto.clone(true) : new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x6b4423 }));
  const lane = Math.floor(Math.random() * 3);
  mesh.position.set(LANE_X[lane], 0, z);
  runScene.add(mesh);
  obstacles.push({ mesh, lane, type: "low", hit: false });
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
  if (player.lane === g.ans) onCorrect();
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

async function startLevel(wid, st, lost) {
  wid = wid || 1; st = st || 0;
  const world = WORLDS[wid - 1];
  if (!world) return false;
  if (!lost && !sOpen(wid - 1, st)) return false;
  hideModal();
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
    hint: 0, wrong: 0, firstTry: 0, hearts: 3, combo: 0, stumbleT: 0,
    bossHP: boss ? 5 : 0, bossMax: 5, nextCoinZ: -8, nextObsZ: -18
  };
  S.runs++; save(); grantAch("first_run");

  applyWorldTheme(world);
  layoutPath();
  clearDyn();
  await spawnDecor(world);
  run.coinProto = await createProp(MP("platformer/coin-gold.glb"), 0.42);
  run.obsProtos = {};
  for (const f of world.obstacle) run.obsProtos[f] = await createProp(MP(f), 0.7);

  player.lane = 1; player.z = 0; player.y = 0; player.vy = 0;
  player.jumping = false; player.sliding = false;
  player.group.position.set(0, 0, 0);
  playAnim(player, "sprint");
  runScene.add(player.group);

  if (boss) {
    const b = BOSSES[wid - 1];
    bossActor = await createActor(MP(b.file), b.height, true);
    bossActor.model.position.set(0, 0, -9);
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
  showModal(`<h2>${title}</h2><p>${boss ? "ענו נכון כדי להחליש את הבוס!" : (st === 0 && !lost ? INTRO[wid - 1] : "קדימה, אתם יכולים!")}</p>
    <button class="btn g" id="mgo">יוצאים לדרך ▶</button>`);
  $("mgo").onclick = () => { hideModal(); paused = false; playAnim(player, "sprint"); };
  return true;
}

async function ensurePlayer() {
  if (player && player.hero === S.hero) return;
  if (player && player.group.parent) player.group.parent.remove(player.group);
  const actor = await createActor(MP(HEROES[S.hero].file), 1.35);
  const group = new THREE.Group();
  group.add(actor.model);
  player = { ...actor, group, hero: S.hero, lane: 1, z: 0, y: 0, vy: 0, jumping: false, sliding: false, slideT: 0, current: null };
}

/* ===== INPUT ===== */
function changeLane(dir) {
  if (!player || paused || appMode !== "run") return;
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
    if (!paused) updateRunner(dt);
    else if (player.mixer) player.mixer.update(dt);
    updateKeyFx(dt);
    let sx = 0, sy = 0;
    if (shakeT > 0) { shakeT -= dt; sx = (Math.random() - 0.5) * 0.25; sy = (Math.random() - 0.5) * 0.18; }
    const ideal = new THREE.Vector3(player.group.position.x * 0.42 + sx, 3.45 + player.y * 0.25 + sy, player.z + 7.1);
    camera.position.lerp(ideal, 1 - Math.pow(0.0008, dt));
    camera.lookAt(player.group.position.x, 1.15 + player.y, player.z - 5);
    renderer.render(runScene, camera);
  }
}

function updateRunner(dt) {
  const world = WORLDS[run.world - 1];
  let speed = 8.2 * (1 + Math.min(0.42, run.combo * 0.028));
  if (run.stumbleT > 0) { run.stumbleT -= dt; speed *= 0.4; }
  player.z -= speed * dt;
  const tx = LANE_X[player.lane];
  player.group.position.x += (tx - player.group.position.x) * Math.min(1, dt * 11);
  player.group.position.z = player.z;
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
  player.group.position.y = player.y;
  if (player.mixer) player.mixer.update(dt);
  if (player.current === "fall" && run.stumbleT <= 0 && !player.jumping) playAnim(player, "sprint");
  emitTrail(dt);
  for (const gt of gates) {
    if (gt.resolved || !gt.group) continue;
    const glow = gt.group.getObjectByName("gateGlow");
    if (glow) glow.material.opacity = 0.11 + Math.sin(performance.now() * 0.006) * 0.09;
    gt.group.children.forEach((ch) => {
      if (ch.name === "laneSign") ch.position.y = 2.58 + Math.sin(performance.now() * 0.005) * 0.07;
    });
  }

  if (bossActor) {
    bossActor.model.position.z = player.z - 8.5;
    bossActor.model.position.x = Math.sin(performance.now() * 0.002) * 0.6;
    bossActor.model.position.y = Math.sin(performance.now() * 0.004) * 0.12;
    if (bossActor.mixer) bossActor.mixer.update(dt);
  }
  runLights.dir.position.set(10, 18, player.z + 8);
  runLights.dir.target.position.set(player.group.position.x, 0, player.z - 6);
  runLights.dir.target.updateMatrixWorld();
  if (runHills) {
    runHills.children.forEach((h) => {
      if (h.position.z > player.z + 22) h.position.z -= 84;
    });
  }
  if (runSunDisk) runSunDisk.position.set(18, 26, player.z - 40);

  pathSegs.forEach((s) => { if (s.position.z > player.z + SEG_LEN) s.position.z -= NSEG * SEG_LEN; });
  decors.forEach((d) => {
    if (d.position.z > player.z + 10) {
      d.position.z -= 18 * 7;
      d.position.x = (d.position.x > 0 ? 1 : -1) * (5.6 + Math.random() * 1.3);
    }
  });

  // coins / obstacles spawn
  if (player.z < run.nextCoinZ) {
    spawnCoinRow(player.z - 16);
    run.nextCoinZ -= 5 + Math.random() * 4;
  }
  if (player.z < run.nextObsZ) {
    spawnObstacle(player.z - 20);
    run.nextObsZ -= 11 + Math.random() * 6;
  }

  for (const c of coins) {
    if (c.taken) continue;
    c.mesh.rotation.z += dt * 3;
    if (c.mesh.position.z > player.z + 4) { c.taken = true; runScene.remove(c.mesh); continue; }
    const dx = c.mesh.position.x - player.group.position.x;
    const dz = c.mesh.position.z - player.z;
    if (dx * dx + dz * dz < 0.55 && player.y < 1.2) {
      c.taken = true; runScene.remove(c.mesh);
      S.coins += 1; run.coins += 1; run.score += 10; sfx.coin(); updateHud();
    }
  }
  for (const o of obstacles) {
    if (o.hit) continue;
    if (o.mesh.position.z > player.z + 4) { o.hit = true; runScene.remove(o.mesh); continue; }
    const dz = o.mesh.position.z - player.z;
    if (Math.abs(dz) < 0.55 && o.lane === player.lane) {
      if (o.type === "low" && player.y > 0.55) continue;
      o.hit = true; runScene.remove(o.mesh);
      run.stumbleT = 0.55; shakeT = 0.2; sfx.bad(); playAnim(player, "fall", 0.08, true);
    }
  }
  for (const g of gates) {
    if (!g.resolved && player.z < g.group.position.z + 0.45) resolveGate(g);
    if (g.resolved && g.group.parent && g.group.position.z > player.z + 6) runScene.remove(g.group);
  }
  if (run.activeMode === "build") {
    for (const L of letters) {
      if (L.taken) continue;
      if (L.mesh.position.z > player.z + 4) continue;
      const dz = L.mesh.position.z - player.z;
      if (Math.abs(dz) < 0.5 && L.lane === player.lane && player.y < 1.3) {
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

/* ===== BOOT ===== */
const ready = (async function boot() {
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
    "mini/character-knight.glb", "mini/character-robot.glb"
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

window.MQ = {
  ready,
  startLevel,
  goMapMode,
  goTitle,
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
  keysOwned: () => keysOwned()
};
