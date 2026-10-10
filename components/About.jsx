import Image from "next/image";

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
        <div className="about-grid">
          <div className="about-copy">
            <div className="section-head">
              <p className="eyebrow"><span className="dot" /> About us</p>
              <h2>Premium Indian spices, sourced with care.</h2>
              <p>
                Bobby Group is an Indian exporter company specializing in premium spices including
                Green Cardamom, Black Pepper, Turmeric, Cinnamon, Teja S17 Red Chilli, Clove and
                Robusta Coffee Beans. We supply importers, distributors and food manufacturers with
                consistent quality products sourced directly from trusted growers across India.
              </p>
            </div>
            <p>
              With a focus on quality and professionalism, we continuously work to create the best
              experience for every customer. Whether you are looking for top-quality products, expert
              solutions, or a trusted brand, we are here to serve you with commitment and care.
            </p>
            <p>
              We believe in building long-term relationships through honesty, consistency, and
              outstanding service. Your satisfaction is our priority, and we strive every day to
              exceed expectations. Thank you for choosing us and being part of our journey.
            </p>
            <ul className="about-points">
              {POINTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <figure className="about-portrait">
            <div className="about-portrait-frame">
              <Image
                src="/team/founder.jpg"
                alt="Prem Shiggaonkar, Founder of Bobby Group"
                width={1000}
                height={1277}
                sizes="(max-width: 900px) 70vw, 340px"
                className="about-portrait-img"
              />
            </div>
            <figcaption className="about-byline">
              <strong>Prem Shiggaonkar</strong>
              <span>Founder, Bobby Group</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
