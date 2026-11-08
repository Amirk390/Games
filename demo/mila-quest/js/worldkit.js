import * as THREE from "../assets/lib/three.module.js";

const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _up = new THREE.Vector3();
const _pos = new THREE.Vector3();

export function shortAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function buildCourse(opt = {}) {
  const step = 1;
  const samples = [];
  const turns = [];
  const landmarks = {};
  let x = 0, y = 0, z = 0, heading = 0;

  function push(kind, pitch = 0) {
    samples.push({ x, y, z, heading, kind, pitch });
  }
  function stepFwd() {
    x += Math.sin(heading) * step;
    z += -Math.cos(heading) * step;
  }
  function emitStraight(len, kind = "straight") {
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      push(kind, 0);
      stepFwd();
    }
  }
  function emitCurve(len, dHeading) {
    if (!landmarks.curve) landmarks.curve = samples.length * step + len * 0.45;
    const n = Math.max(1, Math.round(len / step));
    const dh = dHeading / n;
    for (let i = 0; i < n; i++) {
      heading += dh;
      push("curve", 0);
      stepFwd();
    }
  }
  function emitHill(len, amp) {
    landmarks.hill = samples.length * step + len * 0.5;
    const n = Math.max(2, Math.round(len / step));
    const baseY = y;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const ny = baseY + amp * Math.sin(t * Math.PI);
      const nny = baseY + amp * Math.sin(Math.min(1, (i + 1) / n) * Math.PI);
      const pitch = Math.atan2(nny - ny, step);
      y = ny;
      push("hill", pitch);
      stepFwd();
    }
    y = baseY;
  }
  function emitTurn(dir) {
    const sEnter = samples.length * step;
    emitStraight(8, "straight");
    const radius = 4.6;
    const arcLen = radius * Math.PI * 0.5;
    const n = Math.max(12, Math.round(arcLen / step));
    const startH = heading;
    const rx = Math.cos(heading), rz = Math.sin(heading);
    const cx = x + dir * rx * radius;
    const cz = z + dir * rz * radius;
    landmarks.turn = samples.length * step + arcLen * 0.4;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const h = startH + dir * (Math.PI / 2) * t;
      heading = h;
      x = cx - dir * Math.cos(h) * radius;
      z = cz - dir * Math.sin(h) * radius;
      push("turn", 0);
    }
    const sExit = samples.length * step;
    turns.push({
      sEnter,
      sApex: landmarks.turn,
      sExit,
      dir,
      committed: false
    });
    emitStraight(8, "straight");
  }

  const turnDir = opt.turnDir < 0 ? -1 : 1;
  const curveA = opt.curve != null ? opt.curve : 0.85;
  emitStraight(20);
  emitCurve(32, -curveA);
  emitStraight(12);
  emitHill(38, opt.hillAmp != null ? opt.hillAmp : 4.0);
  emitStraight(10);
  emitTurn(turnDir);
  emitStraight(14);
  if (opt.causeway) {
    landmarks.causeway = samples.length * step + 14;
    emitStraight(48, "causeway");
  }
  emitCurve(24, curveA * 0.9);
  emitStraight(90);
  while (samples.length * step < 520) emitStraight(20);

  return {
    samples,
    step,
    turns,
    landmarks,
    length: samples.length * step
  };
}

export function pathAt(course, s) {
  if (!course || !course.samples.length) {
    return { x: 0, y: 0, z: -s, heading: 0, kind: "straight", pitch: 0 };
  }
  const samples = course.samples;
  const max = samples.length - 1;
  const u = Math.max(0, Math.min(max - 0.001, s / course.step));
  const i = Math.floor(u);
  const f = u - i;
  const a = samples[i];
  const b = samples[i + 1] || a;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    z: a.z + (b.z - a.z) * f,
    heading: a.heading + shortAngle(b.heading - a.heading) * f,
    kind: a.kind,
    pitch: a.pitch + (b.pitch - a.pitch) * f
  };
}

