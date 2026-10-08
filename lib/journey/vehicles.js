/* Detailed vehicles, pre-rendered to sprites. Only wheels, lights and other moving
   parts are drawn per frame. */
import { rr, vgrad, hgrad, rng, lerp, FONTS, glow, shadowEllipse } from "./util";
import { sprite, blit, containerTex, BOX, BOX_MIX, getQuality } from "./textures";

/* =====================================================================
   WHEELS
   ===================================================================== */
export function wheel(ctx, x, y, r, ang, blur = 0, type = "disc") {
  // tyre
  ctx.fillStyle = "#0c0d0f";
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  const sg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  sg.addColorStop(0, "#3d3f45"); sg.addColorStop(0.65, "#212328"); sg.addColorStop(1, "#0b0c0e");
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(x, y, r * 0.93, 0, Math.PI * 2); ctx.fill();
  // sidewall lettering ticks (rotate with the wheel, fade with speed)
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.strokeStyle = `rgba(255,255,255,${0.07 * (1 - blur)})`; ctx.lineWidth = r * 0.05;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, r * 0.8, k * 2.1, k * 2.1 + 0.9); ctx.stroke(); }
  ctx.restore();
  // tread shoulder highlight
  ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, r * 0.97, Math.PI * 1.05, Math.PI * 1.6); ctx.stroke();

  const rim = type === "rtg" ? r * 0.42 : r * 0.62;
  const rg = ctx.createRadialGradient(x - rim * 0.35, y - rim * 0.4, rim * 0.05, x, y, rim);
  if (type === "rtg") {
    rg.addColorStop(0, "#fff3b0"); rg.addColorStop(0.5, "#e3b81f"); rg.addColorStop(1, "#8a6a06");
  } else {
    rg.addColorStop(0, "#fbfcfd"); rg.addColorStop(0.45, "#c3c9d2"); rg.addColorStop(0.85, "#7c838e"); rg.addColorStop(1, "#4b5059");
  }
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.arc(x, y, rim, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = rim * 0.07;
  ctx.beginPath(); ctx.arc(x, y, rim * 0.84, 0, Math.PI * 2); ctx.stroke();

  // hand holes / spokes
  const holes = type === "front" ? 8 : 10;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.globalAlpha = 1 - blur * 0.85;
  ctx.fillStyle = "#15171b";
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * Math.PI * 2;
    ctx.save(); ctx.rotate(a); ctx.translate(rim * 0.6, 0);
    ctx.beginPath(); ctx.ellipse(0, 0, rim * 0.13, rim * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = blur * 0.55;
  ctx.strokeStyle = "#2a2d33"; ctx.lineWidth = rim * 0.2;
  ctx.beginPath(); ctx.arc(0, 0, rim * 0.6, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  // hub + lug nuts
  const hg = ctx.createRadialGradient(-rim * 0.1, -rim * 0.12, 0, 0, 0, rim * 0.38);
  hg.addColorStop(0, "#e9ecf0"); hg.addColorStop(1, "#6a7079");
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, rim * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(30,32,36,${1 - blur * 0.7})`;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * rim * 0.28, Math.sin(a) * rim * 0.28, rim * 0.045, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = type === "front" ? "#f3f5f8" : "#3a3e45";
  ctx.beginPath(); ctx.arc(x, y, rim * (type === "front" ? 0.2 : 0.14), 0, Math.PI * 2); ctx.fill();
  // static specular on rim
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = rim * 0.06;
  ctx.beginPath(); ctx.arc(x, y, rim * 0.92, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
}

/* =====================================================================
   TRUCK  (tractor + 40ft skeletal trailer), side view, facing right
   x relative to truck origin, y absolute (road surface at 678)
   ===================================================================== */
export const TRUCK_WHEELS = [
  { x: 100, t: "disc" }, { x: 177, t: "disc" }, { x: 254, t: "disc" },
  { x: 635, t: "disc" }, { x: 710, t: "disc" }, { x: 870, t: "front" },
];
const TX0 = -24, TY0 = 425, TW = 1000, TH = 265;

function cabPath() {
  const p = new Path2D();
  p.moveTo(782, 612); p.lineTo(828, 612); p.lineTo(828, 646); p.lineTo(834, 646);
  p.arc(870, 648, 36, Math.PI, Math.PI * 2, false);
  p.lineTo(934, 646); p.lineTo(934, 560);
  p.quadraticCurveTo(933, 500, 926, 486);
  p.quadraticCurveTo(918, 470, 898, 470);
  p.lineTo(794, 470); p.quadraticCurveTo(782, 470, 782, 482);
  p.closePath();
  return p;
}

function truckBack(x) {
  // air & electric lines between cab and trailer
  x.lineWidth = 2;
  [["#c62828", 0], ["#2a5bd8", 5], ["#2b2b2b", 10]].forEach(([col, o]) => {
    x.strokeStyle = col; x.beginPath();
    for (let k = 0; k <= 40; k++) {
      const u = k / 40, px = lerp(781, 731, u);
      const py = 548 + o + Math.sin(u * Math.PI) * 20 + Math.sin(u * Math.PI * 22) * 1.1;
      k ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  });

  // container
  x.drawImage(containerTex(BOX.brand, 720, 152, { label: true, seed: 1 }), 10, 450, 720, 152);
  x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(10, 600, 720, 3);

  // skeletal trailer main beam
  x.fillStyle = vgrad(x, 602, 621, [[0, "#50555d"], [0.25, "#2c3036"], [1, "#131518"]]);
  x.fillRect(0, 602, 742, 19);
  x.fillStyle = "#0d0f12"; x.fillRect(0, 619, 742, 3);
  x.fillStyle = "rgba(255,255,255,.12)"; x.fillRect(0, 602, 742, 1);
  for (let i = 0; i < 34; i++) { x.fillStyle = i % 2 ? "rgba(245,245,245,.92)" : "#d02a2a"; x.fillRect(18 + i * 15, 610, 15, 4); }
  x.fillStyle = "#5a5e65"; [12, 718].forEach((px) => x.fillRect(px, 597, 10, 6));
  // landing gear
  x.fillStyle = hgrad(x, 555, 569, [[0, "#24272c"], [0.4, "#737983"], [1, "#1c1f23"]]); x.fillRect(555, 621, 14, 39);
  x.fillStyle = "#1a1c20"; x.fillRect(546, 658, 32, 7);
  x.fillStyle = "#33363c"; x.fillRect(569, 626, 13, 15);
  x.strokeStyle = "#5c6168"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(582, 633); x.lineTo(596, 633); x.lineTo(596, 647); x.stroke();
  // side under-run guard
  [628, 643].forEach((yy) => {
    x.fillStyle = vgrad(x, yy, yy + 6, [[0, "#eef0f3"], [0.5, "#a2a9b2"], [1, "#5b6169"]]);
    x.fillRect(296, yy, 250, 6);
  });
  x.fillStyle = "#33373d"; [298, 420, 540].forEach((px) => x.fillRect(px, 621, 4, 29));
  // rear lights + under-ride bar
  x.fillStyle = "#16181b"; rr(x, -7, 617, 18, 15, 2); x.fill();
  x.fillStyle = "#d71f2a"; rr(x, -5, 619, 7, 11, 1.5); x.fill();
  x.fillStyle = "#ffae1a"; rr(x, 3, 619, 6, 11, 1.5); x.fill();
  x.fillStyle = "#2b2e33"; x.fillRect(6, 621, 4, 22); x.fillRect(30, 621, 4, 22);
  for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? "#f1f1f1" : "#d02a2a"; x.fillRect(-9 + i * 12, 641, 12, 7); }

  // tractor chassis + fifth wheel
  x.fillStyle = vgrad(x, 620, 638, [[0, "#41454c"], [1, "#111316"]]); x.fillRect(600, 620, 330, 18);
  x.fillStyle = "#26282c"; x.fillRect(640, 603, 82, 9);
  x.fillStyle = "#18191c"; x.fillRect(664, 612, 34, 9);
  x.fillStyle = "rgba(255,255,255,.1)"; x.fillRect(640, 603, 82, 1);

  // exhaust stack
  x.fillStyle = hgrad(x, 766, 780, [[0, "#6a6f77"], [0.3, "#f6f8fb"], [0.55, "#bcc1c9"], [1, "#4a4f56"]]);
  rr(x, 766, 438, 14, 172, 3); x.fill();
  x.fillStyle = "rgba(0,0,0,.4)";
  for (let yy = 472; yy < 588; yy += 6) for (let k = 0; k < 2; k++) x.fillRect(769 + k * 5 + ((yy / 6) % 2) * 2, yy, 2, 2);
  x.fillStyle = "#24272c"; x.fillRect(764, 434, 18, 6);

  // cab
  const body = cabPath();
  x.fillStyle = vgrad(x, 470, 648, [[0, "#ffffff"], [0.25, "#f2f4f7"], [0.62, "#dfe3e9"], [1, "#a9b1bd"]]);
  x.fill(body);
  x.save(); x.clip(body);
  x.fillStyle = vgrad(x, 476, 534, [[0, "rgba(140,172,228,0)"], [0.5, "rgba(140,172,228,.3)"], [1, "rgba(140,172,228,0)"]]);
  x.fillRect(780, 476, 160, 58);
  x.fillStyle = vgrad(x, 598, 648, [[0, "rgba(30,32,38,0)"], [1, "rgba(30,32,38,.3)"]]); x.fillRect(780, 598, 160, 50);
  x.fillStyle = hgrad(x, 782, 806, [[0, "rgba(0,0,0,.22)"], [1, "rgba(0,0,0,0)"]]); x.fillRect(782, 470, 24, 180);
  x.fillStyle = hgrad(x, 912, 934, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.18)"]]); x.fillRect(912, 470, 22, 180);
  // livery
  x.beginPath();
  x.moveTo(782, 596); x.bezierCurveTo(842, 594, 884, 582, 934, 552);
  x.lineTo(934, 574); x.bezierCurveTo(884, 602, 842, 612, 782, 614); x.closePath();
  x.fillStyle = hgrad(x, 782, 934, [[0, "#0f2fb8"], [0.6, "#2a52ff"], [1, "#1f47ff"]]); x.fill();
  x.strokeStyle = "#0b0b0d"; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(782, 590); x.bezierCurveTo(842, 588, 884, 576, 934, 546); x.stroke();
  // panels, handles
  x.strokeStyle = "rgba(20,24,32,.35)"; x.lineWidth = 1;
  rr(x, 840, 478, 76, 128, 6); x.stroke();
  rr(x, 790, 576, 34, 14, 3); x.stroke();
  x.fillStyle = "#2b2f36"; rr(x, 848, 566, 16, 4, 2); x.fill();
  x.fillStyle = hgrad(x, 831, 836, [[0, "#8b919a"], [0.5, "#ffffff"], [1, "#7a8089"]]); rr(x, 831, 508, 5, 88, 2.5); x.fill();
  // door window
  const win = new Path2D();
  win.moveTo(848, 486); win.lineTo(906, 486); win.quadraticCurveTo(914, 487, 915, 496); win.lineTo(917, 548); win.lineTo(848, 548); win.closePath();
  x.fillStyle = vgrad(x, 486, 548, [[0, "#30425f"], [0.5, "#1a263a"], [1, "#0d1420"]]); x.fill(win);
  x.save(); x.clip(win);
  x.strokeStyle = "rgba(0,0,0,.5)"; x.lineWidth = 3; x.beginPath(); x.arc(906, 546, 16, Math.PI * 1.05, Math.PI * 1.7); x.stroke();
  x.fillStyle = "rgba(0,0,0,.35)"; rr(x, 852, 520, 22, 30, 4); x.fill();
  x.fillStyle = "rgba(255,255,255,.17)";
  x.beginPath(); x.moveTo(862, 486); x.lineTo(884, 486); x.lineTo(858, 548); x.lineTo(836, 548); x.fill();
  x.fillStyle = "rgba(255,255,255,.08)";
  x.beginPath(); x.moveTo(890, 486); x.lineTo(897, 486); x.lineTo(871, 548); x.lineTo(864, 548); x.fill();
  x.restore();
  x.strokeStyle = "rgba(8,10,14,.85)"; x.lineWidth = 1.6; x.stroke(win);
  // windscreen sliver + visor
  x.fillStyle = "#162235";
  x.beginPath(); x.moveTo(922, 486); x.quadraticCurveTo(928, 492, 930, 520); x.lineTo(932, 556); x.lineTo(927, 556); x.lineTo(923, 500); x.fill();
  x.fillStyle = "#23272e"; rr(x, 884, 469, 46, 7, 3); x.fill();
  x.restore();
  x.strokeStyle = "rgba(40,46,58,.55)"; x.lineWidth = 1; x.stroke(body);

  // roof deflector
  const d = new Path2D();
  d.moveTo(788, 471); d.bezierCurveTo(790, 455, 800, 448, 830, 447);
  d.lineTo(888, 448); d.bezierCurveTo(906, 449, 914, 460, 918, 472); d.closePath();
  x.fillStyle = vgrad(x, 446, 472, [[0, "#ffffff"], [0.6, "#eceff3"], [1, "#cdd3db"]]); x.fill(d);
  x.strokeStyle = "rgba(40,46,58,.45)"; x.stroke(d);
  x.fillStyle = "#1f47ff"; x.font = `800 11px ${FONTS.display}`; x.textBaseline = "middle";
  x.fillText("BOBBY GROUP", 814, 461);
  x.fillStyle = "#f5a40f"; [846, 866, 886].forEach((px) => { rr(x, px, 445, 7, 3, 1); x.fill(); });

  // headlamp, grille, indicator
  x.fillStyle = "#1a1d22"; rr(x, 919, 584, 16, 15, 3); x.fill();
  const lg = x.createRadialGradient(927, 591, 0, 927, 591, 7);
  lg.addColorStop(0, "#ffffff"); lg.addColorStop(1, "#bcd4f5");
  x.fillStyle = lg; rr(x, 921, 586, 11, 10, 2); x.fill();
  x.fillStyle = "#eef6ff"; x.fillRect(921, 584, 13, 1.6);
  x.fillStyle = "#17191d"; x.fillRect(928, 558, 6, 26);
  x.fillStyle = "rgba(220,226,234,.8)"; for (let yy = 561; yy < 582; yy += 5) x.fillRect(928, yy, 6, 1.2);
  x.fillStyle = "#f2a51c"; rr(x, 896, 592, 9, 4, 1); x.fill();

  // mirrors
  x.strokeStyle = "#1c1f24"; x.lineWidth = 3;
  x.beginPath(); x.moveTo(915, 496); x.lineTo(944, 492); x.stroke();
  x.fillStyle = hgrad(x, 940, 952, [[0, "#30353d"], [1, "#0e1013"]]); rr(x, 940, 476, 12, 48, 4); x.fill();
  x.fillStyle = "rgba(255,255,255,.25)"; x.fillRect(941, 479, 2, 40);
  x.fillStyle = "#16181c"; rr(x, 942, 528, 9, 17, 3); x.fill();
}

function truckFront(x) {
  // trailer mudguards + flap
  x.fillStyle = vgrad(x, 612, 621, [[0, "#2a2c31"], [1, "#0f1013"]]);
  rr(x, 62, 612, 230, 9, 3); x.fill();
  x.fillStyle = "#111215"; rr(x, 57, 619, 9, 54, 2); x.fill();
  x.fillStyle = "rgba(255,255,255,.08)"; x.fillRect(58, 622, 1.5, 48);
  // tractor rear guard + flap
  x.fillStyle = vgrad(x, 612, 621, [[0, "#2a2c31"], [1, "#0f1013"]]);
  rr(x, 598, 612, 148, 9, 3); x.fill();
  x.fillStyle = "#111215"; rr(x, 594, 619, 8, 52, 2); x.fill();
  // fuel tank
  x.fillStyle = vgrad(x, 614, 651, [[0, "#7d838c"], [0.14, "#f6f8fa"], [0.34, "#cdd2d8"], [0.7, "#8a9099"], [1, "#454a51"]]);
  rr(x, 745, 614, 60, 37, 10); x.fill();
  x.fillStyle = "#25282d"; x.fillRect(757, 613, 4, 39); x.fillRect(789, 613, 4, 39);
  x.fillStyle = "#30343a"; x.beginPath(); x.arc(798, 619, 3, 0, Math.PI * 2); x.fill();
  // steps
  x.fillStyle = "#1f2226"; rr(x, 806, 612, 30, 36, 3); x.fill();
  x.fillStyle = vgrad(x, 618, 623, [[0, "#e5e8ec"], [1, "#8e959e"]]); x.fillRect(807, 618, 28, 4);
  x.fillStyle = vgrad(x, 634, 639, [[0, "#e5e8ec"], [1, "#8e959e"]]); x.fillRect(807, 634, 28, 4);
  // front wheel arch liner
  x.fillStyle = "#16181c";
  x.beginPath(); x.arc(870, 648, 41, Math.PI, Math.PI * 2); x.arc(870, 648, 35, Math.PI * 2, Math.PI, true); x.closePath(); x.fill();
  // bumper + fog lamp
  x.fillStyle = vgrad(x, 598, 648, [[0, "#3b3f46"], [1, "#141619"]]); rr(x, 908, 598, 28, 50, 4); x.fill();
  x.fillStyle = "#0e0f12"; x.beginPath(); x.arc(926, 626, 6, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#e8eef7"; x.beginPath(); x.arc(926, 626, 4, 0, Math.PI * 2); x.fill();
}

export function drawTruck(ctx, tx, bounce, ang, blur) {
  const back = sprite("truckBack", TX0, TY0, TW, TH, truckBack);
  const front = sprite("truckFront", TX0, TY0, TW, TH, truckFront);
  shadowEllipse(ctx, tx + 470, 680, 540, 18, 0.6);
  ctx.save(); ctx.translate(tx, bounce); blit(ctx, back); ctx.restore();
  TRUCK_WHEELS.forEach((w) => {
    shadowEllipse(ctx, tx + w.x, 678, 40, 6, 0.7);
    wheel(ctx, tx + w.x, 648 + bounce * 0.25, 30, ang, blur, w.t);
  });
  ctx.save(); ctx.translate(tx, bounce); blit(ctx, front); ctx.restore();
}

/* =====================================================================
   AIRLINER  (top-down, nose towards -y), twin-engine wide-body
   ===================================================================== */
const wingP = (s) => {
  const p = new Path2D();
  p.moveTo(s * 28, -58); p.quadraticCurveTo(s * 215, 36, s * 392, 158);
  p.quadraticCurveTo(s * 404, 164, s * 411, 194); p.lineTo(s * 397, 200);
  p.lineTo(s * 126, 113); p.lineTo(s * 28, 94); p.closePath();
  return p;
};
const stabP = (s) => {
  const p = new Path2D();
  p.moveTo(s * 24, 200); p.quadraticCurveTo(s * 96, 236, s * 150, 286);
  p.lineTo(s * 155, 303); p.lineTo(s * 139, 306); p.lineTo(s * 18, 266); p.closePath();
  return p;
};
const nacelleP = (s) => {
  const cx = s * 142, p = new Path2D();
  p.moveTo(cx - 21, -62); p.quadraticCurveTo(cx - 21, -101, cx, -102); p.quadraticCurveTo(cx + 21, -101, cx + 21, -62);
  p.lineTo(cx + 18, 22); p.quadraticCurveTo(cx + 10, 36, cx, 38); p.quadraticCurveTo(cx - 10, 36, cx - 18, 22); p.closePath();
  return p;
};
const fuselageP = () => {
  const p = new Path2D();
  p.moveTo(0, -306);
  p.bezierCurveTo(18, -304, 31, -272, 32, -215); p.lineTo(32, 150);
  p.bezierCurveTo(32, 220, 14, 300, 5, 333); p.lineTo(-5, 333);
  p.bezierCurveTo(-14, 300, -32, 220, -32, 150); p.lineTo(-32, -215);
  p.bezierCurveTo(-31, -272, -18, -304, 0, -306); p.closePath();
  return p;
};
const finP = () => {
  const p = new Path2D();
  p.moveTo(0, 184); p.quadraticCurveTo(7, 240, 4.5, 300); p.lineTo(1.2, 340); p.lineTo(-1.2, 340);
  p.lineTo(-4.5, 300); p.quadraticCurveTo(-7, 240, 0, 184); p.closePath();
  return p;
};
const teY = (x) => (x < 126 ? 94 + (x - 28) * (19 / 98) : 113 + (x - 126) * (87 / 271));
const hingeY = (x) => (x < 124 ? 70 + (x - 30) * (20 / 94) : 90 + (x - 124) * (92 / 270));

function drawPlane(x) {
  const line = "rgba(40,52,74,.42)";
  // horizontal stabilisers
  [-1, 1].forEach((s) => {
    const p = stabP(s);
    x.fillStyle = vgrad(x, 196, 308, [[0, "#f1f3f6"], [1, "#c4cbd5"]]); x.fill(p);
    x.save(); x.clip(p);
    x.strokeStyle = "rgba(40,52,74,.2)"; x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(s * 20, 250); x.lineTo(s * 150, 293); x.stroke();
    x.restore();
    x.strokeStyle = line; x.lineWidth = 1; x.stroke(p);
  });
  // flap-track fairings (poke out behind the trailing edge)
  [-1, 1].forEach((s) => [92, 186, 276].forEach((fx) => {
    const ty = teY(fx);
    x.fillStyle = vgrad(x, ty - 18, ty + 24, [[0, "#dfe4ea"], [1, "#98a1ae"]]);
    x.beginPath(); x.ellipse(s * fx, ty + 3, 4.6, 21, s * -0.32, 0, Math.PI * 2); x.fill();
  }));
  // engines: exhaust cone, nacelle, pylon
  [-1, 1].forEach((s) => {
    const cx = s * 142;
    x.fillStyle = hgrad(x, cx - 10, cx + 10, [[0, "#4a4f57"], [0.4, "#b9bfc8"], [1, "#3a3e45"]]);
    x.beginPath(); x.moveTo(cx - 10, 30); x.lineTo(cx, 54); x.lineTo(cx + 10, 30); x.fill();
    const n = nacelleP(s);
    x.fillStyle = hgrad(x, cx - 21, cx + 21, [[0, "#0a1b6e"], [0.28, "#4268ff"], [0.5, "#2447e8"], [0.82, "#12288f"], [1, "#071450"]]);
    x.fill(n);
    x.save(); x.clip(n);
    x.fillStyle = vgrad(x, -103, -86, [[0, "#f0f3f7"], [1, "#9ba4b2"]]); x.fillRect(cx - 22, -103, 44, 15);
    x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(cx - 10, -86, 3, 96);
    x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(cx - 22, -30, 44, 1.2);
    x.restore();
    x.strokeStyle = "rgba(5,12,40,.6)"; x.lineWidth = 1; x.stroke(n);
    x.fillStyle = hgrad(x, cx - 5, cx + 5, [[0, "#b6bdc8"], [0.5, "#eef1f5"], [1, "#a3abb7"]]);
    rr(x, cx - 4.5, -44, 9, 70, 3); x.fill();
  });
  // wings
  [-1, 1].forEach((s) => {
    const p = wingP(s);
    x.fillStyle = vgrad(x, -60, 205, [[0, "#f4f6f9"], [0.35, "#e0e5eb"], [0.7, "#ced4dd"], [1, "#bcc4cf"]]);
    x.fill(p);
    x.save(); x.clip(p);
    // light falls from the upper left: the right wing is a touch darker
    if (s > 0) { x.fillStyle = "rgba(30,44,70,.06)"; x.fillRect(0, -80, 420, 300); }
    x.fillStyle = hgrad(x, s * 28, s * 76, [[0, `rgba(20,30,50,${s > 0 ? 0.2 : 0.08})`], [1, "rgba(20,30,50,0)"]]);
    x.fillRect(Math.min(s * 28, s * 76), -80, 48, 300);
    x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(s * 30, -57); x.quadraticCurveTo(s * 215, 37, s * 392, 158); x.stroke();
    x.strokeStyle = "rgba(50,62,88,.2)"; x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(s * 36, -44); x.quadraticCurveTo(s * 215, 50, s * 388, 168); x.stroke();
    x.strokeStyle = "rgba(50,62,88,.28)";
    x.beginPath(); x.moveTo(s * 30, 70); x.lineTo(s * 124, 90); x.lineTo(s * 394, 182); x.stroke();
    x.strokeStyle = "rgba(50,62,88,.16)";
    x.beginPath(); x.moveTo(s * 50, hingeY(50) - 24); x.lineTo(s * 124, 66); x.lineTo(s * 300, hingeY(300) - 24); x.stroke();
    for (let fx = 60; fx <= 300; fx += 40) {
      x.beginPath(); x.moveTo(s * fx, hingeY(fx)); x.lineTo(s * fx, hingeY(fx) - 24); x.stroke();
    }
    x.strokeStyle = "rgba(50,62,88,.28)";
    x.beginPath(); x.moveTo(s * 312, hingeY(312)); x.lineTo(s * 312, teY(312)); x.stroke();
    x.strokeStyle = "rgba(50,62,88,.1)";
    [[120, 20], [190, 60], [250, 98]].forEach(([fx, fy]) => { rr(x, s * fx - 7, fy, 14, 9, 2); x.stroke(); });
    x.fillStyle = "rgba(255,255,255,.18)";
    x.beginPath(); x.moveTo(s * 40, -20); x.quadraticCurveTo(s * 215, 72, s * 380, 172); x.lineTo(s * 376, 178); x.quadraticCurveTo(s * 210, 82, s * 40, -8); x.fill();
    x.restore();
    x.strokeStyle = line; x.lineWidth = 1; x.stroke(p);
  });
  // fuselage
  const f = fuselageP();
  x.fillStyle = hgrad(x, -33, 33, [[0, "#b4bcc8"], [0.17, "#eef1f5"], [0.37, "#ffffff"], [0.6, "#f2f4f7"], [0.85, "#d0d6df"], [1, "#a1aab7"]]);
  x.fill(f);
  x.save(); x.clip(f);
  x.strokeStyle = "rgba(30,40,62,.07)"; x.lineWidth = 0.8;
  for (let y = -232; y < 300; y += 34) { x.beginPath(); x.moveTo(-34, y); x.lineTo(34, y); x.stroke(); }
  x.strokeStyle = "rgba(30,40,62,.22)"; x.lineWidth = 0.8;
  [-232, -40, 118, 236].forEach((y) => [-1, 1].forEach((s) => { rr(x, s * 27 - 3, y, 6, 18, 2); x.stroke(); }));
  x.fillStyle = vgrad(x, -250, 270, [[0, "rgba(255,255,255,0)"], [0.15, "rgba(255,255,255,.7)"], [0.85, "rgba(255,255,255,.6)"], [1, "rgba(255,255,255,0)"]]);
  x.fillRect(-15, -250, 4, 520);
  // cockpit glazing
  x.fillStyle = "#101826";
  x.beginPath(); x.moveTo(-21, -262); x.quadraticCurveTo(0, -278, 21, -262); x.lineTo(19, -251); x.quadraticCurveTo(0, -263, -19, -251); x.closePath(); x.fill();
  x.fillStyle = "rgba(170,200,255,.35)";
  x.beginPath(); x.moveTo(-15, -266); x.quadraticCurveTo(-6, -271, 0, -272); x.lineTo(-1, -268); x.quadraticCurveTo(-7, -267, -14, -262); x.fill();
  x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 0.8;
  x.beginPath(); x.moveTo(0, -273); x.lineTo(0, -262); x.moveTo(-10, -270); x.lineTo(-9, -258); x.moveTo(10, -270); x.lineTo(9, -258); x.stroke();
  // titles along the crown
  x.save(); x.translate(0, -160); x.rotate(Math.PI / 2);
  x.fillStyle = "#1f47ff"; x.font = `800 17px ${FONTS.display}`; x.textBaseline = "middle";
  if ("letterSpacing" in x) x.letterSpacing = "1.5px";
  x.fillText("BOBBY GROUP", 0, 0);
  x.restore();
  x.fillStyle = "#1f47ff"; x.fillRect(-32, 150, 64, 3);
  x.fillStyle = "#3a3f48"; rr(x, -2, -138, 4, 9, 2); x.fill(); rr(x, -2, 64, 4, 7, 2); x.fill();
  x.fillStyle = "#2a2d33"; x.beginPath(); x.arc(0, 331, 3, 0, Math.PI * 2); x.fill();
  x.restore();
  x.strokeStyle = line; x.lineWidth = 1.1; x.stroke(f);
  // vertical fin, seen edge-on
  const fin = finP();
  x.fillStyle = hgrad(x, -7, 7, [[0, "#0d27b0"], [0.35, "#5a7cff"], [0.6, "#1f47ff"], [1, "#0a1c84"]]);
  x.fill(fin);
  x.strokeStyle = "rgba(5,12,40,.6)"; x.lineWidth = 0.8; x.stroke(fin);
}

function drawPlaneSilhouette(x) {
  const paths = [fuselageP(), wingP(1), wingP(-1), stabP(1), stabP(-1), nacelleP(1), nacelleP(-1)];
  const q = x.getTransform().a;
  x.save();
  x.shadowColor = "rgba(4,14,44,1)";
  x.shadowBlur = 22 * q;
  x.shadowOffsetX = 4000 * q;
  x.translate(-4000, 0);
  x.fillStyle = "#000";
  paths.forEach((p) => x.fill(p));
  x.restore();
}

export const planeSprite = () => sprite("plane", -420, -320, 840, 670, drawPlane, Math.min(3, getQuality() * 1.2));
export const planeShadow = () => sprite("planeShadow", -470, -370, 940, 770, drawPlaneSilhouette, Math.max(1, getQuality() * 0.5));

/* lights are drawn live so they can blink */
export function planeLights(ctx, t) {
  glow(ctx, -409, 188, 26, "#ff3b3b", 0.9);
  glow(ctx, 409, 188, 26, "#3bff7a", 0.9);
  glow(ctx, 0, 338, 18, "#ffffff", 0.7);
  const beacon = (t * 1.1) % 1 < 0.12;
  if (beacon) glow(ctx, 0, -30, 34, "#ff2a2a", 1);
  const strobe = (t * 0.8) % 1;
  if (strobe < 0.05 || (strobe > 0.12 && strobe < 0.16)) {
    glow(ctx, -405, 196, 70, "#ffffff", 1);
    glow(ctx, 405, 196, 70, "#ffffff", 1);
  }
}

/* =====================================================================
   CONTAINER SHIP  (side view, bow to the left, waterline at y = 600)
   ===================================================================== */
function drawShip(x) {
  const R = rng(4242);
  // superstructure + funnel behind the hull line
  // funnel
  x.fillStyle = hgrad(x, 1046, 1082, [[0, "#e6e9ee"], [0.4, "#ffffff"], [1, "#b9c0ca"]]);
  x.beginPath(); x.moveTo(1048, 498); x.lineTo(1050, 330); x.lineTo(1084, 318); x.lineTo(1082, 498); x.fill();
  x.fillStyle = "#1f47ff"; x.beginPath(); x.moveTo(1049, 352); x.lineTo(1083, 344); x.lineTo(1083, 372); x.lineTo(1049, 378); x.fill();
  x.fillStyle = "#121418"; x.beginPath(); x.moveTo(1050, 330); x.lineTo(1084, 318); x.lineTo(1084, 330); x.lineTo(1050, 342); x.fill();
  // accommodation block
  x.fillStyle = hgrad(x, 936, 1044, [[0, "#cfd5dd"], [0.25, "#ffffff"], [0.8, "#eef1f4"], [1, "#b8c0ca"]]);
  x.fillRect(938, 326, 104, 172);
  x.fillStyle = "rgba(20,28,44,.18)"; x.fillRect(938, 326, 104, 3);
  for (let dk = 0; dk < 5; dk++) {
    const y = 344 + dk * 30;
    x.fillStyle = "rgba(20,28,44,.22)"; x.fillRect(938, y + 20, 104, 1.5);
    x.fillStyle = "#1a2638";
    for (let k = 0; k < 9; k++) x.fillRect(944 + k * 10.6, y, 6, 8);
  }
  // bridge + wings
  x.fillStyle = vgrad(x, 300, 328, [[0, "#ffffff"], [1, "#d7dce3"]]); x.fillRect(922, 302, 136, 26);
  x.fillStyle = "#141d2c"; x.fillRect(926, 308, 128, 10);
  x.fillStyle = "rgba(160,190,240,.35)"; x.fillRect(926, 308, 128, 3);
  x.fillStyle = "#2b2f36"; x.fillRect(920, 300, 140, 3);
  // mast + radar
  x.fillStyle = "#3a3f47"; x.fillRect(988, 258, 4, 44); x.fillRect(970, 272, 40, 3);
  x.fillStyle = "#1b1e23"; x.fillRect(972, 264, 36, 4);
  x.fillStyle = "#e7ebf0"; x.fillRect(978, 282, 24, 4);
  // lifeboat
  x.save(); x.translate(1070, 444); x.rotate(-0.38);
  x.fillStyle = vgrad(x, -9, 9, [[0, "#ff8a3d"], [1, "#c94e10"]]); rr(x, -24, -9, 48, 18, 9); x.fill();
  x.fillStyle = "#16202e"; x.fillRect(-12, -5, 14, 4);
  x.restore();
  x.strokeStyle = "#454a52"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(1046, 470); x.lineTo(1090, 420); x.lineTo(1094, 470); x.stroke();

  // forecastle + foremast
  x.fillStyle = vgrad(x, 470, 500, [[0, "#26324f"], [1, "#18213a"]]);
  x.beginPath(); x.moveTo(-22, 476); x.lineTo(70, 480); x.lineTo(70, 500); x.lineTo(-18, 500); x.fill();
  x.fillStyle = "#c9ced6"; x.fillRect(44, 404, 3, 76);
  x.fillRect(34, 420, 24, 2);
  x.fillStyle = "#f5f7fa"; x.beginPath(); x.arc(45.5, 402, 3, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#8b939e"; x.beginPath(); x.moveTo(62, 480); x.lineTo(76, 452); x.lineTo(78, 480); x.fill();

  // hatch covers + container bays
  x.fillStyle = vgrad(x, 490, 500, [[0, "#5d6570"], [1, "#2c323b"]]); x.fillRect(66, 490, 862, 10);
  const profile = [3, 4, 5, 5, 6, 6, 5];
  for (let b = 0; b < 7; b++) {
    const bx = 70 + b * 122, tiers = profile[b] - (R() < 0.3 ? 1 : 0);
    for (let r = 0; r < tiers; r++) {
      const y = 490 - (r + 1) * 29;
      if (R() < 0.55) {
        const col = BOX_MIX[Math.floor(R() * BOX_MIX.length)];
        x.drawImage(containerTex(col, 118, 29, { seed: (b * 7 + r) % 5 }), bx, y, 118, 29);
      } else {
        for (let h = 0; h < 2; h++) {
          const col = BOX_MIX[Math.floor(R() * BOX_MIX.length)];
          x.drawImage(containerTex(col, 58, 29, { seed: (b + r + h) % 4 }), bx + h * 60, y, 58, 29);
        }
      }
    }
    if (b > 0) {
      // lashing bridge
      x.fillStyle = "#9aa3ae";
      x.fillRect(bx - 4, 432, 2.5, 58); x.fillRect(bx - 2.5, 432, 2.5, 58);
      x.fillRect(bx - 5, 432, 6, 2); x.fillRect(bx - 5, 461, 6, 2);
    }
  }
  // stack shading: top lit, sides in soft shadow
  x.globalCompositeOperation = "source-atop";
  x.fillStyle = vgrad(x, 300, 490, [[0, "rgba(255,240,220,.08)"], [1, "rgba(10,16,30,.22)"]]);
  x.fillRect(70, 300, 852, 190);
  x.globalCompositeOperation = "source-over";

  // hull
  const hull = new Path2D();
  hull.moveTo(-26, 474); hull.quadraticCurveTo(500, 500, 1096, 496);
  hull.lineTo(1090, 560); hull.lineTo(1084, 616); hull.lineTo(52, 616);
  hull.quadraticCurveTo(16, 556, -26, 474); hull.closePath();
  x.fillStyle = vgrad(x, 474, 616, [[0, "#26355a"], [0.4, "#18233f"], [1, "#0c1326"]]);
  x.fill(hull);
  x.save(); x.clip(hull);
  x.fillStyle = vgrad(x, 586, 616, [[0, "#9a3226"], [1, "#5c1b14"]]); x.fillRect(-40, 588, 1160, 30);
  x.fillStyle = "rgba(255,255,255,.08)"; x.fillRect(-40, 586, 1160, 2);
  x.strokeStyle = "rgba(255,255,255,.04)"; x.lineWidth = 1;
  for (let px = 40; px < 1090; px += 58) { x.beginPath(); x.moveTo(px, 470); x.lineTo(px, 590); x.stroke(); }
  x.beginPath(); x.moveTo(-40, 540); x.lineTo(1120, 540); x.stroke();
  x.fillStyle = vgrad(x, 480, 520, [[0, "rgba(255,255,255,.14)"], [1, "rgba(255,255,255,0)"]]); x.fillRect(-40, 478, 1160, 40);
  x.fillStyle = hgrad(x, -26, 120, [[0, "rgba(0,0,0,.3)"], [1, "rgba(0,0,0,0)"]]); x.fillRect(-40, 470, 160, 150);
  x.restore();
  x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 1.5;
  x.beginPath(); x.moveTo(-24, 476); x.quadraticCurveTo(500, 502, 1094, 498); x.stroke();
  // name, anchor, marks
  x.fillStyle = "rgba(255,255,255,.92)"; x.font = `800 22px ${FONTS.display}`; x.textBaseline = "middle";
  if ("letterSpacing" in x) x.letterSpacing = "2px";
  x.fillText("BOBBY GROUP", 96, 530);
  if ("letterSpacing" in x) x.letterSpacing = "0px";
  x.fillStyle = "#0a0e18"; x.beginPath(); x.ellipse(26, 500, 8, 5, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#7d8591"; x.lineWidth = 2.4; x.beginPath(); x.moveTo(26, 504); x.lineTo(26, 522); x.stroke();
  x.beginPath(); x.arc(26, 516, 7, 0.2, Math.PI - 0.2); x.stroke();
  x.fillStyle = "rgba(255,255,255,.7)"; x.font = `600 7px ${FONTS.body}`;
  ["12M", "10M", "8M"].forEach((t, i) => x.fillText(t, 58, 556 + i * 13));
  x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 1.2;
  x.beginPath(); x.arc(560, 572, 7, 0, Math.PI * 2); x.moveTo(548, 572); x.lineTo(572, 572); x.stroke();
}

export const shipSprite = () => sprite("ship", -40, 250, 1150, 370, drawShip);
