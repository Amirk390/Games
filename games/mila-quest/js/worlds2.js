/* Mila Quest v8b — three new worlds: Desert of Pyramids, Ocean Depths (underwater), Volcano Land.
   Same contract as themes.js: course(course,opt) -> Group "courseVisual" (+ followGround child),
   ambience(high) -> Group (+ userData.far), decor(i,high) -> spec, hazard(kind,cTex) -> Group with the
   standard obstacle footprint. Everything procedural; cached materials so mergeStatic() can batch it. */
import * as THREE from "../assets/lib/three.module.js";
import { N } from "./gfx.js";
import { ribbon, R, sideSpot, clearOfCourse, instanced, mat, stdMat, canvasTex, tex, glowTex, makeTwinklePoints, makePalm, makeCloud, makeAsteroid } from "./themes.js";

export const NEW_THEMES = ["desert", "ocean", "volcano"];

/* ---------- textures ---------- */
function sandRoadTex() {
  return tex("sandRoad", () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#e2bf7c"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${150 + Math.random() * 80 | 0},${110 + Math.random() * 60 | 0},${60 + Math.random() * 40 | 0},0.25)`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    // flat sandstone slabs
    for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
      ctx.strokeStyle = "rgba(120,80,30,0.35)"; ctx.lineWidth = 3;
      ctx.strokeRect(x * 86 + (y % 2) * 30 - 20, y * 64 + 2, 84, 60);
    }
  }, [1, 1]));
}
function duneTex(rep) {
  return tex("dune" + rep, () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#e8c47e"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(${170 + Math.random() * 40 | 0},120,60,0.28)`; ctx.lineWidth = 3;
      const y = Math.random() * H; ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x / 30 + i) * 6);
      ctx.stroke();
    }
    for (let i = 0; i < 600; i++) { ctx.fillStyle = "rgba(255,240,200,0.35)"; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  }, [rep, rep]));
}
function hieroTex() {
  return tex("hiero", () => canvasTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = "#d8b070"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#8a5a28"; ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.fillStyle = "#6a3a18";
    const glyph = ["☥", "𓂀", "◉", "▲", "≈", "⌘"];
    ctx.font = "26px serif"; ctx.textAlign = "center";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillText(glyph[(r * 3 + c) % glyph.length], 24 + c * 40, 36 + r * 38);
  }));
}
function seabedTex(rep) {
  return tex("seabed" + rep, () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#c9b98a"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = "rgba(120,100,60,0.25)"; ctx.lineWidth = 2;
      const y = Math.random() * H; ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y + Math.sin(x / 18 + i) * 4);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) { ctx.fillStyle = ["#f4e8d8", "#f0b8b0", "#ffffff"][i % 3]; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 0, 7); ctx.fill(); }
  }, [rep, rep]));
}
function causticTex() {
  return tex("caustic", () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(160,240,255,0.55)"; ctx.lineWidth = 3;
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 12 + Math.random() * 22;
      ctx.beginPath();
      for (let a = 0; a <= 6.3; a += 0.6) { const rr = r * (0.7 + Math.random() * 0.5); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.stroke();
    }
  }, [1, 1]));
}
function basaltTex(emissive) {
  return tex("basalt" + (emissive ? "E" : ""), () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = emissive ? "#000" : "#3a3030"; ctx.fillRect(0, 0, W, H);
    if (!emissive) for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(${60 + Math.random() * 40 | 0},${50 + Math.random() * 30 | 0},${50 + Math.random() * 30 | 0},0.6)`; ctx.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
    // hexagonal basalt slabs
    ctx.strokeStyle = emissive ? "rgba(255,120,30,1)" : "#1a1210"; ctx.lineWidth = emissive ? 2.5 : 4;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const cx = c * 48 + (r % 2) * 24, cy = r * 44 + 20;
      if (emissive && (r * 5 + c * 3) % 4) continue;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 24); }
      ctx.closePath(); ctx.stroke();
    }
  }, [1, 1]));
}
function lavaTex() {
  return tex("lava", () => canvasTex(256, 256, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#ff4a10"); g.addColorStop(0.5, "#ffb030"); g.addColorStop(1, "#ff4a10");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(${90 + Math.random() * 60 | 0},20,10,${0.4 + Math.random() * 0.4})`; ctx.beginPath(); ctx.ellipse(Math.random() * W, Math.random() * H, 8 + Math.random() * 26, 4 + Math.random() * 10, Math.random() * 3, 0, 7); ctx.fill(); }
    for (let i = 0; i < 30; i++) { ctx.fillStyle = "rgba(255,240,140,0.7)"; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 2 + Math.random() * 4, 0, 7); ctx.fill(); }
  }, [1, 1]));
}
function ashTex(rep) {
  return tex("ash" + rep, () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#3a2c28"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 1200; i++) { ctx.fillStyle = `rgba(${20 + Math.random() * 60 | 0},${16 + Math.random() * 40 | 0},${14 + Math.random() * 30 | 0},0.6)`; ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 2); }
    for (let i = 0; i < 12; i++) { ctx.strokeStyle = "rgba(255,90,20,0.55)"; ctx.lineWidth = 1.5; let x = Math.random() * W, y = Math.random() * H; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; ctx.lineTo(x, y); } ctx.stroke(); }
  }, [rep, rep]));
}

