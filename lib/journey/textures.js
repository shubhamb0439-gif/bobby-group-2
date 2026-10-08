/* Procedural textures, rendered once into offscreen canvases and cached.
   Q = texture pixels per logical unit; raised on high-DPI / large screens. */
import { makeCanvas, rng, luminance, FONTS, clamp, hexRgb } from "./util";

let Q = 2;
const cache = new Map();

export function setQuality(q) {
  q = clamp(q, 1, 3);
  if (Math.abs(q - Q) > 0.35) { Q = q; cache.clear(); }
}
export const getQuality = () => Q;
export function clearTextures() { cache.clear(); }

export function cached(key, fn) {
  let v = cache.get(key);
  if (!v) { v = fn(); cache.set(key, v); }
  return v;
}

/* Offscreen sprite drawn in logical coordinates. Blit with blit(ctx, sprite). */
export function sprite(key, x0, y0, w, h, draw, q = Q) {
  return cached(`spr:${key}:${q}`, () => {
    const c = makeCanvas(w * q, h * q);
    const x = c.getContext("2d");
    x.scale(q, q); x.translate(-x0, -y0);
    draw(x);
    return { c, x0, y0, w, h };
  });
}
export function blit(ctx, s, dx = 0, dy = 0) {
  ctx.drawImage(s.c, s.x0 + dx, s.y0 + dy, s.w, s.h);
}

/* ---------- value noise ---------- */
function makeNoise(seed) {
  const R = rng(seed), N = 256, perm = new Uint8Array(N * 2), val = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; val[i] = R(); }
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < N; i++) perm[i + N] = perm[i];
  const f = (t) => t * t * (3 - 2 * t);
  return (x, y, period = 256) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = f(x - xi), yf = f(y - yi);
    const X0 = ((xi % period) + period) % period, X1 = (X0 + 1) % period;
    const Y0 = ((yi % period) + period) % period, Y1 = (Y0 + 1) % period;
    const v = (a, b) => val[perm[(perm[a & 255] + b) & 511] & 255];
    const a = v(X0, Y0), b = v(X1, Y0), c = v(X0, Y1), d = v(X1, Y1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
/* tileable fractal noise, returns Float32Array size*size in 0..1 */
function fbmField(size, cells, octaves, seed) {
  const n = makeNoise(seed), out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let amp = 0.5, sum = 0, norm = 0, c = cells;
    for (let o = 0; o < octaves; o++) {
      sum += amp * n((x / size) * c, (y / size) * c, c);
      norm += amp; amp *= 0.5; c *= 2;
    }
    out[y * size + x] = sum / norm;
  }
  return out;
}
function fieldCanvas(size, field, toRGBA) {
  const c = makeCanvas(size, size), x = c.getContext("2d");
  const img = x.createImageData(size, size), d = img.data;
  for (let i = 0; i < field.length; i++) {
    const [r, g, b, a] = toRGBA(field[i], i);
    d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a;
  }
  x.putImageData(img, 0, 0);
  return c;
}
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/* per-pixel film grain */
export const grainTile = () => cached("grain", () => {
  const s = 256, c = makeCanvas(s, s), x = c.getContext("2d");
  const img = x.createImageData(s, s), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  return c;
});

/* dark weathering blotches */
const grimeTile = () => cached("grime", () => {
  const f = fbmField(256, 6, 5, 11);
  return fieldCanvas(256, f, (v) => [38, 30, 24, Math.round(ss(0.5, 0.85, v) * 150)]);
});
/* rust patches */
const rustTile = () => cached("rust", () => {
  const f = fbmField(256, 10, 4, 23);
  return fieldCanvas(256, f, (v) => [128, 62, 30, Math.round(ss(0.66, 0.86, v) * 190)]);
});
/* soft greyscale cloud/detail noise */
export const softNoise = (seed = 3, cells = 4) => cached(`soft:${seed}:${cells}`, () => {
  const f = fbmField(256, cells, 5, seed);
  return fieldCanvas(256, f, (v) => { const g = Math.round(v * 255); return [g, g, g, 255]; });
});

