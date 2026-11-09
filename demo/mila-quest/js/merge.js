/* v8: merge static scenery into a few big meshes (one per material per 64 m chunk) so the GPU
   driver gets ~10x fewer draw calls. Animated pieces are detected automatically: we run the
   group's update() once and keep every object that moved as a separate mesh. */
import * as THREE from "../assets/lib/three.module.js";
import { mergeGeometries } from "../assets/lib/jsm/utils/BufferGeometryUtils.js";

const CHUNK = 120;
const SKIP_NAMES = /followGround|israelFlags|gateFlag|sky/;

/* materials that look identical can share one draw call even if they are different objects */
const bakeable = (m) => (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshBasicMaterial) && !m.map && !m.vertexColors && !m.isShaderMaterial;
function matSig(m) {
  const bake = bakeable(m);
  const c = (x) => (x && x.isColor ? x.getHexString() : "");
  const t = (x) => (x ? x.uuid : "");
  return [m.type, bake ? "bake" : c(m.color), c(m.emissive), m.emissiveIntensity, m.roughness, m.metalness, t(m.map), t(m.emissiveMap), t(m.alphaMap),
    m.transparent, m.opacity, m.side, m.flatShading, m.vertexColors, m.fog, m.toneMapped, m.depthWrite, m.blending, m.wireframe,
    m.isShaderMaterial ? m.uuid : "", m.onBeforeCompile && m.onBeforeCompile.toString().length > 20 ? m.uuid : ""].join("/");
}
function snapshot(root) {
  const m = new Map();
  root.updateMatrixWorld(true);
  root.traverse((o) => m.set(o, o.matrixWorld.clone()));
  return m;
}

export function mergeStatic(root, opt = {}) {
  if (!root) return { before: 0, after: 0 };
  // 1) find animated objects by stepping the updater once
  const moved = new Set();
  if (root.userData.update) {
    const snap = snapshot(root);
    try {
      root.userData.update(0.37, 12.3, { center: new THREE.Vector3(3.1, 0, -7.7), fwd: new THREE.Vector3(0, 0, -1) });
    } catch (e) {}
    root.updateMatrixWorld(true);
    root.traverse((o) => { const a = snap.get(o); if (a && !a.equals(o.matrixWorld)) moved.add(o); });
  }
  const isFrozen = (o) => {
    for (let p = o; p && p !== root; p = p.parent) {
      if (moved.has(p) || SKIP_NAMES.test(p.name || "") || (p.userData && (p.userData.gltf || p.userData.animated || p.userData.noMerge))) return true;
    }
    return false;
  };
  // 2) collect candidates
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  let before = 0; const rs = {};
  root.traverse((o) => {
    if (!o.isMesh) return;
    before++;
    const why = (k) => { rs[k] = (rs[k] || 0) + 1; };
    if (o.isInstancedMesh) return why("inst");
    if (o.isSkinnedMesh || Array.isArray(o.material)) return why("multi");
    if (!o.visible) return why("hidden");
    const g = o.geometry;
    if (!g || !g.attributes.position || (g.morphAttributes && g.morphAttributes.position)) return why("geo");
    if (isFrozen(o)) return why("frozen");
    const bake = bakeable(o.material);
    if (bake && g.attributes.color) return why("geo");
    const attrs = Object.keys(g.attributes).filter((k) => ["position", "normal", "uv"].includes(k)).concat(bake ? ["color"] : []).sort().join(",");
    if (!g.attributes.normal) return why("geo");
    const interleaved = Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute);
    if (interleaved) return;
    const wp = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    const key = [matSig(o.material), attrs, !!g.index, Math.floor(wp.x / CHUNK), Math.floor(wp.z / CHUNK), o.renderOrder].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  // 3) merge
  let after = before;
  const m4 = new THREE.Matrix4();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const geos = [];
    for (const o of list) {
      let g = o.geometry.clone();
      g.clearGroups();
      m4.multiplyMatrices(inv, o.matrixWorld);
      g.applyMatrix4(m4);
      for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
      if (bakeable(o.material)) {
        const n = g.attributes.position.count, col = new Float32Array(n * 3), cc = o.material.color;
        for (let i = 0; i < n; i++) { col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      }
      geos.push(g);
    }
    let merged = null;
    try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; }
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    let mat = list[0].material;
    if (bakeable(mat)) { mat = mat.clone(); mat.color.setRGB(1, 1, 1); mat.vertexColors = true; mat.userData.mergedOwn = true; }
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = list.some((o) => o.castShadow);
    mesh.receiveShadow = list.some((o) => o.receiveShadow);
    mesh.renderOrder = list[0].renderOrder;
    mesh.name = "merged";
    root.add(mesh);
    list.forEach((o) => { if (o.parent) o.parent.remove(o); });
    after -= list.length - 1;
  }
  // drop groups that became empty
  const empties = [];
  root.traverse((o) => { if (o !== root && o.isGroup && !o.children.length) empties.push(o); });
  empties.forEach((o) => o.parent && o.parent.remove(o));
  let cand = 0; for (const l of groups.values()) cand += l.length;
  return { before, after, cand, groups: groups.size, moved: moved.size, rs };
}
