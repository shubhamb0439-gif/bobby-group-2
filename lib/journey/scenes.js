/* Rendered scenes. Logical canvas = 1600 x 900. Each draw(ctx, p, t) gets
   p = scene progress 0..1 and t = time in seconds (for idle motion). */
import {
  W, H, clamp, lerp, seg, ease, easeOut, easeIn, rand, wrap, rr, vgrad, hgrad, mix, rgba, glow, shadowEllipse, FONTS,
} from "./util";
import {
  drawContainer, BOX, BOX_MIX, asphaltTile, concreteTile, tileStrip, cloudSide, cloudTop, oceanTile, sprite, blit, getQuality,
} from "./textures";
import { drawTruck, wheel, planeSprite, planeShadow, planeLights, shipSprite } from "./vehicles";

const capQ = (m) => Math.min(getQuality(), m);

/* ---------- shared scenery ---------- */
function sky(ctx, stops, y1 = H) {
  ctx.fillStyle = vgrad(ctx, -200, y1, stops);
  ctx.fillRect(-800, -1200, W + 1600, H + 2400);
}
function sun(ctx, x, y, warm = "#fff1d6") {
  glow(ctx, x, y, 760, warm, 0.55);
  glow(ctx, x, y, 220, "#ffffff", 0.55);
  glow(ctx, x, y, 46, "#ffffff", 1);
}
function rays(ctx, x, y, t, a = 0.05) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * 0.62 + i * 0.09 + Math.sin(t * 0.15 + i) * 0.01;
    const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * 1400, y + Math.sin(ang) * 1400);
    g.addColorStop(0, `rgba(255,236,200,${a * (0.6 + rand(i) * 0.8)})`); g.addColorStop(1, "rgba(255,236,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - 0.025) * 1600, y + Math.sin(ang - 0.025) * 1600);
    ctx.lineTo(x + Math.cos(ang + 0.025) * 1600, y + Math.sin(ang + 0.025) * 1600);
    ctx.fill();
  }
  ctx.restore();
}
/* ship-to-shore gantry crane silhouette */
function sts(ctx, x, base, s, col, boom = col) {
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
  ctx.fillStyle = col; ctx.strokeStyle = col;
  ctx.fillRect(0, -262, 11, 262); ctx.fillRect(122, -262, 11, 262);
  ctx.fillRect(-6, -266, 145, 14); ctx.fillRect(-6, -140, 145, 8);
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(0, -140); ctx.lineTo(133, -252); ctx.moveTo(133, -140); ctx.lineTo(0, -252); ctx.stroke();
  ctx.fillStyle = boom; ctx.fillRect(-280, -306, 600, 14);
  ctx.fillStyle = col;
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(10, -266); ctx.lineTo(64, -392); ctx.lineTo(124, -266); ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(64, -392); ctx.lineTo(-270, -304); ctx.moveTo(64, -392); ctx.lineTo(310, -304); ctx.stroke();
  ctx.fillRect(150, -326, 74, 20); ctx.fillRect(40, -292, 50, 24);
  ctx.restore();
}
/* drifting cumulus in the sky */
function skyClouds(ctx, drift, seed, n, yMin, yMax, a = 0.85) {
  for (let i = 0; i < n; i++) {
    const w = 380 + rand(seed + i * 3) * 420, h = w * 0.53;
    const x = wrap(rand(seed + i) * 2600 - drift * (0.4 + rand(seed + i * 5) * 0.3), 2600) - 600;
    const y = yMin + rand(seed + i * 7) * (yMax - yMin);
    ctx.globalAlpha = a * (0.6 + rand(seed + i * 9) * 0.4);
    ctx.drawImage(cloudSide((seed + i) % 6), x, y, w, h);
  }
  ctx.globalAlpha = 1;
}
function lightTower(ctx, x, base, h, col) {
  ctx.fillStyle = col; ctx.fillRect(x - 3, base - h, 6, h);
  ctx.fillRect(x - 22, base - h - 4, 44, 10);
  ctx.fillStyle = "rgba(255,248,225,.9)"; for (let k = 0; k < 4; k++) ctx.fillRect(x - 19 + k * 10, base - h + 6, 7, 4);
}
function haze(ctx, y0, y1, col, a) {
  ctx.fillStyle = vgrad(ctx, y0, y1, [[0, rgba(col, 0)], [0.5, rgba(col, a)], [1, rgba(col, a * 0.6)]]);
  ctx.fillRect(-800, y0, W + 1600, y1 - y0);
}
function motes(ctx, t, n, area, col = "#ffffff") {
  for (let i = 0; i < n; i++) {
    const x = area[0] + wrap(rand(i) * area[2] + t * (6 + rand(i + 9) * 10), area[2]);
    const y = area[1] + wrap(rand(i + 3) * area[3] - t * (3 + rand(i + 5) * 6), area[3]);
    ctx.fillStyle = rgba(col, 0.12 + rand(i + 7) * 0.3);
    ctx.beginPath(); ctx.arc(x, y, 0.8 + rand(i + 11) * 1.6, 0, Math.PI * 2); ctx.fill();
  }
}

