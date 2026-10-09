"use client";

import { useEffect, useRef } from "react";
import { JOURNEY3D } from "@/lib/journey3d/config";

export default function Journey3D() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const loaderRef = useRef(null);
  const capRefs = useRef([]);
  const railRefs = useRef([]);
  const counterRef = useRef(null);
  const barRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    let journey, cancelled = false;
    // three.js and the models only ever load in the browser
    import("@/lib/journey3d/engine").then(({ createJourney3D }) => {
      if (cancelled) return;
      journey = createJourney3D({
        cfg: JOURNEY3D,
        section: sectionRef.current,
        canvas: canvasRef.current,
        loader: loaderRef.current,
        captions: capRefs.current,
        railItems: railRefs.current,
        counter: counterRef.current,
        bar: barRef.current,
      });
      engineRef.current = journey;
      window.__journey = journey;
    });
    return () => { cancelled = true; journey?.destroy(); engineRef.current = null; };
  }, []);

  const n = JOURNEY3D.chapters.length;

  return (
    <section
      id="journey"
      ref={sectionRef}
      className="journey"
      aria-label="How a shipment travels"
      style={{ height: `${JOURNEY3D.scrollLength}vh` }}
    >
      <div className="stage">
        <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />
        <div ref={loaderRef} className="stage-loader" aria-hidden="true">
          <span className="stage-loader-bar"><i /></span>
          <span className="stage-loader-label">Loading the journey</span>
        </div>
        <div className="stage-top">
          <span className="stage-title">The journey</span>
          <span ref={counterRef} className="counter">01 / {String(n).padStart(2, "0")}</span>
        </div>
        <div className="captions">
          {JOURNEY3D.chapters.map((c, i) => (
            <article key={c.id} ref={(el) => (capRefs.current[i] = el)} className="caption">
              <p className="eyebrow">{c.caption.eyebrow}</p>
              <h2>{c.caption.title}</h2>
              <p>{c.caption.body}</p>
            </article>
          ))}
        </div>
        <ol className="rail">
          {JOURNEY3D.chapters.map((c, i) => (
            <li
              key={c.id}
              ref={(el) => (railRefs.current[i] = el)}
              role="button"
              tabIndex={0}
              aria-label={`Go to step ${i + 1}: ${c.label}`}
              onClick={() => engineRef.current?.scrollToChapter(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), engineRef.current?.scrollToChapter(i))}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {c.label}
              <i><b /></i>
            </li>
          ))}
        </ol>
        <div className="stage-progress"><span ref={barRef} /></div>
      </div>
    </section>
  );
}
