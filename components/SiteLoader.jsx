"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/* Opening loading screen: holds until the journey's first pass of frames is in (so the scroll
   story is smooth from the first wheel turn), then fades away. Never blocks for long: a
   timeout releases it on slow connections, and the rest keeps streaming in the background. */
const MAX_WAIT = 9000;

export default function SiteLoader() {
  const [p, setP] = useState(0);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("is-loading");
    const lenisStop = setInterval(() => window.__lenis?.stop(), 100);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setP(1);
      setDone(true);
      clearInterval(lenisStop);
      html.classList.remove("is-loading");
      window.__lenis?.start();
      setTimeout(() => setGone(true), 900);
    };
    const onProgress = (e) => setP((v) => Math.max(v, e.detail));
    window.addEventListener("journey:progress", onProgress);
    window.addEventListener("journey:ready", finish);
    const t = setTimeout(finish, MAX_WAIT);
    return () => {
      window.removeEventListener("journey:progress", onProgress);
      window.removeEventListener("journey:ready", finish);
      clearTimeout(t); clearInterval(lenisStop);
      html.classList.remove("is-loading");
    };
  }, []);

  if (gone) return null;
  return (
    <div className={`site-loader${done ? " is-done" : ""}`} role="status" aria-live="polite">
      <div className="site-loader-inner">
        <Image src="/logo.png" alt="Bobby Group" width={680} height={264} priority className="site-loader-logo" />
        <div className="site-loader-bar" aria-hidden="true"><i style={{ transform: `scaleX(${p})` }} /></div>
        <p className="site-loader-label">
          <span>Preparing the journey</span>
          <span className="site-loader-pct">{Math.round(p * 100)}%</span>
        </p>
      </div>
    </div>
  );
}
