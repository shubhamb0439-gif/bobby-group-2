import Image from "next/image";

const CERTS = [
  { abbr: "IEC", title: "Importer-Exporter Code", body: "Certificate issued by DGFT for import & export operations.", logo: "/certs/dgft.png" },
  { abbr: "FSSAI", title: "Food Safety & Standards", body: "Food Safety and Standards Authority of India registration.", logo: "/certs/fssai.jpg" },
  { abbr: "Spices", title: "Spices Board Certification", body: "Registered exporter with the Spices Board of India.", logo: "/certs/spicesboard.jpg" },
  { abbr: "APEDA", title: "APEDA Membership", body: "Agricultural & Processed Food Products Export Authority.", logo: "/certs/apeda.png" },
  { abbr: "MCA", title: "Ministry of Corporate Affairs", body: "Registered with the Register of Companies.", logo: "/certs/mca.png" },
  { abbr: "GST", title: "Goods & Services Tax", body: "GST registered for compliant domestic & export trade.", logo: "/certs/gst.jpg" },
  { abbr: "Coffee", title: "Coffee Board", body: "Registration with the Coffee Board of India.", logo: "/certs/coffeeboard.png" },
];

const WHY = [
  "Direct sourcing",
  "Competitive pricing",
  "Custom packaging",
  "Bulk quantities",
  "Global shipping",
  "Quality inspection",
  "Timely delivery",
];

export default function Certifications() {
  return (
    <section id="certifications" className="certs">
      <div className="section">
        <div className="section-head">
          <p className="eyebrow"><span className="dot" /> Licenses &amp; certifications</p>
          <h2>Compliance you can trust.</h2>
          <p>
            Quality and compliance form the foundation of our operations. Our certifications and
            registrations demonstrate our commitment to food safety, export excellence and premium
            Indian spices that meet international market requirements.
          </p>
        </div>
        <div className="cert-grid">
          {CERTS.map((c) => (
            <article key={c.abbr} className="cert-card">
              {c.logo ? (
                <div className="cert-logo">
                  <Image src={c.logo} alt={`${c.title} logo`} fill sizes="120px" className="cert-logo-img" />
                </div>
              ) : (
                <div className="cert-seal" aria-hidden="true">
                  <span className="cert-abbr">{c.abbr}</span>
                </div>
              )}
              <div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="why">
          <h3>Why choose Bobby Group?</h3>
          <ul className="why-list">
            {WHY.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
