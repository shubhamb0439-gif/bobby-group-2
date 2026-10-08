/* Scroll engine: maps scroll position to scene progress, draws scenes + transitions,
   drives captions, rail and counter. Image sequences (config.frames) replace a drawn scene. */
(function () {
  const cfg = window.JOURNEY, S = window.SCENES;
  const section = document.getElementById("journey");
  const canvas = document.getElementById("stage-canvas");
  const ctx = canvas.getContext("2d");
  const capWrap = document.getElementById("captions");
  const rail = document.getElementById("rail");
  const counter = document.getElementById("counter");
  const bar = document.getElementById("stage-bar");
  const TW = 0.035; // half-width of a transition window (in overall progress)

  section.style.height = cfg.scrollLength + "vh";

  // scene ranges
  const total = cfg.scenes.reduce((a, s) => a + s.share, 0);
  let acc = 0;
  const scenes = cfg.scenes.map((s, i) => {
    const start = acc / total; acc += s.share;
    return { ...s, i, start, end: acc / total, draw: S[s.id] || S.lift, images: null, loaded: 0 };
  });

  // captions + rail
  scenes.forEach(s => {
    const el = document.createElement("article");
    el.className = "caption";
    el.innerHTML = `<p class="eyebrow">${s.caption.eyebrow}</p><h2>${s.caption.title}</h2><p>${s.caption.body}</p>`;
    capWrap.appendChild(el); s.capEl = el;
    const li = document.createElement("li");
    li.innerHTML = `<span>${String(s.i + 1).padStart(2, "0")}</span>${s.label}<i><b></b></i>`;
    li.addEventListener("click", () => {
      const r = section.getBoundingClientRect();
      const y = window.scrollY + r.top + (s.start + 0.02) * (section.offsetHeight - innerHeight);
      window.scrollTo({ top: y, behavior: "smooth" });
    });
    rail.appendChild(li); s.railEl = li;
  });

  // optional image sequences
  scenes.forEach(s => {
    const f = s.frames; if (!f) return;
    const step = f.step || 1, list = [];
    for (let n = f.start || 0; n < (f.start || 0) + f.count; n += step)
      list.push(`${f.dir}${f.prefix || ""}${String(n).padStart(f.pad || 0, "0")}${f.ext || ".png"}`);
    s.images = list.map((src, k) => {
      const img = new Image(); img.decoding = "async";
      img.onload = () => s.loaded++;
      if (k < 8) img.src = src; else setTimeout(() => (img.src = src), 50 + k * 8);
      return img;
    });
  });

  let cw = 0, ch = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  }
  window.addEventListener("resize", resize); resize();

  function logical() {
    const sc = Math.max(cw / S.W, ch / S.H);
    const ox = (cw - S.W * sc) / 2, oy = (ch - S.H * sc) / 2;
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
  }

  function drawScene(s, p, t) {
    if (s.images && s.images.length) {
      const idx = Math.round(p * (s.images.length - 1));
      let img = s.images[idx];
      for (let d = 1; (!img.complete || !img.naturalWidth) && d < s.images.length; d++) {
        img = s.images[Math.max(0, idx - d)];
        if (img.complete && img.naturalWidth) break;
      }
      if (img.complete && img.naturalWidth) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
        const sc = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
        logical(); return;
      }
    }
    logical(); s.draw(ctx, p, t);
  }

  const local = (s, P) => Math.min(1, Math.max(0, (P - s.start) / (s.end - s.start)));

  function render(P, t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let cur = scenes.findIndex(s => P < s.end); if (cur < 0) cur = scenes.length - 1;
    let a = scenes[cur], blend = null;

    // are we in a transition window?
    for (let i = 0; i < scenes.length - 1; i++) {
      const b = scenes[i].end;
      if (scenes[i].transition && Math.abs(P - b) < TW) blend = { from: scenes[i], to: scenes[i + 1], t: (P - b + TW) / (2 * TW) };
    }

    if (!blend) drawScene(a, local(a, P), t);
    else {
      const { from, to, t: k } = blend;
      if (from.transition === "fade") {
        drawScene(from, local(from, P), t);
        ctx.save(); ctx.globalAlpha = S.ease(k); drawScene(to, local(to, P), t); ctx.restore();
      } else {
        drawScene(k < 0.5 ? from : to, k < 0.5 ? local(from, P) : local(to, P), t);
        logical();
        from.transition === "wipe" ? S.wipe(ctx, k) : S.cloudBank(ctx, k);
      }
    }

    // captions
    scenes.forEach(s => {
      const p = local(s, P);
      const inside = P >= s.start - 0.001 && P <= s.end + 0.001;
      let o = 0;
      if (inside) o = Math.min(1, (p - 0.06) / 0.12) * Math.min(1, (0.94 - p) / 0.1);
      if (s.i === 0 && p < 0.1) o = Math.max(o, 1 - p * 10 < 0 ? 0 : Math.min(1, p / 0.06));
      o = Math.max(0, Math.min(1, o));
      s.capEl.style.opacity = o.toFixed(3);
      s.capEl.style.transform = `translateY(${((1 - o) * 24).toFixed(1)}px)`;
      s.capEl.style.pointerEvents = o > 0.5 ? "auto" : "none";
      s.railEl.classList.toggle("on", P >= s.start && P < s.end + (s.i === scenes.length - 1 ? 1 : 0));
      s.railEl.querySelector("b").style.transform = `scaleX(${p.toFixed(3)})`;
    });
    counter.textContent = `${String(cur + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
    bar.style.transform = `scaleX(${P.toFixed(4)})`;
    document.body.dataset.scene = a.id;
  }

  let target = 0, P = 0;
  function readScroll() {
    const r = section.getBoundingClientRect();
    const range = section.offsetHeight - innerHeight;
    target = Math.min(1, Math.max(0, -r.top / range));
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll(); P = target;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();
  (function loop(now) {
    P += (target - P) * (reduce ? 1 : 0.12);
    if (Math.abs(target - P) < 0.00005) P = target;
    render(P, reduce ? 0 : (now - t0) / 1000);
    requestAnimationFrame(loop);
  })(t0);

  window.__journey = { setProgress: v => { target = P = v; } };
})();