/* ---------- shipping container (side elevation) ---------- */
export function containerTex(color, w, h, opts = {}) {
  w = Math.round(w); h = Math.round(h);
  const { label = false, seed = 0 } = opts;
  return cached(`ctr:${color}:${w}:${h}:${label}:${seed}:${Q}`, () => {
    const q = Q, c = makeCanvas(w * q, h * q), x = c.getContext("2d");
    const R = rng(seed * 977 + w * 13 + h * 7 + 1);
    const light = luminance(color) > 0.62;
    x.scale(q, q);

    x.fillStyle = color; x.fillRect(0, 0, w, h);
    const rail = Math.max(1.6, h * 0.075), post = Math.max(1.6, h * 0.045);

    // corrugation: each rib is a small cylinder lit from the upper left
    const n = Math.max(6, Math.round((w - post * 2) / Math.max(3, h * 0.1)));
    const pw = (w - post * 2) / n;
    const g = x.createLinearGradient(0, 0, pw, 0);
    g.addColorStop(0, "rgba(0,0,0,.26)");
    g.addColorStop(0.16, "rgba(255,255,255,.2)");
    g.addColorStop(0.4, "rgba(255,255,255,.06)");
    g.addColorStop(0.62, "rgba(0,0,0,.03)");
    g.addColorStop(0.86, "rgba(0,0,0,.2)");
    g.addColorStop(1, "rgba(0,0,0,.28)");
    x.fillStyle = g;
    for (let i = 0; i < n; i++) { x.save(); x.translate(post + i * pw, 0); x.fillRect(0, rail, pw, h - rail * 2); x.restore(); }

    // sky light from above, bounce darkening below
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, "rgba(255,255,255,.16)");
    v.addColorStop(0.45, "rgba(255,255,255,0)");
    v.addColorStop(1, "rgba(0,0,0,.3)");
    x.fillStyle = v; x.fillRect(0, 0, w, h);

    // grime + rust
    const gt = grimeTile(), rt = rustTile();
    const ox = R() * 128, oy = R() * 128, sw = Math.min(256 - ox, 40 + w * 0.5), sh = sw * (h / w);
    x.globalAlpha = light ? 0.4 : 0.6;
    x.drawImage(gt, ox, oy, sw, Math.min(256 - oy, sh), 0, 0, w, h);
    x.globalAlpha = light ? 0.4 : 0.32;
    x.drawImage(rt, R() * 128, R() * 128, sw, Math.min(128, sh), 0, 0, w, h);
    x.globalAlpha = 1;

    // rain streaks running down from the top rail
    const streaks = Math.round(w / 6);
    for (let i = 0; i < streaks; i++) {
      const sx = R() * w, len = h * (0.15 + R() * 0.6), sw2 = 0.4 + R() * 1.4;
      const sg = x.createLinearGradient(0, rail, 0, rail + len);
      sg.addColorStop(0, `rgba(40,28,18,${0.12 + R() * 0.18})`);
      sg.addColorStop(1, "rgba(40,28,18,0)");
      x.fillStyle = sg; x.fillRect(sx, rail, sw2, len);
    }

    // top & bottom rails
    x.fillStyle = "rgba(0,0,0,.28)"; x.fillRect(0, 0, w, rail); x.fillRect(0, h - rail, w, rail);
    x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(0, h - rail, w, rail);
    x.fillStyle = "rgba(255,255,255,.28)"; x.fillRect(0, 0, w, Math.max(0.6, rail * 0.18));
    x.fillStyle = "rgba(255,255,255,.14)"; x.fillRect(0, h - rail, w, Math.max(0.5, rail * 0.14));
    x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(0, rail, w, Math.max(0.5, rail * 0.18));

    // corner posts + castings
    x.fillStyle = "rgba(0,0,0,.32)"; x.fillRect(0, 0, post, h); x.fillRect(w - post, 0, post, h);
    x.fillStyle = "rgba(255,255,255,.12)"; x.fillRect(post - 0.6, 0, 0.6, h); x.fillRect(w - post, 0, 0.6, h);
    const cc = Math.max(2, h * 0.09);
    x.fillStyle = "#3b3d41";
    [[0, 0], [w - cc * 1.4, 0], [0, h - cc], [w - cc * 1.4, h - cc]].forEach(([cx, cy]) => {
      x.fillRect(cx, cy, cc * 1.4, cc);
      x.fillStyle = "#121315"; x.fillRect(cx + cc * 0.35, cy + cc * 0.3, cc * 0.7, cc * 0.42); x.fillStyle = "#3b3d41";
    });

    // stencil branding, roughened
    if (label && w > 180) {
      const t = makeCanvas(w * q, h * q), tx = t.getContext("2d");
      tx.scale(q, q);
      tx.fillStyle = light ? "#15233f" : "rgba(255,255,255,.95)";
      tx.font = `800 ${Math.round(h * 0.2)}px ${FONTS.display}`;
      tx.textBaseline = "middle";
      if ("letterSpacing" in tx) tx.letterSpacing = `${(h * 0.012).toFixed(1)}px`;
      tx.fillText("BOBBY GROUP", w * 0.065, h * 0.5);
      tx.font = `600 ${Math.max(5, Math.round(h * 0.065))}px ${FONTS.body}`;
      tx.textAlign = "right";
      tx.fillText("BBGU 204518 2", w - post * 3, h * 0.2);
      tx.fillText("45G1", w - post * 3, h * 0.2 + h * 0.085);
      tx.textAlign = "left";
      tx.font = `500 ${Math.max(4, Math.round(h * 0.05))}px ${FONTS.body}`;
      tx.fillText("MAX GR 32,500 KG", w * 0.065, h * 0.78);
      tx.fillText("TARE  3,750 KG", w * 0.065, h * 0.78 + h * 0.065);
      // wear
      tx.setTransform(1, 0, 0, 1, 0, 0);
      tx.globalCompositeOperation = "destination-out";
      tx.globalAlpha = 0.55;
      tx.drawImage(grimeTile(), 0, 0, 256, 256, 0, 0, t.width, t.height);
      x.drawImage(t, 0, 0, w, h);
    }

    // fine grain
    x.globalCompositeOperation = "overlay";
    x.globalAlpha = light ? 0.12 : 0.18;
    x.drawImage(grainTile(), 0, 0, Math.min(256, w * 1.2), Math.min(256, h * 1.2), 0, 0, w, h);
    x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;

    x.strokeStyle = "rgba(0,0,0,.5)"; x.lineWidth = 0.8; x.strokeRect(0.4, 0.4, w - 0.8, h - 0.8);
    return c;
  });
}

