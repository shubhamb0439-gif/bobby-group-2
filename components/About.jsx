const POINTS = [
  "Direct sourcing from trusted growers",
  "Consistent, inspected quality",
  "Custom packaging for your market",
  "Bulk quantities on demand",
];

export default function About() {
  return (
    <section id="about" className="about">
      <div className="section">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" /> About us</p>
          <h2>Premium Indian spices, sourced with care.</h2>
          <p>
            Bobby Group is an Indian exporter specialising in premium spices and Robusta coffee beans.
            We supply importers, distributors and food manufacturers with consistent quality,
            sourced directly from trusted growers across India.
          </p>
        </div>
        <div className="about-grid">
          <div className="about-copy">
            <p>
              With a focus on quality and professionalism, we work continuously to create the best
              experience for every customer. Whether you are looking for top-quality products, expert
              solutions, or a trusted brand, we are here to serve you with commitment and care.
            </p>
            <p>
              We believe in building long-term relationships through honesty, consistency and
              outstanding service. Your satisfaction is our priority, and we strive every day to
              exceed expectations.
            </p>
            <ul className="about-points">
              {POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="about-card">
            <div className="about-emoji" aria-hidden="true">🌿</div>
            <h3>From India&apos;s growers to your market.</h3>
            <p>
              Quality products, sourced directly, packed your way and shipped to importers and
              distributors in international markets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
