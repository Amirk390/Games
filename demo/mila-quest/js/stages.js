/* Mila Quest v8b — per-stage variety. Every stage of every world gets its own scene: a prop set
   (scattered beside the track + the recycled side decor), lighting / time of day, weather and sky
   extras. Props are tiny procedural models with shared materials, so mergeStatic() batches them
   into a handful of draw calls; LOW quality halves every count through N(). */
import * as THREE from "../assets/lib/three.module.js";
import { N, GFX } from "./gfx.js";
import { makeSmoothTree } from "./worldkit.js";
import { R, sideSpot, clearOfCourse, mat, stdMat, canvasTex, glowTex, makeTwinklePoints, makePalm, makeSnowPine, makeIceSpire, makeIgloo, makeAsteroid, makeCrystalCluster, makeLamp, makeBarrel, makeCrate, makeCannon, makeHouse, makeTower, makeMast } from "./themes.js";
import { makeCactus, makePyramid, makeObelisk, makeCoral, makeBrainCoral, makeSeaweed, makeLavaRock, makeVolcanoCone, makeTumbleweed, makeTorch } from "./worlds2.js";

const M = (key, color, o) => mat("st_" + key, () => stdMat(color, o));
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, n = 8, a, b, c, d) => new THREE.CylinderGeometry(rt, rb, h, n, a, b, c, d);
const SP = (r, a = 10, b = 8, c, d, e, f) => new THREE.SphereGeometry(r, a, b, c, d, e, f);
function mesh(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; }
function grp(...kids) { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; }
const glowSprite = (rgb, s, y) => { const h = new THREE.Sprite(mat("halo" + rgb, () => new THREE.SpriteMaterial({ map: glowTex(rgb, 0.85), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); h.scale.set(s, s, 1); h.position.y = y; return h; };
const basic = (key, color) => mat("stb_" + key, () => new THREE.MeshBasicMaterial({ color, toneMapped: false }));
const pickOf = (a) => a[(Math.random() * a.length) | 0];

const wood = () => M("wood", 0x8a5a30);
const darkWood = () => M("dwood", 0x5a3a1e);
const iron = () => M("iron", 0x2a2a30, { metalness: 0.6, roughness: 0.4 });
const stone = () => M("stone", 0xa8a090, { roughness: 0.9, flatShading: true });
const metal = () => M("metal", 0xb8bcc8, { metalness: 0.6, roughness: 0.35 });
const goldM = () => M("gold", 0xffc83d, { metalness: 0.7, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.3 });
const solarM = () => M("solar", 0x1a3a8a, { metalness: 0.5, roughness: 0.2, emissive: 0x0a1a5a, emissiveIntensity: 0.5 });
const snowM = () => M("snow", 0xffffff, { roughness: 0.6, emissive: 0xc8e4ff, emissiveIntensity: 0.15 });
const iceA = () => M("iceA", 0x9fe4ff, { roughness: 0.1, transparent: true, opacity: 0.85, emissive: 0x3aa8e0, emissiveIntensity: 0.4 });
const ruinM = () => M("ruin", 0xb8b098, { roughness: 0.9 });
const sandst = () => M("sandstone2", 0xd8a860, { roughness: 0.9, flatShading: true });
const boneM = () => M("bone", 0xf2ead8);
function animal(body, head, color) {
  const m = M("an" + color, color, { roughness: 0.8 });
  const g = grp();
  const b = mesh(SP(body), m, 0, body * 1.1, 0); b.scale.set(1, 0.85, 1.35); g.add(b);
  g.add(mesh(SP(head), m, 0, body * 1.6 + head * 0.4, body * 1.15));
  const eye = basic("eye", 0x111111);
  [-1, 1].forEach((s) => g.add(mesh(SP(head * 0.16, 6, 4), eye, s * head * 0.45, body * 1.7 + head * 0.5, body * 1.15 + head * 0.82)));
  return { g, m };
}

/* ============================ PROPS ============================ */
export const PROPS = {
  /* ---- forest / park ---- */
  tree: () => { const t = makeSmoothTree("jungle"); t.scale.setScalar(R(0.7, 1.05)); return t; },
  bigTree: () => { const t = makeSmoothTree("jungle"); t.scale.setScalar(R(1.1, 1.5)); return t; },
  bench: () => {
    const g = grp(mesh(B(1.8, 0.1, 0.5), wood(), 0, 0.5, 0), mesh(B(1.8, 0.45, 0.08), wood(), 0, 0.85, -0.24));
    [-0.75, 0.75].forEach((x) => g.add(mesh(B(0.08, 0.5, 0.45), iron(), x, 0.25, 0), mesh(B(0.08, 0.5, 0.08), iron(), x, 0.8, -0.24)));
    return g;
  },
  parkLamp: () => grp(mesh(C(0.06, 0.09, 3.0), iron(), 0, 1.5, 0), mesh(SP(0.26), basic("lampY", 0xfff0b0), 0, 3.15, 0), mesh(new THREE.ConeGeometry(0.3, 0.25, 6), iron(), 0, 3.42, 0), glowSprite("255,230,160", 1.6, 3.15)),
  flowerBed: () => {
    const g = grp(mesh(C(0.9, 1.0, 0.35, 10), M("bedStone", 0xb8a890), 0, 0.17, 0), mesh(C(0.82, 0.82, 0.05, 10), M("soil", 0x5a3a20), 0, 0.36, 0));
    const cols = [0xff5a8a, 0xffd23d, 0xffffff, 0xb070ff, 0xff8a3a];
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = (i % 3) * 0.28; g.add(mesh(SP(0.13, 6, 4), M("fl" + (i % 5), cols[i % 5], { emissive: cols[i % 5], emissiveIntensity: 0.15 }), Math.cos(a) * r, 0.5, Math.sin(a) * r)); }
    return g;
  },
  fence: () => { const w = M("fence", 0xf2f0e8); const g = grp(mesh(B(2.2, 0.08, 0.05), w, 0, 0.55, 0.04), mesh(B(2.2, 0.08, 0.05), w, 0, 0.25, 0.04)); for (let i = 0; i < 5; i++) g.add(mesh(B(0.1, 0.8, 0.06), w, -1 + i * 0.5, 0.4, 0)); return g; },
  bush: () => { const m = M("bush", 0x2f8a3a, { roughness: 0.9 }); const g = grp(); for (let i = 0; i < 3; i++) g.add(mesh(SP(R(0.45, 0.7), 8, 6), m, (i - 1) * 0.5, 0.4, R(-0.2, 0.2))); return g; },
  fountain: () => grp(mesh(C(1.6, 1.7, 0.5, 14), stone(), 0, 0.25, 0), mesh(C(1.45, 1.45, 0.06, 14), M("water", 0x4ab8e8, { roughness: 0.1, emissive: 0x1a4a6a, emissiveIntensity: 0.3 }), 0, 0.48, 0), mesh(C(0.2, 0.3, 1.4, 8), stone(), 0, 0.9, 0), mesh(C(0.6, 0.3, 0.2, 10), stone(), 0, 1.6, 0)),
  squirrel: () => { const a = animal(0.18, 0.13, 0xb8662a); const tail = mesh(SP(0.16, 8, 6), a.m, 0, 0.42, -0.32); tail.scale.set(0.8, 1.8, 0.8); a.g.add(tail); [-1, 1].forEach((s) => a.g.add(mesh(new THREE.ConeGeometry(0.04, 0.1, 4), a.m, s * 0.07, 0.48, 0.24))); a.g.scale.setScalar(2.6); a.g.userData.hop = 0.35; return a.g; },
  rabbit: () => { const a = animal(0.2, 0.14, 0xf2ece4); [-1, 1].forEach((s) => a.g.add(mesh(C(0.03, 0.04, 0.32, 5), a.m, s * 0.06, 0.6, 0.22))); a.g.add(mesh(SP(0.07, 6, 4), M("white", 0xffffff), 0, 0.26, -0.3)); a.g.scale.setScalar(2.6); a.g.userData.hop = 0.4; return a.g; },
  deer: () => {
    const m = M("deer", 0xa8642a); const g = grp();
    const b = mesh(SP(0.45), m, 0, 1.0, 0); b.scale.set(0.7, 0.7, 1.4); g.add(b);
    [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.4], [0.18, -0.4]].forEach(([x, z]) => g.add(mesh(C(0.05, 0.04, 0.8, 5), m, x, 0.42, z)));
    const neck = mesh(C(0.1, 0.13, 0.6, 6), m, 0, 1.35, 0.5); neck.rotation.x = 0.5; g.add(neck);
    g.add(mesh(SP(0.17, 8, 6), m, 0, 1.68, 0.68));
    const ant = M("antler", 0xe8d8b8);
    [-1, 1].forEach((s) => { const a1 = mesh(C(0.02, 0.03, 0.4, 4), ant, s * 0.1, 1.95, 0.64); a1.rotation.z = -s * 0.4; g.add(a1); });
    return g;
  },
  bird: () => { const a = animal(0.12, 0.09, 0x3a8ae8); a.g.add(mesh(new THREE.ConeGeometry(0.03, 0.08, 4), M("beak", 0xffb020), 0, 0.27, 0.26)); a.g.scale.setScalar(2.4); a.g.userData.hop = 0.25; return a.g; },
  mushroomGiant: () => { const h = R(1.6, 3.2); const g = grp(mesh(C(0.09 * h, 0.12 * h, h, 8), M("stem", 0xf4ead8), 0, h / 2, 0), mesh(SP(0.375 * h, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M("capR", 0xe8323a, { roughness: 0.6 }), 0, h * 0.95, 0)); for (let i = 0; i < 5; i++) { const a = i * 1.3; g.add(mesh(SP(0.04 * h, 6, 4), M("dots", 0xffffff), Math.cos(a) * 0.22 * h, h * 0.95 + 0.12 * h, Math.sin(a) * 0.22 * h)); } return g; },
  mushroomGlow: () => { const h = R(0.8, 1.6); return grp(mesh(C(0.08, 0.12, h, 6), M("stemG", 0xe8e0ff), 0, h / 2, 0), mesh(SP(0.4 * h, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M("capG", 0x7a4aff, { emissive: 0x9a6aff, emissiveIntensity: 0.9 }), 0, h, 0)); },
  log: () => { const l = mesh(C(0.3, 0.32, 2.4, 9), darkWood(), 0, 0.3, 0); l.rotation.z = Math.PI / 2; return grp(l); },
  stump: () => grp(mesh(C(0.4, 0.5, 0.6, 9), darkWood(), 0, 0.3, 0), mesh(C(0.4, 0.4, 0.03, 9), M("logEnd", 0xd8b078), 0, 0.61, 0)),
  pond: () => { const g = grp(); const w = mesh(new THREE.CircleGeometry(R(2, 3.4), 18), M("pond", 0x3a9ac8, { roughness: 0.08, metalness: 0.2, emissive: 0x0a3a5a, emissiveIntensity: 0.35 }), 0, 0.06, 0); w.rotation.x = -Math.PI / 2; g.add(w); for (let i = 0; i < 4; i++) { const p = mesh(new THREE.CircleGeometry(0.3, 8), M("lily", 0x3aa84a, { side: THREE.DoubleSide }), R(-1.2, 1.2), 0.09, R(-1.2, 1.2)); p.rotation.x = -Math.PI / 2; g.add(p); } g.add(mesh(SP(0.1, 6, 4), M("lilyF", 0xff9ad8), 0.4, 0.15, 0.3)); return g; },
  reeds: () => { const g = grp(); const m = M("reed", 0x6a8a3a); for (let i = 0; i < 6; i++) { const x = R(-0.4, 0.4), z = R(-0.4, 0.4); const r = mesh(C(0.02, 0.03, R(1, 1.8), 4), m, x, 0.6, z); r.rotation.z = R(-0.2, 0.2); g.add(r, mesh(C(0.05, 0.05, 0.25, 5), M("cat", 0x6a3a1a), x, 1.3, z)); } return g; },
  frog: () => { const a = animal(0.16, 0.13, 0x3ab84a); a.g.scale.setScalar(2.6); a.g.userData.hop = 0.3; return a.g; },
  rockPile: () => { const g = grp(); for (let i = 0; i < 3; i++) { const r = mesh(new THREE.DodecahedronGeometry(R(0.3, 0.7), 0), stone(), R(-0.5, 0.5), 0.25, R(-0.5, 0.5)); r.scale.y = 0.7; g.add(r); } return g; },
  ruinPillar: () => { const h = R(1.5, 4); return grp(mesh(C(0.4, 0.45, h, 10), ruinM(), 0, h / 2, 0), mesh(B(1.1, 0.3, 1.1), ruinM(), 0, h + 0.15, 0), mesh(SP(0.5, 6, 4), M("vine", 0x2f8a3a), 0.25, h * 0.6, 0.2)); },
  ruinArch: () => grp(mesh(B(0.7, 3.4, 0.7), ruinM(), -1.5, 1.7, 0), mesh(B(0.7, 3.4, 0.7), ruinM(), 1.5, 1.7, 0), mesh(B(3.9, 0.6, 0.8), ruinM(), 0, 3.7, 0), mesh(SP(0.6, 6, 4), M("vine", 0x2f8a3a), -1.2, 3.9, 0.3)),
  deadTree: (m) => { m = m || M("dead", 0x4a3a30); const g = grp(mesh(C(0.15, 0.3, 3.2, 6), m, 0, 1.6, 0)); [[0.6, 2.4, 0.7], [-0.6, 2.0, -0.8], [0.3, 2.9, 0.4]].forEach(([x, y, r]) => { const b = mesh(C(0.05, 0.1, 1.4, 5), m, x * 0.6, y, 0); b.rotation.z = -r; g.add(b); }); return g; },
  /* ---- pirate ---- */
  crateStack: () => { const a = makeCrate(0.9), b = makeCrate(0.85), c = makeCrate(0.8); b.position.x = 0.95; c.position.set(0.45, 0.9, 0); c.rotation.y = 0.3; return grp(a, b, c); },
  crateWall: () => { const g = grp(); for (let x = 0; x < 3; x++) for (let y = 0; y < 3 - (x % 2); y++) { const c = makeCrate(0.95); c.position.set(x * 0.98 - 1, y * 0.95, 0); g.add(c); } return g; },
  barrels: () => { const a = makeBarrel(), b = makeBarrel(), c = makeBarrel(); b.position.x = 0.8; c.position.set(0.4, 0.95, 0); return grp(a, b, c); },
  lanternPost: () => { const h = glowSprite("255,190,90", 1.7, 2.3); h.position.x = 0.55; return grp(mesh(C(0.07, 0.09, 2.6), darkWood(), 0, 1.3, 0), mesh(B(0.6, 0.06, 0.06), darkWood(), 0.3, 2.55, 0), mesh(B(0.26, 0.36, 0.26), basic("lantern", 0xffc060), 0.55, 2.3, 0), h); },
  netPile: () => { const n = mesh(SP(0.6, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat("st_net", () => new THREE.MeshStandardMaterial({ color: 0xc8a870, wireframe: true }))); n.scale.y = 0.6; const i = mesh(SP(0.45, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), M("netIn", 0x8a6a3a)); i.scale.y = 0.6; return grp(n, i); },
  helm: () => { const g = grp(mesh(B(0.3, 1.1, 0.3), darkWood(), 0, 0.55, 0), mesh(new THREE.TorusGeometry(0.55, 0.06, 6, 16), wood(), 0, 1.3, 0.2)); for (let i = 0; i < 4; i++) { const sp = mesh(C(0.03, 0.03, 1.4, 4), wood(), 0, 1.3, 0.2); sp.rotation.z = i * Math.PI / 4; g.add(sp); } return g; },
  telescope: () => { const g = grp(); [-0.25, 0, 0.25].forEach((x, i) => { const l = mesh(C(0.03, 0.03, 1.3, 4), darkWood(), x, 0.6, i === 1 ? -0.25 : 0.1); l.rotation.x = i === 1 ? 0.3 : -0.2; g.add(l); }); const t = mesh(C(0.08, 0.13, 1.2, 10), M("brass", 0xd8a840, { metalness: 0.7, roughness: 0.3 }), 0, 1.35, 0); t.rotation.x = 1.1; g.add(t); return g; },
  mapTable: () => { const g = grp(mesh(B(1.4, 0.08, 0.9), wood(), 0, 0.9, 0)); [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].forEach(([x, z]) => g.add(mesh(B(0.08, 0.9, 0.08), darkWood(), x, 0.45, z))); const mp = mesh(new THREE.PlaneGeometry(1.1, 0.7), M("map", 0xf0dca0), 0, 0.95, 0); mp.rotation.x = -Math.PI / 2; g.add(mp, mesh(C(0.05, 0.05, 0.25, 6), basic("candle", 0xfff4d0), 0.5, 1.07, 0.3)); return g; },
  chest: () => { const lid = mesh(C(0.3, 0.3, 0.9, 10, 1, false, 0, Math.PI), wood(), 0, 0.5, 0); lid.rotation.z = Math.PI / 2; return grp(mesh(B(0.9, 0.5, 0.6), wood(), 0, 0.25, 0), lid, mesh(B(0.94, 0.08, 0.64), goldM(), 0, 0.45, 0), mesh(SP(0.3, 8, 6), M("coins", 0xffd84a, { metalness: 0.8, roughness: 0.25, emissive: 0x8a6a00, emissiveIntensity: 0.4 }), 0.6, 0.1, 0.2)); },
  anchor: () => { const m = iron(); const arc = mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 12, Math.PI), m, 0, 0.5, 0); arc.rotation.z = Math.PI; const g = grp(mesh(C(0.07, 0.07, 1.6, 6), m, 0, 0.9, 0), arc, mesh(new THREE.TorusGeometry(0.15, 0.04, 6, 10), m, 0, 1.8, 0), mesh(B(0.8, 0.08, 0.08), m, 0, 1.45, 0)); g.rotation.z = 0.3; return grp(g); },
  cannon: () => makeCannon(),
  pier: () => { const g = grp(mesh(B(3, 0.15, 7), wood(), 0, 2.9, 0)); [[-1.3, -3], [1.3, -3], [-1.3, 3], [1.3, 3], [-1.3, 0], [1.3, 0]].forEach(([x, z]) => g.add(mesh(C(0.14, 0.14, 4, 6), darkWood(), x, 1.0, z))); return g; },
  palm: () => makePalm(R(4.5, 7)),
  sandIsle: () => { const r = R(6, 11); const m = mesh(SP(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M("sand", 0xf0d79a, { roughness: 0.95 })); m.scale.set(r, R(1.6, 2.6), r * 0.8); const g = grp(m); for (let k = 0; k < 2; k++) { const p = makePalm(R(5, 7)); p.position.set(R(-r * 0.3, r * 0.3), 1.2, R(-r * 0.2, r * 0.2)); g.add(p); } const c = PROPS.chest(); c.position.set(1, 1.5, 1); g.add(c); return g; },
  lifebuoy: () => { const g = grp(mesh(new THREE.TorusGeometry(0.35, 0.1, 8, 16), M("buoy", 0xffffff), 0, 0.85, 0), mesh(B(0.1, 1.3, 0.1), darkWood(), 0, 0.65, -0.14)); for (let i = 0; i < 4; i++) { const s = mesh(new THREE.TorusGeometry(0.35, 0.105, 8, 3, 0.4), M("buoyR", 0xe8323a), 0, 0.85, 0); s.rotation.z = i * Math.PI / 2; g.add(s); } return g; },
  mast: () => makeMast(GFX.level === "high"),
  rockSea: () => { const r = mesh(new THREE.DodecahedronGeometry(R(1, 2.6), 0), M("seaRock", 0x6a6e74, { roughness: 0.9, flatShading: true })); r.scale.y = R(0.7, 1.4); return grp(r); },
  /* ---- magic ---- */
  stall: () => { const c = pickOf([0xe8323a, 0x3a8ae8, 0xffb020, 0x9a4ad8]); const aw = mesh(B(2.2, 0.08, 1.4), M("awn" + c, c), 0, 2.2, 0.15); aw.rotation.x = -0.25; const g = grp(mesh(B(2, 0.9, 1), wood(), 0, 0.45, 0), aw); [-0.9, 0.9].forEach((x) => g.add(mesh(B(0.08, 2.2, 0.08), darkWood(), x, 1.1, 0.45))); for (let i = 0; i < 4; i++) g.add(mesh(SP(0.14, 6, 4), M("fruit" + (i % 3), [0xff5a3a, 0xffd23d, 0x7ad84a][i % 3]), -0.6 + i * 0.4, 1.0, 0.2)); return g; },
  balloons: () => { const cols = [0xff5a8a, 0x5ab8ff, 0xffd23d, 0x9aff7a, 0xc07aff]; const g = grp(mesh(C(0.01, 0.01, 2.6, 3), M("string", 0xffffff), 0, 1.3, 0)); for (let i = 0; i < 5; i++) { const b = mesh(SP(0.3, 10, 8), M("bal" + i, cols[i], { roughness: 0.3, emissive: cols[i], emissiveIntensity: 0.2 }), R(-0.5, 0.5), 2.6 + R(0, 0.8), R(-0.3, 0.3)); b.scale.y = 1.2; g.add(b); } g.userData.bob = 0.25; return g; },
  glowTree: () => { const h = R(3, 5); const c = pickOf([0xc86aff, 0x6ad8ff, 0xff7ad8]); const g = grp(mesh(C(0.14, 0.24, h, 7), M("gtrunk", 0x3a2a4a), 0, h / 2, 0)); for (let i = 0; i < 3; i++) g.add(mesh(SP(R(0.8, 1.3)), M("gleaf" + c, c, { emissive: c, emissiveIntensity: 0.55, roughness: 0.6 }), R(-0.5, 0.5), h + R(-0.4, 0.6), R(-0.5, 0.5))); return g; },
  castlePillar: () => { const m = M("marble", 0xe8e0f0, { roughness: 0.4 }); return grp(mesh(C(0.45, 0.5, 6, 12), m, 0, 3, 0), mesh(B(1.2, 0.3, 1.2), m, 0, 6.15, 0), mesh(B(1.2, 0.3, 1.2), m, 0, 0.15, 0)); },
  banner: () => grp(mesh(C(0.05, 0.05, 4.2, 6), goldM(), 0, 2.1, 0), mesh(new THREE.PlaneGeometry(0.9, 2), M("bannerR", 0xb0203a, { side: THREE.DoubleSide }), 0.47, 3.0, 0), mesh(new THREE.CircleGeometry(0.25, 12), goldM(), 0.47, 3.2, 0.01)),
  candles: () => { const g = grp(mesh(C(0.04, 0.12, 1.4, 6), goldM(), 0, 0.7, 0), mesh(B(0.7, 0.04, 0.04), goldM(), 0, 1.4, 0), glowSprite("255,200,110", 1.3, 1.8)); [-0.3, 0, 0.3].forEach((x) => g.add(mesh(C(0.05, 0.05, 0.3, 6), M("wax", 0xfff8e8), x, 1.55, 0), mesh(new THREE.ConeGeometry(0.05, 0.14, 6), basic("flameY", 0xffd060), x, 1.78, 0))); return g; },
  torchBlue: () => makeTorch(0x6ad8ff),
  torch: () => makeTorch(),
  crystal: () => makeCrystalCluster(R(1.4, 2.6), pickOf([0xb070ff, 0x5ad8ff, 0xff70c8, 0x70ffb0])),
  crystalBig: () => makeCrystalCluster(R(3, 5), pickOf([0xb070ff, 0x5ad8ff, 0xff70c8])),
  crystalFlower: () => { const c = pickOf([0xff8ad8, 0x8ad8ff, 0xffe08a]); const g = grp(mesh(C(0.03, 0.04, 1.0, 4), M("cstem", 0x5ad88a), 0, 0.5, 0)); for (let i = 0; i < 5; i++) { const p = mesh(new THREE.OctahedronGeometry(0.16, 0), M("cpet" + c, c, { emissive: c, emissiveIntensity: 0.7, roughness: 0.2 }), Math.cos(i * 1.26) * 0.16, 1.05, Math.sin(i * 1.26) * 0.16); p.scale.y = 1.6; g.add(p); } g.scale.setScalar(1.6); return g; },
  bookshelf: () => { const cols = [0xb0203a, 0x2a5ab0, 0x2a8a4a, 0xd8a020, 0x6a3a9a]; const g = grp(mesh(B(1.8, 2.6, 0.5), darkWood(), 0, 1.3, 0)); for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) g.add(mesh(B(0.22, 0.45, 0.32), M("book" + ((r + i) % 5), cols[(r + i) % 5]), -0.7 + i * 0.28, 0.35 + r * 0.6, 0.12)); return g; },
  floatBook: () => { const c = pickOf([0xb0203a, 0x2a5ab0, 0xd8a020]); const pg = mesh(new THREE.PlaneGeometry(0.55, 0.4), M("page", 0xfff8e8, { side: THREE.DoubleSide, emissive: 0xfff0c0, emissiveIntensity: 0.3 }), 0, 2.27, 0); pg.rotation.x = -Math.PI / 2; const g = grp(mesh(B(0.6, 0.1, 0.45), M("bk" + c, c), 0, 2.2, 0), pg); g.userData.bob = 0.35; return g; },
  orb: () => grp(mesh(C(0.2, 0.35, 1.2, 8), stone(), 0, 0.6, 0), mesh(SP(0.38, 14, 10), M("orb", 0xc080ff, { emissive: 0xa060ff, emissiveIntensity: 1.1, roughness: 0.1, transparent: true, opacity: 0.9 }), 0, 1.6, 0), glowSprite("190,130,255", 2.2, 1.6)),
  house: () => makeHouse(R(3, 4.5), R(3, 4.5), R(3, 6), R(1.6, 2.6), (Math.random() * 6) | 0),
  tower: () => makeTower(R(1.1, 1.6), R(7, 11), (Math.random() * 6) | 0),
  magicLamp: () => makeLamp(),
  /* ---- space ---- */
  asteroidBig: () => { const a = makeAsteroid(R(2, 4.5)); a.rotation.set(R(0, 6), R(0, 6), 0); a.position.y = R(1, 6); const g = grp(a); g.userData.spin = 0.15; return g; },
  dome: () => grp(mesh(SP(2.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M("domeG", 0xa8d8ff, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75, emissive: 0x2a6aa8, emissiveIntensity: 0.4 })), mesh(C(2.3, 2.4, 0.4, 18), metal(), 0, 0.2, 0), mesh(B(0.9, 1.1, 1), metal(), 0, 0.55, 2.2), mesh(B(0.5, 0.7, 0.05), basic("door", 0x6ad8ff), 0, 0.55, 2.72)),
  antenna: () => { const d = mesh(SP(0.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.5), M("dish", 0xe8eaf0, { side: THREE.DoubleSide, metalness: 0.4, roughness: 0.3 }), 0, 3.4, 0); d.rotation.x = -2.2; return grp(mesh(C(0.08, 0.12, 3.4, 6), metal(), 0, 1.7, 0), d, mesh(SP(0.1, 6, 4), basic("redLight", 0xff3030), 0, 3.6, 0)); },
  solarPanel: () => { const p = mesh(B(2.2, 0.06, 1.2), solarM(), 0, 1.25, 0); p.rotation.x = -0.5; return grp(mesh(C(0.06, 0.06, 1.2, 6), metal(), 0, 0.6, 0), p); },
  moonFlag: () => grp(mesh(C(0.03, 0.03, 2.2, 6), metal(), 0, 1.1, 0), mesh(new THREE.PlaneGeometry(0.9, 0.6), M("flagW", 0xffffff, { side: THREE.DoubleSide }), 0.45, 1.85, 0), mesh(B(0.9, 0.08, 0.01), M("flagB", 0x2a5ad8), 0.45, 2.05, 0.005), mesh(B(0.9, 0.08, 0.01), M("flagB", 0x2a5ad8), 0.45, 1.65, 0.005)),
  moonRock: () => { const r = mesh(new THREE.DodecahedronGeometry(R(0.5, 1.4), 0), M("moonRock", 0x9a9aa4, { roughness: 1, flatShading: true }), 0, 0.3, 0); r.scale.y = 0.6; return grp(r); },
  crater: () => { const r = mesh(new THREE.TorusGeometry(R(1.4, 2.4), 0.35, 6, 16), M("moonRock", 0x9a9aa4, { roughness: 1, flatShading: true }), 0, 0.05, 0); r.rotation.x = Math.PI / 2; r.scale.z = 0.5; return grp(r); },
  alienPlant: () => { const c = pickOf([0x40ff9a, 0xff60d0, 0x60c0ff]); const m = M("aStem", 0x2a6a5a); const g = grp(); for (let i = 0; i < 3; i++) { const h = R(1.2, 2.6); const s = mesh(C(0.04, 0.08, h, 5), m, (i - 1) * 0.3, h / 2, 0); s.rotation.z = (i - 1) * 0.3; g.add(s, mesh(SP(0.22, 8, 6), M("aBulb" + c, c, { emissive: c, emissiveIntensity: 1 }), (i - 1) * (0.3 + h * 0.15), h, 0)); } g.scale.setScalar(1.4); return g; },
  alienPod: () => { const c = pickOf([0xff8a3a, 0xb06aff]); const p = mesh(SP(0.9, 12, 10), M("pod" + c, c, { emissive: c, emissiveIntensity: 0.5, roughness: 0.4 }), 0, 0.8, 0); p.scale.y = 1.4; const g = grp(p); for (let i = 0; i < 4; i++) { const l = mesh(new THREE.ConeGeometry(0.25, 1.4, 5), M("aStem", 0x2a6a5a), Math.cos(i * 1.57) * 0.7, 0.4, Math.sin(i * 1.57) * 0.7); l.rotation.set(Math.sin(i * 1.57) * 0.6, 0, -Math.cos(i * 1.57) * 0.6); g.add(l); } return g; },
  satellite: () => { const g = grp(mesh(B(0.8, 0.8, 1.2), goldM()), mesh(C(0.02, 0.02, 0.8, 4), iron(), 0, 0.6, 0)); [-1, 1].forEach((s) => g.add(mesh(B(2, 0.05, 0.8), solarM(), s * 1.45, 0, 0))); g.position.y = R(3, 7); const w = grp(g); w.userData.spin = 0.25; return w; },
  ufo: () => { const d = mesh(SP(1.2, 16, 8), M("ufo", 0xc8ccd8, { metalness: 0.7, roughness: 0.25 })); d.scale.y = 0.3; const g = grp(d, mesh(SP(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M("ufoTop", 0x8af0ff, { emissive: 0x2ab8d8, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }), 0, 0.2, 0)); for (let i = 0; i < 6; i++) g.add(mesh(SP(0.09, 6, 4), basic("ufoL" + (i % 2), i % 2 ? 0xffe040 : 0xff40a0), Math.cos(i * 1.05) * 1.1, -0.05, Math.sin(i * 1.05) * 1.1)); g.position.y = R(4, 7); const w = grp(g); w.userData.bob = 0.6; return w; },
  station: () => { const r = mesh(new THREE.TorusGeometry(3.4, 0.35, 8, 28), metal()); const bar = mesh(C(0.4, 0.4, 6.8, 8), metal()); bar.rotation.z = Math.PI / 2; const g = grp(r, bar, mesh(SP(0.9, 12, 8), goldM())); g.position.y = 9; g.rotation.x = 1.2; const w = grp(g); w.userData.spin = 0.12; return w; },
  rover: () => { const g = grp(mesh(B(1.4, 0.4, 0.9), metal(), 0, 0.6, 0), mesh(B(0.4, 0.3, 0.3), solarM(), 0, 0.95, 0)); [[-0.55, 0.5], [0.55, 0.5], [-0.55, -0.5], [0.55, -0.5]].forEach(([x, z]) => { const w = mesh(C(0.22, 0.22, 0.15, 10), M("tyre", 0x2a2a2a), x, 0.25, z); w.rotation.x = Math.PI / 2; g.add(w); }); return g; },
  /* ---- ice ---- */
  pine: () => makeSnowPine(R(2.6, 5)),
  igloo: () => makeIgloo(),
  snowman: () => { const car = mesh(new THREE.ConeGeometry(0.06, 0.3, 6), M("carrot", 0xff7a1a), 0, 1.8, 0.35); car.rotation.x = Math.PI / 2; const sc = mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 12), M("scarf", 0xe8323a), 0, 1.55, 0); sc.rotation.x = Math.PI / 2; return grp(mesh(SP(0.55, 12, 10), snowM(), 0, 0.5, 0), mesh(SP(0.4, 12, 10), snowM(), 0, 1.25, 0), mesh(SP(0.28, 12, 10), snowM(), 0, 1.8, 0), car, mesh(C(0.2, 0.22, 0.32, 10), M("hat", 0x1a1a1a), 0, 2.15, 0), sc); },
  penguin: () => { const b = mesh(SP(0.3), M("peng", 0x1a1a2a), 0, 0.4, 0); b.scale.y = 1.5; const f = mesh(SP(0.24), M("white", 0xffffff), 0, 0.38, 0.1); f.scale.y = 1.4; const bk = mesh(new THREE.ConeGeometry(0.05, 0.14, 4), M("beak", 0xffb020), 0, 0.88, 0.22); bk.rotation.x = Math.PI / 2; const g = grp(b, f, mesh(SP(0.2, 8, 6), M("peng", 0x1a1a2a), 0, 0.9, 0), bk); g.scale.setScalar(1.3); g.userData.hop = 0.15; return g; },
  fishingHole: () => { const h = mesh(new THREE.CircleGeometry(0.6, 14), M("hole", 0x0a3a5a, { roughness: 0.05 }), 0, 0.04, 0); h.rotation.x = -Math.PI / 2; const t = mesh(new THREE.TorusGeometry(0.62, 0.1, 6, 14), snowM(), 0, 0.05, 0); t.rotation.x = Math.PI / 2; const rod = mesh(C(0.02, 0.03, 1.6, 4), darkWood(), 0.5, 0.7, 0); rod.rotation.z = 0.7; return grp(h, t, rod); },
  iceLake: () => { const l = mesh(new THREE.CircleGeometry(R(5, 9), 20), M("lakeIce", 0xbfeaff, { roughness: 0.05, metalness: 0.2, emissive: 0x3a8ac0, emissiveIntensity: 0.25 }), 0, 0.03, 0); l.rotation.x = -Math.PI / 2; return grp(l); },
  iceSpire: () => makeIceSpire(R(2, 4.5)),
  iceArch: () => grp(mesh(new THREE.TorusGeometry(2.4, 0.45, 8, 16, Math.PI), iceA())),
  icicleRock: () => { const g = grp(mesh(new THREE.DodecahedronGeometry(R(1, 2), 0), M("iceRock", 0x7a9ab8, { roughness: 0.4, flatShading: true }), 0, 0.6, 0)); for (let i = 0; i < 4; i++) g.add(mesh(new THREE.ConeGeometry(0.15, 0.9, 5), iceA(), R(-0.8, 0.8), 1.5, R(-0.8, 0.8))); return g; },
  sled: () => grp(mesh(B(0.7, 0.1, 1.5), M("sled", 0xc0392b), 0, 0.35, 0), mesh(B(0.05, 0.3, 1.6), iron(), -0.3, 0.15, 0), mesh(B(0.05, 0.3, 1.6), iron(), 0.3, 0.15, 0)),
  iceLantern: () => grp(mesh(B(0.5, 0.8, 0.5), iceA(), 0, 0.4, 0), mesh(SP(0.14, 6, 4), basic("candleF", 0xffd890), 0, 0.45, 0), glowSprite("255,210,140", 1.4, 0.5)),
  snowRock: () => { const r = mesh(new THREE.DodecahedronGeometry(R(0.6, 1.4), 0), M("sRock", 0x8a9aaa, { roughness: 0.9, flatShading: true }), 0, 0.3, 0); r.scale.y = 0.7; const s = mesh(SP(R(0.6, 1.2), 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), snowM(), 0, 0.55, 0); s.scale.y = 0.4; return grp(r, s); },
  /* ---- desert ---- */
  cactus: () => makeCactus(R(1.6, 3.4)),
  tent: () => { const c = pickOf([0xe8d8b0, 0xc84a3a, 0x3a6ab0]); const t = mesh(new THREE.ConeGeometry(1.6, 2.2, 4), M("tent" + c, c, { roughness: 0.9, side: THREE.DoubleSide }), 0, 1.1, 0); t.rotation.y = Math.PI / 4; return grp(t, mesh(new THREE.PlaneGeometry(0.7, 1.1), M("tentDoor", 0x3a2a1a, { side: THREE.DoubleSide }), 0, 0.55, 1.14)); },
  camel: () => { const m = M("camel", 0xc8945a); const b = mesh(SP(0.55), m, 0, 1.4, 0); b.scale.set(0.7, 0.6, 1.4); const n = mesh(C(0.1, 0.14, 0.9, 6), m, 0, 1.85, 0.75); n.rotation.x = 0.7; const g = grp(b, mesh(SP(0.38), m, 0, 1.85, -0.1), n, mesh(SP(0.2, 8, 6), m, 0, 2.2, 1.05), mesh(B(0.8, 0.12, 0.6), M("blanket", 0xc0392b), 0, 1.75, 0.25)); [[-0.2, 0.5], [0.2, 0.5], [-0.2, -0.5], [0.2, -0.5]].forEach(([x, z]) => g.add(mesh(C(0.07, 0.06, 1.2, 5), m, x, 0.6, z))); return g; },
  amphora: () => { const c = pickOf([0xb8642a, 0xd88a4a]); const p = mesh(SP(0.32), M("pot" + c, c, { roughness: 0.8 }), 0, 0.38, 0); p.scale.y = 1.3; return grp(p, mesh(C(0.1, 0.14, 0.3, 8), M("pot" + c, c, { roughness: 0.8 }), 0, 0.85, 0)); },
  obelisk: () => makeObelisk(R(4, 7)),
  pyramidSmall: () => makePyramid(R(8, 14)),
  sphinx: () => { const m = sandst(); const g = grp(mesh(B(2.2, 1.4, 5), m, 0, 0.7, 0), mesh(B(1.6, 1.8, 1.6), m, 0, 2.1, 2.0), mesh(B(2.2, 1.6, 0.4), M("nemes", 0x3a6ab0), 0, 2.1, 1.4)); [-0.6, 0.6].forEach((x) => g.add(mesh(B(0.5, 0.3, 1.8), m, x, 0.15, 3.2))); return g; },
  sandPillar: () => { const h = R(3, 5); return grp(mesh(C(0.45, 0.5, h, 10), sandst(), 0, h / 2, 0), mesh(C(0.75, 0.45, 0.5, 10), sandst(), 0, h + 0.25, 0)); },
  sandArch: () => grp(mesh(B(0.8, 4, 0.8), sandst(), -1.6, 2, 0), mesh(B(0.8, 4, 0.8), sandst(), 1.6, 2, 0), mesh(B(4.2, 0.7, 1), sandst(), 0, 4.3, 0)),
  tumbleweed: () => { const t = makeTumbleweed(R(0.35, 0.6)); t.position.y = 0.45; const g = grp(t); g.userData.roll = 1; return g; },
  oasis: () => { const g = PROPS.pond(); for (let i = 0; i < 2; i++) { const p = makePalm(R(4.5, 6)); p.position.set(R(-2, 2), 0, i ? 2.6 : -2.6); g.add(p); } return g; },
  dune: () => { const d = mesh(SP(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M("duneM", 0xe2b874, { roughness: 1 })); d.scale.set(R(4, 9), R(1, 2.6), R(3, 6)); return grp(d); },
  skull: () => { const m = boneM(); const s = mesh(SP(0.35), m, 0, 0.3, 0); s.scale.set(1, 0.8, 1.3); const g = grp(s); [-1, 1].forEach((x) => { const h = mesh(new THREE.ConeGeometry(0.08, 0.7, 6), m, x * 0.45, 0.45, 0.1); h.rotation.z = -x * 1.1; g.add(h); }); g.scale.setScalar(1.4); return g; },
  /* ---- ocean ---- */
  coral: () => makeCoral(R(1.2, 2.4), pickOf([0xff6a8a, 0xffa040, 0xb070ff, 0x40d0c0, 0xffe060])),
  brainCoral: () => makeBrainCoral(R(0.6, 1.3), pickOf([0xff8a6a, 0xffd060, 0xc080ff])),
  kelp: () => { const k = makeSeaweed(R(5, 9), 0x3a9a3a); k.userData.sway = 1; return k; },
  seaweed: () => makeSeaweed(R(1.6, 3)),
  wreck: () => { const hm = M("wreckWood", 0x4a3a2a, { roughness: 0.9, side: THREE.DoubleSide }); const hull = mesh(C(2.2, 1.4, 10, 10, 1, true, 0, Math.PI), hm, 0, 1.2, 0); hull.rotation.set(Math.PI / 2, 0, Math.PI); const mst = mesh(C(0.15, 0.2, 7, 6), hm, 0.6, 3.2, 1); mst.rotation.z = 0.6; const g = grp(hull, mst, mesh(B(4.2, 0.2, 9.4), hm, 0, 1.4, 0)); g.rotation.z = 0.25; return grp(g); },
  giantShell: () => { const c = pickOf([0xffc8d8, 0xffe8c8]); const sm = M("shell" + c, c, { roughness: 0.4, side: THREE.DoubleSide }); const b = mesh(SP(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), sm, 0, 0.05, 0); b.scale.set(1.2, 0.5, 1); const t = mesh(SP(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), sm, 0, 0.3, -0.7); t.scale.set(1.2, 0.5, 1); t.rotation.x = -1.0; return grp(b, t, mesh(SP(0.3, 14, 10), M("pearl", 0xffffff, { roughness: 0.1, metalness: 0.3, emissive: 0xc8d8ff, emissiveIntensity: 0.5 }), 0, 0.5, 0.1), glowSprite("230,240,255", 1.6, 0.55)); },
  jelly: () => { const c = pickOf([0xff8ad8, 0x8ad8ff, 0xc89aff]); const jm = M("jel" + c, c, { emissive: c, emissiveIntensity: 0.9, transparent: true, opacity: 0.75 }); const g = grp(mesh(SP(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), jm)); for (let i = 0; i < 5; i++) g.add(mesh(C(0.02, 0.01, 1.4, 3), jm, Math.cos(i * 1.26) * 0.3, -0.7, Math.sin(i * 1.26) * 0.3)); g.position.y = R(2.5, 6); const w = grp(g); w.userData.bob = 0.7; return w; },
  researchDome: () => { const g = PROPS.dome(); for (let i = 0; i < 4; i++) g.add(mesh(SP(0.18, 8, 6), basic("porth", 0xffe08a), Math.cos(i * 0.8 - 1.2) * 2.1, 1.0, Math.sin(i * 0.8 - 1.2) * 2.1)); return g; },
  pipe: () => { const p = mesh(C(0.3, 0.3, 6, 10), M("pipe", 0xd8a020, { metalness: 0.5, roughness: 0.4 }), 0, 0.35, 0); p.rotation.x = Math.PI / 2; const g = grp(p); [-2.5, 0, 2.5].forEach((z) => g.add(mesh(B(0.8, 0.4, 0.3), iron(), 0, 0.2, z))); return g; },
  submarine: () => { const sm = M("sub", 0xffd23d, { metalness: 0.3, roughness: 0.4 }); const b = mesh(SP(1, 16, 10), sm); b.scale.set(1, 1, 2.4); const prop = mesh(new THREE.ConeGeometry(0.4, 0.6, 4), iron(), 0, 0, -2.5); prop.rotation.x = -Math.PI / 2; const g = grp(b, mesh(B(0.6, 0.8, 1.2), sm, 0, 1.0, 0), prop); [-0.6, 0, 0.6].forEach((z) => { const w = mesh(new THREE.CircleGeometry(0.22, 12), basic("porth", 0xffe08a), 1.01, 0.1, z); w.rotation.y = Math.PI / 2; g.add(w); }); g.position.y = 4; const w = grp(g); w.userData.bob = 0.4; return w; },
  vent: () => { const v = mesh(new THREE.CircleGeometry(0.4, 10), basic("ventGlow", 0xff7a30), 0, 2.21, 0); v.rotation.x = -Math.PI / 2; return grp(mesh(C(0.4, 1.0, 2.2, 8), M("ventR", 0x2a2a2e, { roughness: 1, flatShading: true }), 0, 1.1, 0), v, glowSprite("255,130,60", 2.4, 2.6)); },
  glowAnemone: () => { const c = pickOf([0x40ffd0, 0xff60c0]); const g = grp(); for (let i = 0; i < 7; i++) { const t = mesh(C(0.03, 0.06, 0.8, 4), M("anem" + c, c, { emissive: c, emissiveIntensity: 1.1 }), Math.cos(i * 0.9) * 0.2, 0.4, Math.sin(i * 0.9) * 0.2); t.rotation.set(Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4); g.add(t); } g.scale.setScalar(1.6); return g; },
  rockOcean: () => { const r = mesh(new THREE.DodecahedronGeometry(R(0.8, 2.2), 0), M("oRock", 0x4a5a64, { roughness: 0.95, flatShading: true }), 0, 0.3, 0); r.scale.y = R(0.6, 1.3); return grp(r); },
  /* ---- volcano ---- */
  lavaRock: () => makeLavaRock(R(0.6, 1.8)),
  lavaPool: () => { const rad = R(1.5, 3); const p = mesh(new THREE.CircleGeometry(rad, 16), basic("lavaPool", 0xff6a1a), 0, 0.05, 0); p.rotation.x = -Math.PI / 2; const rim = mesh(new THREE.TorusGeometry(rad, 0.3, 6, 16), M("lavaRim", 0x2a1a14, { roughness: 1, flatShading: true }), 0, 0.05, 0); rim.rotation.x = Math.PI / 2; return grp(p, rim, glowSprite("255,120,40", 4, 0.6)); },
  dino: () => {
    const c = pickOf([0x5aa84a, 0x8a6ad8, 0x3a8ab0]); const m = M("dino" + c, c, { roughness: 0.7 });
    const b = mesh(SP(1, 12, 8), m, 0, 1.6, 0); b.scale.set(0.8, 0.75, 1.5);
    const n = mesh(C(0.16, 0.3, 2.4, 7), m, 0, 2.8, 1.4); n.rotation.x = 0.6;
    const t = mesh(new THREE.ConeGeometry(0.3, 2.4, 7), m, 0, 1.4, -2.1); t.rotation.x = -1.9;
    const g = grp(b, n, mesh(SP(0.32), m, 0, 3.85, 2.1), t);
    [[-0.4, 0.6], [0.4, 0.6], [-0.4, -0.6], [0.4, -0.6]].forEach(([x, z]) => g.add(mesh(C(0.18, 0.16, 1.1, 6), m, x, 0.55, z)));
    [-0.15, 0.15].forEach((x) => g.add(mesh(SP(0.05, 6, 4), basic("eye", 0x111111), x, 3.95, 2.35)));
    return g;
  },
  fern: () => { const m = M("fern", 0x3a8a3a, { side: THREE.DoubleSide }); const g = grp(); for (let i = 0; i < 6; i++) { const l = mesh(new THREE.ConeGeometry(0.25, 1.6, 4, 1, true), m, 0.6, 0.5, 0); l.scale.z = 0.25; l.rotation.z = -1.0; const p = grp(l); p.rotation.y = i * 1.05; g.add(p); } g.scale.setScalar(1.3); return g; },
  eggNest: () => { const n = mesh(new THREE.TorusGeometry(0.7, 0.25, 6, 12), M("nest", 0x8a6a3a, { roughness: 1 }), 0, 0.15, 0); n.rotation.x = Math.PI / 2; const g = grp(n); [[0, 0], [0.3, 0.2], [-0.25, 0.25]].forEach(([x, z]) => { const e = mesh(SP(0.25), M("dinoEgg", 0xf0e8c8), x, 0.32, z); e.scale.y = 1.3; g.add(e); }); return g; },
  bones: () => { const m = boneM(); const sp = mesh(C(0.07, 0.07, 2, 5), m, 0, 0.05, 0); sp.rotation.z = Math.PI / 2; const g = grp(sp); for (let i = 0; i < 5; i++) { const r = mesh(new THREE.TorusGeometry(0.8, 0.06, 5, 10, Math.PI), m, (i - 2) * 0.35, 0, 0); r.rotation.y = Math.PI / 2; g.add(r); } return g; },
  obsidian: () => makeCrystalCluster(R(1.6, 3.4), 0x7a3ab8),
  geyser: () => { const w = mesh(new THREE.CircleGeometry(0.45, 10), M("geyW", 0x6ad8e8, { emissive: 0x2a8aa0, emissiveIntensity: 0.5 }), 0, 0.71, 0); w.rotation.x = -Math.PI / 2; const steam = new THREE.Sprite(mat("steamM", () => new THREE.SpriteMaterial({ map: glowTex("240,240,240", 0.7), transparent: true, depthWrite: false }))); steam.scale.set(2.4, 5, 1); steam.position.y = 3; const g = grp(mesh(C(0.5, 1.2, 0.7, 10), M("geyR", 0x8a7a60, { roughness: 1, flatShading: true }), 0, 0.35, 0), w, steam); g.userData.steam = steam; return g; },
  sulfur: () => { const p = mesh(new THREE.CircleGeometry(R(1.2, 2.4), 14), M("sulf", 0xe8d040, { emissive: 0x8a7a00, emissiveIntensity: 0.4, roughness: 0.3 }), 0, 0.05, 0); p.rotation.x = -Math.PI / 2; return grp(p); },
  charTree: () => PROPS.deadTree(M("char", 0x1a1412, { emissive: 0x3a0a00, emissiveIntensity: 0.3 })),
  ashPile: () => { const d = mesh(SP(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M("ashP", 0x5a5050, { roughness: 1 })); d.scale.set(R(1.2, 2.4), R(0.4, 0.9), R(1, 2)); return grp(d); },
  volcanoSmall: () => makeVolcanoCone(R(10, 16), true)
};

/* side-decor defaults: lateral offset, face the track */
const META = {
  bench: { off: 5.4, align: true }, parkLamp: { off: 5.0, align: true }, fence: { off: 5.8, align: true }, flowerBed: { off: 6.4 },
  lanternPost: { off: 4.8, align: true }, helm: { off: 4.7, align: true }, telescope: { off: 4.8, align: true }, mapTable: { off: 4.8, align: true },
  crateStack: { off: 4.85, align: true }, crateWall: { off: 4.9, align: true }, barrels: { off: 4.85, align: true }, chest: { off: 4.8, align: true, outward: true }, lifebuoy: { off: 4.9, align: true },
  cannon: { off: 4.65, align: true, outward: true }, netPile: { off: 4.8 }, anchor: { off: 4.9, align: true }, mast: { off: 4.75, align: true },
  stall: { off: 5.6, align: true }, castlePillar: { off: 5.4 }, banner: { off: 5.0, align: true }, candles: { off: 4.9 }, bookshelf: { off: 5.3, align: true },
  magicLamp: { off: 4.6, align: true }, torch: { off: 5.2, align: true }, torchBlue: { off: 5.2, align: true }, floatBook: { off: 4.8 }, orb: { off: 5.0 },
  ufo: { off: 8 }, satellite: { off: 8 }, iceLantern: { off: 4.8 }, sled: { off: 5.4, align: true }, tent: { off: 7.2, align: true },
  dino: { off: 9, align: true }, camel: { off: 6.8, align: true }, kelp: { off: 6.0 }, jelly: { off: 6.5 }, wreck: { off: 12 }, sphinx: { off: 10, align: true },
  sandArch: { off: 6.6, align: true }, ruinArch: { off: 6.6, align: true }, iceArch: { off: 7.2, align: true }, volcanoSmall: { off: 22 }, researchDome: { off: 9 },
  giantShell: { off: 6.4 }, pipe: { off: 6.2, align: true }, submarine: { off: 9 }, rover: { off: 6.6, align: true }, antenna: { off: 6.2 }, solarPanel: { off: 6.4, align: true }
};

/* ============================ STAGE PLANS ============================
   7 stages per world (index 6 = boss). n = scene name (stage tile + intro).
   layers: [{ k: [[prop, weight]], n: [high, medium], off: [min, max], y: absolute height, s: scale, clear }]
   decor: recycled side props; base: share of the world's default scenery that stays;
   look: overrides of THEME_LOOK; tod: jungle time of day; weather / sky: camera-following extras;
   ground: { color, y } adds a floor (space stages). */
const L = (k, n, off, o = {}) => Object.assign({ k, n, off }, o);
export const STAGE_PLANS = {
  1: [
    { n: "🌳 יער העצים", grass: 0x3f9a3a, tod: "morning", base: 1, decor: null, layers: [L([["bigTree", 2], ["bush", 2], ["rockPile", 1]], [26, 14], [9, 26])] },
    { n: "🪑 גן הספסלים", grass: 0x72c850, tod: "noon", base: 0.35, decor: ["bench", "parkLamp", "bench", "fence", "parkLamp", "flowerBed"], layers: [L([["flowerBed", 3], ["bush", 2], ["fountain", 1], ["tree", 1]], [44, 22], [8, 24])] },
    { n: "🐿️ חיות היער", grass: 0x8a9a34, tod: "sunset", base: 0.5, decor: ["tree", "stump", "tree", "log"], layers: [L([["squirrel", 3], ["rabbit", 3], ["deer", 2], ["bird", 2], ["stump", 1]], [40, 20], [6.5, 20])] },
    { n: "🍄 פטריות ענק", grass: 0x2a5a40, tod: "dusk", weather: "fireflies", base: 0.3, decor: ["mushroomGiant", "mushroomGlow", "log", "mushroomGiant"], layers: [L([["mushroomGiant", 3], ["mushroomGlow", 3], ["log", 1], ["stump", 1]], [44, 22], [7, 24])] },
    { n: "🐸 אגם הצפרדעים", grass: 0x3aa860, tod: "morning", base: 0.45, decor: ["reeds", "tree", "reeds", "rockPile"], layers: [L([["pond", 3], ["reeds", 3], ["frog", 2], ["rockPile", 1]], [40, 20], [8, 26])] },
    { n: "🏛️ מקדש הג'ונגל", grass: 0xa0a048, tod: "sunset", weather: "leaves", base: 0.4, decor: ["ruinPillar", "tree", "ruinArch", "ruinPillar"], layers: [L([["ruinPillar", 3], ["ruinArch", 1], ["rockPile", 2], ["bigTree", 1]], [36, 18], [8, 26])] },
    { n: "⛈️ סערה ביער", grass: 0x2e4a2c, tod: "storm", weather: "rain", sky: "storm", base: 0.5, decor: ["deadTree", "tree", "deadTree", "rockPile"], layers: [L([["deadTree", 3], ["rockPile", 2], ["log", 1]], [34, 17], [8, 26])] }
  ],
  2: [
    { n: "⛵ הסיפון הפתוח", base: 1, decor: null, layers: [] },
    { n: "📦 בטן הספינה", base: 0.15, look: { exp: 0.98, hemi: 0.62, hemiSky: 0xffd8a0, hemiGround: 0x3a2410, dir: 0.6, sun: 0xffc080, fog: 0x2a1a10, fogNear: 18, fogFar: 140, skyTop: 0x1a120a, skyBot: 0x4a3018, clear: 0x2a1a10, showSun: false }, decor: ["lanternPost", "barrels", "lanternPost", "netPile"], layers: [L([["crateWall", 3], ["barrels", 1], ["crateStack", 1]], [56, 28], [4.7, 5.0])] },
    { n: "🌅 סיפון הקפטן", base: 0.7, look: { exp: 1.12, hemi: 0.85, hemiSky: 0xffc9a0, hemiGround: 0x5a2a28, dir: 1.2, sun: 0xff9a5c, fog: 0xe8a888, fogNear: 40, fogFar: 300, skyTop: 0x5a2a7a, skyBot: 0xff9a5a, clear: 0xff8a54, sunDisk: 0xff8a4a }, decor: ["helm", "mapTable", "telescope", "chest", "lanternPost", "cannon"], layers: [] },
    { n: "🌩️ סערה בים", base: 0.8, weather: "rain", sky: "storm", look: { exp: 0.95, hemi: 0.62, hemiSky: 0x8a9ab8, hemiGround: 0x1a2a3a, dir: 0.6, sun: 0xb8c8e8, fog: 0x4a5a6a, fogNear: 20, fogFar: 170, skyTop: 0x1a2230, skyBot: 0x5a6a7a, clear: 0x3a4a5a, showSun: false }, decor: ["mast", "barrels", "lifebuoy", "mast", "netPile"], layers: [L([["rockSea", 1]], [20, 10], [16, 40], { y: -2.4 })] },
    { n: "🏝️ מזח אי המטמון", base: 0.4, look: { exp: 1.15, skyTop: 0x1a9ae8, skyBot: 0xb8f4ff }, decor: ["chest", "barrels", "anchor", "chest", "lifebuoy"], layers: [L([["sandIsle", 2], ["pier", 2]], [16, 9], [17, 34], { y: -2.3, clear: 12 })] },
    { n: "🌙 לילה של ירח", base: 0.8, sky: "moon", look: { exp: 1.02, hemi: 0.72, hemiSky: 0x8aa8ff, hemiGround: 0x0a1a3a, dir: 0.72, sun: 0xb8c8ff, fog: 0x0a1a3a, fogNear: 30, fogFar: 230, skyTop: 0x02061a, skyBot: 0x1a2a5a, clear: 0x0a1430, showSun: false }, decor: ["lanternPost", "barrels", "lanternPost", "mast"], layers: [] },
    { n: "💥 קרב התותחים", base: 0.8, weather: "embers", look: { exp: 1.05, hemi: 0.8, hemiSky: 0xffb08a, hemiGround: 0x3a1a10, dir: 1.1, sun: 0xff7a3a, fog: 0x8a4a3a, fogNear: 26, fogFar: 220, skyTop: 0x3a0a14, skyBot: 0xff6a3a, clear: 0x8a3a2a, sunDisk: 0xff5a2a }, decor: ["cannon", "barrels", "cannon", "crateStack"], layers: [] }
  ],
  3: [
    { n: "🏘️ גגות העיר", base: 1, decor: null, layers: [] },
    { n: "🎪 שוק הקסמים", base: 0.6, look: { exp: 1.15, hemi: 1.0, hemiSky: 0xfff0d8, hemiGround: 0x5a4a6a, dir: 1.4, sun: 0xfff2d0, fog: 0xf0d0e8, fogNear: 40, fogFar: 320, skyTop: 0x5ab8ff, skyBot: 0xffe0f0, clear: 0xd8e8ff, sunDisk: 0xfff6c8, showSun: true }, decor: ["stall", "balloons", "stall", "magicLamp"], layers: [] },
    { n: "🌲 היער המכושף", base: 0.25, weather: "fireflies", look: { exp: 1.08, hemi: 0.8, hemiSky: 0x9affd8, hemiGround: 0x1a3a3a, dir: 0.85, sun: 0xc8ffe8, fog: 0x2a5a5a, fogNear: 24, fogFar: 220, skyTop: 0x0a2a3a, skyBot: 0x3a8a7a, clear: 0x1a4a4a, showSun: false }, decor: ["glowTree", "mushroomGlow", "glowTree"], layers: [L([["glowTree", 3], ["mushroomGlow", 1]], [40, 20], [10, 28], { y: -11, s: 2.6 })] },
    { n: "🏰 אולם הטירה", base: 0.2, look: { exp: 1.0, hemi: 0.68, hemiSky: 0xffd8a0, hemiGround: 0x2a1a2a, dir: 0.72, sun: 0xffc080, fog: 0x2a1a24, fogNear: 22, fogFar: 170, skyTop: 0x140a14, skyBot: 0x4a2a2a, clear: 0x1e1018, showSun: false }, decor: ["castlePillar", "banner", "torch", "castlePillar", "candles", "banner"], layers: [] },
    { n: "💎 גן הבדולחים", base: 0.3, weather: "sparkles", look: { exp: 1.1, hemi: 0.85, hemiSky: 0xb8e8ff, hemiGround: 0x2a2a6a, dir: 0.9, sun: 0xd8f0ff, fog: 0x3a3a8a, fogNear: 28, fogFar: 240, skyTop: 0x0a0a3a, skyBot: 0x6a5ad8, clear: 0x2a2a6a, showSun: false }, decor: ["crystal", "crystalFlower", "crystal", "orb"], layers: [L([["crystalBig", 2], ["crystal", 1]], [40, 20], [10, 28], { y: -11, s: 2.4 })] },
    { n: "📚 ספריית הקוסמים", base: 0.35, look: { exp: 1.05, hemi: 0.8, hemiSky: 0xffe0b0, hemiGround: 0x3a2a1a, dir: 0.9, sun: 0xffd8a0, fog: 0x4a3420, fogNear: 26, fogFar: 200, skyTop: 0x2a1a10, skyBot: 0x8a5a2a, clear: 0x3a2818, showSun: false }, decor: ["bookshelf", "floatBook", "candles", "bookshelf", "floatBook"], layers: [] },
    { n: "🔮 מגדל הקוסם", base: 0.8, weather: "sparkles", sky: "storm", look: { exp: 1.0, hemi: 0.72, hemiSky: 0xc89aff, hemiGround: 0x1a0a2a, dir: 0.8, sun: 0xd8b0ff, fog: 0x2a1440, fogNear: 22, fogFar: 200, skyTop: 0x0a0418, skyBot: 0x5a2a8a, clear: 0x1a0a2a, showSun: false }, decor: ["orb", "torchBlue", "orb"], layers: [] }
  ],
  4: [
    { n: "🌌 שביל החלב", base: 1, decor: null, layers: [] },
    { n: "☄️ שדה האסטרואידים", base: 1.6, look: { hemiSky: 0xffc8a0, sun: 0xffd8b0 }, decor: ["asteroidBig"], layers: [L([["asteroidBig", 1]], [24, 12], [9, 30])] },
    { n: "🌕 בסיס הירח", base: 0.25, sky: "moonBig", ground: { color: 0x8a8a94, y: -1.6 }, decor: ["antenna", "moonFlag", "solarPanel", "rover"], layers: [L([["dome", 2], ["moonRock", 3], ["crater", 2], ["solarPanel", 1]], [40, 20], [9, 28], { y: -1.6 })] },
    { n: "👽 כוכב החייזרים", base: 0.3, ground: { color: 0x2a5a4a, y: -1.6 }, look: { exp: 1.15, hemi: 1.0, hemiSky: 0x9aff9a, hemiGround: 0x1a3a1a, sun: 0xd8ffc8, fog: 0x1a4a2a, fogNear: 40, fogFar: 300, skyTop: 0x04140a, skyBot: 0x1a5a3a, clear: 0x0a2a14 }, decor: ["alienPlant", "alienPod", "ufo", "alienPlant"], layers: [L([["alienPlant", 3], ["alienPod", 2]], [44, 22], [9, 28], { y: -1.6 })] },
    { n: "🌈 הערפילית", base: 0.6, sky: "nebula", look: { hemiSky: 0xff9ad8, sun: 0xffd0f0, fog: 0x2a0a2a }, decor: ["crystal", "satellite"], layers: [] },
    { n: "🛰️ תחנת החלל", base: 0.5, decor: ["satellite", "antenna", "solarPanel", "satellite"], layers: [L([["station", 1], ["satellite", 2]], [10, 5], [16, 40])] },
    { n: "🕳️ החור השחור", base: 1.2, sky: "blackhole", look: { hemiSky: 0xff8a8a, sun: 0xffb0b0, fog: 0x1a0410 }, decor: ["asteroidBig", "crystal"], layers: [] }
  ],
  5: [
    { n: "🌲 יער מושלג", base: 1, decor: null, layers: [] },
    { n: "🏠 כפר האיגלו", base: 0.3, look: { exp: 1.04, hemi: 0.82, hemiSky: 0xc8d8ff, hemiGround: 0x4a5a8a, dir: 0.8, sun: 0xffc8a0, fog: 0x9aa8d8, fogNear: 30, fogFar: 260, skyTop: 0x2a3a8a, skyBot: 0xffb8a0, clear: 0x8a9ad8, sunDisk: 0xffa070 }, decor: ["iceLantern", "snowman", "iceLantern", "sled"], layers: [L([["igloo", 3], ["snowman", 2], ["iceLantern", 2], ["pine", 1]], [40, 20], [8.5, 24])] },
    { n: "⛸️ האגם הקפוא", base: 0.25, decor: ["penguin", "fishingHole", "penguin"], layers: [L([["iceLake", 2], ["penguin", 3], ["fishingHole", 2], ["iceSpire", 1]], [40, 20], [8, 24])] },
    { n: "🧊 מערות הקרח", base: 0.2, look: { exp: 1.05, hemi: 0.78, hemiSky: 0x9adcff, hemiGround: 0x1a3a6a, dir: 0.72, sun: 0xb8e8ff, fog: 0x2a5a8a, fogNear: 22, fogFar: 180, skyTop: 0x0a1a3a, skyBot: 0x3a7ab8, clear: 0x1a3a6a, showSun: false }, decor: ["iceArch", "icicleRock", "crystal"], layers: [L([["icicleRock", 3], ["crystalBig", 2], ["iceSpire", 2]], [40, 20], [8.5, 22])] },
    { n: "🌌 זוהר צפוני", base: 0.7, sky: "aurora", look: { exp: 1.05, hemi: 0.78, hemiSky: 0x9affd8, hemiGround: 0x1a2a4a, dir: 0.68, sun: 0xc8e8ff, fog: 0x0a1a2a, fogNear: 30, fogFar: 240, skyTop: 0x020814, skyBot: 0x1a3a4a, clear: 0x0a1424, showSun: false }, decor: ["pine", "iceLantern", "pine"], layers: [] },
    { n: "🌨️ סופת שלגים", base: 0.8, weather: "blizzard", look: { exp: 1.0, hemi: 0.9, dir: 0.7, fog: 0xc8d4e0, fogNear: 4, fogFar: 72, skyTop: 0xb8c8d8, skyBot: 0xe8f0f8, clear: 0xd8e4f0, showSun: false }, decor: ["snowRock", "sled", "pine"], layers: [L([["snowRock", 2], ["pine", 2]], [26, 13], [9, 22])] },
    { n: "👑 ארמון הקרח", base: 0.6, weather: "snow", look: { exp: 1.06, hemi: 0.95, hemiSky: 0xd8c8ff, sun: 0xe8d8ff, skyTop: 0x3a4ab8, skyBot: 0xd8e8ff }, decor: ["iceSpire", "iceLantern", "iceSpire"], layers: [L([["iceSpire", 2], ["crystalBig", 1]], [26, 13], [9, 24])] }
  ],
  6: [
    { n: "🏜️ דיונות החול", base: 1, decor: null, layers: [L([["dune", 2], ["cactus", 1]], [20, 10], [12, 30], { y: -0.35 })] },
    { n: "🌴 נווה המדבר", base: 0.4, look: { skyTop: 0x2a8ae8, skyBot: 0xd8f4ff }, decor: ["palm", "tent", "palm", "amphora"], layers: [L([["oasis", 2], ["tent", 2], ["palm", 2]], [30, 15], [9, 26])] },
    { n: "🔺 עמק הפירמידות", base: 0.4, decor: ["obelisk", "sphinx", "obelisk"], layers: [L([["pyramidSmall", 2], ["obelisk", 1]], [16, 8], [20, 44], { y: -0.3, clear: 15 })] },
    { n: "🐫 שיירת הגמלים", base: 0.5, look: { exp: 1.12, hemi: 0.85, hemiSky: 0xffc9a0, hemiGround: 0x6a3a28, dir: 1.2, sun: 0xff9a5c, fog: 0xe8a878, fogNear: 34, fogFar: 280, skyTop: 0x6a2a6a, skyBot: 0xffa060, clear: 0xff8a54, sunDisk: 0xff7a3a }, decor: ["camel", "amphora", "camel", "tent"], layers: [L([["camel", 2], ["tent", 1], ["amphora", 2]], [30, 15], [8, 22])] },
    { n: "🏛️ המקדש העתיק", base: 0.3, look: { exp: 1.05, hemi: 0.85, dir: 1.0, sun: 0xffd8a0, fog: 0xc8a070, skyTop: 0x3a5aa8, skyBot: 0xf0c890 }, decor: ["sandPillar", "torch", "sandArch", "sandPillar"], layers: [L([["sandPillar", 3], ["sandArch", 1], ["skull", 1], ["amphora", 1]], [36, 18], [8, 24])] },
    { n: "🌪️ סופת החול", base: 0.8, weather: "sand", look: { exp: 1.02, hemi: 0.9, dir: 0.7, sun: 0xffc880, fog: 0xc89858, fogNear: 4, fogFar: 78, skyTop: 0xc8904a, skyBot: 0xf0c888, clear: 0xd8a868, showSun: false }, decor: ["tumbleweed", "cactus", "skull"], layers: [L([["tumbleweed", 2], ["skull", 1], ["cactus", 1]], [24, 12], [8, 22])] },
    { n: "🌙 לילה במדבר", base: 0.7, sky: "starsDesert", look: { exp: 1.02, hemi: 0.72, hemiSky: 0x8aa8ff, hemiGround: 0x3a2a3a, dir: 0.68, sun: 0xb8c8ff, fog: 0x1a1a3a, fogNear: 30, fogFar: 240, skyTop: 0x02061a, skyBot: 0x3a2a5a, clear: 0x0a0a24, showSun: false }, decor: ["torch", "obelisk", "torch"], layers: [L([["torch", 1], ["sandPillar", 1]], [16, 8], [8, 18])] }
  ],
  7: [
    { n: "🪸 שונית האלמוגים", base: 1, decor: null, layers: [L([["coral", 2], ["brainCoral", 2]], [24, 12], [8, 22])] },
    { n: "🌿 יער האצות", base: 0.4, look: { fog: 0x1a6a5a, skyBot: 0x2aa88a, hemiSky: 0xa8ffd8 }, decor: ["kelp", "kelp", "rockOcean"], layers: [L([["kelp", 4], ["rockOcean", 1]], [40, 20], [8, 26])] },
    { n: "🏴‍☠️ הספינה הטבועה", base: 0.5, look: { exp: 1.02, hemi: 0.85, fog: 0x0f4a6a, fogNear: 18, fogFar: 160, skyTop: 0x041a30, skyBot: 0x1a6a8a, clear: 0x0f4a6a }, decor: ["wreck", "chest", "anchor", "barrels"], layers: [L([["chest", 1], ["anchor", 1], ["barrels", 1], ["rockOcean", 1]], [24, 12], [8, 20])] },
    { n: "🦪 מערת הפנינים", base: 0.4, look: { exp: 1.02, hemi: 0.78, hemiSky: 0xc8d8ff, fog: 0x1a3a5a, fogNear: 18, fogFar: 150, skyTop: 0x0a1a2a, skyBot: 0x2a4a6a, clear: 0x1a3a5a }, decor: ["giantShell", "rockOcean", "giantShell"], layers: [L([["giantShell", 2], ["rockOcean", 3], ["glowAnemone", 1]], [36, 18], [8, 22])] },
    { n: "🪼 עיר המדוזות", base: 0.5, look: { exp: 1.05, hemi: 0.62, hemiSky: 0x9aa8ff, hemiGround: 0x040a2a, dir: 0.6, fog: 0x081a3a, fogNear: 20, fogFar: 170, skyTop: 0x02061a, skyBot: 0x0a2a5a, clear: 0x081a3a }, decor: ["jelly", "glowAnemone", "jelly"], layers: [L([["jelly", 1], ["glowAnemone", 2]], [16, 8], [7, 18])] },
    { n: "🔬 תחנת המחקר", base: 0.5, decor: ["pipe", "researchDome", "submarine"], layers: [L([["researchDome", 2], ["pipe", 2], ["submarine", 1]], [16, 8], [10, 26])] },
    { n: "🌑 התהום", base: 0.5, look: { exp: 1.02, hemi: 0.58, hemiSky: 0x8a9aff, hemiGround: 0x02040a, dir: 0.52, fog: 0x020a1a, fogNear: 16, fogFar: 140, skyTop: 0x000208, skyBot: 0x041a3a, clear: 0x020a1a }, decor: ["vent", "glowAnemone", "vent"], layers: [L([["vent", 2], ["glowAnemone", 2]], [20, 10], [8, 22])] }
  ],
  8: [
    { n: "⛰️ מורדות הר הגעש", base: 1, decor: null, layers: [L([["lavaPool", 1], ["lavaRock", 2]], [20, 10], [13.5, 26])] },
    { n: "🔥 נהר הלבה", base: 0.6, look: { exp: 1.15, fog: 0x8a3a1a, skyBot: 0xff6a2a }, decor: ["torch", "lavaRock", "torch"], layers: [L([["lavaPool", 3]], [24, 12], [13.5, 22])] },
    { n: "🦕 עמק הדינוזאורים", base: 0.3, look: { exp: 1.12, hemi: 1.0, hemiSky: 0xffe0b0, hemiGround: 0x3a3a1a, dir: 1.3, sun: 0xffe0a0, fog: 0xc8a070, fogNear: 34, fogFar: 280, skyTop: 0x5a7ab8, skyBot: 0xffc080, clear: 0xd89a60 }, decor: ["fern", "dino", "fern", "eggNest"], layers: [L([["fern", 4], ["dino", 1], ["eggNest", 1], ["bones", 1]], [40, 20], [8, 26])] },
    { n: "🟣 מערת האובסידיאן", base: 0.3, look: { exp: 1.05, hemi: 0.72, hemiSky: 0xc89aff, hemiGround: 0x1a0a1a, dir: 0.72, sun: 0xd8a0ff, fog: 0x1a0a24, fogNear: 22, fogFar: 180, skyTop: 0x08020e, skyBot: 0x3a1a4a, clear: 0x140a1a, showSun: false }, decor: ["obsidian", "torchBlue", "obsidian"], layers: [L([["obsidian", 3], ["lavaRock", 1]], [36, 18], [8, 22])] },
    { n: "♨️ גייזרים ואדים", base: 0.4, weather: "steam", look: { exp: 1.1, hemi: 0.95, hemiSky: 0xfff0c8, sun: 0xffe8c0, fog: 0xa89a80, fogNear: 22, fogFar: 200, skyTop: 0x6a6a7a, skyBot: 0xd8c8a0, clear: 0xa89a80 }, decor: ["geyser", "sulfur", "geyser"], layers: [L([["geyser", 2], ["sulfur", 2], ["lavaRock", 1]], [30, 15], [8, 22])] },
    { n: "🌫️ יער האפר", base: 0.4, weather: "ash", look: { exp: 1.02, hemi: 0.82, hemiSky: 0xc8b8b0, sun: 0xffb890, fog: 0x5a4a48, fogNear: 8, fogFar: 115, skyTop: 0x2a2224, skyBot: 0x8a6a5a, clear: 0x4a3a38, showSun: false }, decor: ["charTree", "ashPile", "charTree"], layers: [L([["charTree", 3], ["ashPile", 2]], [40, 20], [8, 24])] },
    { n: "🌋 לב הר הגעש", base: 0.8, weather: "embers", look: { exp: 1.15, hemi: 0.9, fog: 0x8a2a10, fogNear: 22, fogFar: 200, skyTop: 0x2a0404, skyBot: 0xff4a10, clear: 0x6a1a08 }, decor: ["torch", "lavaRock", "torch"], layers: [L([["lavaPool", 2], ["volcanoSmall", 1]], [16, 8], [16, 34], { clear: 14 })] }
  ]
};
export const stagePlan = (wid, st) => { const p = STAGE_PLANS[wid]; return p ? p[Math.max(0, Math.min(p.length - 1, st))] : null; };
export const stageSceneName = (wid, st) => { const p = stagePlan(wid, st); return p ? p.n : ""; };
export function stageLook(base, wid, st) {
  const p = stagePlan(wid, st);
  if (!base) return base;
  return p && p.look ? Object.assign({}, base, p.look) : base;
}

/* ---------- recycled side decor ---------- */
export function stageDecorSpec(wid, st, i) {
  const p = stagePlan(wid, st);
  if (!p || !p.decor || !p.decor.length) return null;
  const key = p.decor[i % p.decor.length];
  if (!PROPS[key]) return null;
  const meta = META[key] || {};
  const obj = PROPS[key]();
  return { obj, sideOff: (meta.off || 6.4) + (meta.align ? 0 : (i % 3) * 0.45), align: !!meta.align, outward: !!meta.outward, spin: !!obj.userData.spin };
}

/* ---------- static (merged later) + a few animated props along the course ---------- */
function pickWeighted(list) {
  const tot = list.reduce((a, x) => a + x[1], 0);
  let v = Math.random() * tot;
  for (const [k, w] of list) { if ((v -= w) <= 0) return k; }
  return list[list.length - 1][0];
}
const isAnim = (o) => !!(o.userData.hop || o.userData.bob || o.userData.sway || o.userData.spin || o.userData.roll || o.userData.steam);
export function buildStageScatter(wid, st, course, high) {
  const g = new THREE.Group(); g.name = "stageScatter";
  const p = stagePlan(wid, st);
  if (!p) return g;
  if (p.ground) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(240, 48), new THREE.MeshStandardMaterial({ color: p.ground.color, roughness: 1, map: groundTex() }));
    f.rotation.x = -Math.PI / 2; f.name = "followGround"; f.userData.y = p.ground.y; f.position.y = p.ground.y; f.receiveShadow = true;
    g.add(f);
  }
  const animated = [];
  const maxAnim = N(high, 14, 7);
  const turnsNear = (s) => (course.turns || []).some((t) => s > t.sEnter - 10 && s < t.sExit + 8);
  (p.layers || []).forEach((ly, li) => {
    const len = Math.max(20, course.length - 8);
    // v8b: density follows course length (long letter courses keep the same look) and leans to the track
    const n = Math.round(N(high, ly.n[0], ly.n[1]) * Math.max(1, Math.min(2.4, len / 380)));
    for (let i = 0; i < n; i++) {
      const s = 4 + ((i + 0.5) / n) * len + R(-3, 3);
      if (turnsNear(s)) continue;
      const side = (i + li) % 2 ? 1 : -1;
      const off = ly.off[0] + (ly.off[1] - ly.off[0]) * Math.pow(Math.random(), 1.5);
      const sp = sideSpot(course, s, side, off);
      if (!clearOfCourse(course, sp.x, sp.z, ly.clear || Math.min(off - 0.6, 7.6))) continue;
      let key = pickWeighted(ly.k);
      let o = PROPS[key]();
      if (isAnim(o) && animated.length >= maxAnim) {
        const alt = ly.k.map((x) => x[0]).find((k) => k !== key && !isAnim(PROPS[k]()));
        if (!alt) continue;
        key = alt; o = PROPS[key]();
      }
      if (ly.s) o.scale.multiplyScalar(ly.s);
      o.position.set(sp.x, ly.y != null ? ly.y : sp.y - 0.05, sp.z);
      const meta = META[key];
      o.rotation.y = meta && meta.align ? -sp.heading : R(0, Math.PI * 2);
      if (isAnim(o)) { o.userData.baseY = o.position.y; o.userData.ph = R(0, 6); animated.push(o); }
      g.add(o);
    }
  });
  g.userData.update = (dt, t) => {
    for (const o of animated) {
      const u = o.userData;
      if (u.hop) o.position.y = u.baseY + Math.abs(Math.sin(t * 3 + u.ph)) * u.hop;
      if (u.bob) o.position.y = u.baseY + Math.sin(t * 1.2 + u.ph) * u.bob;
      if (u.sway) o.rotation.z = Math.sin(t * 0.9 + u.ph) * 0.12;
      if (u.spin) o.rotation.y += dt * u.spin;
      if (u.roll) { o.rotation.x += dt * 2; o.position.y = u.baseY + Math.abs(Math.sin(t * 2 + u.ph)) * 0.3; }
      if (u.steam) { const k = (t * 0.5 + u.ph) % 3; u.steam.scale.set(2.4, 5 * Math.min(1, k + 0.1), 1); u.steam.material.opacity = k < 1.6 ? 0.9 : 0.25; }
    }
  };
  g.userData.animCount = animated.length;
  return g;
}
function groundTex() {
  return mat("stGroundTex", () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#c8c8c8"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(80,80,90,${0.1 + Math.random() * 0.25})`; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * 16, 0, 7); ctx.fill(); }
  }, [30, 30]));
}