export function drawContainer(ctx, x, y, w, h, color, opts) {
  ctx.drawImage(containerTex(color, w, h, opts), x, y, w, h);
}

/* realistic, slightly muted shipping-line palette with brand blue up front */
export const BOX = {
  brand: "#2447e0",
  navy: "#1b2a55",
  sky: "#5e8fc4",
  white: "#d6dae0",
  grey: "#7a828d",
  red: "#8e3a2d",
  green: "#2e5b4a",
  orange: "#c0612c",
  teal: "#2c6f7a",
};
export const BOX_MIX = [BOX.brand, BOX.navy, BOX.white, BOX.sky, BOX.brand, BOX.red, BOX.grey, BOX.green, BOX.brand, BOX.orange, BOX.teal, BOX.white];

/* ---------- ground surfaces (horizontally tileable strips) ---------- */
export const asphaltTile = () => cached(`asphalt:${Q}`, () => {
  const w = 512, h = 256, q = Math.min(Q, 2), c = makeCanvas(w * q, h * q), x = c.getContext("2d");
  const img = x.createImageData(c.width, c.height), d = img.data, R = rng(5);
  for (let i = 0; i < d.length; i += 4) {
    let v = 62 + (R() - 0.5) * 26;
    const r = R();
    if (r < 0.04) v += 30 + R() * 40; else if (r < 0.09) v -= 22;
    d[i] = v; d[i + 1] = v + 1; d[i + 2] = v + 4; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.scale(q, q);
  // tar patches, tyre polish and oil stains
  for (let i = 0; i < 9; i++) {
    const cx = 60 + R() * 390, cy = 30 + R() * 200, r = 20 + R() * 60;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(10,10,12,${0.18 + R() * 0.2})`); g.addColorStop(1, "rgba(10,10,12,0)");
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  [[0.38, 0.1], [0.72, 0.12]].forEach(([yy, a]) => {
    const g = x.createLinearGradient(0, h * yy - 16, 0, h * yy + 16);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, `rgba(0,0,0,${a * 2.2})`); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, h * yy - 16, w, 32);
  });
  // hairline cracks
  x.strokeStyle = "rgba(12,12,14,.45)"; x.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) {
    let px = 30 + R() * 450, py = R() * h; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 8; k++) { px += (R() - 0.3) * 14; py += (R() - 0.5) * 10; x.lineTo(px, py); }
    x.stroke();
  }
  return c;
});

export const concreteTile = () => cached(`concrete:${Q}`, () => {
  const w = 512, h = 256, q = Math.min(Q, 2), c = makeCanvas(w * q, h * q), x = c.getContext("2d");
  const f = fbmField(256, 8, 5, 41);
  const img = x.createImageData(c.width, c.height), d = img.data, R = rng(9);
  for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
    const n = f[(py % 256) * 256 + (px % 256)];
    let v = 182 + (n - 0.5) * 20 + (R() - 0.5) * 16;
    if (R() < 0.01) v -= 30;
    const i = (py * c.width + px) * 4;
    d[i] = v; d[i + 1] = v + 2; d[i + 2] = v + 6; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.scale(q, q);
  // slab joints
  x.strokeStyle = "rgba(60,62,70,.35)"; x.lineWidth = 1.2;
  [0, 256].forEach((sx) => { x.beginPath(); x.moveTo(sx + 0.5, 0); x.lineTo(sx + 0.5, h); x.stroke(); });
  x.beginPath(); x.moveTo(0, 128); x.lineTo(w, 128); x.stroke();
  // oil stains
  for (let i = 0; i < 5; i++) {
    const cx = 40 + R() * 430, cy = 20 + R() * 210, r = 14 + R() * 40;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(40,36,30,.1)"); g.addColorStop(1, "rgba(40,36,30,0)");
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  return c;
});

/* draw a horizontally tiled strip */
export function tileStrip(ctx, tile, offset, y, h, tileW = 512, x0 = 0, x1 = 1600) {
  const start = x0 - (((offset % tileW) + tileW) % tileW);
  for (let x = start; x < x1; x += tileW) ctx.drawImage(tile, x, y, tileW + 0.5, h);
}

/* ---------- clouds ---------- */
/* blobs are painted on a scratch canvas, then composited through a blur for soft, volumetric edges */
function softBlobs(Wc, Hc, blobs, blurPx) {
  const s = makeCanvas(Wc, Hc), x = s.getContext("2d");
  blobs.forEach(([bx, by, r, a = 1]) => {
    const g = x.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(255,255,255,${a * 0.8})`); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2); x.fill();
  });
  const c = makeCanvas(Wc, Hc), y = c.getContext("2d");
  if ("filter" in y) y.filter = `blur(${blurPx}px)`;
  y.drawImage(s, 0, 0);
  y.filter = "none";
  // crisp detail on top of the soft mass
  y.globalAlpha = 0.55; y.drawImage(s, 0, 0); y.globalAlpha = 1;
  return c;
}

