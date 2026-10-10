/* Scroll-driven image-sequence player for the journey.
   Frames are pre-rendered from the 3D scene (scripts/render-frames.cjs) at two aspect ratios.
   They load coarse-to-fine (every 32nd frame first, then 16th, 8th ... 1st), so the whole
   journey is scrubbable almost immediately and sharpens into full smoothness as it streams.
   Emits `journey:progress` (0..1, readiness of the first pass) and `journey:ready` on window. */

export const FRAME_SETS = {
  desktop: { dir: "/frames/desktop/", w: 1600, h: 900 },
  mobile: { dir: "/frames/mobile/", w: 720, h: 1280 },
};
export const FRAME_COUNT = 360;
export const FRAME_VERSION = 2; // bump after re-rendering so cached frames are refreshed
const READY_STRIDE = 8;         // the loading screen waits for every 8th frame (45 images)

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function createFramePlayer({ cfg, section, canvas, captions, railItems, counter, bar }) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let alive = true;

  /* ---------- choose the frame set for this screen ---------- */
  const pickSet = () => (innerHeight > innerWidth * 1.1 ? FRAME_SETS.mobile : FRAME_SETS.desktop);
  let set = pickSet();
  let frames = [];          // HTMLImageElement | undefined, index = frame number
  let loaded = new Uint8Array(FRAME_COUNT);

  /* ---------- progressive loading ---------- */
  function loadOrder() {
    const order = [], seen = new Uint8Array(FRAME_COUNT);
    for (const s of [32, 16, 8, 4, 2, 1]) for (let i = 0; i < FRAME_COUNT; i += s) if (!seen[i]) { seen[i] = 1; order.push(i); }
    if (!seen[FRAME_COUNT - 1]) order.splice(1, 0, FRAME_COUNT - 1);
    return order;
  }
  let queue = [], active = 0, readyFired = false, gen = 0;
  const firstPass = [];
  for (let i = 0; i < FRAME_COUNT; i += READY_STRIDE) firstPass.push(i);

  function reportProgress() {
    const done = firstPass.reduce((a, i) => a + loaded[i], 0) / firstPass.length;
    window.dispatchEvent(new CustomEvent("journey:progress", { detail: done }));
    if (done >= 1 && !readyFired) { readyFired = true; window.dispatchEvent(new Event("journey:ready")); }
  }
  function pump() {
    const g = gen;
    while (active < 6 && queue.length) {
      const i = queue.shift();
      if (loaded[i]) continue;
      active++;
      const img = new Image();
      img.decoding = "async";
      img.src = `${set.dir}f${String(i).padStart(3, "0")}.webp?v=${FRAME_VERSION}`;
      // decode off the main thread before the frame is ever drawn, so scrolling never stalls on it
      img.decode().then(() => {
        active--;
        if (!alive || g !== gen) return;
        frames[i] = img; loaded[i] = 1;
        reportProgress();
        dirty = true;
        pump();
      }, () => { active--; if (alive && g === gen) pump(); });
    }
  }
  function startLoading() {
    gen++; frames = []; loaded = new Uint8Array(FRAME_COUNT); active = 0;
    queue = loadOrder();
    pump();
  }
  startLoading();

  /* ---------- drawing ---------- */
  let cw = 0, ch = 0, dpr = 1, dirty = true;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    const next = pickSet();
    if (next !== set) { set = next; startLoading(); }
    dirty = true;
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  function nearest(i) {
    if (loaded[i]) return frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (i - d >= 0 && loaded[i - d]) return frames[i - d];
      if (i + d < FRAME_COUNT && loaded[i + d]) return frames[i + d];
    }
    return null;
  }
  let lastDrawn = null;
  function draw(P) {
    const img = nearest(Math.round(P * (FRAME_COUNT - 1)));
    if (!img || (img === lastDrawn && !dirty)) return;
    lastDrawn = img; dirty = false;
    // cover-fit, centred
    const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
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

  /* ---------- scroll ---------- */
  let target = 0, P = 0;
  const readScroll = () => {
    const r = section.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, section.offsetHeight - innerHeight));
  };
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll(); P = target;

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    readScroll();
    P += (target - P) * (reduce ? 1 : 0.12);
    if (Math.abs(target - P) < 1e-5) P = target;
    ui(P);
    draw(P);
  };
  raf = requestAnimationFrame(loop);

  return {
    scrollToChapter(i) {
      const c = chapters[i];
      const y = window.scrollY + section.getBoundingClientRect().top + (c.from + 0.01) * (section.offsetHeight - innerHeight);
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.8 }); else window.scrollTo({ top: y, behavior: "smooth" });
    },
    setProgress(v) { target = P = clamp(v); },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readScroll);
      ro.disconnect();
    },
  };
}