export function pathFrame(course, s) {
  const p = pathAt(course, s);
  _fwd.set(Math.sin(p.heading), 0, -Math.cos(p.heading));
  _right.set(Math.cos(p.heading), 0, Math.sin(p.heading));
  _up.set(0, 1, 0);
  if (p.pitch) {
    _fwd.applyAxisAngle(_right, p.pitch);
    _up.crossVectors(_right, _fwd).normalize();
  }
  _pos.set(p.x, p.y, p.z);
  return {
    x: p.x, y: p.y, z: p.z,
    heading: p.heading, pitch: p.pitch, kind: p.kind,
    pos: _pos.clone(),
    fwd: _fwd.clone(),
    right: _right.clone(),
    up: _up.clone()
  };
}

export function worldOnPath(course, s, laneOff = 0, yOff = 0) {
  const f = pathFrame(course, s);
  return f.pos.addScaledVector(f.right, laneOff).addScaledVector(f.up, yOff);
}

export function makeStoneTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#4e483e";
  ctx.fillRect(0, 0, 256, 256);
  const cols = ["#8d8676", "#7c7568", "#9a927f", "#6e685c", "#867e6f", "#a39884", "#746c60"];
  const ts = 32;
  for (let y = 0; y < 8; y++) {
    const ox = (y % 2) * 16;
    for (let x = -1; x < 9; x++) {
      const px = x * ts + ox, py = y * ts;
      ctx.fillStyle = cols[(x + y * 3 + 13) % cols.length];
      ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
      ctx.fillStyle = "rgba(255,240,210,0.16)";
      ctx.fillRect(px + 3, py + 3, ts - 10, 5);
      ctx.fillStyle = "rgba(20,16,10,0.22)";
      ctx.fillRect(px + 4, py + ts - 8, ts - 8, 4);
    }
  }
  ctx.strokeStyle = "#2e2820";
  ctx.lineWidth = 3;
  for (let y = 0; y < 8; y++) {
    const ox = (y % 2) * 16;
    for (let x = -1; x < 9; x++) {
      ctx.strokeRect(x * ts + ox + 1.5, y * ts + 1.5, ts - 3, ts - 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeDirtTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c4a05a";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const r = 150 + Math.random() * 70;
    const g = 110 + Math.random() * 55;
    const b = 48 + Math.random() * 40;
    ctx.fillStyle = `rgba(${r|0},${g|0},${b|0},${0.12 + Math.random() * 0.28})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 4, 1 + Math.random() * 3, Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeSmoothTree(theme = "jungle") {
  const g = new THREE.Group();
  const pal = {
    jungle: { trunk: 0x6b3f22, leaf: [0x2f9a4c, 0x247a3a, 0x3cb86a, 0x1e6b32] },
    pirate: { trunk: 0x7a5230, leaf: [0x2e8b57, 0x1f7a3a, 0xc4d46a, 0x3a9a50] },
    magic: { trunk: 0x5a3a68, leaf: [0xc86ad8, 0x8a5ad0, 0xf0a0d8, 0x7040c0] },
    space: { trunk: 0x3a3478, leaf: [0x6a80e0, 0x9ad0ff, 0xc8a0ff, 0x5060c8] },
    ice: { trunk: 0x8aa4b4, leaf: [0xe8f6ff, 0xc5e4f4, 0xffffff, 0xd0e8f4] }
  }[theme] || { trunk: 0x6b3f22, leaf: [0x2f9a4c, 0x247a3a, 0x3cb86a, 0x1e6b32] };
  const h = 1.8 + Math.random() * 1.5;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.18, h, 8),
    new THREE.MeshStandardMaterial({ color: pal.trunk, roughness: 0.86, metalness: 0.02, flatShading: false })
  );
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);
  const segs = 4 + (Math.random() * 2 | 0);
  for (let i = 0; i < segs; i++) {
    const r = 0.62 + Math.random() * 0.5;
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 2),
      new THREE.MeshStandardMaterial({
        color: pal.leaf[i % pal.leaf.length],
        roughness: 0.58,
        metalness: 0.02,
        flatShading: false
      })
    );
    canopy.position.set((Math.random() - 0.5) * 0.5, h - 0.15 + i * 0.34, (Math.random() - 0.5) * 0.5);
    canopy.scale.set(1.05, 0.78 + Math.random() * 0.22, 1.05);
    canopy.castShadow = true;
    g.add(canopy);
  }
  return g;
}

export function makeMountains(color = 0x3a7a48, opt = {}) {
  const group = new THREE.Group();
  group.name = "mountains";
  const base = new THREE.Color(color);
  const n = opt.count || 12;
  for (let i = 0; i < n; i++) {
    const geo = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const sx = 46 + (i % 5) * 9;
    const sy = 18 + (i % 4) * 6;
    const sz = 36 + (i % 3) * 8;
    geo.scale(sx, sy, sz);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const cTop = base.clone().lerp(new THREE.Color(0xf4e2c4), 0.5);
    const cBot = base.clone().multiplyScalar(0.38);
    const tmp = new THREE.Color();
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      tmp.copy(cBot).lerp(cTop, THREE.MathUtils.clamp((y + 10) / 28, 0, 1));
      cols[v * 3] = tmp.r; cols[v * 3 + 1] = tmp.g; cols[v * 3 + 2] = tmp.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
      flatShading: false,
      fog: true
    });
    const m = new THREE.Mesh(geo, mat);
    const ang = (i / n) * Math.PI * 2 + 0.18;
    const dist = 200 + (i % 5) * 26;
    m.position.set(Math.cos(ang) * dist, -1.2, Math.sin(ang) * dist);
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

export function makeMist() {
  const group = new THREE.Group();
  group.name = "mist";
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grd.addColorStop(0, "rgba(255,240,220,0.78)");
  grd.addColorStop(0.4, "rgba(255,226,198,0.38)");
  grd.addColorStop(1, "rgba(255,220,190,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.9, depthWrite: false,
    blending: THREE.NormalBlending, fog: false, side: THREE.DoubleSide
  });
  for (let i = 0; i < 22; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(38, 14), mat);
    if (i < 12) {
      p.rotation.x = -Math.PI / 2;
      p.position.set((i % 6 - 2.5) * 14, -1.1 - (i % 4) * 0.55, (i % 5 - 2) * 9);
    } else {
      p.rotation.y = (i / 22) * Math.PI * 2;
      p.position.set((i % 6 - 2.5) * 12, -0.4, (i % 4 - 1.5) * 8);
    }
    group.add(p);
  }
  return group;
}

export function makeValleyFloor() {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a241c, roughness: 1, metalness: 0, fog: true
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(16, 24), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -7.5;
  mesh.name = "valley";
  return mesh;
}

function sampleRuns(samples, pred) {
  const runs = [];
  let i = 0;
  while (i < samples.length) {
    if (pred && !pred(samples[i])) { i++; continue; }
    const from = i;
    while (i < samples.length && (!pred || pred(samples[i]))) i++;
    const to = Math.min(samples.length - 1, i);
    if (to > from) runs.push([from, to]);
  }
  return runs;
}

export function makeRibbonGeometry(course, opt = {}) {
  const width = opt.width != null ? opt.width : 7.2;
  const yLift = opt.yLift || 0;
  const pred = opt.pred || null;
  const xOffset = opt.xOffset || 0;
  const vScale = opt.vScale != null ? opt.vScale : 0.28;
  const uRepeat = opt.uRepeat != null ? opt.uRepeat : 1;
  const samples = course.samples;
  const positions = [];
  const uvs = [];
  const indices = [];
  let base = 0;
  const runs = sampleRuns(samples, pred);
  for (const [from, to] of runs) {
    const start = base;
    for (let k = from; k <= to; k++) {
      const p = samples[k];
      const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
      const cx = p.x + rx * xOffset;
      const cy = p.y + yLift;
      const cz = p.z + rz * xOffset;
      const hw = width * 0.5;
      positions.push(cx - rx * hw, cy, cz - rz * hw);
      positions.push(cx + rx * hw, cy, cz + rz * hw);
      const v = (k - from) * vScale;
      uvs.push(0, v, uRepeat, v);
      base += 2;
    }
    const n = to - from + 1;
    for (let k = 0; k < n - 1; k++) {
      const i0 = start + k * 2;
      indices.push(i0, i0 + 1, i0 + 2);
      indices.push(i0 + 1, i0 + 3, i0 + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  if (!positions.length) {
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    geo.setIndex([0, 1, 2]);
    return geo;
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function makeSkirtGeometry(course, opt = {}) {
  const width = opt.width != null ? opt.width : 6.8;
  const depth = opt.depth != null ? opt.depth : 2.6;
  const pred = opt.pred || null;
  const samples = course.samples;
  const positions = [];
  const uvs = [];
  const indices = [];
  let base = 0;
  const runs = sampleRuns(samples, pred);
  for (const [from, to] of runs) {
    for (const side of [-1, 1]) {
      const start = base;
      for (let k = from; k <= to; k++) {
        const p = samples[k];
        const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
        const hw = width * 0.5 * side;
        const x = p.x + rx * hw;
        const z = p.z + rz * hw;
        positions.push(x, p.y + 0.04, z);
        positions.push(x, p.y - depth, z);
        const v = (k - from) * 0.25;
        uvs.push(0, v, 1, v);
        base += 2;
      }
      const n = to - from + 1;
      for (let k = 0; k < n - 1; k++) {
        const i0 = start + k * 2;
        if (side < 0) {
          indices.push(i0, i0 + 1, i0 + 2);
          indices.push(i0 + 1, i0 + 3, i0 + 2);
        } else {
          indices.push(i0, i0 + 2, i0 + 1);
          indices.push(i0 + 1, i0 + 2, i0 + 3);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  if (!positions.length) {
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    geo.setIndex([0, 1, 2]);
    return geo;
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function makeGrassTexture(repeatX = 16, repeatY = 16) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#3a9348";
  ctx.fillRect(0, 0, 256, 256);
  const patches = ["#2e7a3a", "#4eaa55", "#267033", "#58b45e", "#3d8c40", "#6a9a3a"];
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = patches[i % patches.length];
    ctx.globalAlpha = 0.22 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 28, 8 + Math.random() * 22, Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 2200; i++) {
    const g = 80 + Math.random() * 110;
    ctx.fillStyle = `rgba(${30 + Math.random() * 40},${g|0},${30 + Math.random() * 35},${0.18 + Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeValleyTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#cbb892";
  ctx.fillRect(0, 0, 256, 256);
  const cols = ["#d8c8a0", "#b9a87a", "#c4c090", "#e2d4b0", "#a89870", "#d0b888"];
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.25 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 30, 8 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeRock(color = 0x7a7060) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42 + Math.random() * 0.5, 1),
    new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.04, flatShading: false })
  );
  m.scale.set(1, 0.48 + Math.random() * 0.32, 0.82 + Math.random() * 0.3);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makeGrassTuft(color = 0x2f8a3a) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72, flatShading: false });
  const n = 4 + (Math.random() * 3 | 0);
  for (let i = 0; i < n; i++) {
    const h = 0.2 + Math.random() * 0.28;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.065 + Math.random() * 0.05, h, 5), mat);
    blade.position.set((Math.random() - 0.5) * 0.3, h * 0.5, (Math.random() - 0.5) * 0.3);
    blade.rotation.z = (Math.random() - 0.5) * 0.42;
    blade.rotation.x = (Math.random() - 0.5) * 0.22;
    g.add(blade);
  }
  return g;
}