/* side view: flat base, cauliflower top, blue-grey underside */
export function cloudSide(i) {
  return cached(`cloudS:${i}`, () => {
    const Wc = 640, Hc = 340, R = rng(100 + i * 31), base = Hc * 0.78, blobs = [];
    for (let k = 0; k < 90; k++) {
      const u = R() * 2 - 1, env = 1 - Math.abs(u) * 0.55;
      const r = Hc * (0.06 + R() * 0.16) * env;
      const bx = Wc / 2 + u * Wc * 0.38, by = base - r * 0.6 - R() * Hc * 0.42 * env * env;
      blobs.push([bx, by, r]);
    }
    for (let k = 0; k < 10; k++) blobs.push([Wc * (0.15 + R() * 0.7), base - Hc * 0.08, Hc * 0.16, 0.9]);
    const c = softBlobs(Wc, Hc, blobs, 5), x = c.getContext("2d");
    x.globalCompositeOperation = "destination-out";
    const fb = x.createLinearGradient(0, base - 14, 0, base + 22);
    fb.addColorStop(0, "rgba(0,0,0,0)"); fb.addColorStop(1, "rgba(0,0,0,1)");
    x.fillStyle = fb; x.fillRect(0, base - 14, Wc, Hc);
    x.globalCompositeOperation = "source-atop";
    const sh = x.createLinearGradient(0, Hc * 0.1, 0, base);
    sh.addColorStop(0, "rgba(255,250,240,0)"); sh.addColorStop(0.5, "rgba(200,212,234,.3)"); sh.addColorStop(1, "rgba(120,138,180,.7)");
    x.fillStyle = sh; x.fillRect(0, 0, Wc, Hc);
    x.globalAlpha = 0.14; x.drawImage(softNoise(7, 6), 0, 0, Wc, Hc);
    x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    return c;
  });
}

