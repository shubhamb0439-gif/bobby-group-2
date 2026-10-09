/* Model loading and rigging: turns the downloaded glTF models into animatable rigs
   (crane with slewing upper works and a hook, truck/trailer with spinning wheels,
   branded containers, ship and plane with livery removed). */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const BASE = "/models/";
/* bump when any model or journey texture changes: assets are cached for 30 days, the version
   in the URL is what makes browsers fetch the new file */
export const ASSET_VERSION = 5;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export const loadModel = (name, onProgress) =>
  new Promise((res, rej) => loader.load(BASE + name + ".glb?v=" + ASSET_VERSION, res, onProgress, rej));

/* ---------------- helpers ---------------- */
const meshesIn = (root) => { const a = []; root.traverse((o) => o.isMesh && a.push(o)); return a; };
const boxOf = (obj) => new THREE.Box3().setFromObject(obj);
const centerOf = (obj) => boxOf(obj).getCenter(new THREE.Vector3());

function ancestorNamed(o, names) {
  for (let p = o; p; p = p.parent) if (names.includes(p.name)) return p.name;
  return null;
}

/* create a pivot group in `parent` at world point `center` and re-parent `list` into it
   (world transforms are preserved, so the pivot can then be rotated in place) */
function pivotAround(parent, list, center) {
  const p = new THREE.Group();
  parent.add(p);
  parent.updateMatrixWorld(true);
  p.position.copy(parent.worldToLocal(center.clone()));
  p.updateMatrixWorld(true);
  list.forEach((m) => p.attach(m));
  return p;
}

/* split one mesh into several by classifying each triangle's world-space centroid.
   Attributes are shared (works with quantised / meshopt geometry); only indices differ. */
function splitMesh(mesh, classify) {
  mesh.updateMatrixWorld(true);
  const g = mesh.geometry, pos = g.attributes.position, idx = g.index, mw = mesh.matrixWorld;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), l = new THREE.Vector3();
  const buckets = new Map();
  const tris = (idx ? idx.count : pos.count) / 3;
  for (let t = 0; t < tris; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0).applyMatrix4(mw);
    b.fromBufferAttribute(pos, i1).applyMatrix4(mw);
    c.fromBufferAttribute(pos, i2).applyMatrix4(mw);
    const wa = a.clone(), wb = b.clone(), wc = c.clone();
    const id = classify(a.add(b).add(c).multiplyScalar(1 / 3));
    if (!buckets.has(id)) buckets.set(id, { idx: [], world: new THREE.Box3(), local: new THREE.Box3() });
    const bk = buckets.get(id);
    bk.idx.push(i0, i1, i2);
    bk.world.expandByPoint(wa).expandByPoint(wb).expandByPoint(wc);
    for (const i of [i0, i1, i2]) bk.local.expandByPoint(l.fromBufferAttribute(pos, i));
  }
  const out = [];
  for (const [id, bk] of buckets) {
    const geo = new THREE.BufferGeometry();
    for (const k in g.attributes) geo.setAttribute(k, g.attributes[k]);
    geo.setIndex(bk.idx);
    // bounds from this piece's own triangles: computeBoundingBox() would scan the whole shared
    // vertex buffer and report the bounds of the original, unsplit mesh
    geo.boundingBox = bk.local.clone();
    geo.boundingSphere = bk.local.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(geo, mesh.material);
    m.position.copy(mesh.position); m.quaternion.copy(mesh.quaternion); m.scale.copy(mesh.scale);
    m.name = `${mesh.name}_${id}`;
    mesh.parent.add(m);
    out.push({ id, mesh: m, box: bk.world });
  }
  mesh.parent.remove(mesh);
  return out;
}

/* Transmissive (refracting) glass makes three.js render the whole scene a second time into
   an offscreen buffer. At these distances plain tinted glass looks the same and costs nothing. */