/* ===================================================================
   01 LIFT : rubber-tyred gantry crane rolls in, lowers, lifts a box
   =================================================================== */
const LIFT_SKY = [[0, "#6f95d3"], [0.45, "#b2c8ea"], [0.82, "#e9e3da"], [1, "#f4e6d4"]];
const HZ1 = "#e9dfd3";

const liftBackdrop = () => sprite("liftBack", -700, 120, W + 1400, 590, (x) => {
  const far = mix(HZ1, "#5b6678", 0.38), farB = mix(HZ1, "#3a56c8", 0.42);
  // far stacks
  for (let i = 0; i < 30; i++) {
    const sx = -700 + i * 128, tiers = 2 + Math.floor(rand(i + 30) * 3);
    for (let k = 0; k < tiers; k++) drawContainer(x, sx, 700 - 46 * (k + 1), 124, 44, BOX_MIX[(i * 3 + k) % BOX_MIX.length], { seed: (i + k) % 5 });
  }
  haze(x, 470, 700, HZ1, 0.7);
  [[-420, 0.62], [940, 0.7], [1240, 0.62], [1560, 0.74], [2000, 0.6]].forEach(([cx, s], i) => sts(x, cx, 702, s, far, i % 2 ? farB : far));
  haze(x, 260, 700, HZ1, 0.45);
  lightTower(x, 330, 702, 400, mix(HZ1, "#4a5363", 0.5));
  lightTower(x, 1480, 702, 440, mix(HZ1, "#4a5363", 0.5));
}, capQ(1.6));

function rtgLeg(ctx, lx, top, ground, inward) {
  // box-section leg
  ctx.fillStyle = hgrad(ctx, lx - 16, lx + 16, [[0, "#9aa2ae"], [0.3, "#f4f6f9"], [0.65, "#dfe3e9"], [1, "#8b939f"]]);
  ctx.fillRect(lx - 16, top, 32, ground - top - 40);
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(lx + 10, top, 6, ground - top - 40);
  // hazard bands
  ctx.save(); ctx.beginPath(); ctx.rect(lx - 16, ground - 110, 32, 50); ctx.clip();
  for (let k = -4; k < 8; k++) {
    ctx.fillStyle = k % 2 ? "#151515" : "#f2c200";
    ctx.beginPath(); ctx.moveTo(lx - 16, ground - 110 + k * 12); ctx.lineTo(lx + 16, ground - 122 + k * 12);
    ctx.lineTo(lx + 16, ground - 110 + k * 12); ctx.lineTo(lx - 16, ground - 98 + k * 12); ctx.fill();
  }
  ctx.restore();
  // diagonal bracing
  ctx.strokeStyle = "#7d8693"; ctx.lineWidth = 5;
  for (let y = top + 60; y < ground - 150; y += 110) {
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + inward * 74, y + 64); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.2;
  for (let y = top + 60; y < ground - 150; y += 110) {
    ctx.beginPath(); ctx.moveTo(lx, y - 2); ctx.lineTo(lx + inward * 74, y + 62); ctx.stroke();
  }
  // sill beam + bogie
  ctx.fillStyle = vgrad(ctx, ground - 62, ground - 34, [[0, "#3b414b"], [1, "#1a1d22"]]);
  rr(ctx, lx - 52, ground - 62, 104, 26, 4); ctx.fill();
  ctx.fillStyle = "#f2c200"; ctx.fillRect(lx - 52, ground - 64, 104, 3);
}

