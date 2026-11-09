/* Mila Quest v7 — per-world environments (Pirate deck, Magic rooftops, Milky-Way space, Ice kingdom).
   Jungle keeps the original look built in game.js. Everything here is procedural (no new assets). */
import * as THREE from "../assets/lib/three.module.js";
import { pathAt } from "./worldkit.js";

export const THEMES = ["jungle", "pirate", "magic", "space", "ice"];
export const themeOf = (wid) => THEMES[(wid || 1) - 1] || "jungle";

export const THEME_LOOK = {
  pirate: { exp: 1.1, hemi: 1.0, hemiSky: 0xd8f4ff, hemiGround: 0x2a6a8a, dir: 1.45, sun: 0xfff2d6, fog: 0xbfe8f6, fogNear: 45, fogFar: 330, skyTop: 0x1e8ee0, skyBot: 0xcff2ff, clear: 0x8fd6f4, sunDisk: 0xfff6c8, showSun: true },
  magic: { exp: 1.12, hemi: 0.95, hemiSky: 0xffd2f4, hemiGround: 0x3a2a68, dir: 1.05, sun: 0xffd8ec, fog: 0x8a64b8, fogNear: 36, fogFar: 300, skyTop: 0x241460, skyBot: 0xff9fd2, clear: 0x6a3a9a, sunDisk: 0xfff4dc, showSun: true },
  space: { exp: 1.16, hemi: 0.95, hemiSky: 0xa49cff, hemiGround: 0x1a1040, dir: 1.15, sun: 0xeef0ff, fog: 0x070618, fogNear: 70, fogFar: 380, skyTop: 0x020208, skyBot: 0x0a0822, clear: 0x03030c, showSun: false },
  ice: { exp: 1.1, hemi: 1.05, hemiSky: 0xf2fbff, hemiGround: 0x8ab8d4, dir: 1.3, sun: 0xfffaf0, fog: 0xe2f4ff, fogNear: 34, fogFar: 340, skyTop: 0x5fb2ea, skyBot: 0xeef9ff, clear: 0xd8f0ff, sunDisk: 0xfffbe8, showSun: true }
};

const R = (a, b) => a + Math.random() * (b - a);