const glassCache = new Map();
function cheapGlass(m) {
  if (!m.isMeshPhysicalMaterial) return m;
  if (glassCache.has(m)) return glassCache.get(m);
  const glassy = m.transmission > 0 || /glass|glas|window|vidrio/i.test(m.name) || (m.transparent && m.opacity < 0.9);
  // physical -> standard: same look here, a much lighter shader (clearcoat/sheen/transmission unused)
  const s = glassy
    ? new THREE.MeshStandardMaterial({ name: m.name, color: new THREE.Color("#1b2633"), roughness: 0.06, metalness: 0.4, transparent: true, opacity: 0.55, envMapIntensity: 1.4, side: m.side })
    : new THREE.MeshStandardMaterial({
        name: m.name, color: m.color, map: m.map, normalMap: m.normalMap, normalScale: m.normalScale,
        roughness: m.roughness, roughnessMap: m.roughnessMap, metalness: m.metalness, metalnessMap: m.metalnessMap,
        aoMap: m.aoMap, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity,
        alphaMap: m.alphaMap, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side,
      });
  glassCache.set(m, s);
  return s;
}

function finishMaterials(root, { shadow = true, env = 1 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = shadow; o.receiveShadow = shadow;
    if (Array.isArray(o.material)) o.material = o.material.map(cheapGlass);
    else o.material = cheapGlass(o.material);
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach((m) => { if ("envMapIntensity" in m && !glassCache.has(m)) m.envMapIntensity = env; });
  });
}

/* pull one mesh out of a pack into its own group, centred on its bounding box */
function extract(scene, name) {
  scene.updateMatrixWorld(true);
  const src = scene.getObjectByName(name);
  const g = new THREE.Group();
  const m = src.clone();
  src.matrixWorld.decompose(m.position, m.quaternion, m.scale);
  g.add(m);
  const box = boxOf(g), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  m.position.sub(c);
  g.userData.size = size;
  return g;
}

/* ---------------- branding ---------------- */
function textTexture(lines, w, h, { bg = null, color = "#ffffff", font = "800", weight = [1] } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.fillStyle = color; x.textBaseline = "middle";
  let y = 0;
  lines.forEach(([txt, size, ls = 0], i) => {
    x.font = `${font} ${size}px "Manrope", "Inter", system-ui, sans-serif`;
    if ("letterSpacing" in x) x.letterSpacing = `${ls}px`;
    y += size * (weight[i] ?? 1) * 0.62;
    x.fillText(txt, 0, y);
    y += size * 0.62;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function brandContainer(group) {
  const { x: W, y: H, z: L } = group.userData.size;
  const side = textTexture([["BOBBY GROUP", 230, 10], ["BBGU 204518 2   ·   45G1   ·   EXPORT", 64, 6]], 2048, 512);
  const mat = new THREE.MeshStandardMaterial({ map: side, transparent: true, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
  [1, -1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.64, L * 0.64 * 0.25), mat);
    p.rotation.y = s * Math.PI / 2;
    p.position.set(s * (W / 2 + 0.012), H * 0.06, 0);
    group.add(p);
  });
  const end = textTexture([["BOBBY GROUP", 118, 4]], 1024, 200);
  const endMat = mat.clone(); endMat.map = end;
  const e = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.78, W * 0.78 * 0.195), endMat);
  e.position.set(0, H * 0.3, L / 2 + 0.012);
  group.add(e);
}

/* ---------------- rigs ---------------- */
export function makeContainers(gltf) {
  finishMaterials(gltf.scene, { env: 0.9 });
  const black = extract(gltf.scene, "Object_26");
  const grey = extract(gltf.scene, "Object_30");
  const blue = extract(gltf.scene, "Object_28");
  // (no lettering on the containers)
  return { black, grey, blue, size: blue.userData.size };
}