function lift(ctx, p, t) {
  sky(ctx, LIFT_SKY, 700);
  const zk = ease(seg(p, 0.72, 1)), z = 1 + 0.16 * zk;
  ctx.save();
  ctx.translate(930, 470); ctx.scale(z, z); ctx.translate(-800, -470 - 40 * zk);

  sun(ctx, 1330, 330);
  skyClouds(ctx, t * 8, 11, 6, -60, 260, 0.8);
  blit(ctx, liftBackdrop());
  rays(ctx, 1330, 330, t, 0.035);

  // yard surface
  tileStrip(ctx, concreteTile(), 0, 700, 256, 512, -700, W + 700);
  tileStrip(ctx, concreteTile(), 180, 956, 256, 512, -700, W + 700);
  haze(ctx, 700, 780, HZ1, 0.55);
  ctx.fillStyle = vgrad(ctx, 760, 1200, [[0, "rgba(10,14,28,0)"], [1, "rgba(10,14,28,.28)"]]); ctx.fillRect(-700, 760, W + 1400, 440);
  // painted lane markings
  ctx.fillStyle = "rgba(232,186,38,.78)";
  for (let x = -700; x < W + 700; x += 70) ctx.fillRect(x, 762, 40, 4);
  ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(-700, 846, W + 1400, 5);
  ctx.font = `700 22px ${FONTS.display}`; ctx.fillStyle = "rgba(255,255,255,.45)";
  ["A-12", "A-13", "A-14"].forEach((s, i) => ctx.fillText(s, 160 + i * 560, 812));

  // near stacks
  [[1140, 4], [1330, 3], [-60, 3], [110, 2]].forEach(([sx, tiers], k) => {
    shadowEllipse(ctx, sx + 90, 704, 120, 10, 0.4);
    for (let i = 0; i < tiers; i++) drawContainer(ctx, sx, 700 - 92 * (i + 1), 180, 90, BOX_MIX[(k * 3 + i) % BOX_MIX.length], { seed: k + i });
    ctx.fillStyle = "rgba(255,230,200,.06)"; ctx.fillRect(sx, 700 - 92 * tiers, 180, 92 * tiers);
  });

  const a = easeOut(seg(p, 0, 0.26)), b = ease(seg(p, 0.26, 0.42)), c = ease(seg(p, 0.42, 0.74));
  const span = 660, cx = lerp(-820, 470, a), top = 150, ground = 700, mid = cx + span / 2;
  const cw = 360, ch = 150, cxl = 620;
  const ctop = lerp(ground - ch, 300, c);

  // cast shadows (sun upper right -> shadows fall towards the viewer, left)
  ctx.fillStyle = "rgba(14,20,40,.16)";
  [cx, cx + span].forEach((lx) => {
    ctx.beginPath(); ctx.moveTo(lx - 16, ground); ctx.lineTo(lx + 16, ground); ctx.lineTo(lx - 120, ground + 130); ctx.lineTo(lx - 170, ground + 130); ctx.fill();
  });
  ctx.beginPath(); ctx.moveTo(cx - 50, ground + 6); ctx.lineTo(cx + span + 50, ground + 6); ctx.lineTo(cx + span - 120, ground + 120); ctx.lineTo(cx - 220, ground + 120); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
  shadowEllipse(ctx, 800, 706, 230 * (1 - c * 0.45), 16, 0.5 * (1 - c * 0.6));

  // hoist ropes
  const spreaderBottom = c > 0 ? ctop : lerp(330, ground - ch, b);
  const trolleyY = top + 44;
  [[-40, -170], [-14, -60], [14, 60], [40, 170]].forEach(([tx, sx]) => {
    ctx.strokeStyle = "#2b2f36"; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(mid + tx, trolleyY + 34); ctx.lineTo(mid + sx, spreaderBottom - 24); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(mid + tx - 0.8, trolleyY + 34); ctx.lineTo(mid + sx - 0.8, spreaderBottom - 24); ctx.stroke();
  });

  // spreader + container (with a gentle pendulum)
  const swing = Math.sin(t * 1.4) * 0.012 * c;
  ctx.save();
  ctx.translate(mid, spreaderBottom); ctx.rotate(swing); ctx.translate(-mid, -spreaderBottom);
  ctx.fillStyle = vgrad(ctx, spreaderBottom - 44, spreaderBottom - 26, [[0, "#ffd84a"], [1, "#c99400"]]);
  rr(ctx, mid - 44, spreaderBottom - 44, 88, 20, 3); ctx.fill();
  ctx.fillStyle = vgrad(ctx, spreaderBottom - 26, spreaderBottom - 4, [[0, "#ffd23f"], [0.5, "#e2a900"], [1, "#9c7200"]]);
  rr(ctx, mid - 198, spreaderBottom - 26, 396, 22, 3); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.25)"; for (let k = -180; k < 190; k += 40) ctx.fillRect(mid + k, spreaderBottom - 24, 2, 18);
  ctx.fillStyle = "#1c1d20"; [-206, 186].forEach((o) => { rr(ctx, mid + o, spreaderBottom - 14, 20, 14, 2); ctx.fill(); });
  drawContainer(ctx, cxl, ctop, cw, ch, BOX.brand, { label: true, seed: 2 });
  ctx.restore();

  // legs, wheels
  [cx, cx + span].forEach((lx, i) => {
    rtgLeg(ctx, lx, top, ground, i ? -1 : 1);
    const ang = cx / 26;
    wheel(ctx, lx - 26, ground - 24, 24, ang, a < 1 ? 0.5 : 0, "rtg");
    wheel(ctx, lx + 26, ground - 24, 24, ang, a < 1 ? 0.5 : 0, "rtg");
  });
  // power pack on the right leg
  ctx.fillStyle = hgrad(ctx, cx + span + 16, cx + span + 96, [[0, "#d6dbe2"], [0.4, "#ffffff"], [1, "#b1b9c4"]]);
  rr(ctx, cx + span + 16, 430, 80, 70, 4); ctx.fill();
  ctx.fillStyle = "rgba(20,24,32,.35)"; for (let k = 0; k < 6; k++) ctx.fillRect(cx + span + 24, 442 + k * 8, 40, 2);
  ctx.fillStyle = "#1f47ff"; ctx.fillRect(cx + span + 16, 488, 80, 6);

  // girder (box section)
  ctx.fillStyle = vgrad(ctx, top - 12, top + 30, [[0, "#5274ff"], [0.3, "#2a50ff"], [0.75, "#1a3bd0"], [1, "#0c2290"]]);
  ctx.fillRect(cx - 54, top - 12, span + 108, 42);
  ctx.fillStyle = "#0b0b0d"; ctx.fillRect(cx - 54, top + 28, span + 108, 6);
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(cx - 54, top - 12, span + 108, 2);
  ctx.fillStyle = "rgba(0,0,0,.2)"; for (let k = 0; k < span + 100; k += 44) ctx.fillRect(cx - 50 + k, top - 10, 1.5, 38);
  // handrail
  ctx.strokeStyle = "#f2c200"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 50, top - 32); ctx.lineTo(cx + span + 50, top - 32); ctx.stroke();
  for (let k = 0; k <= span + 100; k += 36) { ctx.beginPath(); ctx.moveTo(cx - 50 + k, top - 32); ctx.lineTo(cx - 50 + k, top - 12); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.font = `800 18px ${FONTS.display}`; ctx.textBaseline = "middle";
  ctx.fillText("BOBBY GROUP · EXPORT", cx + 10, top + 9);

  // trolley + operator cab
  ctx.fillStyle = vgrad(ctx, trolleyY - 12, trolleyY + 36, [[0, "#f7f8fa"], [1, "#a7afba"]]);
  rr(ctx, mid - 76, trolleyY - 12, 152, 48, 4); ctx.fill();
  ctx.fillStyle = "#2b2f36"; for (let k = -60; k < 60; k += 24) { ctx.beginPath(); ctx.arc(mid + k + 12, trolleyY + 36, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = vgrad(ctx, trolleyY + 34, trolleyY + 80, [[0, "#e9edf2"], [1, "#9aa3af"]]);
  rr(ctx, mid + 34, trolleyY + 34, 56, 46, 4); ctx.fill();
  ctx.fillStyle = vgrad(ctx, trolleyY + 40, trolleyY + 74, [[0, "#3a5378"], [1, "#0f1726"]]);
  rr(ctx, mid + 40, trolleyY + 40, 44, 32, 3); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.moveTo(mid + 50, trolleyY + 40); ctx.lineTo(mid + 62, trolleyY + 40); ctx.lineTo(mid + 48, trolleyY + 72); ctx.lineTo(mid + 40, trolleyY + 72); ctx.fill();

  motes(ctx, t, 40, [-200, 200, W + 400, 600], "#fff6e6");
  ctx.restore();
}

/* ===================================================================
   02 HAUL : tractor-trailer drives the box to port
   =================================================================== */
const HAUL_SKY = [[0, "#5f8fd9"], [0.5, "#a9c3ea"], [0.85, "#e7e2d8"], [1, "#efe5d6"]];
const HZ2 = "#e6ded2";

const skyline = () => sprite("skyline", 0, 380, 1800, 320, (x) => {
  const col = mix(HZ2, "#66748c", 0.32);
  for (let i = 0; i < 46; i++) {
    const bw = 24 + rand(i + 90) * 50, bh = 40 + rand(i + 91) * 170 + (rand(i + 92) < 0.15 ? 110 : 0);
    const bx = i * 40;
    x.fillStyle = rand(i + 93) < 0.5 ? col : mix(HZ2, "#5a6880", 0.38);
    x.fillRect(bx, 700 - bh, bw, bh);
    if (bh > 180) x.fillRect(bx + bw / 2 - 1, 700 - bh - 26, 2, 26);
  }
  haze(x, 420, 700, HZ2, 0.4);
}, capQ(1.4));
const portLayer = () => sprite("portLayer", 0, 260, 2200, 440, (x) => {
  const col = mix(HZ2, "#4a5468", 0.48), boom = mix(HZ2, "#2b48c8", 0.5);
  [120, 650, 1180, 1720].forEach((cx, i) => sts(x, cx, 700, 0.74, col, i % 2 ? boom : col));
}, capQ(1.6));
const stackLayer = () => sprite("stackLayer", 0, 450, 2700, 240, (x) => {
  for (let i = 0; i < 20; i++) {
    const bx = i * 136, h = 2 + Math.floor(rand(i + 3) * 3);
    for (let k = 0; k < h; k++) drawContainer(x, bx, 680 - 52 * (k + 1), 132, 50, BOX_MIX[(i + k * 5) % BOX_MIX.length], { seed: (i * 2 + k) % 5 });
  }
  haze(x, 450, 690, HZ2, 0.32);
}, capQ(2));
const barrierTile = () => sprite("barrier", 0, 640, 480, 44, (x) => {
  // jersey barrier seen along its length: continuous wall with joints
  x.fillStyle = vgrad(x, 644, 682, [[0, "#e4e5e8"], [0.12, "#cfd2d6"], [0.5, "#bfc3c8"], [0.62, "#a9aeb5"], [1, "#878c94"]]);
  x.fillRect(0, 644, 480, 38);
  x.fillStyle = "rgba(255,255,255,.5)"; x.fillRect(0, 644, 480, 1.5);
  x.fillStyle = "rgba(0,0,0,.1)"; x.fillRect(0, 666, 480, 2);
  for (let i = 0; i < 4; i++) {
    const bx = i * 120;
    x.fillStyle = "rgba(40,44,50,.35)"; x.fillRect(bx, 644, 1.5, 38);
    x.fillStyle = "#e23b2e"; x.fillRect(bx + 54, 652, 12, 5);
    x.fillStyle = "rgba(70,60,50,.12)"; x.fillRect(bx + 10 + rand(i) * 60, 668, 30 + rand(i + 1) * 30, 14);
  }
});

function haul(ctx, p, t) {
  sky(ctx, HAUL_SKY, 700);
  sun(ctx, 1360, 280);
  const s = p * 3200 + t * 140;

  skyClouds(ctx, s * 0.02 + t * 6, 31, 7, -40, 300, 0.85);
  const sk = skyline(), pl = portLayer(), st = stackLayer(), bt = barrierTile();
  for (let k = -1; k < 2; k++) blit(ctx, sk, -wrap(s * 0.04, 1800) + k * 1800);
  for (let k = -1; k < 2; k++) blit(ctx, pl, -wrap(s * 0.14, 2200) + k * 2200);
  rays(ctx, 1360, 280, t, 0.03);
  for (let k = -1; k < 2; k++) blit(ctx, st, -wrap(s * 0.38, 2700) + k * 2700);

  // light poles
  for (let i = -1; i < 6; i++) {
    const x = wrap(i * 420 - s * 0.7, 2520) - 260;
    ctx.fillStyle = hgrad(ctx, x - 4, x + 4, [[0, "#6c737d"], [0.5, "#c3c8cf"], [1, "#5a616b"]]);
    ctx.fillRect(x - 3.5, 330, 7, 330);
    ctx.fillRect(x, 330, 70, 5);
    ctx.fillStyle = "#30343b"; rr(ctx, x + 56, 326, 34, 10, 3); ctx.fill();
  }
  for (let k = -1; k < 5; k++) blit(ctx, bt, -wrap(s * 0.85, 480) + k * 480);

  // road
  tileStrip(ctx, asphaltTile(), s, 680, 256, 512);
  ctx.fillStyle = vgrad(ctx, 680, 900, [[0, "rgba(220,214,200,.18)"], [0.3, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.25)"]]);
  ctx.fillRect(0, 680, W, 220);
  ctx.fillStyle = "rgba(240,240,236,.85)"; ctx.fillRect(0, 690, W, 4);
  for (let i = -1; i < 12; i++) {
    const x = wrap(i * 180 - s, 2160) - 180;
    ctx.fillStyle = `rgba(245,245,240,${0.6 + rand(i + 50) * 0.3})`;
    ctx.fillRect(x, 786, 100, 7);
  }
  ctx.fillStyle = "rgba(242,194,0,.8)"; ctx.fillRect(0, 878, W, 5);
  // sun sheen on the tarmac
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  glow(ctx, 1240, 720, 520, "#6b6252", 0.35);
  ctx.restore();

  // truck
  const tx = p < 0.35 ? lerp(-1100, 470, easeOut(seg(p, 0, 0.35)))
    : p < 0.78 ? 470 + Math.sin(t * 0.8) * 4
      : lerp(470, 1900, easeIn(seg(p, 0.78, 1)));
  const bounce = Math.sin(t * 9) * 0.9 + Math.sin(t * 3.3) * 0.6;
  drawTruck(ctx, tx, bounce, s / 30, 0.85);

  // road dust kicked up behind the wheels
  for (let i = 0; i < 18; i++) {
    const age = wrap(t * 0.9 + rand(i) , 1);
    const x = tx + 60 - age * 260 + rand(i + 4) * 30, y = 670 - age * 40 - rand(i + 8) * 10;
    glow(ctx, x, y, 14 + age * 40, "#c9bda8", 0.14 * (1 - age));
  }

  // foreground guard rail, motion-blurred
  const fs = s * 1.35;
  for (let i = -1; i < 10; i++) {
    const x = wrap(i * 200 - fs, 2000) - 200;
    ctx.fillStyle = hgrad(ctx, x - 30, x + 30, [[0, "rgba(30,32,36,0)"], [0.5, "rgba(30,32,36,.85)"], [1, "rgba(30,32,36,0)"]]);
    ctx.fillRect(x - 30, 866, 60, 40);
  }
  ctx.fillStyle = vgrad(ctx, 858, 884, [[0, "#cfd4da"], [0.35, "#f4f6f8"], [0.6, "#9aa1aa"], [1, "#5c626a"]]);
  ctx.fillRect(0, 858, W, 26);
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, 869, W, 2);
}

/* ===================================================================
   03 SAIL : container ship crosses, camera tilts to the sky
   =================================================================== */
const SEA_Y = 560;
const SAIL_SKY = [[0, "#4f7fd0"], [0.5, "#9fbbe8"], [0.86, "#f0dcc2"], [1, "#f7e4c9"]];

function sea(ctx, y0) {
  ctx.fillStyle = vgrad(ctx, y0, 1300, [[0, "#9db0c8"], [0.06, "#5d82b0"], [0.25, "#2a5a93"], [0.6, "#0f325f"], [1, "#061633"]]);
  ctx.fillRect(-100, y0, W + 200, 1300 - y0);
}
function waves(ctx, yMin, yMax, t, p) {
  // perspective swell: dark troughs and lit crests, sparse and irregular
  for (let r = 0; r < 54; r++) {
    const d = r / 53, y = SEA_Y + 2 + Math.pow(d, 1.9) * 560;
    if (y < yMin || y > yMax) continue;
    const sc = 0.12 + d * 1.5, n = Math.round(18 - d * 8);
    const sp = 8 + d * 46;
    for (let i = 0; i < n; i++) {
      const j = r * 31 + i;
      const x = wrap(i * (W / n) + rand(j) * 260 - t * sp - p * sp * 30, W + 400) - 200;
      const y2 = y + (rand(j + 2) - 0.5) * 6 * sc;
      const len = (18 + rand(j + 7) * 70) * sc;
      ctx.fillStyle = `rgba(2,14,38,${0.05 + d * 0.12})`;
      ctx.beginPath(); ctx.ellipse(x + len * 0.25, y2 + 2 + sc * 2.2, len, 0.8 + sc * 1.6, 0, 0, Math.PI * 2); ctx.fill();
      if (rand(j + 11) < 0.55) {
        ctx.fillStyle = `rgba(225,236,250,${(0.04 + d * 0.12) * (0.5 + rand(j + 13))})`;
        ctx.beginPath(); ctx.ellipse(x, y2, len * (0.35 + rand(j + 17) * 0.4), 0.5 + sc * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
function glitter(ctx, sx, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(sx, SEA_Y + 30, 0, sx, SEA_Y + 30, 380);
  g.addColorStop(0, "rgba(255,236,200,.45)"); g.addColorStop(1, "rgba(255,236,200,0)");
  ctx.fillStyle = g; ctx.fillRect(sx - 400, SEA_Y, 800, 400);
  for (let i = 0; i < 140; i++) {
    const d = rand(i), y = SEA_Y + 4 + d * d * 330, spread = 30 + d * 220;
    const x = sx + (rand(i + 1) - 0.5) * 2 * spread;
    const f = 0.5 + 0.5 * Math.sin(t * (3 + rand(i + 2) * 5) + i);
    if (f < 0.55) continue;
    ctx.fillStyle = `rgba(255,246,226,${(f - 0.55) * 1.6})`;
    ctx.fillRect(x, y, 3 + d * 14, 1 + d * 1.5);
  }
  ctx.restore();
}

function sail(ctx, p, t) {
  const k = ease(seg(p, 0.68, 1));
  sky(ctx, SAIL_SKY, SEA_Y + k * 360);
  if (k > 0) { ctx.fillStyle = `rgba(70,110,200,${k * 0.35})`; ctx.fillRect(0, 0, W, H); }
  // clouds gathering as the camera tilts up
  for (let i = 0; i < 12 && k > 0; i++) {
    const x = rand(i + 700) * W - 300, y = lerp(-420 - rand(i + 720) * 300, -60 + rand(i + 740) * 420, k);
    ctx.globalAlpha = 0.95 * k;
    ctx.drawImage(cloudSide(i % 6), x, y, 620 + rand(i) * 260, 330 + rand(i) * 130);
  }
  ctx.globalAlpha = 1;

  ctx.save(); ctx.translate(0, k * 360);
  sun(ctx, 1240, 330, "#ffe7c4");
  // far clouds on the horizon
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.6;
    ctx.drawImage(cloudSide((i + 2) % 6), wrap(i * 420 - t * 4, W + 600) - 300, 410 + rand(i + 3) * 40, 460, 200);
  }
  ctx.globalAlpha = 1;
  // far coast with tiny cranes
  ctx.fillStyle = "#a9b3c2";
  ctx.beginPath(); ctx.moveTo(-20, SEA_Y); ctx.lineTo(-20, 538); ctx.quadraticCurveTo(160, 528, 300, 544); ctx.lineTo(470, 552); ctx.lineTo(520, SEA_Y); ctx.fill();
  [60, 120, 190].forEach((cx) => sts(ctx, cx, 546, 0.1, "#9aa5b5"));

  sea(ctx, SEA_Y);
  glitter(ctx, 1240, t);
  waves(ctx, SEA_Y, 600, t, p);

  const sx = p < 0.62 ? lerp(1750, 400, easeOut(seg(p, 0, 0.62))) : lerp(400, 260, seg(p, 0.62, 1));
  const bob = Math.sin(t * 1.3) * 4, roll = Math.sin(t * 0.9) * 0.004;
  const ship = shipSprite();

  // funnel smoke
  for (let i = 0; i < 14; i++) {
    const age = wrap(t * 0.12 + i / 14, 1);
    glow(ctx, sx + 1068 + age * 380, 300 + bob - age * 110 + Math.sin(age * 6 + i) * 8, 18 + age * 70, "#8f96a3", 0.22 * (1 - age));
  }
  ctx.save(); ctx.translate(sx, bob); ctx.rotate(roll);
  blit(ctx, ship);
  ctx.restore();

  // water over the hull below the waterline
  const wl = 600 + bob * 0.4;
  ctx.save(); ctx.beginPath(); ctx.rect(-100, wl, W + 200, 600); ctx.clip();
  sea(ctx, SEA_Y);
  glitter(ctx, 1240, t);
  // reflection: flipped strips with ripple displacement
  ctx.globalAlpha = 0.17;
  const sc = ship.c.width / ship.w;
  for (let r = 0; r < 64; r++) {
    const sy = 600 - r * 4;             // source row (logical, ship space)
    const dy = wl + r * 4.6;            // destination row (stretched)
    const off = Math.sin(t * 2.2 + r * 0.55) * (1 + r * 0.12);
    ctx.drawImage(ship.c, 0, (sy - 4 - ship.y0) * sc, ship.c.width, 4 * sc, sx + ship.x0 + off, dy, ship.w, 4.8);
  }
  ctx.globalAlpha = 1;
  waves(ctx, 600, 1300, t, p);
  ctx.restore();

  // bow wave + hull foam
  // churned water along the hull: an irregular broken line, not a row of beads
  for (let i = 0; i < 70; i++) {
    const x = sx + 40 + rand(i + 300) * 1050 + Math.sin(t * 2 + i) * 5;
    const w2 = 6 + rand(i + 301) * 24, a = 0.25 + rand(i + 302) * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${a * (0.75 + 0.25 * Math.sin(t * 3 + i * 1.7))})`;
    ctx.beginPath(); ctx.ellipse(x, wl + 1 + rand(i + 303) * 3, w2, 1.2 + rand(i + 304) * 2, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(sx + 50, wl, 1040, 1.5);
  for (let i = 0; i < 8; i++) {
    const a = wrap(t * 0.8 + i / 8, 1);
    glow(ctx, sx + 30 - a * 40, wl - 4 + a * 10, 26 + a * 26, "#ffffff", 0.5 * (1 - a));
  }
  // wake
  for (let i = 0; i < 16; i++) {
    const a = 0.45 - i * 0.025;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.ellipse(sx + 1110 + i * 60, wl + 3 + i * 3.2, 60 - i * 2, 3 + i * 0.3, 0.04, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* ===================================================================
   04 FLY : top-down airliner cruising above the clouds
   =================================================================== */
function fly(ctx, p, t) {
  const travel = p * 2600 + t * 60;
  // ocean far below
  const ot = oceanTile();
  const oy = wrap(travel * 0.12, 512);
  for (let y = -512; y < H + 512; y += 512) for (let x = 0; x < W; x += 512) ctx.drawImage(ot, x, y + oy, 512, 512);
  ctx.fillStyle = "rgba(60,110,190,.35)"; ctx.fillRect(0, 0, W, H);
  glow(ctx, 380, 180, 700, "#ffeccc", 0.28);

  // low cloud deck
  for (let i = 0; i < 22; i++) {
    const x = rand(i) * (W + 400) - 400, y = wrap(rand(i + 40) * 1600 + travel * 0.45, 1600) - 500;
    const sz = 300 + rand(i + 80) * 320;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(cloudTop(i % 8), x, y, sz, sz);
  }
  ctx.globalAlpha = 1;

  const sc = lerp(0.62, 1.05, ease(p));
  const py = 470 - 60 * p, px = 900;
  const bank = Math.sin(t * 0.5) * 0.025;

  // shadow on the cloud deck
  ctx.save(); ctx.translate(px + 90, py + 120); ctx.rotate(bank); ctx.scale(sc * 0.9, sc * 0.9);
  ctx.globalAlpha = 0.28; blit(ctx, planeShadow()); ctx.restore();
  ctx.globalAlpha = 1;

  // contrails
  ctx.save(); ctx.translate(px, py); ctx.rotate(bank); ctx.scale(sc, sc);
  [-142, 142].forEach((ex, j) => {
    // tapered vapour ribbon: wide faint halo + dense core, both condensing a little behind the engine
    [[1, 0.28], [0.38, 0.55]].forEach(([wk, alpha]) => {
      const L = 1300, steps = 30, left = [], right = [];
      for (let i = 0; i <= steps; i++) {
        const d = i / steps, y = 60 + d * L;
        const wob = Math.sin(d * 7 + t * 0.5 + j * 2) * d * 22;
        const hw = (3 + Math.pow(d, 0.7) * 58) * wk;
        left.push([ex + wob - hw, y]); right.push([ex + wob + hw, y]);
      }
      const g = ctx.createLinearGradient(0, 60, 0, 60 + L);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.05, `rgba(255,255,255,${alpha})`);
      g.addColorStop(0.45, `rgba(255,255,255,${alpha * 0.55})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath(); ctx.fill();
    });
  });
  // airframe
  blit(ctx, planeSprite());
  planeLights(ctx, t);
  ctx.restore();

  // high wisps in front
  for (let i = 0; i < 8; i++) {
    const x = rand(i + 200) * (W + 600) - 400, y = wrap(rand(i + 240) * 1900 + travel * 1.35, 1900) - 600;
    const sz = 380 + rand(i + 260) * 340;
    ctx.globalAlpha = 0.45;
    ctx.drawImage(cloudTop((i + 3) % 8), x, y, sz, sz * 0.8);
  }
  ctx.globalAlpha = 1;
}

/* ---------- transitions ---------- */
function wipe(ctx, k) {
  const x = k < 0.5 ? lerp(-W - 600, 0, ease(k * 2)) : lerp(0, W + 420, ease((k - 0.5) * 2));
  ctx.fillStyle = vgrad(ctx, 0, H, [[0, "#102463"], [1, "#050b22"]]);
  ctx.beginPath(); ctx.moveTo(x - 200, 0); ctx.lineTo(x + W + 400, 0); ctx.lineTo(x + W + 200, H); ctx.lineTo(x - 400, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#1f47ff"; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(x + W + 400, 0); ctx.lineTo(x + W + 200, H); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + W + 418, 0); ctx.lineTo(x + W + 218, H); ctx.stroke();
  ctx.strokeStyle = "#1f47ff"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(x - 200, 0); ctx.lineTo(x - 400, H); ctx.stroke();
  // wordmark riding on the panel
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.font = `800 220px ${FONTS.display}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "-8px";
  ctx.fillText("BOBBY GROUP", x + W / 2, H / 2);
  ctx.restore();
}
function cloudBank(ctx, k) {
  const cy = lerp(H + 900, -900, k);
  // puffy edges first, with their flat bases buried inside the band
  for (let i = 0; i < 22; i++) {
    const x = rand(i + 500) * (W + 400) - 400, s = 520 + rand(i + 510) * 320;
    ctx.drawImage(cloudTop(i % 8), x - s / 2 + 200, cy - 420 - s * 0.42 + rand(i + 520) * 40, s, s);
    ctx.drawImage(cloudTop((i + 3) % 8), x - s / 2 + 260, cy + 420 - s * 0.58 - rand(i + 560) * 40, s, s);
  }
  // dense core with feathered edges
  ctx.fillStyle = vgrad(ctx, cy - 440, cy + 440, [[0, "rgba(247,249,253,0)"], [0.06, "rgba(247,249,253,1)"], [0.94, "rgba(247,249,253,1)"], [1, "rgba(247,249,253,0)"]]);
  ctx.fillRect(-100, cy - 440, W + 200, 880);
}

/* horizontal point of interest per scene, used to frame narrow (portrait) screens */
const FOCUS = { lift: 800, haul: 1180, sail: 1060, fly: 900 };

export const SCENES = { W, H, lift, haul, sail, fly, wipe, cloudBank, ease, FOCUS };
