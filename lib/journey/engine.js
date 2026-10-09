/* Scroll engine: maps scroll position to scene progress, draws scenes + transitions,
   drives captions, rail and counter. Image sequences (config.frames) replace a rendered scene. */
import { SCENES as S } from "./scenes";
import { setQuality, clearTextures, grainTile } from "./textures";
import { makeCanvas, PERF, detectLowPower } from "./util";

const TW = 0.05; // half-width of a transition window (in overall progress)

export function createJourney({ cfg, section, canvas, captions, railItems, counter, bar }) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  PERF.low = detectLowPower();

  const total = cfg.scenes.reduce((a, s) => a + s.share, 0);
  let acc = 0;
  const scenes = cfg.scenes.map((s, i) => {
    const start = acc / total; acc += s.share;
    return { ...s, i, start, end: acc / total, draw: S[s.id] || S.lift, images: null, capEl: captions[i], railEl: railItems[i], railBar: railItems[i]?.querySelector("b") };
  });

  // optional image sequences
  const timers = [];
  scenes.forEach((s) => {
    const f = s.frames; if (!f) return;
    const step = f.step || 1, list = [];
    for (let n = f.start || 0; n < (f.start || 0) + f.count; n += step)
      list.push(`${f.dir}${f.prefix || ""}${String(n).padStart(f.pad || 0, "0")}${f.ext || ".png"}`);
    s.images = list.map((src, k) => {
      const img = new Image(); img.decoding = "async";
      if (k < 8) img.src = src; else timers.push(setTimeout(() => (img.src = src), 50 + k * 8));
      return img;
    });
  });

  let cw = 0, ch = 0, dpr = 1, vignette = null, grain = null;
  // Resolution ceiling. Starts at the device tier's cap and is lowered at runtime if the
  // device can't hold frame rate (see the governor in the render loop).
  const maxCap = PERF.low ? 1.5 : 2;
  let dprCap = maxCap;
  function resize() {
    const nd = Math.min(window.devicePixelRatio || 1, dprCap);
    const nw = canvas.clientWidth, nh = canvas.clientHeight;
    // mobile browsers fire resize whenever the toolbar slides; skip when nothing changed
    if (vignette && nw === cw && nh === ch && nd === dpr) return;
    dpr = nd; cw = nw; ch = nh;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    const cover = Math.max(cw / S.W, ch / S.H);
    // texture quality follows the ceiling, not the live resolution, so the governor
    // dropping resolution never forces every texture to be rebuilt mid-scroll
    setQuality(Math.min(cover * Math.min(window.devicePixelRatio || 1, maxCap) * 1.1, PERF.low ? 1.4 : 3));
    // vignette, rendered small and stretched (it is all soft gradients)
    vignette = makeCanvas(320, Math.max(1, Math.round((320 * ch) / Math.max(1, cw))));
    const v = vignette.getContext("2d"), vw = vignette.width, vh = vignette.height;
    const g = v.createRadialGradient(vw / 2, vh * 0.46, Math.min(vw, vh) * 0.25, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.62);
    g.addColorStop(0, "rgba(4,8,22,0)"); g.addColorStop(1, "rgba(4,8,22,.42)");
    v.fillStyle = g; v.fillRect(0, 0, vw, vh);
    grain = ctx.createPattern(grainTile(), "repeat");
  }
  resize();
  window.addEventListener("resize", resize);

  // cover-fit the 1600x900 stage; on narrow screens slide towards the scene's subject
  let focus = S.W / 2;
  function logical() {
    const sc = Math.max(cw / S.W, ch / S.H);
    const minX = cw - S.W * sc;
    const ox = Math.min(0, Math.max(minX, cw / 2 - focus * sc)), oy = (ch - S.H * sc) / 2;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
  }

  function drawScene(s, p, t) {
    // frame wide screens dead-centre, portrait screens on the subject
    const portrait = Math.min(1, Math.max(0, (S.W / S.H - cw / Math.max(1, ch)) / (S.W / S.H - 0.6)));
    focus = S.W / 2 + ((S.FOCUS[s.id] ?? S.W / 2) - S.W / 2) * portrait;
    if (s.images && s.images.length) {
      const idx = Math.round(p * (s.images.length - 1));
      let img = s.images[idx];
      for (let d = 1; (!img.complete || !img.naturalWidth) && d < s.images.length; d++) {
        img = s.images[Math.max(0, idx - d)];
        if (img.complete && img.naturalWidth) break;
      }
      if (img.complete && img.naturalWidth) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sc = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
        logical(); return;
      }
    }
    logical(); ctx.save(); s.draw(ctx, p, t); ctx.restore();
  }

  function post(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vignette, 0, 0, canvas.width, canvas.height);
    if (grain && !PERF.low) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.03;
      const ox = Math.floor(Math.random() * 256), oy = Math.floor(Math.random() * 256);
      ctx.translate(-ox, -oy);
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, canvas.width + ox, canvas.height + oy);
      ctx.restore();
    }
  }

  const local = (s, P) => Math.min(1, Math.max(0, (P - s.start) / (s.end - s.start)));
  let lastCounter = "", lastScene = "";

  function render(P, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    let cur = scenes.findIndex((s) => P < s.end); if (cur < 0) cur = scenes.length - 1;
    const a = scenes[cur];
    let blend = null;
    for (let i = 0; i < scenes.length - 1; i++) {
      const b = scenes[i].end;
      if (scenes[i].transition && Math.abs(P - b) < TW) blend = { from: scenes[i], to: scenes[i + 1], k: (P - b + TW) / (2 * TW) };
    }

    if (!blend) drawScene(a, local(a, P), t);
    else {
      const { from, to, k } = blend;
      if (from.transition === "fade") {
        drawScene(from, local(from, P), t);
        ctx.save(); ctx.globalAlpha = S.ease(k); drawScene(to, local(to, P), t); ctx.restore();
      } else {
        drawScene(k < 0.5 ? from : to, k < 0.5 ? local(from, P) : local(to, P), t);
        logical();
        if (from.transition === "wipe") S.wipe(ctx, k);
        else if (from.transition === "water") S.waterRise(ctx, k);
        else S.cloudBank(ctx, k);
      }
    }
    post(t);

    scenes.forEach((s) => {
      const p = local(s, P);
      const inside = P >= s.start - 0.001 && P <= s.end + 0.001;
      let o = 0;
      if (inside) o = Math.min(1, (p - 0.06) / 0.12) * Math.min(1, (0.94 - p) / 0.1);
      if (s.i === 0 && p < 0.1) o = Math.max(o, Math.min(1, p / 0.06));
      o = Math.max(0, Math.min(1, o));
      if (s.capEl) {
        s.capEl.style.opacity = o.toFixed(3);
        s.capEl.style.transform = `translate3d(0,${((1 - o) * 28).toFixed(1)}px,0)`;
        s.capEl.style.pointerEvents = o > 0.5 ? "auto" : "none";
      }
      if (s.railEl) {
        s.railEl.classList.toggle("on", P >= s.start && P < s.end + (s.i === scenes.length - 1 ? 1 : 0));
        if (s.railBar) s.railBar.style.transform = `scaleX(${p.toFixed(3)})`;
      }
    });
    const c = `${String(cur + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
    if (c !== lastCounter) { counter.textContent = c; lastCounter = c; }
    if (bar) bar.style.transform = `scaleX(${P.toFixed(4)})`;
    if (a.id !== lastScene) { section.dataset.scene = a.id; lastScene = a.id; }
  }

  let target = 0, P = 0;
  function readScroll() {
    const r = section.getBoundingClientRect();
    const range = section.offsetHeight - innerHeight;
    target = Math.min(1, Math.max(0, -r.top / Math.max(1, range)));
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll(); P = target;

  // only animate while the stage is on screen
  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: "100px" });
  io.observe(section);

  // Build every scene's textures ahead of time, one step per idle slot, so nothing is
  // generated mid-scroll. Wait for web fonts first: stencils and liveries contain text,
  // and rebuilding them after the fonts land would throw the whole warm-up away.
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));
  const cancelIdle = window.cancelIdleCallback || clearTimeout;
  const warm = [];
  let alive = true, warmDone = false;
  const steps = [];
  // one pass per scene in scroll order builds all of its sprites; transitions slot in
  // right after the scene they leave, so the next thing a visitor reaches is always ready first
  scenes.forEach((s) => {
    // the phone/tablet sea is a loop of baked frames: one frame per idle slot, never a burst
    if (s.id === "sail" && PERF.low) for (let i = 0; i < S.SEA_FRAMES; i++) steps.push(() => S.warmSea(i));
    steps.push(() => { logical(); ctx.save(); s.draw(ctx, 0.5, 0); ctx.restore(); });
    if (s.transition && s.transition !== "fade") steps.push(() => {
      logical(); ctx.save();
      if (s.transition === "water") S.waterRise(ctx, 0.3); else if (s.transition === "wipe") S.wipe(ctx, 0.5); else S.cloudBank(ctx, 0.5);
      ctx.restore();
    });
  });
  const runWarm = (i) => {
    if (!alive) return;
    if (i >= steps.length) { warmDone = true; render(P, 0); return; }
    warm.push(idle(() => { if (!alive) return; steps[i](); runWarm(i + 1); }, { timeout: 800 }));
  };
  const fontsReady = document.fonts?.ready || Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
    if (!alive) return;
    clearTextures();
    runWarm(0);
  });

  const t0 = performance.now();
  let raf = 0;
  // Frame-rate governor: if frames run slow for a sustained stretch, step the canvas
  // resolution down (to a floor of 1x); step back up after a long run of fast frames.
  // Catches GPU-bound devices that no up-front detection can predict.
  let ema = 16.7, lastNow = 0, slowFor = 0, fastFor = 0;
  function govern(now) {
    const dt = lastNow ? now - lastNow : 16.7;
    lastNow = now;
    // judge only real journey frames: not while warming up, not on the hero, not after a stall
    if (!visible || !warmDone || P <= 0.001 || P >= 0.999 || dt > 250) { slowFor = fastFor = 0; return; }
    ema += (dt - ema) * 0.08;
    if (ema > 23) { slowFor += dt; fastFor = 0; }
    else if (ema < 17.5) { fastFor += dt; slowFor = 0; }
    else { slowFor = 0; fastFor = 0; }
    if (slowFor > 800 && dprCap > 1) {
      dprCap = Math.max(1, +(dprCap - 0.25).toFixed(2)); slowFor = 0; ema = 16.7; resize();
    } else if (fastFor > 6000 && dprCap < maxCap) {
      dprCap = Math.min(maxCap, +(dprCap + 0.25).toFixed(2)); fastFor = 0; resize();
    }
  }
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    govern(now);
    readScroll();
    P += (target - P) * (reduce ? 1 : 0.14);
    if (Math.abs(target - P) < 0.00005) P = target;
    if (visible) render(P, reduce ? 0 : (now - t0) / 1000);
  };
  raf = requestAnimationFrame(loop);

  return {
    scrollToScene(i) {
      const s = scenes[i];
      const r = section.getBoundingClientRect();
      const y = window.scrollY + r.top + (s.start + 0.02) * (section.offsetHeight - innerHeight);
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.6 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    },
    setProgress(v) { target = P = v; },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", readScroll);
      io.disconnect();
      timers.forEach(clearTimeout);
      warm.forEach((id) => cancelIdle(id));
    },
  };
}
