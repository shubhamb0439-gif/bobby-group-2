const STATS = [
  { dt: "7", dd: "Registrations & certifications" },
  { dt: "IEC", dd: "DGFT importer-exporter code" },
  { dt: "BLR", dd: "Based in Bengaluru, India" },
  { dt: "Global", dd: "Export shipments worldwide" },
];

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" aria-hidden="true">
        <span className="g1" />
        <span className="g2" />
      </div>
      <div className="hero-grid">
        <p className="tag rise" style={{ "--d": "0ms" }}>
          <span className="dot" />
          Premium Indian spices &amp; coffee
        </p>
        <h1>
          <span className="line"><span className="rise" style={{ "--d": "80ms" }}>Excellent-quality Indian spices,</span></span>
          <span className="line"><em className="rise" style={{ "--d": "180ms" }}>delivered across the world.</em></span>
        </h1>
        <div className="hero-side rise" style={{ "--d": "320ms" }}>
          <p>Handpicked, quality-inspected spices sourced from India&apos;s finest growers — shipped to importers and distributors worldwide.</p>
          <div className="hero-actions">
            <a className="btn btn-ink" href="#contact">Get a quote</a>
            <a className="btn btn-line" href="#journey">See how we ship <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </div>
      <dl className="hero-stats rise" style={{ "--d": "440ms" }}>
        {STATS.map((s) => (
          <div key={s.dt}>
            <dt>{s.dt}</dt>
            <dd>{s.dd}</dd>
          </div>
        ))}
      </dl>
      <div className="scroll-cue" aria-hidden="true"><span /></div>
    </section>
  );
}