/* ---------- shared props for these worlds (also used by stages.js) ---------- */
export function makeCactus(h = 2.4) {
  const g = new THREE.Group();
  const m = mat("cactus", () => stdMat(0x3a9a4a, { roughness: 0.7 }));
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, h - 0.56, 4, 8), m); body.position.y = h / 2; g.add(body);
  [[-1, 0.45], [1, 0.62]].forEach(([s, f]) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, h * 0.22, 4, 8), m);
    arm.position.set(s * 0.5, h * f + h * 0.12, 0); g.add(arm);
    const elbow = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 8), m);
    elbow.rotation.z = Math.PI / 2; elbow.position.set(s * 0.32, h * f, 0); g.add(elbow);
  });
  return g;
}
export function makePyramid(size = 20, color = 0xe0b46a) {
  const geo = new THREE.ConeGeometry(size * 0.75, size * 0.62, 4, 1); geo.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(geo, mat("pyr" + color, () => stdMat(color, { roughness: 0.9, flatShading: true })));
  m.position.y = size * 0.31;
  const g = new THREE.Group(); g.add(m);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(size * 0.75 * 0.12, size * 0.62 * 0.12, 4), mat("pyrCap", () => stdMat(0xffd84a, { metalness: 0.6, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.4 })));
  cap.rotation.y = Math.PI / 4; cap.position.y = size * 0.62 * 0.94; g.add(cap);
  return g;
}
export function makeObelisk(h = 6) {
  const g = new THREE.Group();
  const m = mat("obelisk", () => new THREE.MeshStandardMaterial({ map: hieroTex(), roughness: 0.8 }));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, h, 4), m); shaft.rotation.y = Math.PI / 4; shaft.position.y = h / 2; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 4), mat("pyrCap", () => stdMat(0xffd84a, { metalness: 0.6, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.4 })));
  tip.rotation.y = Math.PI / 4; tip.position.y = h + 0.4; g.add(tip);
  return g;
}
export function makeCoral(h = 1.6, color = 0xff6a8a) {
  const g = new THREE.Group();
  const m = mat("coral" + color, () => stdMat(color, { roughness: 0.6, emissive: color, emissiveIntensity: 0.18 }));
  const n = 5;
  for (let i = 0; i < n; i++) {
    const hh = h * R(0.5, 1);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, hh, 6), m);
    const a = (i / n) * Math.PI * 2;
    b.position.set(Math.cos(a) * 0.25, hh / 2, Math.sin(a) * 0.25);
    b.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
    g.add(b);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), m); tip.position.set(Math.cos(a) * (0.25 + hh * 0.35), hh * 0.95, Math.sin(a) * (0.25 + hh * 0.35)); g.add(tip);
  }
  return g;
}
export function makeBrainCoral(r = 0.8, color = 0xffa040) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("bcoral" + color, () => stdMat(color, { roughness: 0.85, flatShading: true, emissive: color, emissiveIntensity: 0.12 })));
  const g = new THREE.Group(); g.add(m); m.scale.y = 0.75; return g;
}
export function makeSeaweed(h = 3, color = 0x2aa860) {
  const g = new THREE.Group();
  const m = mat("weed" + color, () => stdMat(color, { side: THREE.DoubleSide, roughness: 0.7, emissive: 0x0a3a1a, emissiveIntensity: 0.3 }));
  for (let k = 0; k < 3; k++) {
    const geo = new THREE.PlaneGeometry(0.35, h, 1, 8);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + h / 2; p.setX(i, p.getX(i) * (1 - y / h * 0.6) + Math.sin(y * 1.6 + k) * 0.25); }
    geo.computeVertexNormals();
    const blade = new THREE.Mesh(geo, m); blade.position.set((k - 1) * 0.22, h / 2, 0); blade.rotation.y = k * 1.1; g.add(blade);
  }
  return g;
}
export function makeLavaRock(r = 1) {
  const m = makeAsteroid(r);
  m.material = mat("lavaRock", () => new THREE.MeshStandardMaterial({ color: 0x2a201e, roughness: 0.95, flatShading: true, emissive: 0x3a0a00, emissiveIntensity: 0.4 }));
  const g = new THREE.Group(); g.add(m); m.position.y = r * 0.5; return g;
}
export function makeVolcanoCone(h = 40, glow = true) {
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.12, h * 0.8, h, 14, 1, true), mat("volcCone", () => stdMat(0x3a2420, { roughness: 1, flatShading: true })));
  cone.position.y = h / 2; g.add(cone);
  if (glow) {
    const top = new THREE.Mesh(new THREE.CircleGeometry(h * 0.12, 14), mat("volcTop", () => new THREE.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false, fog: false })));
    top.rotation.x = -Math.PI / 2; top.position.y = h - 0.2; g.add(top);
    const halo = new THREE.Sprite(mat("volcHalo", () => new THREE.SpriteMaterial({ map: glowTex("255,110,30", 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    halo.scale.set(h * 0.9, h * 0.6, 1); halo.position.y = h + h * 0.1; g.add(halo);
    // lava streaks down the side
    const sm = mat("volcStreak", () => new THREE.MeshBasicMaterial({ color: 0xff5a10, toneMapped: false }));
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4;
      const s = new THREE.Mesh(new THREE.BoxGeometry(h * 0.04, h * 0.55, 0.3), sm);
      const rr = h * 0.33;
      s.position.set(Math.sin(a) * rr, h * 0.62, Math.cos(a) * rr); s.rotation.y = a; s.rotation.x = 0.55;
      g.add(s);
    }
  }
  return g;
}
export function makeTumbleweed(r = 0.45) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat("tumble", () => new THREE.MeshStandardMaterial({ color: 0xa8804a, roughness: 1, wireframe: true })));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.72, 1), mat("tumbleIn", () => stdMat(0x8a6034, { roughness: 1, flatShading: true })));
  const g = new THREE.Group(); g.add(core, m); return g;
}