/* top-down: lit from the upper left, shadowed lower right */
export function cloudTop(i) {
  return cached(`cloudT:${i}`, () => {
    const S = 420, R = rng(500 + i * 17), stretch = 0.55 + R() * 0.5, blobs = [];
    blobs.push([S / 2, S / 2, S * 0.26, 0.6]);
    for (let k = 0; k < 150; k++) {
      const a = R() * Math.PI * 2, d = Math.pow(R(), 0.7) * S * 0.32;
      const fall = 1 - d / (S * 0.32);
      blobs.push([S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d * stretch, S * (0.025 + R() * 0.07) * (0.5 + fall), 0.5 + fall * 0.5]);
    }
    const c = softBlobs(S, S, blobs, 4), x = c.getContext("2d");
    x.globalCompositeOperation = "source-atop";
    const sh = x.createLinearGradient(S * 0.25, S * 0.2, S * 0.8, S * 0.85);
    sh.addColorStop(0, "rgba(255,252,245,0)"); sh.addColorStop(0.5, "rgba(208,218,238,.28)"); sh.addColorStop(1, "rgba(112,132,176,.68)");
    x.fillStyle = sh; x.fillRect(0, 0, S, S);
    x.globalAlpha = 0.18; x.drawImage(softNoise(13, 5), 0, 0, S, S);
    x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    return c;
  });
}

/* tinted ocean texture for the top-down flight */
export const oceanTile = () => cached("ocean", () => {
  const f = fbmField(256, 5, 5, 77), f2 = fbmField(256, 24, 3, 78);
  return fieldCanvas(256, f, (v, i) => {
    const w = f2[i];
    const r = 8 + v * 22 + w * 10, g = 52 + v * 50 + w * 14, b = 110 + v * 60 + w * 16;
    return [r, g, b, 255];
  });
});

export function tint(hex, a) { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; }
