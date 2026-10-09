import Image from "next/image";

const SPICES = [
  { name: "Turmeric", tag: "Curcumin-rich", img: "/spices/turmeric.jpg", desc: "Bright, earthy and golden." },
  { name: "Green Cardamom", tag: "Aromatic", img: "/spices/cardamom.jpg", desc: "Sweet, fragrant pods." },
  { name: "Teja S17 Red Chilli", tag: "High pungency", img: "/spices/chilli.jpg", desc: "Fiery, deep-red heat." },
  { name: "Cinnamon", tag: "Sweet & warm", img: "/spices/cinnamon.jpg", desc: "Warm, woody quills." },
  { name: "Cloves", tag: "Intense aroma", img: "/spices/cloves-v2.jpg", desc: "Bold, pungent buds." },
  { name: "Black Pepper", tag: "King of spices", img: "/spices/pepper.jpg", desc: "Sharp, bold and clean." },
  { name: "Star Anise", tag: "Liquorice notes", img: "/spices/staranise.jpg", desc: "Star-shaped and sweet." },
  { name: "Cumin Seeds", tag: "Warm & nutty", img: "/spices/cumin.jpg", desc: "Earthy, warming seeds." },
  { name: "Robusta Coffee Beans", tag: "Full-bodied", img: "/spices/coffee.jpg", desc: "Strong, rich and bold." },
];

export default function Spices() {
  return (
    <section id="spices" className="spices">
      <div className="section">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" /> What we export</p>
          <h2>Experience the magic of spices.</h2>
          <p>
            A rich collection of handpicked spices sourced for freshness, aroma and authentic flavour —
            from everyday kitchen essentials to exotic blends.
          </p>
        </div>
        <div className="spice-grid">
          {SPICES.map((s) => (
            <article key={s.name} className="spice-card">
              <div className="spice-thumb">
                <Image
                  src={s.img}
                  alt={s.name}
                  fill
                  sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 300px"
                  className="spice-img"
                />
                <span className="spice-tag">{s.tag}</span>
              </div>
              <div className="spice-body">
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
