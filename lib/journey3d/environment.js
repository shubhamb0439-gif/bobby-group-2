/* Scene dressing: lights, shadow ground, road, night ocean, clouds, plane effects. */
import * as THREE from "three";

/* ---------------- lights ---------------- */
export function makeLights(scene, { shadows }) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe3ea, 1.15);
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-30, 60, 45);
  sun.castShadow = shadows;
  if (shadows) {
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    const c = sun.shadow.camera; c.left = -40; c.right = 40; c.top = 40; c.bottom = -40; c.near = 1; c.far = 220;
    sun.shadow.radius = 4;
  }
  const moon = new THREE.DirectionalLight(0x9db4ff, 0);
  moon.position.set(40, 120, -60);
  scene.add(hemi, sun, sun.target, moon, moon.target);
  return { hemi, sun, moon };
}

/* invisible ground that only shows soft shadows on the white void */
export function makeShadowGround() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.16 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

/* ---------------- road ---------------- */
function roadTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024;
  const x = c.getContext("2d");
  x.fillStyle = "#101114"; x.fillRect(0, 0, 512, 1024);
  // fine aggregate grain
  const img = x.getImageData(0, 0, 512, 1024), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (Math.random() - 0.5) * 14; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  x.putImageData(img, 0, 0);
  // shoulders + edge lines
  x.fillStyle = "#1a1b1f"; x.fillRect(0, 0, 18, 1024); x.fillRect(494, 0, 18, 1024);
  x.fillStyle = "rgba(255,255,255,.55)"; x.fillRect(26, 0, 7, 1024); x.fillRect(479, 0, 7, 1024);
  // dashed lane dividers
  x.fillStyle = "rgba(255,255,255,.42)";
  [171, 341].forEach((lx) => { x.fillRect(lx - 4, 120, 8, 360); x.fillRect(lx - 4, 632, 8, 360); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

/* ribbon mesh following a path function (s -> {p:Vector3, dir:Vector3}) */
export function makeRoad(path, length, width = 12) {
  const segs = Math.ceil(length / 1.5);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const s = (i / segs) * length, { p, dir } = path(s);
    const nx = -dir.z, nz = dir.x; // left normal in the ground plane
    pos.push(p.x + nx * width / 2, 0.02, p.z + nz * width / 2, p.x - nx * width / 2, 0.02, p.z - nz * width / 2);
    uv.push(0, s / 24, 1, s / 24);
    if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.92, metalness: 0, transparent: true, opacity: 0 });
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

/* ---------------- ocean ---------------- */
const OCEAN_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const OCEAN_FRAG = /* glsl */ `
uniform sampler2D uTile;
uniform vec2 uTileSize;    // metres covered by one repeat of the water photo
uniform float uTime, uFade, uQuay, uWake, uBeam, uLen;
uniform vec2 uStern;      // world xz of the stern (ship heads +z)
uniform vec3 uTint;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xz;
  if (p.y < uQuay) discard;            // land side of the quay
  // two samples of the same photographed water at different scales and angles break up the repeat
  vec2 uv1 = p / uTileSize + vec2(uTime * 0.004, -uTime * 0.006);
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  vec2 uv2 = (r * p) / (uTileSize * 1.73) + vec2(-uTime * 0.003, uTime * 0.002) + 0.37;
  vec3 a = texture2D(uTile, uv1).rgb, b = texture2D(uTile, uv2).rgb;
  vec3 col = mix(a, b, 0.42);
  // restore the contrast the blend softens
  col = mix(vec3(dot(col, vec3(0.333))), col, 1.08);
  col = (col - 0.27) * 1.12 + 0.27;
  // slow, large-scale light and colour variation (wind patches, cloud shade) hides the repeat from altitude
  float m1 = dot(texture2D(uTile, p / (uTileSize * 11.0) + 0.21).rgb, vec3(0.333));
  float m2 = dot(texture2D(uTile, (r * p) / (uTileSize * 23.0) + 0.63).rgb, vec3(0.333));
  float macro = (m1 + m2) * 0.5 - 0.42;
  col *= 1.0 + macro * 1.6;
  col = mix(col, col * vec3(0.85, 1.02, 1.08), smoothstep(-0.05, 0.08, macro) * 0.5);
  // wake: turbulent centre trail + two Kelvin arms, fixed in the water, fading with distance
  // ---- wakes around a hull heading +z: al = metres from the stern towards the bow, s = sideways
  float al = p.y - uStern.y, s = p.x - uStern.x;
  if (uWake > 0.0 && al > -700.0 && al < uLen + 40.0) {
    float n = dot(texture2D(uTile, p / (uTileSize * 0.45) + vec2(0.0, uTime * 0.05)).rgb, vec3(0.333));
    float n2 = dot(texture2D(uTile, p / (uTileSize * 0.21) + vec2(uTime * 0.03, 0.0)).rgb, vec3(0.333));
    float churn = smoothstep(0.18, 0.55, n * 0.6 + n2 * 0.6);
    // hull half-width, tapering to the bow over its last 9 %
    float tip = clamp((uLen - al) / (uLen * 0.09), 0.0, 1.0);
    float hw = uBeam * sqrt(tip);
    float inside = step(0.0, al) * step(al, uLen);
    float d = abs(s) - hw;                                   // distance out from the hull side
    // 1. foam churning along both sides, building towards the bow
    float sideFoam = inside * smoothstep(5.5, 0.0, d) * step(-1.0, d) * (0.35 + 0.65 * smoothstep(0.2, 1.0, al / uLen));
    // 2. bow wave: a cushion of white water pushed ahead and around the stem
    float bow = smoothstep(9.0, 0.0, length(vec2(s * 0.75, max(al - uLen, 0.0) * 1.4))) * smoothstep(uLen * 0.75, uLen, al);
    // 3. propeller trail astern, widening and fading with distance
    float bk = max(-al, 0.0);
    float w = uBeam * 0.85 + bk * 0.11;
    float trail = (1.0 - smoothstep(w * 0.2, w, abs(s))) * exp(-bk / 260.0) * smoothstep(4.0, -4.0, al);
    trail *= smoothstep(0.15, 0.6, churn + (1.0 - abs(s) / w) * 0.35);   // turbulent, not a solid band
    // 4. Kelvin arms spreading back from the bow at ~19.5 degrees
    float back = uLen - al;
    // broad, broken chop rather than a crisp line
    float kel = step(0.0, back) * smoothstep(7.0, 0.0, abs(abs(s) - (uBeam * 0.9 + back * 0.36))) * exp(-max(back - uLen, 0.0) / 150.0) * smoothstep(0.0, 18.0, back);
    kel *= smoothstep(0.42, 0.78, churn);
    // side foam is broken up by the chop so it reads as spray, not an outline
    float foam = sideFoam * smoothstep(0.2, 0.75, churn + smoothstep(3.0, 0.0, d) * 0.3) * 1.25 + bow * (0.6 + churn * 0.6) + trail * (0.45 + churn * 1.1) + kel * 0.55;
    col = mix(col, vec3(0.88, 0.93, 0.97), clamp(foam, 0.0, 1.0) * 0.88 * uWake);
  }
  gl_FragColor = vec4(max(col, 0.0) * uTint, uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeOcean(tile, tileSize) {
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.colorSpace = THREE.SRGBColorSpace;
  tile.anisotropy = 8;
  const uniforms = {
    uTile: { value: tile }, uTileSize: { value: new THREE.Vector2(tileSize.x, tileSize.y) },
    uTime: { value: 0 }, uFade: { value: 0 }, uQuay: { value: -1e6 }, uTint: { value: new THREE.Color(1, 1, 1) },
    uWake: { value: 0 }, uBeam: { value: 11 }, uLen: { value: 140 }, uStern: { value: new THREE.Vector2() },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: OCEAN_VERT, fragmentShader: OCEAN_FRAG, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return { mesh: m, uniforms };
}

/* ---------------- clouds ----------------
   Each texture is a fractal-noise density field (puffy cumulus cells with wispy edges),
   lit from one side by sampling the density a little towards the light: thick parts facing
   the moon are bright, the far side falls into blue-grey shadow. */
function valueNoise(seed) {
  const P = new Uint8Array(512), G = new Float32Array(256);
  let s = seed * 9973 + 7;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 256; i++) { P[i] = i; G[i] = R(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
  for (let i = 0; i < 256; i++) P[i + 256] = P[i];
  const f = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = f(x - xi), yf = f(y - yi), X = xi & 255, Y = yi & 255;
    const a = G[P[P[X] + Y]], b = G[P[P[X + 1] + Y]], c = G[P[P[X] + Y + 1]], d = G[P[P[X + 1] + Y + 1]];
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
function cloudTexture(seed) {
  const S = 320, n = valueNoise(seed);
  const fbm = (x, y) => { let v = 0, a = 0.5, f = 1; for (let o = 0; o < 6; o++) { v += a * n(x * f, y * f); a *= 0.5; f *= 2.03; } return v; };
  const stretch = 0.75 + ((seed * 0.37) % 0.4);
  const density = (x, y) => {
    const dx = (x / S - 0.5) * 2, dy = ((y / S - 0.5) * 2) / stretch;
    const fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy)); // overall cloud footprint
    // domain warp gives the cauliflower lobes their irregular shape
    const wx = fbm(x * 0.012 + 3.1, y * 0.012) * 26, wy = fbm(x * 0.012, y * 0.012 + 7.7) * 26;
    return fbm((x + wx) * 0.018, (y + wy) * 0.018) * 0.9 + fall * 0.75 - 0.42;
  };
  const c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d"), img = x.createImageData(S, S), d = img.data;
  const L = [-4, -5]; // light from the upper left (pixels)
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const k = (py * S + px) * 4;
    const den = density(px, py);
    const a = Math.min(1, Math.max(0, (den - 0.18) / 0.32));
    if (a <= 0) { d[k + 3] = 0; continue; }
    const toward = density(px + L[0], py + L[1]);
    const lit = Math.min(1, Math.max(0, 0.62 + (den - toward) * 2.6));
    const thick = Math.min(1, (den - 0.18) / 0.6);
    // bright sunlit tops, blue-grey self-shadowed undersides
    d[k] = 150 + 105 * lit; d[k + 1] = 160 + 95 * lit; d[k + 2] = 185 + 70 * lit;
    d[k + 3] = Math.round(255 * Math.pow(a, 1.6) * (0.55 + 0.45 * thick));
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* a deck of cloud sprites spread over an area, between two heights */
export function makeClouds({ center, spread, y0, y1, count }) {
  const group = new THREE.Group();
  const textures = [0, 1, 2, 3].map(cloudTexture);
  const mats = textures.map((map) => new THREE.SpriteMaterial({ map, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  let s = 7;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const sp = new THREE.Sprite(mats[i % mats.length]);
    const size = 110 + R() * 170;
    sp.scale.set(size, size, 1);
    sp.position.set(center.x + (R() - 0.5) * spread, y0 + R() * (y1 - y0), center.z + (R() - 0.5) * spread);
    sp.material.rotation = R() * Math.PI;
    group.add(sp);
  }
  return { group, mats };
}

/* ---------------- plane extras ---------------- */
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export function makeNavLight(color, size) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  sp.scale.setScalar(size);
  return sp;
}
/* soft vapour ribbon trailing behind an engine (lies flat, extends towards -x) */
export function makeContrail(length, width) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 32;
  const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 256, 0);
  // u=0 is the far end of the trail, u=1 sits just behind the engine (short clear gap first)
  g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.8, "rgba(255,255,255,.55)"); g.addColorStop(0.96, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 256, 32);
  const v = x.createLinearGradient(0, 0, 0, 32);
  v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(0.5, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)");
  x.globalCompositeOperation = "destination-out"; x.fillStyle = v; x.fillRect(0, 0, 256, 32);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(length, width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.7 }));
  m.rotation.x = -Math.PI / 2;
  m.geometry.translate(-length / 2, 0, 0);
  return m;
}

/* ---------------- photographic sea ----------------
   A real top-down drone photo of a container ship and its wake. Edges feather into the
   procedural ocean; the whole thing is graded from daylight to a deep night blue. */
const PHOTO_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uFade, uTime, uQuay;
uniform vec2 uSize;     // photo size in metres
varying vec2 vUv;
varying vec3 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
void main() {
  if (vWorld.z < uQuay) discard;   // water never spills onto the land side of the quay
  vec2 uv = vUv;
  vec3 col = texture2D(uMap, uv).rgb;
  // live shimmer on the open water only (the ship deck stays still): brightens wave glints
  float shipM = (1.0 - smoothstep(0.13, 0.16, abs(uv.x - 0.5))) * smoothstep(0.10, 0.13, uv.y) * (1.0 - smoothstep(0.88, 0.91, uv.y));
  float water = 1.0 - shipM;
  float sh = noise(uv * vec2(60.0, 140.0) + vec2(uTime * 0.6, -uTime * 0.9));
  col *= 1.0 + water * (sh - 0.5) * 0.18;
  col *= uTint;
  // distance (metres) outside the ship's footprint in the photo: hull spans x 0.36-0.64,
  // bow at v 0.105, stern at v 0.861. Only the hull and the foam hugging it are kept, so the
  // open water is always the shared ocean that stays still while the ship sails through it.
  float dx = max(abs(uv.x - 0.5) - 0.135, 0.0) * uSize.x;
  float dy = max(0.105 - uv.y, 0.0) * uSize.y + max(uv.y - 0.861, 0.0) * uSize.y * 0.6;
  float keep = 1.0 - smoothstep(1.2, 6.5, length(vec2(dx, dy)));
  gl_FragColor = vec4(col, keep * uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function makeSeaPhoto(texture, width, length) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const uniforms = { uMap: { value: texture }, uTint: { value: new THREE.Color(1, 1, 1) }, uFade: { value: 0 }, uTime: { value: 0 }, uQuay: { value: -1e6 }, uSize: { value: new THREE.Vector2(width, length) } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: PHOTO_FRAG,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
  m.rotation.x = -Math.PI / 2; // image top -> world -z (stern towards the quay), bow towards +z
  m.renderOrder = 0;
  return { mesh: m, uniforms };
}

/* ---------------- cut-out ship ----------------
   The ship photographed from above, cut out of its water (transparent PNG/WebP), floating on
   the shared ocean. A blurred matte under it darkens the water against the hull; the wakes
   themselves are drawn by the ocean shader. */
const CUTOUT_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uFade, uQuay, uShade;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  if (vWorld.z < uQuay) discard;
  vec4 c = texture2D(uMap, vUv);
  if (uShade > 0.5) { gl_FragColor = vec4(0.0, 0.02, 0.06, c.a * 0.55 * uFade); return; }
  gl_FragColor = vec4(c.rgb * uTint, c.a * uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const CUTOUT_VERT = "varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";
export function makeShipCutout(shipTex, shadowTex, size, shadowSize) {
  [shipTex, shadowTex].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
  const uniforms = { uTint: { value: new THREE.Color(1, 1, 1) }, uFade: { value: 0 }, uQuay: { value: -1e6 } };
  const mk = (map, shade, w, l, y) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uMap: { value: map }, uShade: { value: shade } },
      vertexShader: CUTOUT_VERT, fragmentShader: CUTOUT_FRAG, transparent: true, depthWrite: false,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
    m.rotation.x = -Math.PI / 2; // image top (stern) -> -z, bow -> +z
    m.position.y = y;
    return m;
  };
  const group = new THREE.Group();
  const shadow = mk(shadowTex, 1, shadowSize.x, shadowSize.y, 0.03);
  shadow.position.x = 1.2; shadow.position.z = 1.6; // light from the upper left
  const ship = mk(shipTex, 0, size.x, size.y, 0.08);
  shadow.renderOrder = 1; ship.renderOrder = 2;
  group.add(shadow, ship);
  // both materials share the same uniform objects, so one update drives both
  return { group, uniforms };
}