/* Mobile crane: carrier (rolls in) + upper works (slews) + hook block (hoists). */
export function makeCrane(gltf, scale, boomScale = 1) {
  const root = new THREE.Group();
  root.add(gltf.scene);
  root.updateMatrixWorld(true);
  finishMaterials(gltf.scene, { env: 0.9 });

  const ring = gltf.scene.getObjectByName("rotating");
  const T = ring ? centerOf(ring) : new THREE.Vector3(0, -1.15, 0);
  const HOOK = ["plate"], SPARE = ["pCube63", "polySurface69", "polySurface76"], ROPE = ["polySurface64", "polySurface65", "polySurface66", "polySurface67", "polySurface68"];
  const WHEELS = ["tyre", "rim1"];
  const carrierList = [], upperList = [], hookList = [], ropeList = [], wheelList = [];
  for (const m of meshesIn(gltf.scene)) {
    // the model also carries a small ball-and-hook below the main block: not needed
    if (ancestorNamed(m, SPARE)) { m.visible = false; continue; }
    const tag = ancestorNamed(m, [...HOOK, ...ROPE]);
    if (tag && HOOK.includes(tag)) { hookList.push(m); continue; }
    if (tag && ROPE.includes(tag)) { ropeList.push(m); continue; }
    if (ancestorNamed(m, WHEELS)) { wheelList.push(m); continue; }
    m.userData.boom = !!ancestorNamed(m, ["hand"]); // remember before re-parenting
    (centerOf(m).y > T.y + 0.2 ? upperList : carrierList).push(m);
  }
  const carrier = new THREE.Group(), upper = new THREE.Group();
  root.add(carrier, upper);
  upper.position.copy(T);
  root.updateMatrixWorld(true);
  carrierList.forEach((m) => carrier.attach(m));
  upperList.forEach((m) => upper.attach(m));

  // wheels: cluster by axle position, one pivot each
  const clusters = new Map();
  wheelList.forEach((m) => {
    const c = centerOf(m), key = `${Math.round(c.x / 2.5)}:${Math.sign(c.z)}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(m);
  });
  const wheels = [];
  for (const list of clusters.values()) {
    const b = new THREE.Box3(); list.forEach((m) => b.expandByObject(m));
    wheels.push(pivotAround(carrier, list, b.getCenter(new THREE.Vector3())));
  }
  const tyreBox = new THREE.Box3(); wheelList.forEach((m) => tyreBox.expandByObject(m));
  const wheelR = (tyreBox.max.y - tyreBox.min.y) / 2;

  // hook block + ropes (measured before anything moves)
  const hb = new THREE.Box3(); hookList.forEach((m) => hb.expandByObject(m));
  const rb = new THREE.Box3(); ropeList.forEach((m) => rb.expandByObject(m));
  const ropeTop = new THREE.Vector3((rb.min.x + rb.max.x) / 2, rb.max.y, (rb.min.z + rb.max.z) / 2);
  const ropeLen = rb.max.y - rb.min.y;
  const hookTipDrop = hb.getCenter(new THREE.Vector3()).y - hb.min.y; // hook centre -> tip

  // telescope the boom in: everything along the boom axis is scaled towards the boom foot
  const handMeshes = upperList.filter((m) => m.userData.boom);
  const handBox = new THREE.Box3(); handMeshes.forEach((m) => handBox.expandByObject(m));
  const foot = new THREE.Vector3(handBox.max.x - 0.8, T.y + 2.2, 0);
  const axis = ropeTop.clone().sub(foot); const boomLen = axis.length(); axis.normalize();
  const boomParts = upperList.filter((m) => {
    if (m.userData.boom) return true;
    const c = centerOf(m).sub(foot), along = c.dot(axis), perp = c.clone().addScaledVector(axis, -along).length();
    return along > boomLen * 0.18 && perp < 1.6;
  });
  const boom = new THREE.Group();
  upper.add(boom);
  boom.position.copy(foot).sub(T);
  boom.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
  root.updateMatrixWorld(true);
  boomParts.forEach((m) => boom.attach(m));
  const tipAt = (k) => foot.clone().addScaledVector(axis, boomLen * k); // tip position for a telescope factor

  const hook = pivotAround(upper, hookList, hb.getCenter(new THREE.Vector3()));
  const rope = pivotAround(upper, ropeList, ropeTop);
  const hookBase = hook.position.clone();
  let tip = ropeTop.clone();
  function telescope(k) {
    boom.scale.set(k, 1, 1);
    tip = tipAt(k);
    rope.position.copy(tip).sub(T);
    hook.position.x = tip.x - T.x; hook.position.z = tip.z - T.z;
  }

  const rig = new THREE.Group();
  rig.add(root);
  root.scale.setScalar(scale);
  const ground = boxOf(root).min.y;
  root.position.y = -ground;

  telescope(boomScale);

  return {
    object: rig, upper, carrier, wheels, scale,
    wheelRadius: wheelR * scale,
    radius: Math.hypot(tip.x - T.x, tip.z - T.z) * scale,
    /* world height of the boom-head sheave, the highest the hook block can reach */
    tipHeight: () => tip.y * scale - ground,
    /* height of the hook block above the hook tip (world) */
    blockAboveTip: (rb.min.y - hb.min.y) * scale,
    /* raise the hook by h metres (world) above its modelled rest position */
    setHook(h) {
      const hm = h / scale;
      hook.position.y = hookBase.y + hm;
      // rope runs from the (telescoped) boom head down to the top of the hook block
      rope.scale.y = Math.max(0.01, (tip.y - (rb.min.y + hm)) / ropeLen);
    },
    hookTip(target = new THREE.Vector3()) {
      hook.updateMatrixWorld(true);
      return hook.localToWorld(target.set(0, -hookTipDrop, 0));
    },
  };
}

/* Volvo FH16 tractor: black paint, wheels split per axle. Faces -z in the model. */
export function makeTractor(gltf) {
  const g = new THREE.Group();
  g.add(gltf.scene);
  g.updateMatrixWorld(true);
  finishMaterials(gltf.scene, { env: 1.1 });
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.name === "truck_paint_cab__fh.001") { m.color.set("#0b0c0f"); m.metalness = 0.75; m.roughness = 0.22; }
  });
  const parts = [];
  ["wheel_24", "rim fh 01_19", "rim fh 002_18"].forEach((n) => {
    const node = gltf.scene.getObjectByName(n);
    if (node) meshesIn(node).forEach((m) => parts.push(...splitMesh(m, (c) => (c.z < -1.4 ? "f" : "r")).map((p) => ({ ...p, tyre: n === "wheel_24" }))));
  });
  const wheels = [];
  ["f", "r"].forEach((id) => {
    const mine = parts.filter((p) => p.id === id);
    if (!mine.length) return;
    // axle centre from the tyre's own triangles (the rims carry odd brackets that skew a box)
    const b = new THREE.Box3();
    (mine.some((p) => p.tyre) ? mine.filter((p) => p.tyre) : mine).forEach((p) => b.union(p.box));
    const c = b.getCenter(new THREE.Vector3()); c.x = 0;
    wheels.push(pivotAround(g, mine.map((p) => p.mesh), c));
  });
  const box = boxOf(g);
  return { object: g, wheels, wheelRadius: 0.54, box };
}

/* Skeletal container trailer: steel-grey instead of yellow, wheels on pivots. Front at -x. */
export function makeTrailer(gltf) {
  const g = new THREE.Group();
  g.add(gltf.scene);
  g.updateMatrixWorld(true);
  finishMaterials(gltf.scene, { env: 1 });
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.material.name === "paint_yellow_4k") {
      o.material = o.material.clone();
      o.material.map = null; o.material.color.set("#1e2024"); o.material.metalness = 0.55; o.material.roughness = 0.45;
    }
  });
  const wheelParts = meshesIn(gltf.scene).filter((m) => {
    const b = boxOf(m), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    return s.x < 1.2 && s.y > 0.4 && s.y < 1.2 && c.x > 6 && c.x < 10.3 && c.y < 0;
  });
  const clusters = new Map();
  wheelParts.forEach((m) => {
    const c = centerOf(m), key = `${Math.round(c.x * 2)}:${Math.sign(c.z + 0.37)}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(m);
  });
  const wheels = [];
  for (const list of clusters.values()) {
    const b = new THREE.Box3(); list.forEach((m) => b.expandByObject(m));
    wheels.push(pivotAround(g, list, b.getCenter(new THREE.Vector3())));
  }
  return { object: g, wheels, wheelRadius: 0.53, box: boxOf(g) };
}

/* Container ship: bow at +x in the model. */
export function makeShip(gltf) {
  const g = new THREE.Group();
  g.add(gltf.scene);
  finishMaterials(gltf.scene, { shadow: false, env: 0.6 });
  return { object: g, box: boxOf(g) };
}

/* Boeing 787: livery stripped to plain white, tail in brand blue. Nose at -x in the model. */
export function makePlane(gltf) {
  const g = new THREE.Group();
  g.add(gltf.scene);
  finishMaterials(gltf.scene, { shadow: false, env: 1 });
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.material.name;
    if (n === "Metal_Fuselage_2" || n === "Fuselage_Wing_Section.EDIT2") {
      o.material = o.material.clone(); o.material.map = null; o.material.color.set("#eef1f5"); o.material.roughness = 0.35; o.material.metalness = 0.15;
    } else if (n === "Tail_Metal_Singapore") {
      o.material = o.material.clone(); o.material.map = null; o.material.color.set("#1f47ff"); o.material.roughness = 0.35; o.material.metalness = 0.2;
    }
  });
  return { object: g, box: boxOf(g) };
}
