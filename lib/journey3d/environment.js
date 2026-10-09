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
uniform float uTime, uFade;
uniform vec3 uShip;        // stern-to-bow axis origin (ship centre), world
uniform vec2 uShipDir;     // heading in xz
uniform float uHalfLen, uHalfBeam, uSpeed, uQuay, uWake;
uniform vec3 uTint;
varying vec3 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
void main() {
  vec2 p = vWorld.xz;
  if (p.y < uQuay) discard;            // land side of the quay stays dark ground
  float t = uTime;
  // domain-warped swell: the long, lighter streaks of open water seen from above
  vec2 q = vec2(fbm(p*0.012 + vec2(0.0, t*0.02)), fbm(p*0.012 + vec2(5.2, -t*0.015)));
  float n = fbm(p*0.02 + q*2.4 + vec2(t*0.01, 0.0));
  float fine = fbm(p*0.11 + vec2(t*0.08, -t*0.05));
  vec3 deep = vec3(0.028, 0.105, 0.19);
  vec3 mid  = vec3(0.055, 0.19, 0.30);
  vec3 lite = vec3(0.11, 0.30, 0.44);
  vec3 col = mix(deep, mid, smoothstep(0.25, 0.75, n));
  col = mix(col, lite, smoothstep(0.62, 0.9, n) * 0.55);
  // moon glints on wave crests
  float glint = smoothstep(0.74, 0.92, fine * 0.6 + n * 0.5);
  col += vec3(0.35, 0.45, 0.65) * glint * 0.18;

  // wake: hull-hugging foam plus a widening, turbulent trail astern
  vec2 d = p - uShip.xz;
  float along = dot(d, uShipDir);
  float side = dot(d, vec2(-uShipDir.y, uShipDir.x));
  float hull = smoothstep(2.6, 0.0, abs(abs(side) - uHalfBeam)) * step(-uHalfLen, along) * step(along, uHalfLen * 0.95);
  float behind = -uHalfLen - along;
  float w = uHalfBeam * 0.9 + max(behind, 0.0) * 0.16;
  float trail = step(0.0, behind) * (1.0 - smoothstep(w * 0.4, w, abs(side))) * exp(-behind / 260.0);
  float kelvin = step(0.0, behind) * smoothstep(3.0, 0.0, abs(abs(side) - (uHalfBeam + behind * 0.36))) * exp(-behind / 180.0);
  float bow = smoothstep(14.0, 0.0, length(vec2(along - uHalfLen, side * 1.6)));
  float churn = fbm(vec2(along * 0.09 + t * uSpeed * 0.05, side * 0.25));
  float foam = clamp(hull * 0.9 + trail * churn * 1.25 + kelvin * 0.55 + bow * 0.8, 0.0, 1.0) * uWake;
  foam *= smoothstep(0.25, 0.65, churn + 0.25);
  col = mix(col, vec3(0.78, 0.84, 0.92), foam * 0.85);
  gl_FragColor = vec4(col * uTint, uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeOcean() {
  const uniforms = {
    uTime: { value: 0 }, uFade: { value: 0 },
    uShip: { value: new THREE.Vector3() }, uShipDir: { value: new THREE.Vector2(0, 1) },
    uHalfLen: { value: 45 }, uHalfBeam: { value: 6.4 }, uSpeed: { value: 1 }, uQuay: { value: -1e6 }, uWake: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: OCEAN_VERT, fragmentShader: OCEAN_FRAG, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return { mesh: m, uniforms };
}

/* ---------------- clouds ---------------- */
function cloudTexture(seed) {
  let s = seed * 9973 + 1;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d");
  for (let k = 0; k < 70; k++) {
    const a = R() * Math.PI * 2, d = Math.pow(R(), 0.7) * S * 0.3;
    const bx = S / 2 + Math.cos(a) * d, by = S / 2 + Math.sin(a) * d * 0.7;
    const r = S * (0.05 + R() * 0.12) * (1.2 - d / (S * 0.3) * 0.6);
    const g = x.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.5, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* a deck of cloud sprites spread over an area, between two heights */
export function makeClouds({ center, spread, y0, y1, count }) {
  const group = new THREE.Group();
  const textures = [0, 1, 2, 3, 4, 5].map(cloudTexture);
  const mats = textures.map((map) => new THREE.SpriteMaterial({ map, color: 0x9aa7c4, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  let s = 7;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const sp = new THREE.Sprite(mats[i % mats.length]);
    const size = 60 + R() * 120;
    sp.scale.set(size, size * 0.75, 1);
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
uniform float uFade, uTime;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
void main() {
  vec2 uv = vUv;
  vec3 col = texture2D(uMap, uv).rgb;
  // live shimmer on the open water only (the ship deck stays still): brightens wave glints
  float shipM = (1.0 - smoothstep(0.13, 0.16, abs(uv.x - 0.5))) * smoothstep(0.10, 0.13, uv.y) * (1.0 - smoothstep(0.88, 0.91, uv.y));
  float water = 1.0 - shipM;
  float sh = noise(uv * vec2(60.0, 140.0) + vec2(uTime * 0.6, -uTime * 0.9));
  col *= 1.0 + water * (sh - 0.5) * 0.18;
  col *= uTint;
  float edge = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x) * smoothstep(0.0, 0.07, uv.y) * smoothstep(1.0, 0.93, uv.y);
  gl_FragColor = vec4(col, edge * uFade);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function makeSeaPhoto(texture, width, length) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const uniforms = { uMap: { value: texture }, uTint: { value: new THREE.Color(1, 1, 1) }, uFade: { value: 0 }, uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: PHOTO_FRAG,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
  m.rotation.x = -Math.PI / 2; // image top -> world -z (stern towards the quay), bow towards +z
  m.renderOrder = 0;
  return { mesh: m, uniforms };
}