function runsOf(samples, pred) {
  const runs = [];
  let i = 0;
  while (i < samples.length) {
    if (pred && !pred(samples[i], i)) { i++; continue; }
    const from = i;
    while (i < samples.length && (!pred || pred(samples[i], i))) i++;
    const to = Math.min(samples.length - 1, i);
    if (to > from) runs.push([from, to]);
  }
  return runs;
}
export function ribbon(course, opt = {}) {
  const width = opt.width || 7;
  const pos = [], uvs = [], idx = [];
  let base = 0;
  for (const [from, to] of runsOf(course.samples, opt.pred)) {
    const start = base;
    for (let k = from; k <= to; k++) {
      const p = course.samples[k];
      const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
      const off = typeof opt.offset === "function" ? opt.offset(p) : (opt.offset || 0);
      const cx = p.x + rx * off, cz = p.z + rz * off;
      const y = opt.absY != null ? opt.absY : p.y + (opt.yLift || 0);
      const hw = width / 2;
      pos.push(cx - rx * hw, y, cz - rz * hw, cx + rx * hw, y, cz + rz * hw);
      const v = (k - from) * (opt.vScale || 0.1);
      uvs.push(0, v, opt.uRepeat || 1, v);
      base += 2;
    }
    for (let k = 0; k < to - from; k++) {
      const i0 = start + k * 2;
      idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  }
  return finishGeo(pos, uvs, idx);
}
export function wall(course, opt = {}) {
  const pos = [], uvs = [], idx = [];
  let base = 0;
  for (const [from, to] of runsOf(course.samples, opt.pred)) {
    const start = base;
    let dist = 0;
    for (let k = from; k <= to; k++) {
      const p = course.samples[k];
      const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
      const off = typeof opt.offset === "function" ? opt.offset(p) : opt.offset;
      const x = p.x + rx * off, z = p.z + rz * off;
      const top = p.y + (opt.top != null ? opt.top : 1);
      const bot = opt.absBottom != null ? opt.absBottom : p.y + (opt.bottom || 0);
      pos.push(x, top, z, x, bot, z);
      if (k > from) {
        const q = course.samples[k - 1];
        const qo = typeof opt.offset === "function" ? opt.offset(q) : opt.offset;
        dist += Math.hypot(x - (q.x + Math.cos(q.heading) * qo), z - (q.z + Math.sin(q.heading) * qo));
      }
      const u = dist * (opt.uScale || 0.25);
      uvs.push(u, opt.vTop != null ? opt.vTop : 1, u, 0);
      base += 2;
    }
    for (let k = 0; k < to - from; k++) {
      const i0 = start + k * 2;
      idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  }
  return finishGeo(pos, uvs, idx);
}
function finishGeo(pos, uvs, idx) {
  const g = new THREE.BufferGeometry();
  if (!pos.length) {
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    g.setIndex([0, 1, 2]);
    return g;
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function clearOfCourse(course, x, z, minD) {
  const S = course.samples;
  for (let i = 0; i < S.length; i += 2) {
    const dx = S[i].x - x, dz = S[i].z - z;
    if (dx * dx + dz * dz < minD * minD) return false;
  }
  return true;
}
/* true when a point lies on another (non-neighbouring) stretch of the track, e.g. the inner corner of the sharp turn */
function onOtherStretch(course, x, z, i, half) {
  const S = course.samples;
  const h2 = half * half;
  for (let j = 0; j < S.length; j++) {
    if (Math.abs(j - i) < 5) continue;
    const dx = S[j].x - x, dz = S[j].z - z;
    if (dx * dx + dz * dz < h2) return true;
  }
  return false;
}
function instanced(geo, material, list) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, list.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach((it, i) => {
    q.setFromEuler(e.set(0, it[3], 0));
    m.compose(v.set(it[0], it[1], it[2]), q, sc.set(it[4], it[5], it[6]));
    im.setMatrixAt(i, m);
  });
  im.count = list.length;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}
function sideSpot(course, s, side, off) {
  const p = pathAt(course, s);
  const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
  return { x: p.x + rx * side * off, y: p.y, z: p.z + rz * side * off, heading: p.heading, kind: p.kind };
}

/* ---------- canvas textures ---------- */
function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const TEX = {};
function tex(name, make) { return TEX[name] || (TEX[name] = make()); }

function deckTex() {
  return tex("deck", () => canvasTex(512, 512, (ctx, W, H) => {
    const cols = ["#b98250", "#a8713f", "#c79058", "#9c6838", "#b37a46", "#c08a52"];
    const n = 10, pw = W / n;
    for (let i = 0; i < n; i++) {
      const off = (i * 197) % H;
      for (let seg = -2; seg < 2; seg++) {
        const y0 = off + seg * H * 0.5;
        ctx.fillStyle = cols[(i * 3 + seg + 6) % cols.length];
        ctx.fillRect(i * pw, y0, pw, H * 0.5);
        ctx.strokeStyle = "rgba(60,30,10,0.55)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(i * pw, y0); ctx.lineTo(i * pw + pw, y0); ctx.stroke();
        ctx.fillStyle = "#3a2410";
        ctx.fillRect(i * pw + 8, y0 + 6, 4, 4); ctx.fillRect(i * pw + pw - 12, y0 + 6, 4, 4);
      }
      for (let g = 0; g < 7; g++) {
        ctx.strokeStyle = `rgba(80,45,15,${0.12 + Math.random() * 0.18})`; ctx.lineWidth = 1 + Math.random();
        const x = i * pw + 4 + Math.random() * (pw - 8);
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let y = 0; y <= H; y += 32) ctx.lineTo(x + Math.sin(y * 0.03 + g) * 2, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#2a1a0c"; ctx.fillRect(i * pw, 0, 3, H);
    }
  }));
}
function hullTex() {
  return tex("hull", () => canvasTex(512, 256, (ctx, W, H) => {
    for (let r = 0; r < 12; r++) {
      ctx.fillStyle = ["#5a3418", "#4e2c14", "#63391b", "#55301a"][r % 4];
      ctx.fillRect(0, r * (H / 12), W, H / 12);
      ctx.fillStyle = "rgba(20,10,4,0.6)"; ctx.fillRect(0, r * (H / 12), W, 2);
    }
    ctx.fillStyle = "#e0a32a"; ctx.fillRect(0, H * 0.16, W, H * 0.1);
    ctx.fillStyle = "#9a1f1f"; ctx.fillRect(0, H * 0.26, W, H * 0.12);
    ctx.fillStyle = "#1a0e06";
    for (let x = 30; x < W; x += 128) ctx.fillRect(x, H * 0.28, 34, H * 0.08);
    ctx.fillStyle = "#3a2410"; ctx.fillRect(0, 0, W, H * 0.06);
  }));
}
function seaTex() {
  return tex("sea", () => canvasTex(512, 512, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#1386c0"); g.addColorStop(0.5, "#1a9ad0"); g.addColorStop(1, "#1286bc");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(10,70,120,${0.15 + Math.random() * 0.2})`;
      const x = Math.random() * W, y = Math.random() * H;
      for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 20 + Math.random() * 40, 6 + Math.random() * 10, 0, 0, 7); ctx.fill(); }
    }
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * W, y = Math.random() * H, l = 10 + Math.random() * 34;
      ctx.strokeStyle = `rgba(${200 + Math.random() * 55 | 0},245,255,${0.25 + Math.random() * 0.45})`;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) {
        ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
        ctx.quadraticCurveTo(x + dx + l / 2, y + dy - 5, x + dx + l, y + dy); ctx.stroke();
      }
    }
  }, [70, 70]));
}
function foamTex() {
  return tex("foam", () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * W;
      const edge = Math.min(x, W - x) / (W / 2);
      if (edge > 0.55 || Math.random() < edge) continue;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.5})`;
      const y = Math.random() * H;
      for (const dy of [-H, 0, H]) { ctx.beginPath(); ctx.arc(x, y + dy, 1 + Math.random() * 4, 0, 7); ctx.fill(); }
    }
  }));
}
function sailTex() {
  return tex("sail", () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#f6ecd2"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = "rgba(160,130,90,0.18)"; ctx.fillRect(0, i * H / 6, W, 3); }
    ctx.fillStyle = "#c0392b"; ctx.fillRect(0, H * 0.42, W, H * 0.12);
    ctx.strokeStyle = "rgba(120,90,60,0.5)"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
  }));
}
function jollyTex() {
  return tex("jolly", () => canvasTex(128, 96, (ctx, W, H) => {
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(64, 40, 18, 0, 7); ctx.fill();
    ctx.fillRect(54, 52, 20, 12);
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(57, 38, 5, 0, 7); ctx.arc(71, 38, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(34, 62); ctx.lineTo(94, 86); ctx.moveTo(94, 62); ctx.lineTo(34, 86); ctx.stroke();
  }));
}
function crateTex() {
  return tex("crate", () => canvasTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = "#b07a40"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? "#a06c36" : "#bb8648"; ctx.fillRect(0, i * 32, W, 32); }
    ctx.strokeStyle = "#5a3412"; ctx.lineWidth = 12; ctx.strokeRect(6, 6, W - 12, H - 12);
    ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(W - 10, H - 10); ctx.stroke();
  }));
}
function blobAt(ctx, x, y, r, col) {
  const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
/* Milky-Way track texture: tiles along v, u = across the track */
function galaxyTex() {
  return tex("galaxy", () => canvasTex(512, 1024, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#160c3a"); g.addColorStop(0.3, "#2a1a66"); g.addColorStop(0.5, "#3c2a86");
    g.addColorStop(0.7, "#2a1a66"); g.addColorStop(1, "#160c3a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const blob = (x, y, r, col) => { for (const dy of [-H, 0, H]) blobAt(ctx, x, y + dy, r, col); };
    const cols = ["rgba(140,90,255,0.35)", "rgba(80,150,255,0.32)", "rgba(255,110,200,0.28)", "rgba(255,190,120,0.30)", "rgba(90,220,255,0.25)"];
    for (let i = 0; i < 70; i++) {
      const x = W / 2 + (Math.random() + Math.random() - 1) * W * 0.42;
      blob(x, Math.random() * H, 40 + Math.random() * 110, cols[i % cols.length]);
    }
    for (let i = 0; i < 26; i++) blob(W / 2 + (Math.random() - 0.5) * 120, Math.random() * H, 50 + Math.random() * 60, "rgba(255,230,190,0.30)");
    for (let i = 0; i < 18; i++) blob(W / 2 + (Math.random() - 0.5) * 160, Math.random() * H, 18 + Math.random() * 30, "rgba(8,4,24,0.45)");
    for (let i = 0; i < 4200; i++) {
      const x = W / 2 + (Math.random() + Math.random() + Math.random() - 1.5) * W * 0.62;
      const y = Math.random() * H;
      const a = 0.35 + Math.random() * 0.65;
      ctx.fillStyle = Math.random() < 0.15 ? `rgba(255,220,170,${a})` : (Math.random() < 0.2 ? `rgba(170,200,255,${a})` : `rgba(255,255,255,${a})`);
      const s = Math.random() < 0.94 ? 1.2 : 2.4;
      ctx.fillRect(x, y, s, s);
    }
    for (let i = 0; i < 70; i++) {
      const x = 30 + Math.random() * (W - 60), y = 12 + Math.random() * (H - 24);
      blobAt(ctx, x, y, 9, "rgba(255,255,255,0.9)");
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(x - 9, y - 0.75, 18, 1.5); ctx.fillRect(x - 0.75, y - 9, 1.5, 18);
    }
  }));
}
function dustTex() {
  return tex("dust", () => canvasTex(256, 512, (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(60,30,140,0)"); g.addColorStop(0.3, "rgba(110,70,220,0.35)");
    g.addColorStop(0.5, "rgba(170,120,255,0.55)"); g.addColorStop(0.7, "rgba(110,70,220,0.35)"); g.addColorStop(1, "rgba(60,30,140,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 1300; i++) {
      const x = W / 2 + (Math.random() + Math.random() - 1) * W * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
      ctx.fillRect(x, Math.random() * H, 1.5, 1.5);
    }
  }));
}
function starSkyTex() {
  return tex("starsky", () => canvasTex(2048, 1024, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#010107"); g.addColorStop(0.5, "#07061a"); g.addColorStop(1, "#020210");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const blob = (x, y, r, col) => { for (const dx of [-W, 0, W]) blobAt(ctx, x + dx, y, r, col); };
    const bandY = (x) => H * 0.36 + Math.sin(x / W * Math.PI * 2) * H * 0.16;
    const bandCols = ["rgba(120,90,230,0.20)", "rgba(80,130,255,0.18)", "rgba(255,170,220,0.16)", "rgba(255,210,160,0.20)"];
    for (let i = 0; i < 220; i++) { const x = Math.random() * W; blob(x, bandY(x) + (Math.random() - 0.5) * 90, 40 + Math.random() * 90, bandCols[i % 4]); }
    for (let i = 0; i < 60; i++) { const x = Math.random() * W; blob(x, bandY(x) + (Math.random() - 0.5) * 20, 20 + Math.random() * 30, "rgba(4,2,14,0.5)"); }
    for (let i = 0; i < 16000; i++) {
      const x = Math.random() * W;
      const y = bandY(x) + (Math.random() + Math.random() + Math.random() - 1.5) * 150;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`;
      ctx.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 6500; i++) {
      ctx.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${210 + Math.random() * 45 | 0},255,${0.3 + Math.random() * 0.7})`;
      const s = Math.random() < 0.9 ? 1 : 2;
      ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
    }
    blob(W * 0.18, H * 0.62, 160, "rgba(255,80,170,0.22)");
    blob(W * 0.22, H * 0.58, 100, "rgba(120,80,255,0.22)");
    blob(W * 0.66, H * 0.2, 180, "rgba(40,200,220,0.16)");
    blob(W * 0.7, H * 0.24, 90, "rgba(90,120,255,0.2)");
    blob(W * 0.88, H * 0.66, 130, "rgba(255,140,90,0.15)");
  }));
}
function bandTex(cols, n = 9) {
  return tex('band' + cols.join(''), () => canvasTex(256, 128, (ctx, W, H) => {
    for (let i = 0; i < n; i++) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(0, i * H / n, W, H / n + 1); }
    for (let i = 0; i < 40; i++) { ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(Math.random() * W, Math.random() * H, 30 + Math.random() * 60, 2); }
  }));
}
function earthTex() {
  return tex('earth', () => canvasTex(256, 128, (ctx, W, H) => {
    ctx.fillStyle = "#1f5fc8"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 3 ? "#3fa35a" : "#c9b07a"; ctx.beginPath(); ctx.ellipse(Math.random() * W, 20 + Math.random() * (H - 40), 8 + Math.random() * 22, 5 + Math.random() * 12, Math.random() * 3, 0, 7); ctx.fill(); }
    for (let i = 0; i < 30; i++) { ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(Math.random() * W, Math.random() * H, 10 + Math.random() * 20, 2 + Math.random() * 4, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#f4f8ff"; ctx.fillRect(0, 0, W, 8); ctx.fillRect(0, H - 8, W, 8);
  }));
}
function craterTex(base) {
  return tex('crater' + base, () => canvasTex(256, 128, (ctx, W, H) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 2 + Math.random() * 9;
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(x - 1, y - 1, r * 0.7, 0, 7); ctx.fill();
    }
  }));
}
function ringTex() {
  return tex('ring', () => canvasTex(512, 512, (ctx, W) => {
    const cx = W / 2;
    for (let r = 160; r < 256; r += 2) {
      const gap = r > 228 && r < 238 ? 0.15 : 1;
      ctx.strokeStyle = `rgba(${220 + Math.random() * 35 | 0},${190 + Math.random() * 40 | 0},${140 + Math.random() * 40 | 0},${(0.25 + Math.random() * 0.55) * gap})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cx, r, 0, 7); ctx.stroke();
    }
  }));
}
function glowTex(rgb, a = 1) {
  return tex("glow" + rgb + a, () => canvasTex(128, 128, (ctx, W) => {
    const rg = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, `rgba(${rgb},${a})`); rg.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`); rg.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, W);
  }));
}
/* magic city */
function cobbleTex() {
  return tex("cobble", () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#6a5a86"; ctx.fillRect(0, 0, W, H);
    const cols = ["#c9b6dc", "#d8c2e2", "#bca8d4", "#e0c8dc", "#b8c0dc", "#ccb4d8"];
    for (let y = 0; y < 8; y++) for (let x = -1; x < 8; x++) {
      const ox = (y % 2) * 16;
      ctx.fillStyle = cols[(x * 7 + y * 3 + 14) % cols.length];
      ctx.beginPath(); ctx.ellipse(x * 32 + ox + 16, y * 32 + 16, 13.5, 12.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.beginPath(); ctx.ellipse(x * 32 + ox + 12, y * 32 + 11, 6, 3, -0.4, 0, 7); ctx.fill();
      if (Math.random() < 0.08) { ctx.fillStyle = "#ffe68a"; ctx.beginPath(); ctx.arc(x * 32 + ox + 20, y * 32 + 20, 2, 0, 7); ctx.fill(); }
    }
  }));
}
function roofTileTex() {
  return tex("rooftile", () => canvasTex(256, 256, (ctx) => {
    ctx.fillStyle = "#3a1840"; ctx.fillRect(0, 0, 256, 256);
    for (let r = -1; r < 10; r++) for (let c = -1; c < 9; c++) {
      const x = c * 32 + (r % 2 ? 16 : 0), y = r * 25.6;
      ctx.fillStyle = ["#a8324e", "#b8405a", "#962a46", "#c04a62"][(r + c + 8) % 4];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 32, y); ctx.lineTo(x + 32, y + 18);
      ctx.arc(x + 16, y + 18, 16, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(x + 4, y + 2, 24, 3);
    }
  }));
}
function facadeTex(emissive) {
  return tex("facade" + (emissive ? "E" : ""), () => canvasTex(128, 256, (ctx, W, H) => {
    ctx.fillStyle = emissive ? "#000" : "#ffffff"; ctx.fillRect(0, 0, W, H);
    if (!emissive) for (let i = 0; i < 80; i++) { ctx.fillStyle = "rgba(0,0,0,0.04)"; ctx.fillRect(Math.random() * W, Math.random() * H, 10, 5); }
    for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) {
      const x = 20 + c * 56, y = 16 + r * 40;
      const lit = ((r * 3 + c * 5) % 4) !== 0;
      if (emissive) { ctx.fillStyle = lit ? "#ffd27a" : "#000"; ctx.fillRect(x + 3, y + 3, 26, 22); continue; }
      ctx.fillStyle = "#5a3a2a"; ctx.fillRect(x, y, 32, 28);
      ctx.fillStyle = lit ? "#ffd98a" : "#2a3460"; ctx.fillRect(x + 3, y + 3, 26, 22);
      ctx.fillStyle = "#5a3a2a"; ctx.fillRect(x + 15, y + 3, 2, 22); ctx.fillRect(x + 3, y + 13, 26, 2);
    }
  }));
}
function brickTex() {
  return tex("brick", () => canvasTex(128, 128, (ctx, W, H) => {
    ctx.fillStyle = "#d8c8b8"; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) {
      ctx.fillStyle = ["#b84a3a", "#a8402e", "#c45a44"][(r + c + 3) % 3];
      ctx.fillRect(c * 32 + (r % 2) * 16 + 2, r * 16 + 2, 28, 12);
    }
  }));
}
function clockTex() {
  return tex("clock", () => canvasTex(128, 128, (ctx) => {
    ctx.fillStyle = "#fff8e6"; ctx.beginPath(); ctx.arc(64, 64, 60, 0, 7); ctx.fill();
    ctx.strokeStyle = "#3a2a5a"; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = "#3a2a5a";
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.fillRect(64 + Math.cos(a) * 48 - 3, 64 + Math.sin(a) * 48 - 3, 6, 6); }
    ctx.strokeStyle = "#3a2a5a"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64, 26); ctx.moveTo(64, 64); ctx.lineTo(90, 70); ctx.stroke();
  }));
}
/* ice */
function iceTex() {
  return tex("ice", () => canvasTex(256, 256, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#9ccfe8"); g.addColorStop(0.5, "#cdeeff"); g.addColorStop(1, "#9ccfe8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.3})`; ctx.fillRect(Math.random() * W, 0, 2 + Math.random() * 6, H); }
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      let x = Math.random() * W, y = Math.random() * H;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(60,120,160,0.35)"; ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(Math.random() * W, Math.random() * H); ctx.lineTo(Math.random() * W, Math.random() * H); ctx.stroke(); }
  }));
}
function snowTex(rep) {
  return tex("snow" + rep.join("x"), () => canvasTex(256, 256, (ctx, W, H) => {
    ctx.fillStyle = "#f4faff"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(150,190,225,${0.08 + Math.random() * 0.14})`;
      ctx.beginPath(); ctx.ellipse(Math.random() * W, Math.random() * H, 14 + Math.random() * 30, 8 + Math.random() * 16, Math.random() * 3, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 500; i++) { ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.9)" : "rgba(170,210,240,0.5)"; ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
  }, rep));
}

/* ---------- shader points: twinkling stars / sparkles / snow ---------- */
export const fxTime = { value: 0 };
function makeTwinklePoints(n, place, opt = {}) {
  const pos = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n), col = new Float32Array(n * 3);
  const palette = (opt.colors || [0xffffff, 0xcfe0ff, 0xfff0c8]).map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    const p = place(i);
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
    size[i] = R(opt.minSize || 2, opt.maxSize || 5.5);
    phase[i] = Math.random();
    const c = palette[i % palette.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: fxTime, uPx: { value: Math.min(window.devicePixelRatio || 1, 1.5) }, uFall: { value: opt.fall || 0 }, uBox: { value: opt.box || 1 }, uDrift: { value: opt.drift || 0 }, uPersp: { value: opt.persp ? 1 : 0 }, uTw: { value: opt.noTwinkle ? 0 : 1 } },
    vertexShader: `
      uniform float uTime; uniform float uPx; uniform float uFall; uniform float uBox; uniform float uDrift; uniform float uPersp; uniform float uTw;
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      varying vec3 vC; varying float vA;
      void main(){
        vec3 p = position;
        if (uFall > 0.0) {
          p.y = mod(p.y - uTime * uFall * (0.7 + aPhase * 0.6), uBox);
          p.x += sin(uTime * 0.9 + aPhase * 30.0) * 0.6;
        }
        if (uDrift > 0.0) {
          p += vec3(sin(uTime * 0.7 + aPhase * 40.0), sin(uTime * 0.9 + aPhase * 23.0) * 0.7, cos(uTime * 0.6 + aPhase * 17.0)) * uDrift;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = mix(1.0, 0.5 + 0.5 * sin(uTime * (1.2 + fract(aPhase * 7.13) * 3.0) + aPhase * 6.2831), uTw);
        float s = aSize * uPx * (0.65 + 0.7 * tw);
        if (uPersp > 0.5) s *= 18.0 / max(1.0, -mv.z);
        gl_PointSize = s;
        vA = 0.4 + 0.6 * tw; vC = aColor;
      }`,
    fragmentShader: `
      uniform float uTw;
      varying vec3 vC; varying float vA;
      void main(){
        vec2 p = gl_PointCoord - 0.5; float d = length(p);
        float core = smoothstep(0.5, 0.0, d);
        float cr = (max(0.0, 1.0 - abs(p.x) * 14.0) * max(0.0, 1.0 - abs(p.y) * 2.2) + max(0.0, 1.0 - abs(p.y) * 14.0) * max(0.0, 1.0 - abs(p.x) * 2.2)) * uTw;
        float a = (core * core + cr * 0.55) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vC * (core + cr * 0.7), a);
      }`,
    transparent: true, depthWrite: false, blending: opt.normalBlend ? THREE.NormalBlending : THREE.AdditiveBlending
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}

/* ---------- shared props ---------- */
const MAT = {};
function mat(key, make) { return MAT[key] || (MAT[key] = make()); }
const stdMat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, o));

function makeMast(high) {
  const g = new THREE.Group();
  const wood = mat("mastWood", () => stdMat(0x6a4020, { roughness: 0.7 }));
  const sailM = mat("sail", () => new THREE.MeshStandardMaterial({ map: sailTex(), side: THREE.DoubleSide, roughness: 0.9, emissive: 0x3a3020, emissiveIntensity: 0.25 }));
  const H = 10.5;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, H, 10), wood);
  mast.position.y = H / 2; mast.castShadow = high; g.add(mast);
  // fore-and-aft sails, parallel to the track so they never hide the word signs
  [[2.6, 3.4, 3.0], [6.4, 2.8, 2.4]].forEach(([y, h, w]) => {
    const geo = new THREE.PlaneGeometry(w, h, 10, 4);
    geo.rotateY(Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const zz = p.getZ(i), yy = p.getY(i);
      p.setX(i, Math.sin((zz / w + 0.5) * Math.PI) * 0.55 * (1 - Math.abs(yy / h)));
    }
    geo.computeVertexNormals();
    const s = new THREE.Mesh(geo, sailM);
    s.position.set(0.05, y + h / 2, w / 2 + 0.1);
    s.castShadow = high;
    g.add(s);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, w + 0.3, 6), wood);
    boom.rotation.x = Math.PI / 2; boom.position.set(0, y, w / 2 + 0.1); g.add(boom);
  });
  const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.45, 0.55, 12, 1, true), mat("nest", () => stdMat(0x5a3418, { side: THREE.DoubleSide })));
  nest.position.y = H - 1.4; g.add(nest);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.85), mat("jolly", () => new THREE.MeshBasicMaterial({ map: jollyTex(), side: THREE.DoubleSide })));
  flag.position.set(0, H - 0.3, 0.62); flag.rotation.y = Math.PI / 2; g.add(flag);
  const rope = mat("rope", () => new THREE.LineBasicMaterial({ color: 0x3a2a18 }));
  const lg = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, H - 1.2, 0), new THREE.Vector3(0.7, 1.0, 1.6),
    new THREE.Vector3(0, H - 1.2, 0), new THREE.Vector3(0.7, 1.0, -1.6),
    new THREE.Vector3(0, H - 1.2, 0), new THREE.Vector3(0.7, 1.0, 0)]);
  g.add(new THREE.LineSegments(lg, rope));
  return g;
}
function makeBarrel() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.95, 14), mat("barrel", () => stdMat(0x8a5428, { roughness: 0.7 })));
  b.position.y = 0.48; b.castShadow = true; g.add(b);
  const hoop = mat("hoop", () => stdMat(0x2a2a2a, { metalness: 0.6, roughness: 0.4 }));
  [0.18, 0.78].forEach((y) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 0.07, 14), hoop); h.position.y = y; g.add(h); });
  return g;
}
function crateMat() { return mat("crate", () => new THREE.MeshStandardMaterial({ map: crateTex(), roughness: 0.8 })); }
function makeCrate(s = 0.8) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat());
  m.position.y = s / 2; m.castShadow = true;
  return m;
}
function makeCannon() {
  const g = new THREE.Group();
  const iron = mat("iron", () => stdMat(0x23262c, { metalness: 0.7, roughness: 0.35 }));
  const wood = mat("carriage", () => stdMat(0x6a3c1c));
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 1.1), wood); base.position.y = 0.3; g.add(base);
  [-0.42, 0.42].forEach((x) => [-0.35, 0.35].forEach((z) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), wood); w.rotation.z = Math.PI / 2; w.position.set(x, 0.2, z); g.add(w); }));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 1.5, 12), iron);
  barrel.rotation.x = Math.PI / 2 - 0.12; barrel.position.set(0, 0.62, 0.35); barrel.castShadow = true; g.add(barrel);
  return g; // muzzle points to local +z
}
function makePalm(h = 5) {
  const g = new THREE.Group();
  const trunkM = mat("palmTrunk", () => stdMat(0x8a6a40));
  const leafM = mat("palmLeaf", () => stdMat(0x2e9a48, { side: THREE.DoubleSide }));
  let x = 0;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.012, 0.2 - i * 0.012, h / 6 + 0.05, 7), trunkM);
    x += 0.04 * i; seg.position.set(x, h / 12 + i * h / 6, 0); g.add(seg);
  }
  for (let k = 0; k < 7; k++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.8, 4, 1, true), leafM);
    leaf.scale.set(1, 1, 0.22);
    const piv = new THREE.Group(); piv.position.set(x, h, 0); piv.rotation.y = k / 7 * Math.PI * 2;
    leaf.rotation.z = -Math.PI / 2 - 0.35; leaf.position.x = 1.3; leaf.position.y = -0.3;
    piv.add(leaf); g.add(piv);
  }
  return g;
}
function makeCloud(scale = 1) {
  const g = new THREE.Group();
  const m = mat("cloud", () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xdde8f4, emissiveIntensity: 0.55, fog: false }));
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(R(3, 6) * scale, 12, 10), m);
    s.position.set((i - 2.5) * 4 * scale, R(-1, 2) * scale, R(-2, 2) * scale); s.scale.y = 0.65;
    g.add(s);
  }
  return g;
}
function makeSnowPine(h = 3) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.3, 7), mat("pineTrunk", () => stdMat(0x5a3a22)));
  trunk.position.y = h * 0.15; g.add(trunk);
  const green = mat("pine", () => stdMat(0x1f5a46, { roughness: 0.8 }));
  const snow = mat("snowCap", () => stdMat(0xffffff, { roughness: 0.6, emissive: 0xc8e4ff, emissiveIntensity: 0.15 }));
  for (let i = 0; i < 3; i++) {
    const r = h * (0.36 - i * 0.08), y = h * (0.22 + i * 0.22), ch = h * 0.36;
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, ch, 9), green); c.position.y = y + ch / 2; c.castShadow = true; g.add(c);
    const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.7, ch * 0.5, 9), snow); s.position.y = y + ch * 0.76; g.add(s);
  }
  return g;
}
function makeIceSpire(h = 2.4) {
  const g = new THREE.Group();
  const m = mat("iceSpire", () => new THREE.MeshStandardMaterial({ color: 0x9fe4ff, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.85, emissive: 0x3aa8e0, emissiveIntensity: 0.35 }));
  for (let i = 0; i < 4; i++) {
    const hh = h * R(0.45, 1);
    const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.14, hh, 5), m);
    c.position.set(R(-0.4, 0.4), hh / 2, R(-0.4, 0.4)); c.rotation.z = R(-0.25, 0.25); c.rotation.x = R(-0.25, 0.25);
    g.add(c);
  }
  return g;
}
function makeIgloo() {
  const g = new THREE.Group();
  const m = mat("igloo", () => new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, (ctx, W) => {
    ctx.fillStyle = "#f6fbff"; ctx.fillRect(0, 0, W, 64);
    ctx.strokeStyle = "#a8c8e0"; ctx.lineWidth = 2;
    for (let r = 0; r < 6; r++) { ctx.beginPath(); ctx.moveTo(0, r * 11); ctx.lineTo(W, r * 11); ctx.stroke(); for (let c = 0; c < 8; c++) { const x = c * 16 + (r % 2) * 8; ctx.beginPath(); ctx.moveTo(x, r * 11); ctx.lineTo(x, r * 11 + 11); ctx.stroke(); } }
  }, [3, 1]), roughness: 0.7 }));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); g.add(dome);
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 12, 1, false, -Math.PI / 2, Math.PI), m);
  tunnel.rotation.x = Math.PI / 2; tunnel.position.set(0, 0, 1.45); g.add(tunnel);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.46, 12, 0, Math.PI), mat("dark", () => new THREE.MeshBasicMaterial({ color: 0x1a2a3a })));
  hole.position.set(0, 0.01, 2.06); g.add(hole);
  return g;
}
function makeAsteroid(r = 1) {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const p = geo.attributes.position;
  const key = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const jit = {};
  for (let i = 0; i < p.count; i++) {
    const k = key(p.getX(i), p.getY(i), p.getZ(i));
    const f = jit[k] || (jit[k] = 0.75 + Math.random() * 0.45);
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  const m = mat("asteroid", () => new THREE.MeshStandardMaterial({ color: 0x8a7a70, roughness: 0.95, flatShading: true, emissive: 0x2a1a40, emissiveIntensity: 0.5 }));
  return new THREE.Mesh(geo, m);
}
function makeCrystalCluster(h = 1.6, color = 0xb070ff) {
  const g = new THREE.Group();
  const m = mat("crys" + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.2, emissive: color, emissiveIntensity: 0.75, transparent: true, opacity: 0.92 }));
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(h * R(0.18, 0.32), 0), m);
    c.scale.y = R(1.8, 3); c.position.set(R(-0.5, 0.5), h * 0.3, R(-0.5, 0.5)); c.rotation.set(R(-0.3, 0.3), R(0, 3), R(-0.3, 0.3));
    g.add(c);
  }
  return g;
}
function makeLamp() {
  const g = new THREE.Group();
  const iron = mat("lampIron", () => stdMat(0x2a2240, { metalness: 0.6, roughness: 0.4 }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 8), iron); pole.position.y = 1.6; g.add(pole);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat("lampGlow", () => new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false })));
  glow.position.y = 3.35; g.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 6), iron); cap.position.y = 3.7; g.add(cap);
  const halo = new THREE.Sprite(mat("lampHalo", () => new THREE.SpriteMaterial({ map: glowTex("255,220,140", 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  halo.scale.set(1.9, 1.9, 1); halo.position.y = 3.35; g.add(halo);
  return g;
}
const FACADES = [0xf7c6d9, 0xc9b6f2, 0xa8e0d8, 0xffe0a3, 0xf2b7a7, 0xb8d4ff];
const ROOFS = [0x7a3fa0, 0xc0395a, 0x3a5fb0, 0x2f8a7a, 0xe07a2a];
function facadeMat(ci) {
  return mat("facade" + (ci % FACADES.length), () => new THREE.MeshStandardMaterial({ color: FACADES[ci % FACADES.length], map: facadeTex(false), emissiveMap: facadeTex(true), emissive: 0xffc870, emissiveIntensity: 0.9, roughness: 0.85 }));
}
const _box = new THREE.BoxGeometry(1, 1, 1);
const _pyr = new THREE.ConeGeometry(0.75, 1, 4); _pyr.rotateY(Math.PI / 4);
function makeHouse(w, d, bodyH, roofH, ci) {
  const g = new THREE.Group();
  const rm = mat("roof" + (ci % ROOFS.length), () => stdMat(ROOFS[ci % ROOFS.length], { roughness: 0.6, flatShading: true }));
  const body = new THREE.Mesh(_box, facadeMat(ci));
  body.scale.set(w, bodyH, d); body.position.y = bodyH / 2; g.add(body);
  body.material.map.repeat.set(1, 1);
  const roof = new THREE.Mesh(_pyr, rm);
  roof.scale.set(w * 0.98, roofH, d * 0.98);
  roof.position.y = bodyH + roofH / 2; g.add(roof);
  if (ci % 3 === 0) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), mat("brickM", () => new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.9 })));
    ch.position.set(w * 0.22, bodyH + roofH * 0.55, d * 0.1); g.add(ch);
  }
  return g;
}
function makeTower(r, h, ci) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 14), facadeMat(ci));
  body.position.y = h / 2; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, r * 3.2, 14), mat("troof" + (ci % ROOFS.length), () => stdMat(ROOFS[ci % ROOFS.length], { roughness: 0.5 })));
  roof.position.y = h + r * 1.6; g.add(roof);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), mat("pennant", () => new THREE.MeshBasicMaterial({ color: 0xffd23d, side: THREE.DoubleSide })));
  flag.position.set(0.45, h + r * 3.2 + 0.3, 0); g.add(flag);
  return g;
}
function makeClockTower(h = 22) {
  const g = makeTower(1.7, h, 3);
  const faceM = mat("clockFace", () => new THREE.MeshBasicMaterial({ map: clockTex() }));
  [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a) => {
    const f = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), faceM);
    f.position.set(Math.sin(a) * 1.73, h - 2.2, Math.cos(a) * 1.73); f.rotation.y = a; g.add(f);
  });
  return g;
}
function makeCastle(color = 0xe8d4ff, roof = 0x7a3fa0, opts = {}) {
  const g = new THREE.Group();
  const wm = new THREE.MeshStandardMaterial({ color, roughness: opts.ice ? 0.15 : 0.8, transparent: !!opts.ice, opacity: opts.ice ? 0.9 : 1, emissive: opts.ice ? 0x4ab8f0 : 0x2a1a40, emissiveIntensity: opts.ice ? 0.35 : 0.25 });
  const rm = new THREE.MeshStandardMaterial({ color: roof, roughness: 0.5, emissive: opts.ice ? 0x5ac8ff : 0x000000, emissiveIntensity: opts.ice ? 0.3 : 0 });
  const keep = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 12), wm); keep.position.y = 9; g.add(keep);
  [[-10, 26, 3.4], [10, 26, 3.4], [-4, 34, 2.8], [5, 38, 3], [0, 46, 2.2], [-15, 20, 2.6], [15, 20, 2.6]].forEach(([x, h, r]) => {
    const z = (Math.abs(x) % 3) * 1.2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), wm); t.position.set(x, h / 2, z); g.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.4, r * 3.4, 14), rm); c.position.set(x, h + r * 1.7, z); g.add(c);
  });
  if (opts.windows) {
    const wmat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    for (let i = 0; i < 18; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), wmat); w.position.set(R(-7, 7), R(3, 16), 6.05); g.add(w); }
  }
  return g;
}

/* ================= COURSE BUILDERS =================
   Returns a Group; group.userData.update(dt,t,ctx) animates it.
   A child named "followGround" is moved under the player by game.js (height in userData.y). */
export function buildThemeCourse(theme, course, opt = {}) {
  const high = opt.high !== false;
  const narrow = !!opt.narrow;
  const pathW = narrow ? 5.5 : 7.3;
  const turnDir = (course.turns[0] && course.turns[0].dir) || 1;
  const g = new THREE.Group();
  g.name = "courseVisual";
  const updaters = [];
  const notTurn = (s) => s.kind !== "turn";
  const isTurn = (s) => s.kind === "turn";
  const span = narrow ? 1.7 : 2;
  const laneLines = (color, o = {}) => {
    const m = new THREE.MeshBasicMaterial(Object.assign({ color, transparent: true, opacity: 0.85, toneMapped: false }, o));
    [-span / 2, span / 2].forEach((x) => g.add(new THREE.Mesh(ribbon(course, { width: 0.1, yLift: 0.06, offset: x }), m)));
  };
  // outer edge offset for a side; on the sharp turn only the outer side keeps a wall
  const edge = (side, straightHalf, turnHalf) => (p) => (p.kind === "turn" ? (side === -turnDir ? side * turnHalf : null) : side * straightHalf);

  if (theme === "pirate") {
    const deckM = new THREE.MeshStandardMaterial({ map: deckTex(), roughness: 0.78 });
    const deckW = 11.2;
    const deck = new THREE.Mesh(ribbon(course, { width: deckW, yLift: 0.03, pred: notTurn, vScale: 0.25, uRepeat: 2.2 }), deckM);
    const deckTurn = new THREE.Mesh(ribbon(course, { width: 8.6, yLift: 0.02, pred: isTurn, vScale: 0.25, uRepeat: 1.7 }), deckM);
    deck.receiveShadow = deckTurn.receiveShadow = true;
    g.add(deck, deckTurn);
    laneLines(0xf6e2b0, { opacity: 0.6 });
    const hullM = new THREE.MeshStandardMaterial({ map: hullTex(), roughness: 0.8, side: THREE.DoubleSide });
    const railM = mat("rail", () => stdMat(0x4a2a12, { roughness: 0.6 }));
    const SEA = -2.4;
    for (const side of [-1, 1]) {
      const off = edge(side, deckW / 2, 4.3);
      const pred = (p, i) => {
        const o = off(p);
        if (o == null) return false;
        if (p.kind === "turn") return true;
        return !onOtherStretch(course, p.x + Math.cos(p.heading) * o, p.z + Math.sin(p.heading) * o, i, deckW / 2 - 0.2);
      };
      const offN = (p) => off(p) || 0;
      const hull = new THREE.Mesh(wall(course, { offset: offN, top: 1.0, absBottom: SEA - 0.6, pred, uScale: 0.12 }), hullM);
      hull.receiveShadow = true;
      g.add(hull);
      g.add(new THREE.Mesh(ribbon(course, { width: 0.34, yLift: 1.02, offset: offN, pred }), railM));
    }
    const posts = [];
    for (let i = 0; i < course.samples.length; i += 3) {
      const s = course.samples[i];
      if (s.kind === "turn") continue;
      for (const side of [-1, 1]) {
        const o = side * (deckW / 2 - 0.12);
        if (onOtherStretch(course, s.x + Math.cos(s.heading) * o, s.z + Math.sin(s.heading) * o, i, deckW / 2 - 0.2)) continue;
        posts.push([s.x + Math.cos(s.heading) * o, s.y + 0.5, s.z + Math.sin(s.heading) * o, -s.heading, 1, 1, 1]);
      }
    }
    g.add(instanced(new THREE.BoxGeometry(0.16, 1.0, 0.16), railM, posts));
    const foamT = foamTex();
    const foam = new THREE.Mesh(ribbon(course, { width: 17, absY: SEA + 0.06, pred: notTurn, vScale: 0.06 }), new THREE.MeshBasicMaterial({ map: foamT, transparent: true, depthWrite: false, opacity: 0.9 }));
    g.add(foam);
    const seaT = seaTex();
    const sea = new THREE.Mesh(new THREE.CircleGeometry(300, 48), new THREE.MeshStandardMaterial({ map: seaT, roughness: 0.3, metalness: 0.1 }));
    sea.rotation.x = -Math.PI / 2; sea.name = "followGround"; sea.userData.y = SEA; sea.receiveShadow = true;
    g.add(sea);
    updaters.push((dt, t) => { foamT.offset.y -= dt * 0.3; seaT.offset.x = Math.sin(t * 0.25) * 0.05; seaT.offset.y -= dt * 0.03; });
    // islands with palms, rocks in the water
    const sand = mat("sand", () => stdMat(0xf0d79a, { roughness: 0.95 }));
    for (let i = 0; i < (high ? 10 : 6); i++) {
      const sp = sideSpot(course, 25 + i * 48, i % 2 ? 1 : -1, R(42, 80));
      if (!clearOfCourse(course, sp.x, sp.z, 32)) continue;
      const isl = new THREE.Group();
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), sand);
      const r = R(8, 14); mound.scale.set(r, R(1.8, 3.2), r * R(0.7, 1)); isl.add(mound);
      for (let k = 0; k < 2 + (i % 3); k++) { const pm = makePalm(R(5, 8)); pm.position.set(R(-r * 0.35, r * 0.35), 1.4, R(-r * 0.25, r * 0.25)); pm.rotation.y = R(0, 6); isl.add(pm); }
      isl.position.set(sp.x, SEA + 0.1, sp.z);
      g.add(isl);
    }
    const rockM = mat("seaRock", () => stdMat(0x6a6e74, { roughness: 0.9, flatShading: true }));
    for (let i = 0; i < (high ? 26 : 12); i++) {
      const sp = sideSpot(course, 10 + i * 19, i % 2 ? 1 : -1, R(15, 40));
      if (!clearOfCourse(course, sp.x, sp.z, 13)) continue;
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(R(0.8, 2.2), 0), rockM);
      rk.position.set(sp.x, SEA + 0.2, sp.z); rk.scale.y = R(0.6, 1.2); g.add(rk);
    }
    // seagulls circling above the ship
    const gullM = mat("gull", () => new THREE.LineBasicMaterial({ color: 0xffffff }));
    const gulls = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const gg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.8, 0.3, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.8, 0.3, 0)]);
      const b = new THREE.LineSegments(gg, gullM); b.userData = { ph: i * 0.9, r: R(9, 20), h: R(9, 15) };
      gulls.add(b);
    }
    g.add(gulls);
    updaters.push((dt, t, ctx) => {
      if (!ctx || !ctx.center) return;
      gulls.position.copy(ctx.center);
      gulls.children.forEach((b) => {
        const a = t * 0.35 + b.userData.ph;
        b.position.set(Math.cos(a) * b.userData.r, b.userData.h + Math.sin(t * 2 + b.userData.ph) * 0.6, Math.sin(a) * b.userData.r);
        b.rotation.y = -a; b.scale.y = 0.4 + Math.abs(Math.sin(t * 6 + b.userData.ph)) * 1.0;
      });
    });
    g.userData.ships = [];
    for (let i = 0; i < (high ? 5 : 3); i++) {
      const sp = sideSpot(course, 40 + i * 95, i % 2 ? -1 : 1, R(30, 55));
      if (!clearOfCourse(course, sp.x, sp.z, 24)) continue;
      g.userData.ships.push({ x: sp.x, y: SEA, z: sp.z, heading: sp.heading + (i % 2 ? 0.3 : -0.4) });
    }
  } else if (theme === "space") {
    const galT = galaxyTex();
    const galM = new THREE.MeshStandardMaterial({ map: galT, emissiveMap: galT, emissive: 0xffffff, emissiveIntensity: 0.9, color: 0x9a9ac0, roughness: 0.55, metalness: 0.1 });
    const w = pathW + 0.6;
    const track = new THREE.Mesh(ribbon(course, { width: w, yLift: 0.03, pred: notTurn, vScale: 0.045 }), galM);
    const trackTurn = new THREE.Mesh(ribbon(course, { width: w, yLift: 0.025, pred: isTurn, vScale: 0.045 }), galM);
    track.receiveShadow = trackTurn.receiveShadow = true;
    g.add(track, trackTurn);
    const dustM = new THREE.MeshBasicMaterial({ map: dustTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false });
    g.add(new THREE.Mesh(ribbon(course, { width: 30, yLift: -0.6, vScale: 0.03 }), dustM));
    g.add(new THREE.Mesh(ribbon(course, { width: 15, yLift: -1.8, vScale: 0.05 }), dustM));
    const edgeM = new THREE.MeshBasicMaterial({ color: 0xc8b0ff, transparent: true, opacity: 0.95, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
    [-w / 2, w / 2].forEach((x) => g.add(new THREE.Mesh(ribbon(course, { width: 0.18, yLift: 0.07, offset: x }), edgeM)));
    laneLines(0x8fe8ff, { opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
    const S = course.samples;
    g.add(makeTwinklePoints(high ? 900 : 450, () => {
      const s = S[(Math.random() * S.length) | 0];
      const lat = (Math.random() + Math.random() - 1) * 15;
      return [s.x + Math.cos(s.heading) * lat, s.y + R(-2, 3.5), s.z + Math.sin(s.heading) * lat];
    }, { minSize: 2, maxSize: 5, persp: true, colors: [0xffffff, 0xbfa8ff, 0x9fe0ff, 0xffd8a8] }));
    const rocks = [];
    for (let i = 0; i < (high ? 70 : 36); i++) {
      const sp = sideSpot(course, (i * 7.3) % (course.length - 4), i % 2 ? 1 : -1, R(10, 46));
      if (!clearOfCourse(course, sp.x, sp.z, 8.5)) continue;
      const a = makeAsteroid(R(0.5, i % 7 === 0 ? 3.2 : 1.6));
      a.position.set(sp.x, sp.y + R(-5, 9), sp.z);
      a.rotation.set(R(0, 6), R(0, 6), R(0, 6));
      a.userData = { spin: new THREE.Vector3(R(-0.4, 0.4), R(-0.4, 0.4), 0), baseY: a.position.y, ph: R(0, 6) };
      rocks.push(a); g.add(a);
    }
    updaters.push((dt, t) => rocks.forEach((a) => {
      a.rotation.x += a.userData.spin.x * dt; a.rotation.y += a.userData.spin.y * dt;
      a.position.y = a.userData.baseY + Math.sin(t * 0.6 + a.userData.ph) * 0.4;
    }));
  } else if (theme === "magic") {
    const roadM = new THREE.MeshStandardMaterial({ map: cobbleTex(), roughness: 0.6 });
    const road = new THREE.Mesh(ribbon(course, { width: pathW, yLift: 0.03, vScale: 0.26, uRepeat: 4.5 }), roadM);
    road.receiveShadow = true; g.add(road);
    laneLines(0xffe68a, { opacity: 0.8 });
    const roofM = new THREE.MeshStandardMaterial({ map: roofTileTex(), roughness: 0.6 });
    const roofW = 14, roofTW = 8.6;
    const roofs = new THREE.Mesh(ribbon(course, { width: roofW, yLift: -0.05, pred: notTurn, vScale: 0.12, uRepeat: 4 }), roofM);
    const roofsT = new THREE.Mesh(ribbon(course, { width: roofTW, yLift: -0.06, pred: isTurn, vScale: 0.12, uRepeat: 2.5 }), roofM);
    roofs.receiveShadow = roofsT.receiveShadow = true; g.add(roofs, roofsT);
    const GROUND = -11;
    const facM = new THREE.MeshStandardMaterial({ color: 0xe8c8f0, map: facadeTex(false), emissiveMap: facadeTex(true), emissive: 0xffc870, emissiveIntensity: 0.9, roughness: 0.85, side: THREE.DoubleSide });
    const edgeM = mat("roofEdge", () => stdMat(0xffd23d, { roughness: 0.4, metalness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.3 }));
    for (const side of [-1, 1]) {
      const off = edge(side, roofW / 2, roofTW / 2);
      const pred = (p, i) => {
        const o = off(p);
        if (o == null) return false;
        if (p.kind === "turn") return true;
        return !onOtherStretch(course, p.x + Math.cos(p.heading) * o, p.z + Math.sin(p.heading) * o, i, roofW / 2 - 0.2);
      };
      const offN = (p) => off(p) || 0;
      g.add(new THREE.Mesh(wall(course, { offset: offN, top: -0.05, absBottom: GROUND, pred, uScale: 0.16, vTop: 2 }), facM));
      g.add(new THREE.Mesh(ribbon(course, { width: 0.3, yLift: 0.1, offset: offN, pred }), edgeM));
    }
    const stT = cobbleTex().clone(); stT.repeat.set(90, 90); stT.needsUpdate = true;
    const street = new THREE.Mesh(new THREE.CircleGeometry(300, 40), new THREE.MeshStandardMaterial({ map: stT, color: 0x6a5a8a, roughness: 0.9 }));
    street.rotation.x = -Math.PI / 2; street.name = "followGround"; street.userData.y = GROUND;
    g.add(street);
    const nH = high ? 130 : 65;
    for (let i = 0; i < nH; i++) {
      const sp = sideSpot(course, (i * 4.37) % (course.length - 4), i % 2 ? 1 : -1, R(11, 36));
      const w = R(3.5, 6.5), d = R(3.5, 6.5);
      if (!clearOfCourse(course, sp.x, sp.z, 7.8 + Math.max(w, d) * 0.75)) continue;
      const top = sp.y + R(-4.5, 2.5);
      const h = top - GROUND;
      const obj = (i % 9 === 4) ? makeTower(R(1.4, 2.2), h + R(4, 9), i) : makeHouse(w, d, h, R(2, 3.6), i);
      obj.position.set(sp.x, GROUND, sp.z);
      obj.rotation.y = -sp.heading + (i % 4) * 0.08;
      g.add(obj);
    }
    const lm = course.landmarks || {};
    [(lm.curve || 40) + 6, (lm.turn || 120) + 34, 290].forEach((s, k) => {
      for (const extra of [0, 8, 16, 24, 32]) {
        const sp = sideSpot(course, s + extra, k % 2 ? 1 : -1, 12.5);
        if (!clearOfCourse(course, sp.x, sp.z, 11)) continue;
        const ct = makeClockTower(sp.y - GROUND + 13);
        ct.position.set(sp.x, GROUND, sp.z); ct.rotation.y = -sp.heading;
        g.add(ct);
        break;
      }
    });
    const S = course.samples;
    g.add(makeTwinklePoints(high ? 520 : 260, () => {
      const s = S[(Math.random() * S.length) | 0];
      const lat = (Math.random() - 0.5) * 26;
      return [s.x + Math.cos(s.heading) * lat, s.y + R(0.6, 7), s.z + Math.sin(s.heading) * lat];
    }, { minSize: 3, maxSize: 7, persp: true, drift: 0.6, colors: [0xffe08a, 0xff9ad8, 0xb8a0ff, 0x9ff0ff] }));
  } else if (theme === "ice") {
    const iceM = new THREE.MeshStandardMaterial({ map: iceTex(), roughness: 0.14, metalness: 0.12, emissive: 0x2a5a7a, emissiveIntensity: 0.12 });
    const road = new THREE.Mesh(ribbon(course, { width: pathW, yLift: 0.03, vScale: 0.08 }), iceM);
    road.receiveShadow = true; g.add(road);
    laneLines(0x4a98c8, { opacity: 0.55 });
    const snowM = new THREE.MeshStandardMaterial({ map: snowTex([4, 1]), roughness: 0.85 });
    const banks = new THREE.Mesh(ribbon(course, { width: 14, yLift: -0.05, pred: notTurn, vScale: 0.08, uRepeat: 4 }), snowM);
    const banksT = new THREE.Mesh(ribbon(course, { width: 8.6, yLift: -0.06, pred: isTurn, vScale: 0.08, uRepeat: 2.4 }), snowM);
    banks.receiveShadow = banksT.receiveShadow = true; g.add(banks, banksT);
    const ridgeM = mat("ridge", () => stdMat(0xf8fcff, { roughness: 0.8, emissive: 0xa8c8e0, emissiveIntensity: 0.12 }));
    const ridges = [];
    for (let i = 0; i < course.samples.length; i += 2) {
      const s = course.samples[i];
      if (s.kind === "turn") continue;
      for (const side of [-1, 1]) {
        const o = side * (pathW / 2 + 0.6);
        ridges.push([s.x + Math.cos(s.heading) * o, s.y - 0.12, s.z + Math.sin(s.heading) * o, -s.heading, 1.0, 0.42, 1.7]);
      }
    }
    g.add(instanced(new THREE.SphereGeometry(0.55, 8, 4), ridgeM, ridges));
    const field = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshStandardMaterial({ map: snowTex([40, 40]), roughness: 0.9 }));
    field.rotation.x = -Math.PI / 2; field.name = "followGround"; field.userData.y = -0.32;
    field.receiveShadow = true; g.add(field);
    const rockM = mat("snowRock", () => stdMat(0x8a9aaa, { roughness: 0.9, flatShading: true }));
    for (let i = 0; i < (high ? 120 : 60); i++) {
      const sp = sideSpot(course, (i * 4.71) % (course.length - 4), i % 2 ? 1 : -1, R(8.5, 42));
      if (!clearOfCourse(course, sp.x, sp.z, 8)) continue;
      const pick = i % 11;
      let o;
      if (pick === 3) o = makeIgloo();
      else if (pick === 6 || pick === 9) o = makeIceSpire(R(2, 4));
      else if (pick === 10) { o = makeAsteroid(R(0.6, 1.3)); o.material = rockM; o.scale.y = 0.6; }
      else o = makeSnowPine(R(2.4, 5.4));
      o.position.set(sp.x, sp.y - 0.1, sp.z); o.rotation.y = pick === 3 ? -sp.heading + (i % 2 ? Math.PI / 2 : -Math.PI / 2) : R(0, 6);
      g.add(o);
    }
  }
  g.userData.update = (dt, t, ctx) => updaters.forEach((u) => u(dt, t, ctx));
  return g;
}

/* ================= SKY / FAR AMBIENCE =================
   group follows the camera (sky things); userData.far follows the player on the ground plane (horizon things). */
export function buildThemeAmbience(theme, high = true) {
  const g = new THREE.Group();
  g.name = "themeAmbience";
  const far = new THREE.Group();
  far.name = "themeFar";
  const updaters = [];
  if (theme === "space") {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.MeshBasicMaterial({ map: starSkyTex(), side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }));
    sky.rotation.z = 0.35; sky.renderOrder = -2;
    g.add(sky);
    const tw = makeTwinklePoints(high ? 1500 : 750, () => {
      const v = new THREE.Vector3(R(-1, 1), R(-0.3, 1), R(-1, 1)).normalize().multiplyScalar(270);
      return [v.x, v.y, v.z];
    }, { minSize: 2.4, maxSize: 7, colors: [0xffffff, 0xd0e0ff, 0xfff0c8, 0xffd0f0, 0xffffff] });
    g.add(tw);
    const planet = (r, map, dir, o = {}) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24), new THREE.MeshStandardMaterial({ map, roughness: 0.9, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: o.glow || 0.35, fog: false }));
      m.position.copy(new THREE.Vector3(...dir).normalize().multiplyScalar(o.dist || 210));
      m.rotation.z = o.tilt || 0.3;
      g.add(m);
      if (o.halo) {
        const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(o.halo, 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
        h.scale.set(r * 3.2, r * 3.2, 1); h.position.copy(m.position); g.add(h);
      }
      return m;
    };
    const sat = planet(20, bandTex(["#e8c890", "#d4a868", "#f0dcae", "#c49058", "#e2bc80"]), [-0.55, 0.3, -0.78], { halo: "255,210,150" });
    const ring = new THREE.Mesh(new THREE.RingGeometry(26, 42, 96), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    ring.position.copy(sat.position); ring.rotation.set(-1.15, 0.25, 0.3); g.add(ring);
    planet(11, earthTex(), [0.7, 0.24, -0.68], { halo: "120,190,255", glow: 0.45 });
    planet(7, craterTex("#c4552e"), [0.3, 0.42, 0.85], { halo: "255,120,80" });
    planet(6, craterTex("#b8b8c4"), [-0.88, 0.22, 0.35], { glow: 0.5 });
    planet(4.5, bandTex(["#7ab8ff", "#5a9ae8", "#9ad0ff"]), [0.95, 0.5, 0.15], { halo: "140,200,255" });
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 8, (ctx, W, H) => { const gr = ctx.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,1)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }));
    streak.visible = false; g.add(streak);
    let nextShoot = 1.5, shootT = -1;
    const from = new THREE.Vector3(), vel = new THREE.Vector3();
    updaters.push((dt, t, ctx) => {
      if (shootT < 0 && t > nextShoot) {
        shootT = 0;
        const fwd = ctx && ctx.fwd ? ctx.fwd : new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
        from.copy(fwd).multiplyScalar(160).addScaledVector(right, R(-90, 90)).setY(R(55, 100));
        vel.copy(right).multiplyScalar(Math.random() < 0.5 ? -1 : 1).setY(-0.4).normalize();
        streak.visible = true;
      }
      if (shootT >= 0) {
        shootT += dt;
        streak.position.copy(from).addScaledVector(vel, shootT * 150);
        streak.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), vel);
        streak.material.opacity = Math.max(0, 1 - shootT / 0.9);
        if (shootT > 0.9) { shootT = -1; streak.visible = false; nextShoot = t + R(2, 5); }
      }
    });
  } else if (theme === "pirate") {
    for (let i = 0; i < (high ? 14 : 8); i++) {
      const a = (i / (high ? 14 : 8)) * Math.PI * 2 + R(-0.2, 0.2);
      const c = makeCloud(R(1, 1.7));
      c.position.set(Math.cos(a) * R(160, 230), R(40, 80), Math.sin(a) * R(160, 230));
      c.lookAt(0, c.position.y, 0);
      g.add(c);
    }
  } else if (theme === "magic") {
    g.add(makeTwinklePoints(high ? 600 : 300, () => {
      const v = new THREE.Vector3(R(-1, 1), R(0.2, 1), R(-1, 1)).normalize().multiplyScalar(260);
      return [v.x, v.y, v.z];
    }, { minSize: 1.8, maxSize: 4.5, colors: [0xffffff, 0xffe0f4, 0xfff4c8] }));
    [[0.1, -1], [-0.95, -0.2], [0.95, 0.35], [-0.3, 1]].forEach(([x, z], k) => {
      const c = makeCastle(k % 2 ? 0xe0d0f8 : 0xf4e0ff, k === 1 ? 0xc0395a : 0x7a3fa0, { windows: true });
      const v = new THREE.Vector3(x, 0, z).normalize().multiplyScalar(175);
      c.position.set(v.x, -14, v.z); c.lookAt(0, -14, 0);
      c.scale.setScalar(k === 0 ? 1.5 : 1.1);
      far.add(c);
    });
    const lanM = new THREE.MeshBasicMaterial({ color: 0xffb860, toneMapped: false });
    const lans = [];
    for (let i = 0; i < (high ? 30 : 14); i++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.95, 8), lanM);
      l.userData = { a: R(0, Math.PI * 2), r: R(25, 110), y0: R(0, 60), sp: R(0.6, 1.4) };
      lans.push(l); g.add(l);
    }
    updaters.push((dt, t) => lans.forEach((l) => {
      const u = l.userData;
      l.position.set(Math.cos(u.a + t * 0.01) * u.r, ((u.y0 + t * u.sp) % 60) + 6, Math.sin(u.a + t * 0.01) * u.r);
    }));
  } else if (theme === "ice") {
    for (let i = 0; i < (high ? 10 : 6); i++) {
      const a = (i / (high ? 10 : 6)) * Math.PI * 2 + R(-0.2, 0.2);
      const c = makeCloud(R(1, 1.5));
      c.position.set(Math.cos(a) * R(160, 230), R(50, 85), Math.sin(a) * R(160, 230));
      g.add(c);
    }
    [[0, -1, 1.6], [0.95, 0.3, 1.1], [-0.9, 0.45, 1.2]].forEach(([x, z, s], k) => {
      const castle = makeCastle(k ? 0xd8f4ff : 0xbfeaff, 0x8fd8ff, { ice: true });
      const v = new THREE.Vector3(x, 0, z).normalize().multiplyScalar(150);
      castle.position.set(v.x, -2, v.z); castle.lookAt(0, -2, 0); castle.scale.setScalar(s);
      far.add(castle);
    });
    const snow = makeTwinklePoints(high ? 1700 : 850, () => [R(-30, 30), R(0, 26), R(-40, 12)], { minSize: 3, maxSize: 6, fall: 2.4, box: 26, colors: [0xffffff, 0xeef8ff], normalBlend: true, persp: true, noTwinkle: true });
    snow.position.y = -9;
    g.add(snow);
  }
  g.userData.far = far;
  g.userData.update = (dt, t, ctx) => updaters.forEach((u) => u(dt, t, ctx));
  return g;
}

/* ================= SIDE DECOR (recycled along the course by game.js) =================
   returns { obj } or { glb, height } plus sideOff, align (face along the track), yaw, float, spin */
export function makeThemeDecor(theme, i, high = true) {
  if (theme === "pirate") {
    const k = i % 6;
    if (k === 0 || k === 3) return { obj: makeMast(high), sideOff: 4.75, align: true };
    if (k === 1) return { obj: makeCannon(), sideOff: 4.65, align: true, outward: true };
    if (k === 2) { const gg = new THREE.Group(); const b1 = makeBarrel(); const b2 = makeBarrel(); b2.position.set(0.1, 0, 0.8); const cr = makeCrate(0.75); cr.position.set(0, 0, -0.85); gg.add(b1, b2, cr); return { obj: gg, sideOff: 4.85, align: true }; }
    if (k === 4) { const gg = new THREE.Group(); const c1 = makeCrate(0.9); const c2 = makeCrate(0.7); c2.position.set(0.05, 0.9, 0.05); c2.rotation.y = 0.4; gg.add(c1, c2); return { obj: gg, sideOff: 4.75, align: true }; }
    return { glb: "pirate/chest.glb", height: 0.7, sideOff: 4.8, align: true, outward: true };
  }
  if (theme === "space") {
    const k = i % 8;
    if (k === 2) return { glb: "space/astronautA.glb", height: 1.5, sideOff: 6.6, float: 1.6 };
    if (k === 5) return { glb: "space/craft_speederA.glb", height: 1.2, sideOff: 7.4, float: 2.2 };
    if (k === 7) return { glb: "space/alien.glb", height: 1.3, sideOff: 6.8, float: 1.2 };
    if (k % 2 === 0) return { obj: makeCrystalCluster(R(1.4, 2.2), [0xb070ff, 0x5ad8ff, 0xff70c8][i % 3]), sideOff: 6.0 + (i % 3) * 0.5, float: 0.3 };
    const gg = new THREE.Group(); gg.add(makeAsteroid(R(0.6, 1.1)));
    return { obj: gg, sideOff: 6.4 + (i % 4) * 0.6, float: 1.4, spin: true };
  }
  if (theme === "magic") {
    const k = i % 4;
    if (k === 0 || k === 2) return { obj: makeLamp(), sideOff: 4.6, align: true };
    if (k === 1) {
      const gg = new THREE.Group();
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), mat("brickM", () => new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.9 })));
      ch.position.y = 0.8; ch.castShadow = true; gg.add(ch);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 1.0), mat("chCap", () => stdMat(0x5a4a6a))); cap.position.y = 1.65; gg.add(cap);
      return { obj: gg, sideOff: 5.9 + (i % 3) * 0.4, align: true };
    }
    const gg = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.5, 10), mat("pot", () => stdMat(0xc0603a)));
    pot.position.y = 0.25; gg.add(pot);
    const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat("flowers", () => stdMat(0xff7ac8, { emissive: 0x8a2a6a, emissiveIntensity: 0.3 })));
    fl.position.y = 0.75; gg.add(fl);
    return { obj: gg, sideOff: 4.9, align: true };
  }
  if (theme === "ice") {
    if (i % 5 === 2) return { obj: makeIceSpire(R(1.8, 3)), sideOff: 6.6 + (i % 3) * 0.6 };
    return { obj: makeSnowPine(R(2.6, 4.2)), sideOff: 7.0 + (i % 5) * 0.45 };
  }
  return null;
}

/* ================= THEMED HAZARDS (same footprint and heights as the originals) ================= */
export function makeThemedHazard(theme, kind, cTex) {
  const g = new THREE.Group();
  const caution = () => new THREE.MeshBasicMaterial({ map: cTex });
  if (kind === "hole") {
    if (theme === "space") {
      const disk = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      disk.rotation.x = -Math.PI / 2; disk.position.y = 0.06; disk.scale.set(0.8, 1.15, 1);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.3, 48), new THREE.MeshBasicMaterial({ map: tex("bhole", () => canvasTex(128, 128, (ctx) => {
        for (let a = 0; a < 360; a += 3) { ctx.strokeStyle = `hsla(${290 + Math.sin(a / 20) * 40},100%,${60 + Math.random() * 25}%,0.95)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(64, 64, 42 + Math.random() * 20, a / 57.3, (a + 16) / 57.3); ctx.stroke(); }
      })), transparent: true, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; ring.scale.set(0.8, 1.15, 1);
      g.add(disk, ring);
      return g;
    }
    const pitMat = theme === "ice" ? new THREE.MeshStandardMaterial({ color: 0x0a3050, roughness: 0.1, emissive: 0x06202e, emissiveIntensity: 0.5 })
      : new THREE.MeshStandardMaterial({ color: 0x0a0610, roughness: 1, emissive: 0x220814, emissiveIntensity: 0.28 });
    const pit = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 2.3), pitMat); pit.position.y = -0.08;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.06, 2.45), caution()); rim.position.y = 0.04;
    g.add(pit, rim);
    if (theme === "pirate") {
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), crateMat());
      lid.position.set(0, 0.5, 1.45); lid.rotation.x = -1.0; g.add(lid);
    }
    return g;
  }
  if (kind === "wall") {
    let body;
    if (theme === "pirate") body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.6), crateMat());
    else if (theme === "space") body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.3), new THREE.MeshStandardMaterial({ color: 0xff3a8a, emissive: 0xff2a7a, emissiveIntensity: 0.9, transparent: true, opacity: 0.75, roughness: 0.2 }));
    else if (theme === "magic") body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.38), mat("brickWall", () => new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.85 })));
    else body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.55, 0.5), new THREE.MeshStandardMaterial({ color: 0x9fe4ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88, emissive: 0x3aa8e0, emissiveIntensity: 0.45 }));
    body.position.y = 0.78; body.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.28), caution());
    const depth = body.geometry.parameters.depth;
    stripe.position.set(0, 1.28, depth / 2 + 0.02);
    g.add(body, stripe);
    if (theme === "space") {
      const frameM = new THREE.MeshBasicMaterial({ color: 0xffe0f0, toneMapped: false });
      [-0.86, 0.86].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.65, 0.36), frameM); p.position.set(x, 0.82, 0); g.add(p); });
    }
    return g;
  }
  if (kind === "beam") {
    let beamMat, postMat;
    if (theme === "space") { beamMat = new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false }); postMat = stdMat(0x9a9ab0, { metalness: 0.7, roughness: 0.3 }); }
    else if (theme === "pirate") { beamMat = stdMat(0x7a4a22, { emissive: 0x3a1a00, emissiveIntensity: 0.3 }); postMat = stdMat(0x4a2a12); }
    else if (theme === "magic") { beamMat = new THREE.MeshStandardMaterial({ color: 0xffd0f8, emissive: 0xff60d0, emissiveIntensity: 0.8 }); postMat = stdMat(0x3a2a5a); }
    else { beamMat = new THREE.MeshStandardMaterial({ color: 0xbfeaff, emissive: 0x5ac8ff, emissiveIntensity: 0.5, roughness: 0.1 }); postMat = stdMat(0x8ab8d4); }
    const r = theme === "space" ? 0.08 : 0.13;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.72, 10), beamMat);
    beam.rotation.z = Math.PI / 2; beam.position.y = 1.18; beam.castShadow = theme !== "space";
    g.add(beam);
    if (theme === "space") {
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.72, 10), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      glow.rotation.z = Math.PI / 2; glow.position.y = 1.18; g.add(glow);
    }
    [-0.78, 0.78].forEach((x) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.22, 8), postMat);
      post.position.set(x, 0.61, 0); g.add(post);
      if (theme === "space") { const e = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8080, toneMapped: false })); e.position.set(x, 1.18, 0); g.add(e); }
    });
    if (theme === "ice") {
      for (let k = 0; k < 6; k++) { const ic = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), beamMat); ic.rotation.x = Math.PI; ic.position.set(-0.6 + k * 0.24, 0.98, 0); g.add(ic); }
    }
    if (theme !== "space") {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.22, 10), caution());
      band.rotation.z = Math.PI / 2; band.position.y = 1.18; g.add(band);
    }
    return g;
  }
  // roll
  if (theme === "space") {
    const m = makeAsteroid(0.45);
    m.material = mat("meteor", () => new THREE.MeshStandardMaterial({ color: 0x5a4a44, roughness: 0.9, flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0.55 }));
    m.position.y = 0.46; m.castShadow = true; g.add(m);
    return g;
  }
  if (theme === "ice") {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), mat("snowball", () => stdMat(0xffffff, { roughness: 0.7, emissive: 0xbfe0ff, emissiveIntensity: 0.25 })));
    m.position.y = 0.46; m.castShadow = true; g.add(m);
    return g;
  }
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.55, 14), stdMat(theme === "magic" ? 0x8a4ac0 : 0x8a5428, { roughness: 0.68 }));
  log.rotation.z = Math.PI / 2; log.position.y = 0.44; log.castShadow = true; g.add(log);
  const hoopM = mat("hoop", () => stdMat(0x2a2a2a, { metalness: 0.6, roughness: 0.4 }));
  [-0.55, 0.55].forEach((x) => { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.435, 0.435, 0.1, 14), hoopM); h.rotation.z = Math.PI / 2; h.position.set(x, 0.44, 0); g.add(h); });
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.18, 14), new THREE.MeshBasicMaterial({ color: 0xffd000 }));
  stripe.rotation.z = Math.PI / 2; stripe.position.y = 0.44; g.add(stripe);
  return g;
}

export const THEME_MOUNTAINS = { magic: { color: 0x5a3a8a }, ice: { color: 0xa8cce4, top: 0xffffff } };
