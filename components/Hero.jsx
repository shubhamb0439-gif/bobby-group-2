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
          Bulk orders &amp; customisation
        </p>
        <h1>
          <span className="line"><span className="rise" style={{ "--d": "80ms" }}>From India&apos;s growers</span></span>
          <span className="line"><em className="rise" style={{ "--d": "180ms" }}>to your market.</em></span>
        </h1>
        <div className="hero-side rise" style={{ "--d": "320ms" }}>
          <p>Tell us what you need, and we&apos;ll take it from there.</p>
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
