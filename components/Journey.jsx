"use client";

import { useEffect, useRef } from "react";
import { JOURNEY } from "@/lib/journey/config";
import { display, body } from "@/app/fonts";

export default function Journey() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const capRefs = useRef([]);
  const railRefs = useRef([]);
  const counterRef = useRef(null);
  const barRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    let journey;
    let cancelled = false;
    (async () => {
      // the renderer touches document/canvas, so load it only in the browser
      const [{ createJourney }, { setFonts }] = await Promise.all([
        import("@/lib/journey/engine"),
        import("@/lib/journey/util"),
      ]);
      if (cancelled) return;
      setFonts({ display: display.style.fontFamily, body: body.style.fontFamily });
      journey = createJourney({
        cfg: JOURNEY,
        section: sectionRef.current,
        canvas: canvasRef.current,
        captions: capRefs.current,
        railItems: railRefs.current,
        counter: counterRef.current,
        bar: barRef.current,
      });
      engineRef.current = journey;
      window.__journey = journey;
    })();
    return () => {
      cancelled = true;
      journey?.destroy();
      engineRef.current = null;
    };
  }, []);

  const n = JOURNEY.scenes.length;

  return (
    <section
      id="journey"
      ref={sectionRef}
      className="journey"
      aria-label="How a shipment travels"
      style={{ height: `${JOURNEY.scrollLength}vh` }}
    >
      <div className="stage">
        <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />
        <div className="stage-top">
          <span className="stage-title">The journey</span>
          <span ref={counterRef} className="counter">01 / {String(n).padStart(2, "0")}</span>
        </div>
        <div className="captions">
          {JOURNEY.scenes.map((s, i) => (
            <article key={s.id} ref={(el) => (capRefs.current[i] = el)} className="caption">
              <p className="eyebrow">{s.caption.eyebrow}</p>
              <h2>{s.caption.title}</h2>
              <p>{s.caption.body}</p>
            </article>
          ))}
        </div>
        <ol className="rail">
          {JOURNEY.scenes.map((s, i) => (
            <li
              key={s.id}
              ref={(el) => (railRefs.current[i] = el)}
              role="button"
              tabIndex={0}
              aria-label={`Go to step ${i + 1}: ${s.label}`}
              onClick={() => engineRef.current?.scrollToScene(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), engineRef.current?.scrollToScene(i))}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {s.label}
              <i><b /></i>
            </li>
          ))}
        </ol>
        <div className="stage-progress"><span ref={barRef} /></div>
      </div>
    </section>
  );
}
