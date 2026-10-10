/* 3D scroll journey. One continuous shot driven by scroll progress P (0..1):
   containers on a white void -> mobile crane drives in, hooks the Bobby Group box, lifts,
   slews 90° and lands it on a waiting truck -> truck drives off, camera rises to a top-down
   road -> night falls at the quay, the box rides onto a container ship -> camera climbs
   through moonlit cloud and a plane crosses the frame. */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadModel, ASSET_VERSION, makeContainers, makeCrane, makeTractor, makeTrailer, makePlane } from "./assets";
import { makeLights, makeShadowGround, makeRoad, makeOcean, makeClouds, makeNavLight, makeContrail, makeShipCutout } from "./environment";

/* ---------------- math ---------------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const smooth = (t) => t * t * (3 - 2 * t);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- layout constants (metres) ---------------- */
const CRANE_SCALE = 0.62;
const STACK_X = -1.28;          // column of the box that gets lifted
const SLING = 2.6;              // hook tip to container roof
const LIFT = 7.0;               // how far the box is raised clear of the stack (capped by the boom head)
const BOOM = 0.68;              // telescoped boom length (fraction of the model's full extension)
const SHIP_LEN = 140;           // length of the photographed ship, sets the photo's scale
const DAY_TINT = new THREE.Color(1, 1, 1), NIGHT_TINT = new THREE.Color(0.42, 0.52, 0.76);
const DRIVE_IN = 40;            // truck drive-in distance before parking
const STRAIGHT = 120, R = 38, DOWN = 170; // road: straight, 90° curve, straight down to the quay
const QUAY_GAP = 6;

