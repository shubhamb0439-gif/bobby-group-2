/* Rendered scenes. Logical canvas = 1600 x 900. Each draw(ctx, p, t) gets
   p = scene progress 0..1 and t = time in seconds (for idle motion). */
import {
  W, H, clamp, lerp, seg, ease, easeOut, easeIn, rand, wrap, rr, vgrad, hgrad, mix, rgba, glow, shadowEllipse, FONTS, metal,
} from "./util";
import {
  drawContainer, BOX, BOX_MIX, asphaltTile, concreteTile, tileStrip, cloudSide, cloudTop, oceanTile, sprite, blit, getQuality, waveTile,
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

/* crawler undercarriage: shoe belt that travels with the machine, sprocket, rollers, side frame */
function crawlerTrack(ctx, cx, ground, roll = 0) {
  const x0 = cx - 150, w = 300, h = 50, top = ground - h, r = h / 2, straight = w - 2 * r;
  ctx.fillStyle = "#121417"; rr(ctx, x0, top, w, h, r); ctx.fill();
  const pitch = 17, per = 2 * straight + 2 * Math.PI * r;
  for (let d = wrap(-roll, pitch); d < per; d += pitch) {
    let x, y, ang;
    if (d < straight) { x = x0 + r + d; y = top; ang = 0; }
    else if (d < straight + Math.PI * r) { const a = (d - straight) / r - Math.PI / 2; x = x0 + w - r + Math.cos(a) * r; y = top + r + Math.sin(a) * r; ang = a + Math.PI / 2; }
    else if (d < 2 * straight + Math.PI * r) { x = x0 + w - r - (d - straight - Math.PI * r); y = ground; ang = Math.PI; }
    else { const a = (d - 2 * straight - Math.PI * r) / r + Math.PI / 2; x = x0 + r + Math.cos(a) * r; y = top + r + Math.sin(a) * r; ang = a + Math.PI / 2; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = "#3d4148"; ctx.fillRect(-pitch / 2 + 1, -1, pitch - 2, 8);
    ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(-pitch / 2 + 1, -1, pitch - 2, 1.4);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(-1, 2, 2, 5);
    ctx.restore();
  }
  // sprocket (drive, right) and idler (left)
  [[x0 + w - r, true], [x0 + r, false]].forEach(([wx, teeth]) => {
    ctx.fillStyle = "#2a2d33"; ctx.beginPath(); ctx.arc(wx, top + r, r - 7, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(wx, top + r); ctx.rotate(roll / r);
    ctx.fillStyle = "#4a4f57";
    if (teeth) for (let k = 0; k < 10; k++) { ctx.rotate(Math.PI / 5); ctx.fillRect(-3, -(r - 6), 6, 7); }
    ctx.beginPath(); ctx.arc(0, 0, r - 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1b1d21";
    for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.arc(0, -(r - 18), 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  });
  // side frame with bottom rollers
  const fx = x0 + 44, fw = w - 88;
  ctx.fillStyle = metal(ctx, top + 10, ground - 10, "#e6ab0e", { gloss: 0.8, horizon: 0.5 });
  rr(ctx, fx, top + 10, fw, h - 20, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(fx + 4, top + 10, fw - 8, 1.5);
  ctx.fillStyle = "#2b2e33";
  for (let k = fx + 18; k < fx + fw - 6; k += 34) { ctx.beginPath(); ctx.arc(k, ground - 14, 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "rgba(0,0,0,.35)";
  for (let k = fx + 30; k < fx + fw - 20; k += 52) { rr(ctx, k, top + 16, 26, 12, 6); ctx.fill(); }
  // mud
  ctx.fillStyle = vgrad(ctx, top + 20, ground, [[0, "rgba(96,80,58,0)"], [1, "rgba(96,80,58,.45)"]]);
  rr(ctx, x0, top + 20, w, h - 20, r * 0.6); ctx.fill();
  // car body + slewing ring
  ctx.fillStyle = metal(ctx, top - 22, top + 2, "#8d949e", { gloss: 0.8 });
  rr(ctx, x0 + 46, top - 22, w - 92, 24, 4); ctx.fill();
  ctx.fillStyle = "#24272c"; ctx.fillRect(x0 + 70, top - 28, w - 140, 7);
  ctx.fillStyle = "rgba(255,255,255,.25)"; for (let k = x0 + 74; k < x0 + w - 74; k += 9) ctx.fillRect(k, top - 27, 3, 2);
}

/* round steel member: dark rim, body, specular line - reads as a tube rather than a flat stroke */
function tube(ctx, ax, ay, bx, by, wdt, col = ["#4f3b00", "#d9a20c", "#fff4cc"]) {
  ctx.lineCap = "round";
  ctx.strokeStyle = col[0]; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = col[1]; ctx.lineWidth = wdt * 0.66; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const len = Math.hypot(bx - ax, by - ay) || 1, ox = (-(by - ay) / len) * wdt * 0.18, oy = ((bx - ax) / len) * wdt * 0.18;
  ctx.strokeStyle = col[2]; ctx.lineWidth = Math.max(0.8, wdt * 0.18);
  ctx.beginPath(); ctx.moveTo(ax - ox, ay - oy); ctx.lineTo(bx - ox, by - oy); ctx.stroke();
}

/* tapered lattice boom from (x0,y0) foot to (x1,y1) tip */
function latticeBoom(ctx, x0, y0, x1, y1, hw0, hw1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const P = (u, s) => [lerp(x0, x1, u) + nx * s * lerp(hw0, hw1, u), lerp(y0, y1, u) + ny * s * lerp(hw0, hw1, u)];
  const segs = Math.max(8, Math.floor(len / 34));
  const lace = ["#4a3700", "#c8950b", "#ffeeb8"];
  // far-side lacing first, darker and offset: gives the boom depth
  ctx.save(); ctx.translate(4, -3); ctx.globalAlpha = 0.55;
  for (let i = 0; i < segs; i++) {
    const u = i / segs, u2 = (i + 1) / segs, d1 = P(u, i % 2 ? -1 : 1), d2 = P(u2, i % 2 ? 1 : -1);
    tube(ctx, d1[0], d1[1], d2[0], d2[1], 3, ["#3a2c00", "#8a6a00", "#b38f20"]);
  }
  ctx.restore();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, tP = P(u, 1), bP = P(u, -1);
    tube(ctx, tP[0], tP[1], bP[0], bP[1], 3.2, lace);
    if (i < segs) {
      const u2 = (i + 1) / segs, d1 = P(u, i % 2 ? 1 : -1), d2 = P(u2, i % 2 ? -1 : 1);
      tube(ctx, d1[0], d1[1], d2[0], d2[1], 3.4, lace);
    }
  }
  const aT = P(0, 1), aB = P(0, -1), bT = P(1, 1), bB = P(1, -1);
  tube(ctx, aB[0], aB[1], bB[0], bB[1], 8);
  tube(ctx, aT[0], aT[1], bT[0], bT[1], 8);
  // solid foot and head sections
  [[0, 0.07], [0.94, 1]].forEach(([u0, u1]) => {
    const a = P(u0, 1.08), b = P(u1, 1.08), c = P(u1, -1.08), d = P(u0, -1.08);
    ctx.fillStyle = "#d9a600";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(70,50,0,.6)"; ctx.lineWidth = 1; ctx.stroke();
  });
}

const CRANE_YELLOW = "#e6ab0e";
function bolts(ctx, x0, x1, y, step = 9) {
  for (let px = x0; px <= x1; px += step) {
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.arc(px + 0.4, y + 0.4, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(px - 0.3, y - 0.3, 0.7, 0, Math.PI * 2); ctx.fill();
  }
}
/* embossed panel seam: shadow line + highlight line */
function seam(ctx, x0, y0, x1, y1) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,.38)"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + (y0 === y1 ? 1 : 0)); ctx.lineTo(x1 + 1, y1 + (y0 === y1 ? 1 : 0)); ctx.stroke();
}

/* upper works: machinery house, counterweight, operator cab */
function slewHouse(ctx, base, houseTop) {
  const x = base - 72, w = 252, h = 114;
  // counterweight slabs (rear)
  const cx = base - 122, cwt = 64;
  for (let k = 0; k < 3; k++) {
    const y = houseTop + 2 + k * 39;
    ctx.fillStyle = metal(ctx, y, y + 37, "#454a52", { gloss: 0.7, horizon: 0.6 });
    rr(ctx, cx, y, cwt, 37, 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(cx, y + 36, cwt, 1.5);
    bolts(ctx, cx + 22, cx + 58, y + 6, 12);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(cx, houseTop + 2, 11, 115); ctx.clip();
  for (let k = -2; k < 12; k++) {
    ctx.fillStyle = k % 2 ? "#161616" : "#e8b40c";
    ctx.beginPath(); ctx.moveTo(cx, houseTop + k * 14); ctx.lineTo(cx + 11, houseTop + k * 14 - 10);
    ctx.lineTo(cx + 11, houseTop + k * 14 + 4); ctx.lineTo(cx, houseTop + k * 14 + 14); ctx.fill();
  }
  ctx.restore();

  // machinery house body
  ctx.fillStyle = metal(ctx, houseTop, houseTop + h, CRANE_YELLOW, { gloss: 0.85, horizon: 0.5 });
  rr(ctx, x, houseTop, w, h, 3); ctx.fill();
  ctx.save(); rr(ctx, x, houseTop, w, h, 3); ctx.clip();
  // form shading: sun from the right
  ctx.fillStyle = hgrad(ctx, x, x + w, [[0, "rgba(40,24,0,.22)"], [0.35, "rgba(40,24,0,0)"], [0.85, "rgba(255,248,220,.08)"], [1, "rgba(40,24,0,.1)"]]);
  ctx.fillRect(x, houseTop, w, h);
  [x + 74, x + 152].forEach((px) => seam(ctx, px, houseTop + 2, px, houseTop + h));
  seam(ctx, x, houseTop + 30, x + w, houseTop + 30);
  // recessed louvre grille
  ctx.fillStyle = "#3a2a00"; rr(ctx, x + 84, houseTop + 38, 58, 40, 2); ctx.fill();
  for (let k = 0; k < 9; k++) {
    const ly = houseTop + 40 + k * 4.2;
    ctx.fillStyle = metal(ctx, ly, ly + 3, CRANE_YELLOW, { gloss: 0.6 }); ctx.fillRect(x + 86, ly, 54, 2.6);
  }
  // access door with hinges and handle
  ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 1; rr(ctx, x + 160, houseTop + 36, 34, 54, 2); ctx.stroke();
  ctx.fillStyle = "#2a2d33"; ctx.fillRect(x + 161, houseTop + 42, 3, 8); ctx.fillRect(x + 161, houseTop + 76, 3, 8);
  ctx.fillStyle = hgrad(ctx, x + 184, x + 190, [[0, "#6a6f77"], [0.5, "#eef1f4"], [1, "#50555c"]]); ctx.fillRect(x + 185, houseTop + 58, 4, 12);
  // warning decal
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(x + 220, houseTop + 40); ctx.lineTo(x + 230, houseTop + 56); ctx.lineTo(x + 210, houseTop + 56); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f2c200"; ctx.beginPath(); ctx.moveTo(x + 220, houseTop + 43); ctx.lineTo(x + 227.5, houseTop + 54.5); ctx.lineTo(x + 212.5, houseTop + 54.5); ctx.closePath(); ctx.fill();
  // fleet stripe and dirt line
  ctx.fillStyle = "#0a1a4a"; ctx.fillRect(x, houseTop + h - 24, w, 6);
  ctx.fillStyle = "#1f47ff"; ctx.fillRect(x, houseTop + h - 18, w, 2);
  ctx.fillStyle = vgrad(ctx, houseTop + h - 22, houseTop + h, [[0, "rgba(70,52,30,0)"], [1, "rgba(70,52,30,.45)"]]); ctx.fillRect(x, houseTop + h - 22, w, 22);
  ctx.restore();
  // crisp top edge + bolt line
  ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(x + 2, houseTop, w - 4, 1.2);
  bolts(ctx, x + 8, x + w - 8, houseTop + 5, 10);
  ctx.fillStyle = "#0a1a4a"; ctx.font = `800 15px ${FONTS.display}`; ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "1.5px";
  ctx.fillText("BOBBY GROUP", x + 10, houseTop + 16);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  // roof handrail + exhaust
  ctx.strokeStyle = "#2a2d33"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(x + 6, houseTop - 16); ctx.lineTo(x + w - 70, houseTop - 16); ctx.stroke();
  ctx.strokeStyle = CRANE_YELLOW; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x + 6, houseTop - 16.5); ctx.lineTo(x + w - 70, houseTop - 16.5); ctx.stroke();
  for (let px = x + 6; px <= x + w - 70; px += 30) { ctx.beginPath(); ctx.moveTo(px, houseTop - 16); ctx.lineTo(px, houseTop); ctx.stroke(); }
  ctx.fillStyle = hgrad(ctx, x + 44, x + 54, [[0, "#5d6168"], [0.35, "#f2f4f7"], [0.6, "#a9aeb5"], [1, "#43474d"]]);
  ctx.fillRect(x + 44, houseTop - 34, 10, 36);
  ctx.fillStyle = vgrad(ctx, houseTop - 36, houseTop - 22, [[0, "#3b2a1a"], [1, "rgba(120,90,60,0)"]]); ctx.fillRect(x + 44, houseTop - 34, 10, 14);
  ctx.fillStyle = "#1e2024"; ctx.fillRect(x + 42, houseTop - 36, 14, 3);

  // operator cab
  const kx = base + 120, ky = houseTop - 8;
  ctx.fillStyle = metal(ctx, ky, ky + 76, CRANE_YELLOW, { gloss: 0.9, horizon: 0.62 });
  rr(ctx, kx, ky, 64, 76, 3); ctx.fill();
  ctx.fillStyle = "#16181b"; rr(ctx, kx + 5, ky + 5, 54, 48, 2); ctx.fill();
  [[kx + 8, 22], [kx + 33, 23]].forEach(([gx, gw]) => {
    ctx.save(); rr(ctx, gx, ky + 8, gw, 42, 1.5); ctx.clip();
    ctx.fillStyle = vgrad(ctx, ky + 8, ky + 50, [[0, "#9fb9d6"], [0.5, "#4d6b8c"], [0.52, "#24364c"], [1, "#16202d"]]);
    ctx.fillRect(gx, ky + 8, gw, 42);
    // operator seat + controls behind the tint
    ctx.fillStyle = "rgba(8,10,14,.55)"; rr(ctx, kx + 22, ky + 26, 16, 24, 3); ctx.fill(); ctx.fillRect(kx + 40, ky + 34, 3, 12);
    ctx.fillStyle = "rgba(255,255,255,.22)";
    ctx.beginPath(); ctx.moveTo(gx + 4, ky + 8); ctx.lineTo(gx + 11, ky + 8); ctx.lineTo(gx + 1, ky + 50); ctx.lineTo(gx - 6, ky + 50); ctx.fill();
    ctx.restore();
  });
  ctx.strokeStyle = "#0c0d0f"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(kx + 52, ky + 47); ctx.lineTo(kx + 40, ky + 22); ctx.stroke();
  ctx.fillStyle = "#1e2024"; ctx.fillRect(kx + 1, ky - 3, 62, 4);
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(kx + 2, ky, 60, 1);
  glow(ctx, kx + 32, ky - 7, 8, "#ffae1a", 0.9);
  ctx.fillStyle = "#e58a00"; rr(ctx, kx + 29, ky - 10, 6, 6, 2); ctx.fill();
}

/* two-fall hook block with a forged hook underneath */
function hookBlock(ctx, x, y) {
  ctx.fillStyle = metal(ctx, y - 14, y + 18, CRANE_YELLOW, { gloss: 0.9, horizon: 0.55 });
  rr(ctx, x - 20, y - 14, 40, 32, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(x - 19, y - 14, 38, 1);
  ctx.fillStyle = "#121315"; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7c8189"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
  bolts(ctx, x - 14, x + 14, y - 9, 28); bolts(ctx, x - 14, x + 14, y + 12, 28);
  ctx.fillStyle = "#0a1a4a"; ctx.fillRect(x - 20, y + 14, 40, 4);
  // swivel + forged hook (drawn as a shaded tube)
  ctx.fillStyle = vgrad(ctx, y + 18, y + 26, [[0, "#8a9098"], [1, "#2d3035"]]); ctx.fillRect(x - 4, y + 18, 8, 8);
  const hook = () => { ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x, y + 28); ctx.arc(x + 7, y + 32, 8, Math.PI * 1.15, Math.PI * 0.15, true); };
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1a1c20"; ctx.lineWidth = 7.5; hook(); ctx.stroke();
  ctx.strokeStyle = "#5a6068"; ctx.lineWidth = 5; hook(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.2; hook(); ctx.stroke();
  ctx.strokeStyle = "#e6ab0e"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 1, y + 29); ctx.lineTo(x + 13, y + 34); ctx.stroke();
}

/* everything above the tracks is static relative to the machine: paint it once */
const craneUpper = (base, houseTop, pivot, tip, aFrame) => sprite("craneUpper", base - 150, 160, 820, 560, (ctx) => {
  slewHouse(ctx, base, houseTop);

  // A-frame gantry (box-section struts) + backstay
  const steel = ["#2f3338", "#8b939f", "#dfe3e8"];
  tube(ctx, base - 28, houseTop, aFrame[0], aFrame[1], 9, steel);
  tube(ctx, base + 112, houseTop, aFrame[0], aFrame[1], 9, steel);
  ctx.fillStyle = "#2b2f36"; ctx.beginPath(); ctx.arc(aFrame[0], aFrame[1], 7, 0, Math.PI * 2); ctx.fill();
  // pendant lines to the boom head (a pair, with a slight sag)
  ctx.strokeStyle = "#1f2226"; ctx.lineWidth = 2;
  [0, 4].forEach((o) => {
    ctx.beginPath(); ctx.moveTo(aFrame[0], aFrame[1] + o);
    ctx.quadraticCurveTo((aFrame[0] + tip[0]) / 2, (aFrame[1] + tip[1]) / 2 + 10 + o, tip[0] - 24, tip[1] + 14 + o);
    ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(aFrame[0], aFrame[1]); ctx.lineTo(base - 112, houseTop + 6); ctx.stroke();

  // lattice boom
  latticeBoom(ctx, pivot[0], pivot[1], tip[0], tip[1], 26, 15);
  ctx.fillStyle = "#2b2f36"; ctx.beginPath(); ctx.arc(pivot[0], pivot[1], 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8b939f"; ctx.beginPath(); ctx.arc(pivot[0], pivot[1], 5, 0, Math.PI * 2); ctx.fill();
  // boom-head sheaves
  ctx.fillStyle = "#1c1d20"; ctx.beginPath(); ctx.arc(tip[0], tip[1], 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a5f66"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tip[0], tip[1], 9, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#c9ced6"; ctx.beginPath(); ctx.arc(tip[0], tip[1], 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e23b2e"; ctx.beginPath(); ctx.arc(tip[0] + 8, tip[1] - 14, 3, 0, Math.PI * 2); ctx.fill();
});

function lift(ctx, p, t) {
  sky(ctx, LIFT_SKY, 700);
  const zk = ease(seg(p, 0.86, 1)), z = 1 + 0.05 * zk;
  ctx.save();
  ctx.translate(930, 470); ctx.scale(z, z); ctx.translate(-800, -470 - 12 * zk);

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

  const a = easeOut(seg(p, 0, 0.26)), b = ease(seg(p, 0.26, 0.44));
  const cUp = ease(seg(p, 0.44, 0.66)), cSet = ease(seg(p, 0.78, 0.99)), c = cUp;
  const ground = 700, ch = 150, cw = 360;
  const contCX = 900, cxl = contCX - cw / 2;            // container centre / left edge
  const ctop = lerp(lerp(ground - ch, 372, cUp), 470, cSet); // lift clear, then settle down to load

  // machine geometry (roll-in offset applied to the crane only)
  const rollX = lerp(-1260, 0, a);
  const base = 430;                                     // crawler centre (final position)
  const houseTop = 548;
  const pivot = [base + 150, 582];                      // boom foot hinge
  const tip = [contCX, 198];                            // boom tip, above the container
  const aFrame = [base + 24, 452];                      // gantry apex
  const tx = tip[0] + rollX, ty = tip[1];               // boom tip in screen space

  // boom shadow thrown across the yard (sun upper right -> falls left, towards the viewer)
  ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = "#0a1020";
  ctx.beginPath();
  ctx.moveTo(pivot[0] + rollX - 10, 706); ctx.lineTo(pivot[0] + rollX - 420, 812);
  ctx.lineTo(pivot[0] + rollX - 396, 822); ctx.lineTo(pivot[0] + rollX + 22, 712); ctx.closePath(); ctx.fill();
  ctx.restore();
  // ground shadows
  shadowEllipse(ctx, base + rollX + 110, 707, 300, 20, 0.32);
  shadowEllipse(ctx, contCX - 100, 708, 240 * (1 - c * 0.4), 16, 0.5 * (1 - c * 0.55));

  // ---------- the crane (translated during roll-in) ----------
  ctx.save();
  ctx.translate(rollX, 0);
  crawlerTrack(ctx, base, ground, rollX);
  blit(ctx, craneUpper(base, houseTop, pivot, tip, aFrame));
  ctx.restore();

  // ---------- hoist ropes + hook + spreader + container (screen space) ----------
  const hookY = c > 0 ? ctop - 92 : lerp(ty + 120, ground - ch - 92, b);
  [-6, 6].forEach((o) => {
    ctx.strokeStyle = "#2b2f36"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(tx + o, ty + 4); ctx.lineTo(tx + o, hookY - 8); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(tx + o - 0.7, ty + 4); ctx.lineTo(tx + o - 0.7, hookY - 8); ctx.stroke();
  });

  // airborne load swings gently about the boom tip
  const swing = Math.sin(t * 1.3) * 0.016 * c;
  ctx.save();
  ctx.translate(tx, ty); ctx.rotate(swing); ctx.translate(-tx, -ty);

  hookBlock(ctx, tx, hookY);

  const attached = b > 0.25 || c > 0;
  if (attached) {
    const spY = ctop - 26;                              // spreader bar sits just above the box
    ctx.strokeStyle = "#2b2f36"; ctx.lineWidth = 2.4;
    [-190, 190].forEach((o) => { ctx.beginPath(); ctx.moveTo(tx + 9, hookY + 36); ctx.lineTo(contCX + o, spY + 8); ctx.stroke(); });
    ctx.fillStyle = metal(ctx, spY, spY + 22, "#e6ab0e", { gloss: 0.9, horizon: 0.55 });
    rr(ctx, contCX - 198, spY, 396, 22, 1.5); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(contCX - 197, spY, 394, 1);
    ctx.fillStyle = "rgba(0,0,0,.25)"; for (let k = -180; k < 190; k += 40) ctx.fillRect(contCX + k, spY + 2, 2, 18);
    ctx.fillStyle = "#1c1d20"; [-206, 186].forEach((o) => { rr(ctx, contCX + o, spY + 10, 20, 14, 2); ctx.fill(); });
  }
  drawContainer(ctx, cxl, ctop, cw, ch, BOX.brand, { label: true, seed: 1 });
  ctx.restore();

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
  const tx = p < 0.3 ? lerp(-1100, 470, easeOut(seg(p, 0, 0.3)))
    : p < 0.9 ? 470 + Math.sin(t * 0.8) * 4
      : lerp(470, 980, easeIn(seg(p, 0.9, 1)));
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
/* Sea surface as a textured plane in perspective ("mode 7"): each screen row samples the
   wave texture at the depth that row sees, so swells shrink and compress towards the horizon.
   Two layers drift in different directions so the surface churns instead of sliding. */
const wavePatterns = new WeakMap();
function wavePattern(ctx, seed) {
  let m = wavePatterns.get(ctx);
  if (!m) { m = {}; wavePatterns.set(ctx, m); }
  return m[seed] || (m[seed] = ctx.createPattern(waveTile(seed), "repeat"));
}
const LAYERS = [
  { seed: 91, k: 0.0105, aniso: 3.2, vx: 9, vz: 26, a: 0.95 },
  { seed: 93, k: 0.0062, aniso: 2.4, vx: -14, vz: 17, a: 0.55 },
];
function waves(ctx, yMin, yMax, t, p) {
  const y0 = Math.max(yMin, SEA_Y + 1), y1 = Math.min(yMax, 1300);
  LAYERS.forEach((L) => {
    const pat = wavePattern(ctx, L.seed);
    if (!pat || !pat.setTransform) return;
    for (let y = y0; y < y1;) {
      const dy = y - SEA_Y, rowH = Math.min(8, Math.max(2, dy * 0.032));
      const s = dy * L.k;                                // texels -> logical px at this depth
      const K = (520 * L.aniso) / L.k;                    // true ground-plane foreshortening
      const depth = K / dy;                               // texel row this screen row looks at
      const v = depth - t * L.vz * 6 - p * 3000;
      const u = t * L.vx + p * 300;
      const sy = (dy * dy) / K;
      pat.setTransform(new DOMMatrix([s, 0, 0, sy, W / 2 - u * s, y - v * sy]));
      ctx.globalAlpha = L.a * Math.min(1, 0.25 + dy / 160);
      ctx.fillStyle = pat;
      ctx.fillRect(-100, y, W + 200, rowH + 0.6);
      y += rowH;
    }
  });
  ctx.globalAlpha = 1;
  // distance haze hides the finest, aliasing ripples at the horizon
  ctx.fillStyle = vgrad(ctx, SEA_Y, SEA_Y + 90, [[0, "rgba(176,192,214,.85)"], [1, "rgba(176,192,214,0)"]]);
  ctx.fillRect(-100, Math.max(yMin, SEA_Y), W + 200, Math.max(0, Math.min(yMax, SEA_Y + 90) - Math.max(yMin, SEA_Y)));
}
function glitter(ctx, sx, t) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(sx, SEA_Y + 30, 0, sx, SEA_Y + 30, 380);
  g.addColorStop(0, "rgba(255,236,200,.45)"); g.addColorStop(1, "rgba(255,236,200,0)");
  ctx.fillStyle = g; ctx.fillRect(sx - 400, SEA_Y, 800, 400);
  for (let i = 0; i < 140; i++) {
    const d = rand(i), y = SEA_Y + 4 + d * d * 330, spread = 20 + d * 140;
    const x = sx + (rand(i + 1) - 0.5) * 2 * spread;
    const f = 0.5 + 0.5 * Math.sin(t * (3 + rand(i + 2) * 5) + i);
    if (f < 0.55) continue;
    ctx.fillStyle = `rgba(255,246,226,${(f - 0.55) * 1.6})`;
    ctx.beginPath(); ctx.ellipse(x, y, 1 + d * 4, 0.5 + d * 0.8, 0, 0, Math.PI * 2); ctx.fill();
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
  const sc = ship.c.width / ship.w;
  for (let r = 0; r < 70; r++) {
    const sy = 600 - r * 3.4;           // source row (logical, ship space), walking up the hull
    const dy = wl + r * 4;              // destination row, slightly stretched
    const off = Math.sin(t * 2.1 + r * 0.42) * (0.6 + r * 0.07) + Math.sin(t * 3.7 + r * 1.3) * r * 0.025;
    ctx.globalAlpha = 0.3 * Math.pow(1 - r / 70, 1.4);
    ctx.drawImage(ship.c, 0, (sy - 3.4 - ship.y0) * sc, ship.c.width, 3.4 * sc, sx + ship.x0 + off, dy, ship.w, 4.3);
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
  // propeller wash: churned, broken-up foam spreading behind the stern
  for (let i = 0; i < 60; i++) {
    const d = rand(i + 900), jitter = Math.sin(t * 1.7 + i * 2.1) * 6;
    const x = sx + 1085 + d * 620 + jitter, y = wl + 4 + d * 26 + (rand(i + 901) - 0.5) * (6 + d * 22);
    ctx.fillStyle = `rgba(255,255,255,${(0.55 - d * 0.45) * (0.5 + rand(i + 902) * 0.5)})`;
    ctx.beginPath(); ctx.ellipse(x, y, 8 + rand(i + 903) * (16 + d * 30), 1.2 + d * 2.6, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Kelvin wake arms fanning out
  ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.lineWidth = 2;
  [1, -0.35].forEach((dir) => {
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const d = k / 24, x = sx + 1080 + d * 700, y = wl + 3 + dir * d * 70 + Math.sin(d * 18 - t * 2) * 1.5;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  });
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


/* sea sweeps up and floods the frame, then settles to the ship's waterline */
function waterRise(ctx, k) {
  const crest = k < 0.5 ? lerp(H + 180, -150, k / 0.5) : lerp(-150, SEA_Y, (k - 0.5) / 0.5);
  const n = 16, pts = [];
  ctx.beginPath();
  ctx.moveTo(-140, H + 240);
  ctx.lineTo(-140, crest + 24);
  for (let i = 0; i <= n; i++) {
    const x = -140 + (W + 280) * (i / n);
    const y = crest + Math.sin(i * 0.9 + k * 7) * 20 + Math.sin(i * 2.3 + k * 4.2) * 9;
    pts.push([x, y]);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 140, H + 240);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, crest - 30, H, [[0, "#3a6ea5"], [0.18, "#1f5285"], [0.5, "#123f6b"], [1, "#061a38"]]);
  ctx.fill();
  // body of the swell carries the same wave texture as the open sea
  const pat = wavePattern(ctx, 91);
  if (pat && pat.setTransform) {
    pat.setTransform(new DOMMatrix([2.4, 0, 0, 1.1, -k * 220, crest * 0.6]));
    ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = pat; ctx.fill(); ctx.restore();
  }
  // foam crest
  ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineJoin = "round";
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 2) : ctx.moveTo(x, y - 2))); ctx.stroke();
  // spray along the crest
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    ctx.fillStyle = "rgba(255,255,255,.5)";
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(x + (rand(i * 3 + j) - 0.5) * 70, y - rand(i + j) * 18, 2 + rand(i + j * 2) * 5, 0, Math.PI * 2); ctx.fill(); }
  }
}

/* horizontal point of interest per scene, used to frame narrow (portrait) screens */
const FOCUS = { lift: 800, haul: 1180, sail: 1060, fly: 900 };

export const SCENES = { W, H, lift, haul, sail, fly, wipe, cloudBank, waterRise, ease, FOCUS };
