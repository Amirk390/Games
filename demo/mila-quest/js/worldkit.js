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
  grd.addColorStop(0, "rgba(255,232,210,0.72)");
  grd.addColorStop(0.42, "rgba(255,220,190,0.32)");
  grd.addColorStop(1, "rgba(255,214,170,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.88, depthWrite: false,
    blending: THREE.NormalBlending, fog: false, side: THREE.DoubleSide
  });
  for (let i = 0; i < 18; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(34, 12), mat);
    if (i < 10) {
      p.rotation.x = -Math.PI / 2;
      p.position.set((i % 5 - 2) * 12, -4.6 - (i % 4) * 0.8, -4 - (i % 5) * 8);
    } else {
      p.rotation.y = (i / 18) * Math.PI * 2;
      p.position.set((i % 5 - 2) * 9, -3.4, -8 - (i % 4) * 7);
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