/* ================= COURSE ================= */
export function buildWorld2Course(theme, course, opt = {}) {
  const high = opt.high !== false;
  const bs = opt.baseScale == null ? 1 : opt.baseScale;
  const NB = (a, b) => Math.round(N(high, a, b) * bs);
  const narrow = !!opt.narrow;
  const pathW = narrow ? 5.5 : 7.3;
  const span = narrow ? 1.7 : 2;
  const g = new THREE.Group(); g.name = "courseVisual";
  const updaters = [];
  const notTurn = (s) => s.kind !== "turn";
  const isTurn = (s) => s.kind === "turn";
  const laneLines = (color, o = {}) => {
    const m = new THREE.MeshBasicMaterial(Object.assign({ color, transparent: true, opacity: 0.8, toneMapped: false }, o));
    [-span / 2, span / 2].forEach((x) => g.add(new THREE.Mesh(ribbon(course, { width: 0.1, yLift: 0.06, offset: x }), m)));
  };
  const edges = (geo, matl, off, y = 0.12, sc = [0.5, 0.26, 1.3]) => {
    const list = [];
    for (let i = 0; i < course.samples.length; i += 2) {
      const s = course.samples[i];
      if (s.kind === "turn") continue;
      for (const side of [-1, 1]) {
        const o = side * off;
        list.push([s.x + Math.cos(s.heading) * o, s.y + y, s.z + Math.sin(s.heading) * o, -s.heading, sc[0], sc[1], sc[2]]);
      }
    }
    g.add(instanced(geo, matl, list));
  };
  const ground = (map, y, color) => {
    const f = new THREE.Mesh(new THREE.CircleGeometry(240, 48), new THREE.MeshStandardMaterial({ map, color: color || 0xffffff, roughness: 0.95 }));
    f.rotation.x = -Math.PI / 2; f.name = "followGround"; f.userData.y = y; f.receiveShadow = true; g.add(f);
    return f;
  };
  const along = (n, offMin, offMax, minClear, make, yFn) => {
    for (let i = 0; i < n; i++) {
      const sp = sideSpot(course, (i * 5.3 + 3) % Math.max(10, course.length - 4), i % 2 ? 1 : -1, R(offMin, offMax));
      if (!clearOfCourse(course, sp.x, sp.z, minClear)) continue;
      const o = make(i, sp);
      if (!o) continue;
      o.position.set(sp.x, yFn ? yFn(sp) : sp.y, sp.z);
      if (!o.userData.keepRot) o.rotation.y = R(0, 6);
      g.add(o);
    }
  };

  if (theme === "desert") {
    const road = new THREE.Mesh(ribbon(course, { width: pathW, yLift: 0.03, vScale: 0.14, uRepeat: 1.6 }), new THREE.MeshStandardMaterial({ map: sandRoadTex(), roughness: 0.9 }));
    road.receiveShadow = true; g.add(road);
    laneLines(0x8a5a28, { opacity: 0.55 });
    const bankM = new THREE.MeshStandardMaterial({ map: duneTex(4), roughness: 0.95 });
    const banks = new THREE.Mesh(ribbon(course, { width: 15, yLift: -0.05, pred: notTurn, vScale: 0.06, uRepeat: 4 }), bankM);
    const banksT = new THREE.Mesh(ribbon(course, { width: 8.6, yLift: -0.06, pred: isTurn, vScale: 0.06, uRepeat: 2.4 }), bankM);
    banks.receiveShadow = banksT.receiveShadow = true; g.add(banks, banksT);
    edges(new THREE.BoxGeometry(1, 1, 1), mat("sandstone", () => stdMat(0xc89a5a, { roughness: 0.9 })), pathW / 2 + 0.35, 0.1, [0.55, 0.32, 1.5]);
    ground(duneTex(40), -0.3);
    const duneM = mat("duneM", () => stdMat(0xe2b874, { roughness: 1 }));
    along(NB(40, 20), 14, 60, 12, () => { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), duneM); d.scale.set(R(6, 14), R(1.5, 4), R(4, 9)); const gg = new THREE.Group(); gg.add(d); return gg; }, () => -0.35);
    along(NB(60, 30), 8.5, 30, 8, (i) => (i % 4 === 0 ? makeLavaRockSand(R(0.5, 1.2)) : makeCactus(R(1.6, 3.2))));
  } else if (theme === "ocean") {
    const pathM = new THREE.MeshStandardMaterial({ map: seabedTex(1), color: 0xe8f0e0, roughness: 0.9 });
    pathM.map.repeat.set(1.5, 1);
    const road = new THREE.Mesh(ribbon(course, { width: pathW, yLift: 0.03, vScale: 0.12, uRepeat: 1.5 }), pathM);
    road.receiveShadow = true; g.add(road);
    // moving caustic light on the path
    const cT = causticTex();
    const caus = new THREE.Mesh(ribbon(course, { width: pathW + 4, yLift: 0.05, vScale: 0.05, uRepeat: 1.2 }), new THREE.MeshBasicMaterial({ map: cT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, toneMapped: false }));
    caus.renderOrder = 1; g.add(caus);
    updaters.push((dt) => { cT.offset.y -= dt * 0.05; cT.offset.x = Math.sin(performance.now() * 0.0004) * 0.1; });
    laneLines(0x7af0ff, { opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const bedM = new THREE.MeshStandardMaterial({ map: seabedTex(4), color: 0x9ab8a8, roughness: 0.95 });
    const banks = new THREE.Mesh(ribbon(course, { width: 16, yLift: -0.05, pred: notTurn, vScale: 0.06, uRepeat: 4 }), bedM);
    const banksT = new THREE.Mesh(ribbon(course, { width: 8.6, yLift: -0.06, pred: isTurn, vScale: 0.06, uRepeat: 2.4 }), bedM);
    g.add(banks, banksT);
    edges(new THREE.IcosahedronGeometry(0.5, 0), mat("pebble", () => stdMat(0x8a9a9a, { roughness: 0.9, flatShading: true })), pathW / 2 + 0.4, 0.0, [0.7, 0.35, 0.9]);
    ground(seabedTex(36), -0.3, 0x7a9a90);
    const rockM = mat("oRock", () => stdMat(0x4a5a64, { roughness: 0.95, flatShading: true }));
    along(NB(36, 18), 14, 55, 12, () => { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(R(1.5, 4), 0), rockM); r.scale.y = R(0.6, 1.4); const gg = new THREE.Group(); gg.add(r); return gg; }, (sp) => sp.y - 0.4);
    const corals = [0xff6a8a, 0xffa040, 0xb070ff, 0x40d0c0, 0xffe060];
    along(NB(70, 34), 8.5, 26, 8, (i) => (i % 3 === 0 ? makeBrainCoral(R(0.5, 1.1), corals[i % 5]) : i % 3 === 1 ? makeCoral(R(1, 2), corals[(i + 2) % 5]) : makeSeaweed(R(1.6, 3.4))));
  } else if (theme === "volcano") {
    const roadM = new THREE.MeshStandardMaterial({ map: basaltTex(false), emissiveMap: basaltTex(true), emissive: 0xff7a2a, emissiveIntensity: 0.9, roughness: 0.85 });
    const road = new THREE.Mesh(ribbon(course, { width: pathW, yLift: 0.03, vScale: 0.12, uRepeat: 1.4 }), roadM);
    road.receiveShadow = true; g.add(road);
    laneLines(0xffb050, { opacity: 0.6 });
    const sideM = new THREE.MeshStandardMaterial({ map: ashTex(4), roughness: 0.95 });
    const banks = new THREE.Mesh(ribbon(course, { width: 14, yLift: -0.05, pred: notTurn, vScale: 0.06, uRepeat: 4 }), sideM);
    const banksT = new THREE.Mesh(ribbon(course, { width: 8.6, yLift: -0.06, pred: isTurn, vScale: 0.06, uRepeat: 2.4 }), sideM);
    g.add(banks, banksT);
    // lava rivers on both sides (animated)
    const lT = lavaTex();
    const lavaM = new THREE.MeshBasicMaterial({ map: lT, toneMapped: false });
    for (const side of [-1, 1]) g.add(new THREE.Mesh(ribbon(course, { width: 5, yLift: -0.25, pred: notTurn, offset: side * 10, vScale: 0.05 }), lavaM));
    updaters.push((dt) => { lT.offset.y -= dt * 0.04; });
    edges(new THREE.DodecahedronGeometry(0.5, 0), mat("basaltEdge", () => stdMat(0x1e1614, { roughness: 0.9, flatShading: true })), pathW / 2 + 0.4, 0.05, [0.8, 0.45, 1.0]);
    ground(ashTex(36), -0.35);
    along(NB(60, 30), 13.5, 50, 12, () => makeLavaRock(R(0.8, 2.8)), (sp) => sp.y - 0.3);
    const ventM = mat("vent", () => new THREE.MeshBasicMaterial({ color: 0xff7a20, toneMapped: false }));
    along(NB(16, 8), 13.5, 30, 12, () => { const gg = new THREE.Group(); const v = new THREE.Mesh(new THREE.CircleGeometry(R(1, 2.2), 12), ventM); v.rotation.x = -Math.PI / 2; v.position.y = 0.05; gg.add(v); return gg; }, (sp) => sp.y - 0.2);
  }
  g.userData.update = (dt, t, ctx) => updaters.forEach((u) => u(dt, t, ctx));
  return g;
}
function makeLavaRockSand(r) {
  const m = makeAsteroid(r);
  m.material = mat("sandRock", () => new THREE.MeshStandardMaterial({ color: 0xb8865a, roughness: 0.95, flatShading: true }));
  const g = new THREE.Group(); g.add(m); m.position.y = r * 0.35; m.scale.y = 0.7; return g;
}