export function populateValley(course, theme = "jungle", high = true) {
  const group = new THREE.Group();
  group.name = "valleyDecor";
  const step = high ? 2 : 4;
  for (let i = 0; i < course.samples.length; i += step) {
    const s = course.samples[i];
    if (s.kind !== "causeway") continue;
    const rx = Math.cos(s.heading), rz = Math.sin(s.heading);
    for (const side of [-1, 1]) {
      const dist = 8 + ((i * 17 + (side > 0 ? 11 : 0)) % 22);
      const x = s.x + rx * side * dist;
      const z = s.z + rz * side * dist;
      const y = s.y - 6.05;
      const pick = (i + (side > 0 ? 1 : 0)) % 5;
      if (pick <= 1) {
        const tree = makeSmoothTree(theme);
        tree.scale.setScalar(0.4 + (i % 4) * 0.12);
        tree.position.set(x, y, z);
        tree.rotation.y = i * 0.7;
        group.add(tree);
      } else {
        const rock = makeRock(pick === 2 ? 0x8a7a62 : 0x6e6558);
        rock.position.set(x, y + 0.18, z);
        rock.scale.multiplyScalar(1.3 + (i % 3) * 0.35);
        group.add(rock);
      }
    }
  }
  return group;
}

export function scatterGroundDetails(course, theme = "jungle", high = true) {
  const group = new THREE.Group();
  group.name = "groundScatter";
  const n = high ? 72 : 34;
  const colors = [0x2f8a3a, 0x3a9a44, 0x267833];
  const len = course.length || 240;
  for (let i = 0; i < n; i++) {
    const sVal = (i * 6.7 + 1.5) % Math.max(12, len - 4);
    const p = pathAt(course, sVal);
    if (p.kind === "causeway") continue;
    const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
    const side = i % 2 === 0 ? -1 : 1;
    const off = 8.2 + (i * 4.13 % 26);
    const x = p.x + rx * side * off;
    const z = p.z + rz * side * off;
    const pick = i % 7;
    if (pick === 0) {
      const tree = makeSmoothTree(theme);
      tree.scale.setScalar(0.48 + (i % 5) * 0.1);
      tree.position.set(x, p.y, z);
      tree.rotation.y = i * 0.5;
      group.add(tree);
    } else if (pick <= 3) {
      const tuft = makeGrassTuft(colors[i % colors.length]);
      tuft.position.set(x, p.y - 0.02, z);
      tuft.scale.setScalar(1.15 + (i % 4) * 0.22);
      group.add(tuft);
    } else {
      const rock = makeRock();
      rock.position.set(x, p.y - 0.12, z);
      group.add(rock);
    }
  }
  for (let i = 0; i < 16; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const off = 5.4 + (i % 8) * 2.2;
    const sVal = (i % 6) * 2.0;
    const p = pathAt(course, sVal);
    const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
    const tuft = makeGrassTuft(0x348a3c);
    tuft.position.set(p.x + rx * side * off, p.y - 0.02, p.z + rz * side * off);
    tuft.scale.setScalar(1.35);
    group.add(tuft);
    if (i % 3 === 0) {
      const rock = makeRock();
      rock.position.set(p.x + rx * side * (off + 1.3), p.y - 0.1, p.z + rz * side * (off + 1.3));
      group.add(rock);
    }
    if (i % 5 === 0) {
      const tree = makeSmoothTree(theme);
      tree.scale.setScalar(0.55);
      tree.position.set(p.x + rx * side * (off + 3.2), p.y, p.z + rz * side * (off + 3.2));
      group.add(tree);
    }
  }
  return group;
}

