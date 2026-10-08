/* Built-in drawn scenes. Logical canvas = 1600 x 900. Each draw(ctx, p, t) gets
   p = scene progress 0..1 and t = time in seconds (for idle motion). */
(function () {
  const W = 1600, H = 900;
  const C = {
    ink: "#0b0b0d", ink2: "#23262e", blue: "#1f47ff", blueDeep: "#0a1a4a",
    blueSoft: "#a9bbff", sky: "#eef2ff", line: "#dfe3eb", grey: "#c7ccd6", paper: "#ffffff"
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t * t;
  const rand = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  }

  function container(ctx, x, y, w, h, fill, opts = {}) {
    const light = fill === C.paper || fill === "#e9edf5";
    ctx.fillStyle = fill; rr(ctx, x, y, w, h, 3); ctx.fill();
    if (light) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); }
    const n = Math.max(4, Math.round(w / 18));
    ctx.strokeStyle = light ? "rgba(11,11,13,.25)" : "rgba(255,255,255,.16)";
    ctx.lineWidth = 2;
    for (let i = 1; i < n; i++) {
      const xx = x + (w / n) * i;
      ctx.beginPath(); ctx.moveTo(xx, y + h * 0.1); ctx.lineTo(xx, y + h * 0.9); ctx.stroke();
    }
    ctx.fillStyle = light ? C.ink : "rgba(0,0,0,.28)";
    ctx.fillRect(x, y, w, Math.max(3, h * 0.06));
    ctx.fillRect(x, y + h - Math.max(3, h * 0.06), w, Math.max(3, h * 0.06));
    if (opts.label && w > 220) {
      ctx.fillStyle = light ? C.ink : "rgba(255,255,255,.92)";
      ctx.font = `700 ${Math.round(h * 0.16)}px Manrope, Inter, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText("BOBBY GROUP", x + w * 0.08, y + h * 0.5);
    }
  }

  function wheel(ctx, x, y, r, ang) {
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = C.grey; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a = ang + (i * Math.PI) / 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45); ctx.stroke();
    }
  }

  /* ---------- 01 LIFT : gantry crane rolls in, lowers, lifts a container ---------- */
  function lift(ctx, p, t) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    const z = 1 + 0.16 * ease(seg(p, 0.72, 1));
    ctx.save();
    ctx.translate(930, 470); ctx.scale(z, z); ctx.translate(-800, -470 - 40 * ease(seg(p, 0.72, 1)));

    // yard floor
    ctx.fillStyle = "#f5f7fb"; ctx.fillRect(-600, 700, W + 1000, 500);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-400, 700); ctx.lineTo(W + 400, 700); ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.setLineDash([40, 30]);
    ctx.beginPath(); ctx.moveTo(-400, 760); ctx.lineTo(W + 400, 760); ctx.stroke(); ctx.setLineDash([]);

    // background stacks
    const stackCols = [C.ink2, "#e9edf5", C.blue, C.blueSoft, C.blueDeep];
    [[1140, 4], [1330, 3], [-60, 3], [110, 2]].forEach(([sx, tiers], k) => {
      for (let i = 0; i < tiers; i++) {
        ctx.globalAlpha = 0.9;
        container(ctx, sx, 700 - 92 * (i + 1), 180, 90, stackCols[(k * 3 + i) % stackCols.length]);
      }
    });
    ctx.globalAlpha = 1;

    const a = easeOut(seg(p, 0, 0.26));
    const b = ease(seg(p, 0.26, 0.42));
    const c = ease(seg(p, 0.42, 0.74));
    const span = 660, cx = lerp(-820, 470, a), top = 150, ground = 700;
    const mid = cx + span / 2;

    // container + shadow
    const cw = 360, ch = 150, cxl = 620;
    const ctop = lerp(ground - ch, 300, c);
    ctx.fillStyle = `rgba(10,26,74,${0.18 * (1 - c * 0.7)})`;
    ctx.beginPath(); ctx.ellipse(800, 704, 200 * (1 - c * 0.45), 10, 0, 0, 7); ctx.fill();

    // spreader / cables
    const spreaderBottom = c > 0 ? ctop : lerp(330, ground - ch, b);
    const trolleyY = top + 44;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    [[-40, -170], [-14, -60], [14, 60], [40, 170]].forEach(([tx, sx]) => {
      ctx.beginPath(); ctx.moveTo(mid + tx, trolleyY + 34); ctx.lineTo(mid + sx, spreaderBottom - 22); ctx.stroke();
    });

    const swing = Math.sin(t * 1.4) * 0.012 * c;
    ctx.save();
    ctx.translate(mid, spreaderBottom); ctx.rotate(swing); ctx.translate(-mid, -spreaderBottom);
    ctx.fillStyle = C.ink; ctx.fillRect(mid - 195, spreaderBottom - 22, 390, 18);
    ctx.fillStyle = C.blue; ctx.fillRect(mid - 205, spreaderBottom - 10, 22, 12); ctx.fillRect(mid + 183, spreaderBottom - 10, 22, 12);
    container(ctx, cxl, ctop, cw, ch, C.blue, { label: true });
    ctx.restore();

    // crane legs
    [cx, cx + span].forEach((lx, i) => {
      ctx.fillStyle = C.ink;
      ctx.fillRect(lx - 14, top, 28, ground - top - 30);
      ctx.fillStyle = C.ink2;
      ctx.fillRect(lx - 30, ground - 52, 60, 22);
      ctx.strokeStyle = "rgba(11,11,13,.5)"; ctx.lineWidth = 3;
      for (let y = top + 60; y < ground - 80; y += 90) {
        ctx.beginPath(); ctx.moveTo(lx - 14, y); ctx.lineTo(lx + (i ? -70 : 70), y + 60); ctx.stroke();
      }
      const ang = (cx / 30) % (Math.PI * 2);
      wheel(ctx, lx - 16, ground - 20, 20, ang); wheel(ctx, lx + 16, ground - 20, 20, ang);
    });
    // girder
    ctx.fillStyle = C.blue; ctx.fillRect(cx - 50, top - 10, span + 100, 38);
    ctx.fillStyle = C.ink; ctx.fillRect(cx - 50, top + 28, span + 100, 6);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "800 18px Manrope, Inter, sans-serif"; ctx.textBaseline = "middle";
    ctx.fillText("BOBBY GROUP · EXPORT", cx + 10, top + 9);
    // trolley + cab
    ctx.fillStyle = C.ink; rr(ctx, mid - 70, trolleyY - 10, 140, 44, 4); ctx.fill();
    ctx.fillStyle = C.sky; ctx.fillRect(mid + 22, trolleyY - 2, 36, 20);

    ctx.restore();
  }

  /* ---------- 02 HAUL : truck carries the container to port ---------- */
  function haul(ctx, p, t) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    const s = p * 3200;

    // distant port cranes (parallax)
    ctx.fillStyle = "#e6eaf2";
    for (let i = -1; i < 7; i++) {
      const x = ((i * 380 - s * 0.15) % 2660 + 2660) % 2660 - 300;
      ctx.fillRect(x, 300, 16, 380); ctx.fillRect(x + 120, 300, 16, 380);
      ctx.fillRect(x - 60, 300, 330, 22); ctx.fillRect(x + 200, 250, 16, 70);
    }
    // stacked boxes mid layer
    for (let i = -1; i < 9; i++) {
      const x = ((i * 300 - s * 0.4) % 2700 + 2700) % 2700 - 300;
      const h = 2 + Math.floor(rand(i + 3) * 3);
      for (let k = 0; k < h; k++) {
        ctx.globalAlpha = 0.55;
        container(ctx, x, 680 - 52 * (k + 1), 120, 50, [C.blueSoft, "#e9edf5", C.grey][(i + k) % 3]);
      }
    }
    ctx.globalAlpha = 1;

    // road
    ctx.fillStyle = C.ink; ctx.fillRect(0, 680, W, 220);
    ctx.fillStyle = C.blue; ctx.fillRect(0, 676, W, 6);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (let i = -1; i < 12; i++) {
      const x = ((i * 180 - s) % 2160 + 2160) % 2160 - 180;
      ctx.fillRect(x, 786, 100, 8);
    }

    // truck position
    const tx = p < 0.35 ? lerp(-1100, 470, easeOut(seg(p, 0, 0.35)))
             : p < 0.78 ? 470 + Math.sin(t * 0.8) * 4
             : lerp(470, 1900, easeIn(seg(p, 0.78, 1)));
    const bounce = Math.sin(t * 9) * 1.2;
    const ang = s / 34;

    // trailer + container
    ctx.save(); ctx.translate(0, bounce);
    ctx.fillStyle = C.ink2; ctx.fillRect(tx, 604, 740, 16);
    container(ctx, tx + 10, 450, 720, 152, C.blue, { label: true });
    // cab
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(tx + 760, 610); ctx.lineTo(tx + 760, 440); ctx.lineTo(tx + 880, 440);
    ctx.quadraticCurveTo(tx + 935, 445, tx + 945, 520); ctx.lineTo(tx + 955, 610); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.sky;
    ctx.beginPath(); ctx.moveTo(tx + 860, 460); ctx.lineTo(tx + 878, 460); ctx.quadraticCurveTo(tx + 920, 466, tx + 928, 530); ctx.lineTo(tx + 860, 530); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.blue; ctx.fillRect(tx + 770, 560, 180, 8);
    ctx.fillStyle = C.ink2; ctx.fillRect(tx + 742, 400, 10, 150);
    ctx.restore();
    [tx + 90, tx + 180, tx + 560, tx + 650, tx + 800, tx + 905].forEach(x => wheel(ctx, x, 644 + bounce * 0.3, 34, ang));

    // speed lines
    ctx.strokeStyle = "rgba(11,11,13,.12)"; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = 420 + i * 34, x = ((i * 260 - s * 1.6) % 1900 + 1900) % 1900 - 200;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 140, y); ctx.stroke();
    }
  }

  /* ---------- 03 SAIL : container ship crosses, camera tilts to the sky ---------- */
  function sail(ctx, p, t) {
    const k = ease(seg(p, 0.68, 1));
    const g = ctx.createLinearGradient(0, -600, 0, 560);
    g.addColorStop(0, k > 0 ? `rgb(${Math.round(lerp(201, 120, k))},${Math.round(lerp(214, 150, k))},255)` : "#c9d6ff"); g.addColorStop(1, "#ffffff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // clouds gathering as the camera tilts up
    for (let i = 0; i < 12 && k > 0; i++) {
      const x = rand(i + 700) * W, y = lerp(-260 - rand(i + 720) * 300, 120 + rand(i + 740) * 380, k);
      puff(ctx, x, y, 60 + rand(i + 760) * 70, 0.9 * k);
    }
    ctx.save(); ctx.translate(0, k * 360);

    const sea = ctx.createLinearGradient(0, 560, 0, 900);
    sea.addColorStop(0, C.blue); sea.addColorStop(1, C.blueDeep);
    ctx.fillStyle = "#c9cfdb"; ctx.fillRect(0, 548, 420, 12); // far coast
    ctx.fillStyle = sea; ctx.fillRect(0, 560, W, 900);

    for (let r = 0; r < 12; r++) {
      const y = 580 + r * 26, sp = 30 + r * 22, len = 30 + r * 6;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + r * 0.012})`;
      for (let i = 0; i < 14; i++) {
        const x = ((i * 140 + rand(r * 9 + i) * 120 - t * sp - p * sp * 40) % 1960 + 1960) % 1960 - 180;
        ctx.fillRect(x, y, len, 3);
      }
    }

    const sx = p < 0.62 ? lerp(1750, 400, easeOut(seg(p, 0, 0.62))) : lerp(400, 260, seg(p, 0.62, 1));
    const bob = Math.sin(t * 1.3) * 4;
    ctx.save(); ctx.translate(sx, bob); ctx.rotate(Math.sin(t * 0.9) * 0.004);

    // containers on deck
    const cols = [C.blue, C.ink2, "#e9edf5", C.blueSoft, C.blueDeep, C.blue];
    for (let b = 0; b < 14; b++) {
      const tiers = 3 + Math.floor(rand(b + 1) * 3);
      for (let r = 0; r < tiers; r++) {
        container(ctx, 70 + b * 60, 500 - (r + 1) * 30, 58, 29, cols[Math.floor(rand(b * 7 + r) * cols.length)]);
      }
    }
    // superstructure
    ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    rr(ctx, 935, 360, 110, 140, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink;
    for (let r = 0; r < 4; r++) ctx.fillRect(945, 378 + r * 28, 90, 9);
    ctx.fillStyle = C.blue; ctx.fillRect(990, 320, 26, 44);
    // hull
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(-30, 500); ctx.lineTo(1100, 500); ctx.lineTo(1080, 620); ctx.lineTo(70, 620);
    ctx.quadraticCurveTo(10, 600, -30, 500); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.paper; ctx.font = "800 26px Manrope, Inter, sans-serif"; ctx.textBaseline = "middle";
    ctx.fillText("BOBBY GROUP", 120, 540);
    ctx.restore();

    // foam & water over the hull line
    ctx.fillStyle = sea; ctx.fillRect(0, 592 + bob, W, 400);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    for (let i = 0; i < 18; i++) {
      const x = sx - 40 + i * 64 + Math.sin(t * 3 + i) * 6;
      ctx.beginPath(); ctx.ellipse(x, 594 + bob, 26, 5, 0, 0, 7); ctx.fill();
    }
    // wake
    ctx.fillStyle = "rgba(255,255,255,.35)";
    for (let i = 0; i < 10; i++) {
      ctx.beginPath(); ctx.ellipse(sx + 1120 + i * 60, 600 + bob + i * 3, 50 - i * 3, 4, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- clouds helper ---------- */
  function puff(ctx, x, y, s, a) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    [[0, 0, 1], [-0.9, 0.2, 0.7], [0.9, 0.25, 0.75], [-0.4, -0.45, 0.65], [0.45, -0.4, 0.6], [0, 0.45, 0.8]]
      .forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); });
  }

  /* ---------- 04 FLY : top-down plane above the clouds ---------- */
  function plane(ctx, s, shadow) {
    ctx.save(); ctx.scale(s, s);
    const body = shadow || C.paper;
    ctx.fillStyle = body; ctx.strokeStyle = shadow ? "transparent" : "rgba(11,11,13,.18)"; ctx.lineWidth = 2;
    // wings
    ctx.beginPath();
    ctx.moveTo(-26, -40); ctx.lineTo(-400, 110); ctx.lineTo(-400, 140); ctx.lineTo(-26, 60);
    ctx.lineTo(26, 60); ctx.lineTo(400, 140); ctx.lineTo(400, 110); ctx.lineTo(26, -40); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // tailplane
    ctx.beginPath();
    ctx.moveTo(-18, 230); ctx.lineTo(-150, 300); ctx.lineTo(-150, 318); ctx.lineTo(-18, 290);
    ctx.lineTo(18, 290); ctx.lineTo(150, 318); ctx.lineTo(150, 300); ctx.lineTo(18, 230); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (shadow) { rr(ctx, -30, -290, 60, 620, 30); ctx.fill(); ctx.restore(); return; }
    // engines
    ctx.fillStyle = C.ink2;
    [-150, -270, 150, 270].forEach(x => { rr(ctx, x - 13, x < 0 ? 10 + (-x - 150) * 0.38 : 10 + (x - 150) * 0.38, 26, 70, 10); ctx.fill(); });
    // fuselage
    ctx.fillStyle = C.paper;
    rr(ctx, -30, -290, 60, 620, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.blue; ctx.fillRect(-4, 200, 8, 120);
    ctx.fillStyle = C.ink; rr(ctx, -16, -262, 32, 18, 8); ctx.fill();
    ctx.fillStyle = C.blue; ctx.fillRect(-398, 112, 14, 26); ctx.fillRect(384, 112, 14, 26);
    ctx.restore();
  }

  function fly(ctx, p, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1f47ff"); g.addColorStop(1, "#6d88ff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const travel = p * 2600 + t * 40;
    // low cloud layer
    for (let i = 0; i < 26; i++) {
      const x = rand(i) * W, y = ((rand(i + 40) * 1500 + travel * 0.5) % 1500) - 300;
      puff(ctx, x, y, 50 + rand(i + 80) * 60, 0.85);
    }
    const sc = lerp(0.62, 1.05, ease(p));
    const py = 470 - 60 * p;
    // shadow
    ctx.save(); ctx.translate(960, py + 80); ctx.globalAlpha = 0.22;
    plane(ctx, sc * 0.92, C.blueDeep);
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(900, py); ctx.rotate(Math.sin(t * 0.5) * 0.025);
    plane(ctx, sc);
    ctx.restore();
    // high cloud layer (in front)
    for (let i = 0; i < 10; i++) {
      const x = rand(i + 200) * W, y = ((rand(i + 240) * 1700 + travel * 1.3) % 1700) - 400;
      puff(ctx, x, y, 90 + rand(i + 260) * 80, 0.55);
    }
  }

  /* ---------- transitions ---------- */
  function wipe(ctx, t) {
    const x = t < 0.5 ? lerp(-W, 0, ease(t * 2)) : lerp(0, W, ease((t - 0.5) * 2));
    ctx.fillStyle = C.blue; ctx.fillRect(x, 0, W, H);
    ctx.fillStyle = C.ink; ctx.fillRect(x + W - 14, 0, 14, H); ctx.fillRect(x, 0, 14, H);
  }
  function cloudBank(ctx, t) {
    const cy = lerp(H + 900, -900, t);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, cy - 420, W, 840);
    for (let i = 0; i < 34; i++) {
      const x = rand(i + 500) * (W + 200) - 100;
      puff(ctx, x, cy - 440 - rand(i + 520) * 90, 110 + rand(i + 540) * 70, 1);
      puff(ctx, x, cy + 440 + rand(i + 560) * 90, 110 + rand(i + 580) * 70, 1);
    }
  }

  window.SCENES = { W, H, lift, haul, sail, fly, wipe, cloudBank, ease };
})();