/* ================= AMBIENCE ================= */
export function buildWorld2Ambience(theme, high = true) {
  const g = new THREE.Group(); g.name = "themeAmbience";
  const far = new THREE.Group(); far.name = "themeFar";
  const updaters = [];
  if (theme === "desert") {
    [[0.1, -1, 1.6], [-0.7, -0.75, 1.1], [0.8, -0.6, 0.9], [-0.95, 0.3, 1.2], [0.9, 0.45, 1.3], [0.2, 1, 1]].forEach(([x, z, s]) => {
      const p = makePyramid(42 * s);
      const v = new THREE.Vector3(x, 0, z).normalize().multiplyScalar(170);
      p.position.set(v.x, -3, v.z); far.add(p);
    });
    for (let i = 0; i < N(high, 6, 3); i++) {
      const a = (i / N(high, 6, 3)) * Math.PI * 2;
      const c = makeCloud(R(0.8, 1.2)); c.position.set(Math.cos(a) * 200, R(70, 95), Math.sin(a) * 200); g.add(c);
    }
  } else if (theme === "ocean") {
    // the water surface far above, with light shafts
    const surf = new THREE.Mesh(new THREE.CircleGeometry(260, 40), new THREE.MeshBasicMaterial({ map: causticTex(), color: 0x9ff4ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false }));
    surf.rotation.x = Math.PI / 2; surf.position.y = 48; g.add(surf);
    const rayM = new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (ctx, W, H) => { const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(200,250,255,0.55)"); gr.addColorStop(1, "rgba(200,250,255,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const rays = [];
    for (let i = 0; i < N(high, 14, 7); i++) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(R(3, 7), 60), rayM);
      const a = R(0, Math.PI * 2), d = R(12, 70);
      r.position.set(Math.cos(a) * d, 18, Math.sin(a) * d); r.rotation.set(0, a, R(-0.25, 0.25));
      r.userData.ph = R(0, 6); rays.push(r); g.add(r);
    }
    const bub = makeTwinklePoints(N(high, 700, 350), () => [R(-30, 30), R(0, 30), R(-45, 12)], { minSize: 3, maxSize: 7, fall: -1.6, box: 30, colors: [0xdff8ff, 0xffffff], persp: true, noTwinkle: true });
    bub.position.y = -6; g.add(bub);
    // fish schools circling around the runner
    const fishM = mat("fish", () => stdMat(0xffb030, { emissive: 0x6a3a00, emissiveIntensity: 0.4 }));
    const fishM2 = mat("fish2", () => stdMat(0x6ad8ff, { emissive: 0x0a4a6a, emissiveIntensity: 0.4 }));
    const schools = [];
    for (let s = 0; s < N(high, 4, 2); s++) {
      const sc = new THREE.Group();
      for (let k = 0; k < 9; k++) {
        const f = makeFish(s % 2 ? fishM : fishM2);
        f.position.set(R(-2, 2), R(-1, 1), R(-2, 2)); sc.add(f);
      }
      sc.userData = { r: R(14, 26), h: R(3, 9), ph: s * 1.7, sp: R(0.18, 0.3) * (s % 2 ? 1 : -1) };
      schools.push(sc); g.add(sc);
    }
    updaters.push((dt, t) => {
      rays.forEach((r) => { r.material.opacity = 1; r.scale.x = 0.8 + Math.sin(t * 0.6 + r.userData.ph) * 0.25; });
      schools.forEach((sc) => {
        const u = sc.userData, a = t * u.sp + u.ph;
        sc.position.set(Math.cos(a) * u.r, u.h + Math.sin(t * 0.8 + u.ph), Math.sin(a) * u.r - 10);
        sc.rotation.y = -a + (u.sp > 0 ? 0 : Math.PI);
      });
    });
  } else if (theme === "volcano") {
    [[0, -1, 1.6], [-0.8, -0.6, 1.0], [0.85, -0.5, 1.15], [-0.9, 0.4, 0.9], [0.95, 0.4, 1.0]].forEach(([x, z, s], k) => {
      const v = makeVolcanoCone(55 * s, k < 3);
      const p = new THREE.Vector3(x, 0, z).normalize().multiplyScalar(175);
      v.position.set(p.x, -4, p.z); far.add(v);
    });
    const smokeM = new THREE.SpriteMaterial({ map: glowTex("70,50,50", 0.85), transparent: true, depthWrite: false, fog: false });
    const smokes = [];
    for (let i = 0; i < N(high, 10, 5); i++) {
      const s = new THREE.Sprite(smokeM); s.userData = { y0: R(0, 60), sp: R(3, 6), x: R(-12, 12) };
      s.scale.setScalar(R(20, 34)); smokes.push(s); far.add(s);
    }
    const emb = makeTwinklePoints(N(high, 600, 300), () => [R(-30, 30), R(0, 24), R(-45, 12)], { minSize: 3, maxSize: 6, fall: -2.2, box: 24, colors: [0xff8a2a, 0xffc040, 0xff5a1a], persp: true });
    emb.position.y = -4; g.add(emb);
    updaters.push((dt, t) => smokes.forEach((s) => { const u = s.userData; s.position.set(u.x, 50 + ((u.y0 + t * u.sp) % 60), -175); s.material.opacity = 0.75; }));
  }
  g.userData.far = far;
  g.userData.update = (dt, t, ctx) => updaters.forEach((u) => u(dt, t, ctx));
  return g;
}
export function makeFish(m) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), m); body.scale.set(1.6, 0.8, 0.5); g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), m); tail.rotation.z = Math.PI / 2; tail.position.x = -0.42; g.add(tail);
  return g;
}