/* ===== Israeli flags (waving cloth) ===== */
export const flagWaveTime = { value: 0 };
export function updateFlagWave(t) {
  flagWaveTime.value = t;
}

const FLAG_BLUE = "#0038b8";
let _flagTex = null;
let _flagMat = null;
let _poleMat = null;
let _finialMat = null;

export function makeIsraelFlagTexture() {
  if (_flagTex) return _flagTex;
  const W = 550, H = 400; // official 11:8
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const topM = H * (15 / 160);
  const stripeH = H * (25 / 160);
  ctx.fillStyle = FLAG_BLUE;
  ctx.fillRect(0, topM, W, stripeH);
  ctx.fillRect(0, H - topM - stripeH, W, stripeH);
  const cx = W / 2, cy = H / 2;
  const R = H * 0.253;
  ctx.strokeStyle = FLAG_BLUE;
  ctx.lineWidth = Math.max(10, H * 0.03);
  ctx.lineJoin = "miter";
  ctx.miterLimit = 2.4;
  ctx.lineCap = "butt";
  function tri(up) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (up ? -Math.PI / 2 : Math.PI / 2) + i * (Math.PI * 2 / 3);
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  tri(true);
  tri(false);
  _flagTex = new THREE.CanvasTexture(c);
  _flagTex.colorSpace = THREE.SRGBColorSpace;
  _flagTex.minFilter = THREE.LinearFilter;
  _flagTex.magFilter = THREE.LinearFilter;
  _flagTex.anisotropy = 4;
  _flagTex.needsUpdate = true;
  return _flagTex;
}