export function createJourney3D({ cfg, section, canvas, captions, railItems, counter, bar, loader: loaderEl }) {
  const low = matchMedia("(pointer: coarse)").matches || Math.min(screen.width, screen.height) < 820 || /[?&]lite3d/.test(location.search);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- renderer / scene ---------- */
  // render3d: offline frame rendering for the image-sequence build (scripts/render-frames.cjs)
  const renderMode = /[?&]render3d/.test(location.search);
  const debug = renderMode || /[?&]debug3d/.test(location.search); // keeps frames readable for automated screenshots
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: "high-performance", preserveDrawingBuffer: debug });
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); console.error("journey3d: WebGL context lost"); });
  renderer.setPixelRatio(renderMode ? 1 : Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const WHITE = new THREE.Color("#ffffff"), NIGHT = new THREE.Color("#03060d");
  scene.background = WHITE.clone();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.5, 4000);
  const lights = makeLights(scene, { shadows: !low });
  if (renderMode) lights.sun.shadow.radius = 3;
  const ground = makeShadowGround();
  scene.add(ground);
  // black floor under the yard and the road: white world above, black below
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0x0b0b0d, transparent: true, opacity: 1, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; floor.renderOrder = -2;
  scene.add(floor);

  /* ---------- state that rigs fill in ---------- */
  let ready = false, alive = true;
  const R_ = {}; // rigs
  let path, pathLen, roadEndS, quayZ, X_C, TRUCK_Z, PARK_X, slot, hTipRest, hHigh, hAttach, hPlace, shipBase, shipZ0;
  let road, ocean, clouds, plane, slings, navL, navR, strobe, shipLights = [];

  /* ---------- loading: in two stages ----------
     Stage 1 (the yard) is all the first half of the story needs. Stage 2 (sea + sky) streams
     in the background once the visitor is scrolling the journey, so the first paint is light
     and phones never decode all six models at once. */
  const YARD = ["containers", "crane", "truck", "trailer"];
  const progress = Object.fromEntries(YARD.map((n) => [n, 0]));
  const setProgress = () => {
    if (!loaderEl) return;
    const v = YARD.reduce((a, n) => a + progress[n], 0) / YARD.length;
    loaderEl.style.setProperty("--p", v.toFixed(3));
  };
  const track = (n) => loadModel(n, (e) => { if (e.total && n in progress) { progress[n] = e.loaded / e.total; setProgress(); } });
  let seaReady = false, seaRequested = false;

  Promise.all(YARD.map(track)).then(([containersG, craneG, truckG, trailerG]) => {
    if (!alive) return;
    buildYard({ containersG, craneG, truckG, trailerG });
    ready = true;
    if (debug) window.__j3d = { THREE, scene, rigs: R_, camera, get: () => ({ X_C, TRUCK_Z, PARK_X, slot, hTipRest, hHigh, hAttach, hPlace, pathLen, seaReady }) };
    loaderEl?.classList.add("done");
  }).catch((e) => { console.error("journey3d: failed to load models", e); loaderEl?.classList.add("error"); });

  function requestSea() {
    if (seaRequested || !ready) return;
    seaRequested = true;
    const tex = (url) => new Promise((res, rej) => new THREE.TextureLoader().load(url + "?v=" + ASSET_VERSION, res, undefined, rej));
    Promise.all([track("plane"), tex("/textures/ship-cutout.webp"), tex("/textures/ship-shadow.webp"), tex("/textures/sea-tile.webp")]).then(([planeG, shipTex, shadowTex, tileTex]) => {
      if (!alive) return;
      buildSea({ planeG, shipTex, shadowTex, tileTex });
      seaReady = true;
    }).catch((e) => console.error("journey3d: failed to load sea models", e));
  }

  function buildYard({ containersG, craneG, truckG, trailerG }) {
    /* containers */
    const C = makeContainers(containersG);
    const { x: W, y: H } = C.size;
    C.black.position.set(STACK_X, H / 2, 0);
    C.grey.position.set(STACK_X + W + 0.1, H / 2, 0);
    C.blue.position.set(STACK_X, H * 1.5, 0);
    scene.add(C.black, C.grey, C.blue);
    R_.C = C;

    /* crane */
    const crane = makeCrane(craneG, CRANE_SCALE, BOOM);
    X_C = STACK_X + crane.radius;
    TRUCK_Z = crane.radius;
    crane.object.position.set(X_C, 0, 0);
    scene.add(crane.object);
    crane.setHook(0);
    scene.updateMatrixWorld(true);
    hTipRest = crane.hookTip().y;
    hAttach = H * 2 + SLING - hTipRest;
    // never hoist the block into the boom head
    hHigh = Math.min(hAttach + LIFT, crane.tipHeight() - crane.blockAboveTip - 0.8 - hTipRest);
    R_.crane = crane;

    /* truck = tractor + articulated trailer + container slot (forward = +x) */
    const truck = new THREE.Group();
    const tractor = makeTractor(truckG);
    tractor.object.rotation.y = -Math.PI / 2;
    truck.add(tractor.object);
    const fifth = new THREE.Group(); fifth.position.set(-0.25, 0, 0); truck.add(fifth);
    const trailer = makeTrailer(trailerG);
    trailer.object.rotation.y = Math.PI;
    trailer.object.position.set(-0.4, 0.83, -0.37);
    fifth.add(trailer.object);
    scene.add(truck);
    truck.updateMatrixWorld(true);
    const tb = new THREE.Box3().setFromObject(trailer.object);
    slot = V((tb.min.x + tb.max.x) / 2 + 0.3, tb.max.y + H / 2 - 0.02, 0); // container centre on the deck (truck space)
    hPlace = slot.y + H / 2 + SLING - hTipRest;
    PARK_X = X_C - slot.x;
    R_.truck = { object: truck, tractor, trailer, fifth };

    /* road path */
    const x0 = PARK_X - DRIVE_IN, z0 = TRUCK_Z, xA = PARK_X + STRAIGHT;
    const L1 = xA - x0, LA = (R * Math.PI) / 2;
    pathLen = L1 + LA + DOWN;
    path = (s) => {
      if (s <= L1) return { p: V(x0 + s, 0, z0), dir: V(1, 0, 0) };
      if (s <= L1 + LA) {
        const th = (s - L1) / R;
        return { p: V(xA + R * Math.sin(th), 0, z0 + R - R * Math.cos(th)), dir: V(Math.cos(th), 0, Math.sin(th)) };
      }
      return { p: V(xA + R, 0, z0 + R + (s - L1 - LA)), dir: V(0, 0, 1) };
    };
    roadEndS = pathLen;
    quayZ = z0 + R + DOWN + QUAY_GAP;
    road = makeRoad((s) => path(Math.min(s, pathLen)), pathLen + 30, 13);
    scene.add(road);
    R_.roadEnd = V(xA + R, 0, quayZ);

    /* deck lights exist from the start (at zero) so adding the ship later never changes the
       light count, which would force every material to recompile mid-scroll */
    [[0, 9, 18], [0, 12, 50], [0, 9, -20]].forEach(([x, y, z]) => {
      const l = new THREE.PointLight(0xffd9a0, 0, 60, 1.6);
      l.userData.offset = V(x, y, z);
      scene.add(l); shipLights.push(l);
    });

    /* slings: four ropes from hook tip to the box corners */
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3));
    slings = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0x1b1d22, transparent: true, opacity: 0 }));
    slings.frustumCulled = false;
    scene.add(slings);
  }

  function buildSea({ planeG, shipTex, shadowTex, tileTex }) {
    const xA = R_.roadEnd.x - R;
    /* the ship is cut out of a real top-down drone photo and floats on the shared ocean,
       which draws its wakes. Bow towards +z, stern just past the quay, on the road's line. */
    const mpp = SHIP_LEN / 1814;                      // metres per pixel of the source photo
    // cut-out: 322 x 1845 px around a 310 x 1833 px hull; shadow matte: 442 x 1965 px (same centre)
    const size = { x: 322 * mpp, y: 1845 * mpp }, shadowSize = { x: 442 * mpp, y: 1965 * mpp };
    const cut = makeShipCutout(shipTex, shadowTex, size, shadowSize);
    const shipGroup = cut.group;
    shipBase = V(R_.roadEnd.x, 0.05, quayZ + 8 + size.y / 2);
    shipGroup.position.copy(shipBase);
    shipGroup.visible = false;
    scene.add(shipGroup);
    cut.uniforms.uQuay.value = quayZ;
    R_.ship = { object: shipGroup, cut, centerOffset: 0, sternOffset: -(1833 * mpp) / 2, length: 1833 * mpp, beam: (310 * mpp) / 2 };

    /* open sea around the ship: tiled from the same photo's water (340 x 680 px patch) so it matches exactly */
    ocean = makeOcean(tileTex, { x: 84, y: 42 }); // 2200 x 1100 px of open water at 3.8 cm/px
    ocean.uniforms.uQuay.value = quayZ;
    ocean.mesh.position.y = 0.01;
    scene.add(ocean.mesh);
    // concrete quay edge where the road meets the water
    const quay = new THREE.Mesh(new THREE.PlaneGeometry(900, 2.2), new THREE.MeshStandardMaterial({ color: 0x3a3c41, roughness: 0.9, transparent: true, opacity: 0 }));
    quay.rotation.x = -Math.PI / 2; quay.position.set(R_.roadEnd.x, 0.03, quayZ - 1.1);
    scene.add(quay); R_.quay = quay;

    /* clouds over the ship's run */
    clouds = makeClouds({ center: V(xA + R, 0, quayZ + 260), spread: 700, y0: 170, y1: 330, count: low ? 60 : 110 });
    clouds.group.visible = false;
    clouds.group.children.forEach((c) => (c.renderOrder = 10)); // always over the sea and the ship
    scene.add(clouds.group);

    /* plane with nav lights and contrails (nose to +x) */
    const pl = makePlane(planeG);
    pl.object.rotation.y = Math.PI;
    plane = new THREE.Group();
    plane.add(pl.object);
    const span = pl.box.max.z - pl.box.min.z;
    navL = makeNavLight(0xff3344, 7); navL.position.set(0, 2, -span / 2 + 0.6);
    navR = makeNavLight(0x33ff88, 7); navR.position.set(0, 2, span / 2 - 0.6);
    strobe = makeNavLight(0xffffff, 16); strobe.position.set(-28, 4, 0);
    plane.add(navL, navR, strobe);
    [-11, 11].forEach((z) => { const c = makeContrail(260, 3.2); c.position.set(-6, 0, z); plane.add(c); });
    plane.visible = false;
    scene.add(plane);
  }

  /* ---------- timeline ---------- */
  const tmpA = V(), tmpB = V(), tmpC = V();
  function placeTruck(s) {
    const { object: truck, fifth, tractor, trailer } = R_.truck;
    const { p, dir } = path(clamp(s, 0, roadEndS + 60));
    let pos = p, d = dir;
    if (s > roadEndS) { pos = V(p.x, 0, path(roadEndS).p.z + (s - roadEndS)); d = V(0, 0, 1); }
    truck.position.copy(pos);
    const yaw = Math.atan2(-d.z, d.x);
    truck.rotation.y = yaw;
    // articulation: trailer axles follow the path ~8.5 m behind the fifth wheel
    truck.updateMatrixWorld(true);
    const king = fifth.getWorldPosition(tmpA);
    const back = s - 8.5 > roadEndS ? V(pos.x, 0, path(roadEndS).p.z + (s - 8.5 - roadEndS)) : path(clamp(s - 8.5, 0, roadEndS)).p;
    const ty = Math.atan2(-(king.z - back.z), king.x - back.x);
    fifth.rotation.y = s > 1 ? ty - yaw : 0;
    // wheels
    tractor.wheels.forEach((w) => (w.rotation.x = -s / tractor.wheelRadius));
    trailer.wheels.forEach((w) => (w.rotation.z = s / trailer.wheelRadius));
  }

  function slingCorners(box, tip) {
    const { x: W, y: H, z: L } = R_.C.size;
    const a = slings.geometry.attributes.position;
    let i = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      tmpC.set(sx * W * 0.42, H / 2, sz * L * 0.42).applyMatrix4(box.matrixWorld); // world space, whoever the parent is
      a.setXYZ(i++, tip.x, tip.y, tip.z);
      a.setXYZ(i++, tmpC.x, tmpC.y, tmpC.z);
    }
    a.needsUpdate = true;
  }

  // camera state helpers
  const cam = { pos: V(), target: V(), up: V(0, 1, 0) };
  const UP = V(0, 1, 0), TOPUP = V(0, 0, -1);
  function shot(pos, target, up = UP) { return { pos, target, up }; }
  function mix(a, b, t) {
    return { pos: a.pos.clone().lerp(b.pos, t), target: a.target.clone().lerp(b.target, t), up: a.up.clone().lerp(b.up, t).normalize() };
  }

  let truckS = 0, shipOffset = 0, boxOnShip = false;

  function update(P, t) {
    const { crane, C, truck: T, ship } = R_;
    const { y: H } = C.size;

    /* --- crane drive-in + hoist + slew --- */
    const drive = easeOut(seg(P, 0.03, 0.13));
    const craneX = lerp(X_C + 42, X_C, drive);
    crane.object.position.x = craneX;
    crane.wheels.forEach((w) => (w.rotation.z = (X_C + 42 - craneX) / crane.wheelRadius));
    let h = hHigh;
    if (P < 0.13) h = hHigh;
    else if (P < 0.2) h = lerp(hHigh, hAttach, ease(seg(P, 0.13, 0.2)));
    else if (P < 0.22) h = hAttach;
    else if (P < 0.3) h = lerp(hAttach, hHigh, ease(seg(P, 0.22, 0.3)));
    else if (P < 0.38) h = hHigh;
    else if (P < 0.43) h = lerp(hHigh, hPlace, ease(seg(P, 0.38, 0.43)));
    else if (P < 0.45) h = hPlace;
    else h = lerp(hPlace, hHigh, ease(seg(P, 0.45, 0.52)));
    crane.setHook(h);
    const slew = (Math.PI / 2) * ease(seg(P, 0.3, 0.38));
    crane.upper.rotation.y = slew;
    crane.object.updateMatrixWorld(true);
    const tip = crane.hookTip(tmpB);

    /* --- truck along the road --- */
    if (P < 0.22) truckS = 0;
    else if (P < 0.32) truckS = DRIVE_IN * easeOut(seg(P, 0.22, 0.32));
    else if (P < 0.45) truckS = DRIVE_IN;
    else truckS = DRIVE_IN + (roadEndS + 48 - DRIVE_IN) * smooth(seg(P, 0.45, 0.8));
    // past the end of the road the truck rolls on along the ship's deck (the photo)
    placeTruck(truckS);
    T.object.position.y = 0;
    T.object.visible = P > 0.215 && P < 0.81;

    /* --- the Bobby Group box --- */
    const box = C.blue;
    const attached = P >= 0.2 && P < 0.43;
    if (P < 0.2) {
      if (box.parent !== scene) scene.attach(box);
      box.position.set(STACK_X, H * 1.5, 0); box.rotation.set(0, 0, 0);
    } else if (attached) {
      if (box.parent !== scene) scene.attach(box);
      box.position.set(tip.x, tip.y - SLING - H / 2, tip.z);
      box.rotation.set(0, slew, 0);
    } else if (P < 0.79 || !seaReady) {
      if (box.parent !== T.object) { T.object.add(box); }
      box.position.copy(slot); box.rotation.set(0, Math.PI / 2, 0);
      boxOnShip = false;
    } else {
      if (box.parent !== ship.object) { ship.object.attach(box); boxOnShip = true; }
    }
    const slingA = seg(P, 0.195, 0.205) * (1 - seg(P, 0.43, 0.445));
    slings.material.opacity = slingA;
    slings.visible = slingA > 0.01;
    if (slings.visible) { box.updateMatrixWorld(true); slingCorners(box, tip); }

    /* --- ship sails (once the sea stage has streamed in) --- */
    shipOffset = 300 * easeIn(seg(P, 0.79, 1)) + 40 * seg(P, 0.79, 1);
    const shipCenter = tmpA.set(R_.roadEnd.x, 0, quayZ + 50 + shipOffset);
    if (seaReady) {
      ship.object.position.set(shipBase.x, shipBase.y, shipBase.z + shipOffset);
      ship.object.visible = P > 0.6;
      shipCenter.set(shipBase.x, 0, shipBase.z + shipOffset + ship.centerOffset);
      ocean.uniforms.uTime.value = t;
      // the wake is drawn by the sea itself, so it stays in the water as the ship pulls away
      ocean.uniforms.uStern.value.set(shipBase.x, shipBase.z + shipOffset + ship.sternOffset);
      ocean.uniforms.uBeam.value = ship.beam;
      ocean.uniforms.uLen.value = ship.length;
      ocean.uniforms.uWake.value = 0.55 + 0.45 * smooth(seg(P, 0.78, 0.84));
      ship.object.updateMatrixWorld(true);
      shipLights.forEach((l) => l.position.copy(ship.object.localToWorld(tmpB.copy(l.userData.offset))));
    }

    /* --- visibility for performance --- */
    const yard = P < 0.68;
    crane.object.visible = yard;
    C.black.visible = C.grey.visible = yard;
    road.material.opacity = smooth(seg(P, 0.44, 0.5));
    // once the camera is up in the clouds the sea fills the whole frame: no road, no quay edge
    const openSea = P > 0.84;
    road.visible = P > 0.44 && !openSea;
    if (seaReady) { clouds.group.visible = P > 0.83; plane.visible = P > 0.92; }

    /* --- day -> night --- */
    const night = smooth(seg(P, 0.72, 0.8));
    scene.background.copy(WHITE).lerp(NIGHT, night);
    lights.hemi.intensity = lerp(0.42, 0.12, night);
    lights.hemi.groundColor.set("#dfe3ea").lerp(new THREE.Color("#05070c"), night);
    lights.sun.intensity = lerp(2.15, 0, night);
    lights.moon.intensity = lerp(0, 1.6, night);
    scene.environmentIntensity = lerp(0.7, 0.15, night);
    ground.material.opacity = 0.16 * (1 - night);
    // floor fades back to white as the camera rises to the top-down road
    const floorA = 1 - smooth(seg(P, 0.57, 0.63));
    floor.material.opacity = floorA; floor.visible = floorA > 0.001;
    if (seaReady) {
      // the sea (photo + surrounding water) appears as the truck nears the quay, then grades to night
      const seaIn = smooth(seg(P, 0.68, 0.74));
      ocean.uniforms.uFade.value = seaIn; ocean.mesh.visible = seaIn > 0.001;
      R_.quay.material.opacity = seaIn; R_.quay.visible = seaIn > 0.001 && !openSea;
      ocean.uniforms.uQuay.value = openSea ? -1e6 : quayZ;
      ship.cut.uniforms.uQuay.value = openSea ? -1e6 : quayZ;
      ship.cut.uniforms.uFade.value = seaIn;
      const tint = DAY_TINT.clone().lerp(NIGHT_TINT, night);
      ship.cut.uniforms.uTint.value.copy(tint);
      ocean.uniforms.uTint.value.copy(tint);
    }
    shipLights.forEach((l) => (l.intensity = 0)); // the photographed ship carries its own lighting
    renderer.toneMappingExposure = lerp(0.95, 1.1, night);
    road.material.color.setScalar(lerp(1, 0.55, night));

    /* --- clouds & plane --- */
    const cloudA = seg(P, 0.84, 0.88);
    if (seaReady) clouds.mats.forEach((m) => (m.opacity = 0.85 * cloudA));
    const fly = seg(P, 0.935, 1);

    /* --- camera choreography --- */
    const truckC = T.object.localToWorld(tmpC.set(-4.5, 1.8, 0)).clone();
    // opening: the stack fills the frame; crane shot: tight on stack + crane together
    const xm = (STACK_X + X_C + 3) / 2;
    // ground-level eye (~0.6 m): the horizon sits on the tyre / container contact line, so the
    // black floor reads as a clean band below the machines instead of a plane receding behind them
    const sA = shot(V(0.9, 0.6, 19), V(0.9, 2.7, 0));
    const sB = shot(V(xm, 0.7, 30), V(xm, 5.6, 0));
    const sC = shot(V(X_C - 4, 0.8, TRUCK_Z + 40), V(X_C - 3, 4.8, TRUCK_Z * 0.45));
    const sD = shot(V(X_C + 1, 0.7, TRUCK_Z + 36), V(X_C + 1, 3.8, TRUCK_Z));
    const sE = shot(V(truckC.x, 0.7, truckC.z + 29), V(truckC.x, 2.3, truckC.z));
    const sF = shot(V(truckC.x, 150, truckC.z + 0.001), V(truckC.x, 0, truckC.z), TOPUP);
    const shipC = V(shipCenter.x, 0, shipCenter.z + 6);
    const sG = shot(V(shipC.x, 190, shipC.z + 0.001), V(shipC.x, 0, shipC.z), TOPUP);
    const sH = shot(V(shipC.x, 560, shipC.z + 0.001), V(shipC.x, 0, shipC.z), TOPUP);
    let c;
    if (P < 0.05) c = sA;
    else if (P < 0.14) c = mix(sA, sB, ease(seg(P, 0.05, 0.14)));
    else if (P < 0.22) c = sB;
    else if (P < 0.3) c = mix(sB, sC, ease(seg(P, 0.22, 0.3)));
    else if (P < 0.36) c = mix(sC, sD, ease(seg(P, 0.3, 0.36)));
    else if (P < 0.45) c = sD;
    else if (P < 0.5) c = mix(sD, sE, ease(seg(P, 0.45, 0.5)));
    else if (P < 0.56) c = sE;
    else if (P < 0.64) {
      // crane up from the side view to straight down, holding on the truck
      const k = ease(seg(P, 0.56, 0.64));
      const arcPos = V(truckC.x, lerp(0.7, 150, Math.pow(k, 1.6)), truckC.z + 29 * Math.cos(k * Math.PI / 2) + 0.001);
      c = { pos: arcPos, target: V(truckC.x, lerp(2.3, 0, k), truckC.z), up: UP.clone().lerp(TOPUP, smooth(k)).normalize() };
    } else if (P < 0.78) c = sF;
    else if (P < 0.84) c = mix(sF, sG, ease(seg(P, 0.78, 0.84)));
    else if (P < 0.88) c = sG;
    else c = mix(sG, sH, ease(seg(P, 0.88, 0.96)));
    cam.pos.copy(c.pos); cam.target.copy(c.target); cam.up.copy(c.up);

    if (seaReady) {
      // close under the camera so the airliner fills the frame as it sweeps across
      plane.position.set(cam.pos.x + lerp(-120, 120, fly), cam.pos.y - 66, cam.pos.z + 3);
      const blink = (t * 1.2) % 1;
      strobe.visible = blink < 0.06 || (blink > 0.14 && blink < 0.18);
    }

    // keep the sun's shadow box on the action
    const focus = P < 0.45 ? tmpA.set(X_C - 4, 0, TRUCK_Z / 2) : truckC;
    lights.sun.target.position.copy(focus);
    lights.sun.position.copy(focus).add(tmpB.set(-30, 60, 45));
  }

  function applyCamera() {
    camera.position.copy(cam.pos);
    camera.up.copy(cam.up);
    camera.lookAt(cam.target);
  }

  /* ---------- captions + rail ---------- */
  const chapters = cfg.chapters.map((c, i) => ({ ...c, i, capEl: captions[i], railEl: railItems[i], railBar: railItems[i]?.querySelector("b") }));
  let lastCounter = "";
  function ui(P) {
    let cur = chapters.findIndex((c) => P < c.to); if (cur < 0) cur = chapters.length - 1;
    chapters.forEach((c) => {
      const p = clamp((P - c.from) / (c.to - c.from));
      const inside = P >= c.from - 0.001 && P <= c.to + 0.001;
      let o = inside ? Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.08) : 0;
      if (c.i === 0) o = inside ? Math.min(1, (1 - p) / 0.08) : 0;
      o = clamp(o);
      if (c.capEl) {
        c.capEl.style.opacity = o.toFixed(3);
        c.capEl.style.transform = `translate3d(0,${((1 - o) * 24).toFixed(1)}px,0)`;
        c.capEl.style.pointerEvents = o > 0.5 ? "auto" : "none";
      }
      if (c.railEl) {
        c.railEl.classList.toggle("on", c.i === cur);
        if (c.railBar) c.railBar.style.transform = `scaleX(${p.toFixed(3)})`;
      }
    });
    const txt = `${String(cur + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
    if (txt !== lastCounter) { counter.textContent = txt; lastCounter = txt; }
    if (bar) bar.style.transform = `scaleX(${P.toFixed(4)})`;
    section.dataset.night = P > 0.76 ? "1" : "0";
  }

  /* ---------- sizing ---------- */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    // narrow / portrait screens keep most (not all) of a 16:9 frame's width: phones show ~58 %
    // of it, so the machines stay a good size instead of a sliver above a sea of black
    const base = 32, ref = 16 / 9;
    const keep = THREE.MathUtils.lerp(0.58, 1, THREE.MathUtils.clamp((camera.aspect - 0.56) / (ref - 0.56), 0, 1));
    camera.fov = camera.aspect < ref
      ? Math.max(base, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base) / 2) * ref * keep / camera.aspect)))
      : base;
    camera.fov = Math.min(camera.fov, 78);
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  /* ---------- scroll ---------- */
  let target = 0, P = 0;
  const readScroll = () => {
    const r = section.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, section.offsetHeight - innerHeight));
  };
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll(); P = target;

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "200px" });
  io.observe(section);

  const t0 = performance.now();
  let raf = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (renderMode) return; // frames are drawn on demand by renderFrame()
    readScroll();
    P += (target - P) * (reduce ? 1 : 0.09);
    if (Math.abs(target - P) < 1e-5) P = target;
    ui(P);
    if (!visible || !ready) return;
    if (P > 0.02) requestSea(); // start streaming the ship + plane once the journey is under way
    update(P, reduce ? 0 : (now - t0) / 1000);
    applyCamera();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    scrollToChapter(i) {
      const c = chapters[i];
      const y = window.scrollY + section.getBoundingClientRect().top + (c.from + 0.01) * (section.offsetHeight - innerHeight);
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.8 }); else window.scrollTo({ top: y, behavior: "smooth" });
    },
    /* debug / testing hook: jump straight to a progress value */
    setProgress(v) { target = P = clamp(v); },
    /* render mode: draw progress p synchronously and return the frame as an encoded image.
       Idle motion (waves, strobe) is tied to p so the sequence stays deterministic. */
    get ready() { return ready; },
    get seaReady() { return seaReady; },
    loadSea() { requestSea(); },
    renderFrame(p, type = "image/webp", quality = 0.86) {
      P = target = clamp(p);
      ui(P);
      update(P, P * 90);
      applyCamera();
      // accumulation anti-aliasing: the frame is rendered several times with the camera nudged by
      // sub-pixel amounts and the results averaged. Smooth, film-like edges at 1x memory cost.
      const W = canvas.width, Hh = canvas.height;
      const out = document.createElement("canvas"); out.width = W; out.height = Hh;
      const o = out.getContext("2d");
      const J = [[0.125, 0.375], [-0.375, 0.125], [0.375, -0.125], [-0.125, -0.375], [0.3125, 0.3125], [-0.3125, -0.3125], [0.0625, -0.4375], [-0.4375, 0.0625]];
      J.forEach(([jx, jy], k) => {
        camera.setViewOffset(W, Hh, jx, jy, W, Hh);
        renderer.render(scene, camera);
        o.globalAlpha = 1 / (k + 1);                 // running average
        o.drawImage(canvas, 0, 0);
      });
      camera.clearViewOffset();
      return out.toDataURL(type, quality);
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readScroll);
      io.disconnect(); ro.disconnect();
      renderer.dispose(); pmrem.dispose();
    },
  };
}