/* ================= SIDE DECOR ================= */
export function world2Decor(theme, i) {
  if (theme === "desert") {
    const k = i % 5;
    if (k === 1 || k === 4) return { obj: makePalm(R(4.5, 6)), sideOff: 7.2 + (i % 3) * 0.5 };
    if (k === 2) return { obj: makeObelisk(R(4, 6)), sideOff: 6.4, align: true };
    return { obj: makeCactus(R(1.8, 3)), sideOff: 6.0 + (i % 4) * 0.5 };
  }
  if (theme === "ocean") {
    const k = i % 4;
    if (k === 0 || k === 2) return { obj: makeSeaweed(R(2.6, 4.4)), sideOff: 5.8 + (i % 3) * 0.6 };
    return { obj: makeCoral(R(1.4, 2.2), [0xff6a8a, 0xffa040, 0xb070ff, 0x40d0c0][i % 4]), sideOff: 6.0 + (i % 3) * 0.5 };
  }
  if (theme === "volcano") {
    if (i % 3 === 1) return { obj: makeTorch(), sideOff: 5.2, align: true };
    return { obj: makeLavaRock(R(0.7, 1.4)), sideOff: 6.2 + (i % 4) * 0.5 };
  }
  return null;
}
export function makeTorch(color = 0xff9a2a) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.2, 6), mat("torchPost", () => stdMat(0x3a2418)));
  post.position.y = 1.1; g.add(post);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.16, 0.3, 8), mat("torchBowl", () => stdMat(0x2a2a2a, { metalness: 0.5 }))); bowl.position.y = 2.25; g.add(bowl);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), mat("flame" + color, () => new THREE.MeshBasicMaterial({ color, toneMapped: false }))); flame.position.y = 2.65; g.add(flame);
  const halo = new THREE.Sprite(mat("flameHalo", () => new THREE.SpriteMaterial({ map: glowTex("255,170,60", 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  halo.scale.set(1.8, 1.8, 1); halo.position.y = 2.6; g.add(halo);
  return g;
}

/* ================= HAZARDS (standard footprints) ================= */
export function world2Hazard(theme, kind, cTex) {
  const g = new THREE.Group();
  const caution = () => new THREE.MeshBasicMaterial({ map: cTex });
  if (kind === "hole") {
    let pitM;
    if (theme === "volcano") pitM = new THREE.MeshBasicMaterial({ map: lavaTex(), toneMapped: false });
    else if (theme === "ocean") pitM = new THREE.MeshStandardMaterial({ color: 0x02121e, roughness: 1, emissive: 0x003a5a, emissiveIntensity: 0.6 });
    else pitM = new THREE.MeshStandardMaterial({ color: 0x8a6030, roughness: 1, emissive: 0x2a1404, emissiveIntensity: 0.3 });
    const pit = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 2.3), pitM); pit.position.y = -0.08;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 2.45), caution()); rim.position.y = 0.04;
    g.add(pit, rim);
    if (theme === "desert") { // quicksand swirl
      const sw = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.7, 24), new THREE.MeshBasicMaterial({ color: 0x5a3a14, transparent: true, opacity: 0.6 }));
      sw.rotation.x = -Math.PI / 2; sw.position.y = 0.05; sw.scale.set(1, 1.4, 1); g.add(sw);
    }
    if (theme === "ocean") { // glowing trench rim
      const glow = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), new THREE.MeshBasicMaterial({ color: 0x40f0ff, transparent: true, opacity: 0.8, toneMapped: false, side: THREE.DoubleSide }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.07; glow.scale.set(1, 1.35, 1); g.add(glow);
    }
    return g;
  }
  if (kind === "wall") {
    let body;
    if (theme === "desert") body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.6), mat("hieroWall", () => new THREE.MeshStandardMaterial({ map: hieroTex(), roughness: 0.85 })));
    else if (theme === "ocean") body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.55), mat("coralWall", () => stdMat(0xff7a9a, { roughness: 0.6, emissive: 0x6a1a3a, emissiveIntensity: 0.35, flatShading: true })));
    else body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.5), mat("obsWall", () => new THREE.MeshStandardMaterial({ color: 0x241a2a, roughness: 0.25, metalness: 0.3, emissiveMap: basaltTex(true), emissive: 0xff6a20, emissiveIntensity: 1 })));
    body.position.y = 0.78; body.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.28), caution());
    stripe.position.set(0, 1.28, body.geometry.parameters.depth / 2 + 0.02);
    g.add(body, stripe);
    if (theme === "ocean") for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat("coralBump", () => stdMat(0xffb0c0, { roughness: 0.6 }))); b.position.set(-0.7 + k * 0.35, 1.58, 0); g.add(b); }
    return g;
  }
  if (kind === "beam") {
    let beamM, postM;
    if (theme === "desert") { beamM = stdMat(0x9a6a34, { roughness: 0.8 }); postM = stdMat(0xc89a5a); }
    else if (theme === "ocean") { beamM = stdMat(0x6a4a2a, { emissive: 0x0a2a2a, emissiveIntensity: 0.3 }); postM = stdMat(0x4a5a64); }
    else { beamM = new THREE.MeshStandardMaterial({ color: 0x2a1a14, emissive: 0xff4a10, emissiveIntensity: 0.6, roughness: 0.8 }); postM = stdMat(0x1e1614); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.72, 10), beamM);
    beam.rotation.z = Math.PI / 2; beam.position.y = 1.18; beam.castShadow = true; g.add(beam);
    [-0.78, 0.78].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.22, 8), postM); p.position.set(x, 0.61, 0); g.add(p); });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 10), caution());
    band.rotation.z = Math.PI / 2; band.position.y = 1.18; g.add(band);
    if (theme === "ocean") { const w = makeSeaweed(0.9, 0x2aa860); w.position.set(0.3, 0.3, 0); w.scale.setScalar(0.6); g.add(w); }
    return g;
  }
  // roll
  if (theme === "desert") { const t = makeTumbleweed(0.45); t.position.y = 0.46; g.add(t); return g; }
  if (theme === "ocean") { // puffer fish
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), mat("puffer", () => stdMat(0xffd040, { roughness: 0.5, emissive: 0x4a3000, emissiveIntensity: 0.3 })));
    m.position.y = 0.46; m.castShadow = true; g.add(m);
    const spM = mat("pufferSp", () => stdMat(0xfff0b0));
    for (let k = 0; k < 10; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), spM); const a = k / 10 * Math.PI * 2; sp.position.set(0, 0.46 + Math.sin(a) * 0.46, Math.cos(a) * 0.46); sp.rotation.x = a; g.add(sp); }
    const eyeM = mat("eyeBlk", () => new THREE.MeshBasicMaterial({ color: 0x111111 }));
    [-0.15, 0.15].forEach((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeM); e.position.set(x, 0.6, 0.38); g.add(e); });
    return g;
  }
  const m = makeAsteroid(0.45);
  m.material = mat("lavaBall", () => new THREE.MeshStandardMaterial({ color: 0x3a1a10, roughness: 0.9, flatShading: true, emissive: 0xff4a10, emissiveIntensity: 0.85 }));
  m.position.y = 0.46; m.castShadow = true; g.add(m);
  return g;
}
