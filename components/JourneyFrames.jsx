"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import { JOURNEY3D } from "@/lib/journey3d/config";
import { FRAME_SETS, FRAME_VERSION } from "@/lib/journeyFrames/player";

/* The journey as a pre-rendered image sequence (rendered from the 3D scene in lib/journey3d,
   see scripts/render-frames.cjs). Works on every device, no WebGL needed. */
export default function JourneyFrames() {
  // the very first frames are needed for the loading screen to finish: fetch them with the page
  ["desktop", "mobile"].forEach((k) => preload(`${FRAME_SETS[k].dir}f000.webp?v=${FRAME_VERSION}`, { as: "image" }));
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const capRefs = useRef([]);
  const railRefs = useRef([]);
  const counterRef = useRef(null);
  const barRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    let journey, cancelled = false;
    import("@/lib/journeyFrames/player").then(({ createFramePlayer }) => {
      if (cancelled) return;
      journey = createFramePlayer({
        cfg: JOURNEY3D,
        section: sectionRef.current,
        canvas: canvasRef.current,
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
        <div className="stage-top">
          <span className="stage-title">The journey</span>
          <span ref={counterRef} className="counter">01 / {String(n).padStart(2, "0")}</span>
        </div>
        <p className="stage-claim" aria-label="Inspected, packed and shipped on time.">
          <span className="cl-line" aria-hidden="true">
            {["Inspected,", "packed", "and"].map((w, i) => (
              <span className="cl-w" key={w} style={{ "--i": i }}>{w}</span>
            ))}
          </span>
          <strong className="cl-line" aria-hidden="true">
            {["shipped", "on", "time."].map((w, i) => (
              <span className="cl-w" key={w} style={{ "--i": i + 3 }}>{w}</span>
            ))}
          </strong>
        </p>
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