/* ---------- weather & sky extras (camera-following group) ---------- */
export function buildStageAtmos(wid, st, high) {
  const p = stagePlan(wid, st);
  const g = new THREE.Group(); g.name = "stageAtmos";
  const ups = [];
  g.userData.update = (dt, t) => ups.forEach((u) => u(dt, t));
  if (!p) return g;
  const box = (n, o) => { const pts = makeTwinklePoints(N(high, n, Math.round(n / 2)), () => [R(-30, 30), R(0, o.box || 26), R(-45, 12)], o); pts.position.y = o.y0 != null ? o.y0 : -9; g.add(pts); };
  switch (p.weather) {
    case "rain": box(1600, { minSize: 2, maxSize: 3.5, fall: 16, box: 26, colors: [0xb8d0ff, 0xd8e8ff], normalBlend: true, persp: true, noTwinkle: true }); break;
    case "snow": box(1200, { minSize: 3, maxSize: 6, fall: 2.4, box: 26, colors: [0xffffff, 0xeef8ff], normalBlend: true, persp: true, noTwinkle: true }); break;
    case "blizzard": box(2600, { minSize: 3, maxSize: 7, fall: 6, box: 22, colors: [0xffffff, 0xeef8ff], normalBlend: true, persp: true, noTwinkle: true, drift: 2 }); break;
    case "fireflies": box(260, { minSize: 4, maxSize: 8, drift: 1.2, box: 8, colors: [0xfff27a, 0xc8ff6a, 0xffd860], persp: true, y0: -1 }); break;
    case "leaves": box(500, { minSize: 4, maxSize: 7, fall: 1.4, box: 22, colors: [0xff9a3a, 0xd8c040, 0x8ac040], normalBlend: true, persp: true, noTwinkle: true, drift: 1 }); break;
    case "sparkles": box(500, { minSize: 3, maxSize: 7, drift: 0.8, box: 14, colors: [0xffe08a, 0xff9ad8, 0x9ff0ff], persp: true, y0: -2 }); break;
    case "sand": box(2200, { minSize: 3, maxSize: 6, fall: 0.6, box: 18, colors: [0xe8c080, 0xd8a868], normalBlend: true, persp: true, noTwinkle: true, drift: 3 }); break;
    case "embers": box(700, { minSize: 3, maxSize: 6, fall: -2.4, box: 24, colors: [0xff8a2a, 0xffc040, 0xff5a1a], persp: true, y0: -4 }); break;
    case "ash": box(1200, { minSize: 2.5, maxSize: 5, fall: 1.2, box: 22, colors: [0x8a8080, 0x5a5050, 0xb0a8a0], normalBlend: true, persp: true, noTwinkle: true, drift: 0.6 }); break;
    case "steam": box(700, { minSize: 10, maxSize: 20, fall: -1.4, box: 16, colors: [0xffffff, 0xe8e8e8], normalBlend: true, persp: true, noTwinkle: true, drift: 1, y0: -2 }); break;
    default: break;
  }
  const sky = p.sky;
  if (sky === "moon" || sky === "moonBig") {
    const big = sky === "moonBig";
    const moon = new THREE.Mesh(new THREE.SphereGeometry(big ? 34 : 12, 32, 20), new THREE.MeshBasicMaterial({ map: moonTex(), fog: false, toneMapped: false, color: big ? 0xd8d8e0 : 0xfff8e0 }));
    moon.position.set(big ? -60 : 70, big ? 70 : 85, -200); g.add(moon);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("220,230,255", 0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    h.scale.setScalar(big ? 140 : 60); h.position.copy(moon.position); g.add(h);
  }
  if (sky === "moon" || sky === "starsDesert" || sky === "aurora") {
    g.add(makeTwinklePoints(N(high, 900, 450), () => { const v = new THREE.Vector3(R(-1, 1), R(0.15, 1), R(-1, 1)).normalize().multiplyScalar(250); return [v.x, v.y, v.z]; }, { minSize: 2, maxSize: 5, colors: [0xffffff, 0xd8e8ff, 0xfff0c8] }));
  }
  if (sky === "aurora") {
    const am = new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (ctx, W, H) => { const gr = ctx.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, "rgba(60,255,170,0.0)"); gr.addColorStop(0.25, "rgba(60,255,170,0.75)"); gr.addColorStop(0.7, "rgba(140,90,255,0.35)"); gr.addColorStop(1, "rgba(140,90,255,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const bands = [];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(320, 60, 40, 1);
      const pa = geo.attributes.position;
      for (let k = 0; k < pa.count; k++) pa.setZ(k, Math.sin(pa.getX(k) / 30 + i) * 22);
      const b = new THREE.Mesh(geo, am); b.position.set(R(-40, 40), 42 + i * 10, -150 + i * 22); b.rotation.x = 0.15; g.add(b); bands.push(b);
    }
    ups.push((dt, t) => bands.forEach((b, i) => { b.position.x = Math.sin(t * 0.08 + i) * 30; }));
  }
  if (sky === "nebula" || sky === "blackhole") {
    const cols = sky === "nebula" ? ["255,90,200", "120,90,255", "80,200,255", "255,150,90"] : ["255,60,60", "160,40,200"];
    for (let i = 0; i < (sky === "nebula" ? 9 : 4); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(cols[i % cols.length], 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.position.copy(new THREE.Vector3(R(-1, 1), R(0.05, 0.6), R(-1, -0.2)).normalize().multiplyScalar(220)); s.scale.setScalar(R(90, 170)); g.add(s);
    }
    if (sky === "blackhole") {
      const disk = new THREE.Mesh(new THREE.RingGeometry(18, 44, 64), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (ctx) => { for (let a = 0; a < 360; a += 2) { ctx.strokeStyle = `hsla(${15 + Math.random() * 30},100%,${55 + Math.random() * 25}%,0.9)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(64, 64, 34 + Math.random() * 26, a / 57.3, (a + 10) / 57.3); ctx.stroke(); } }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
      disk.position.set(0, 60, -210); disk.rotation.x = -1.1; g.add(disk);
      const core = new THREE.Mesh(new THREE.SphereGeometry(17, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })); core.position.copy(disk.position); g.add(core);
      ups.push((dt) => { disk.rotation.z += dt * 0.3; });
    }
  }
  if (sky === "storm") {
    const flash = new THREE.Mesh(new THREE.SphereGeometry(240, 16, 8), new THREE.MeshBasicMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
    flash.renderOrder = -1; g.add(flash);
    let next = 2;
    ups.push((dt, t) => {
      if (t > next) { flash.material.opacity = 0.45; next = t + R(3, 7); }
      flash.material.opacity = Math.max(0, flash.material.opacity - dt * 2.2);
    });
  }
  return g;
}
function moonTex() {
  return mat("moonTex", () => canvasTex(256, 128, (ctx, W, H) => {
    ctx.fillStyle = "#e8e4d8"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(150,145,140,${0.2 + Math.random() * 0.4})`; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * 12, 0, 7); ctx.fill(); }
  }));
}