function flagClothMaterial() {
  if (_flagMat) return _flagMat;
  _flagMat = new THREE.MeshBasicMaterial({
    map: makeIsraelFlagTexture(),
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: true
  });
  _flagMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = flagWaveTime;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      {
        float along = max(transformed.x, 0.0);
        vec4 wp = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float phase = wp.x * 0.41 + wp.z * 0.27;
        float wave = sin(uTime * 3.15 + along * 4.8 + transformed.y * 2.4 + phase) * along * 0.28;
        float ripple = sin(uTime * 5.4 + along * 7.2 + phase * 1.3) * along * 0.10;
        transformed.z += wave + ripple;
        transformed.y += sin(uTime * 2.7 + along * 3.6 + phase) * along * 0.06;
      }`
    );
  };
  _flagMat.customProgramCacheKey = () => "israelFlagWave-v1";
  return _flagMat;
}

export function makeIsraelFlag(opt = {}) {
  const size = opt.size != null ? opt.size : 1;
  const high = opt.high !== false;
  const flagW = 1.42 * size;
  const flagH = flagW * (8 / 11);
  const poleH = opt.poleHeight != null ? opt.poleHeight : (2.15 * size + flagH);
  const segsX = high ? 18 : 8;
  const segsY = high ? 12 : 6;
  const g = new THREE.Group();
  g.name = "israelFlag";
  if (!_poleMat) {
    _poleMat = new THREE.MeshStandardMaterial({ color: 0xb08948, roughness: 0.42, metalness: 0.18 });
    _finialMat = new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.28, metalness: 0.65, emissive: 0xaa7700, emissiveIntensity: 0.22 });
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.038 * Math.max(size, 0.55), 0.05 * Math.max(size, 0.55), poleH, 7), _poleMat);
  pole.position.y = poleH * 0.5;
  pole.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07 * Math.max(size, 0.55), 8, 6), _finialMat);
  finial.position.y = poleH + 0.02;
  const geo = new THREE.PlaneGeometry(flagW, flagH, segsX, segsY);
  geo.translate(flagW * 0.5, 0, 0);
  const cloth = new THREE.Mesh(geo, flagClothMaterial());
  cloth.position.set(0.02, poleH - 0.1 - flagH * 0.5, 0);
  cloth.name = "flagCloth";
  cloth.renderOrder = 1;
  g.add(pole, finial, cloth);
  return g;
}

export function plantCourseFlags(course, high = true) {
  const group = new THREE.Group();
  group.name = "israelFlags";
  if (!course || !course.samples || !course.samples.length) return group;
  const len = course.length || (course.samples.length * (course.step || 1));
  const spots = [
    { s: 5, kind: "start", size: 1.2 },
    { s: Math.max(24, len - 14), kind: "finish", size: 1.08 }
  ];
  if (course.landmarks && course.landmarks.hill != null) {
    spots.push({ s: course.landmarks.hill, kind: "hill", size: 1.1 });
  }
  const gap = high ? 108 : 140;
  for (let s = 6 + gap; s < len - 36; s += gap) {
    spots.push({ s, kind: "road", size: 1 });
  }
  spots.sort((a, b) => a.s - b.s);
  const kept = [];
  for (const sp of spots) {
    if (sp.kind === "road" && kept.some((k) => Math.abs(k.s - sp.s) < 40)) continue;
    kept.push(sp);
  }
  for (const sp of kept) {
    const f = pathFrame(course, sp.s);
    if (f.kind === "causeway") continue;
    const off = sp.kind === "start" ? 4.45 : (sp.kind === "hill" ? 4.7 : 4.55);
    for (const side of [-1, 1]) {
      const flag = makeIsraelFlag({ size: sp.size, high });
      flag.position.copy(f.pos).addScaledVector(f.right, side * off);
      flag.rotation.order = "YXZ";
      flag.rotation.y = -f.heading;
      if (side < 0) flag.scale.x = -Math.abs(flag.scale.x);
      group.add(flag);
    }
  }
  return group;
}

