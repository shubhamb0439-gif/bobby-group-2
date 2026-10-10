import Image from "next/image";
import Link from "next/link";
import { MODEL_CREDITS } from "@/lib/journey3d/config";
import { CONTACT, whatsappLink } from "@/lib/contact";

const LEGAL = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-conditions", label: "Terms & Conditions" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/cookie-policy", label: "Cookie Policy" },
];

export default function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-top">
        <Image src="/logo.png" alt="Bobby Group" width={680} height={264} className="footer-logo" />
        <a
          className="btn btn-blue"
          href={CONTACT.enquiryForm}
          target="_blank"
          rel="noopener noreferrer"
        >
          Send an enquiry
        </a>
      </div>
      <div className="footer-cols">
        <div>
          <h3>Address</h3>
          <p>{CONTACT.address.line1}</p>
          <p>{CONTACT.address.line2}</p>
          <p>{CONTACT.address.line3}</p>
        </div>
        <div>
          <h3>Phone</h3>
          <p><a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phoneDisplay}</a></p>
          <h3 className="footer-h3-gap">WhatsApp</h3>
          <p>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              {CONTACT.phoneDisplay}
            </a>
          </p>
        </div>
        <div>
          <h3>Email</h3>
          <p><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p>
          <h3 className="footer-h3-gap">Legal</h3>
          <ul className="footer-legal-links">
            {LEGAL.map((l) => (
              <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <p className="footer-legal">© 2026 Bobby Group. All rights reserved.</p>
      <p className="footer-credits">
        3D models:{" "}
        {MODEL_CREDITS.map((m, i) => (
          <span key={m.url}>
            <a href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a> by {m.author} ({m.license}){i < MODEL_CREDITS.length - 1 ? " · " : ""}
          </span>
        ))}
      </p>
    </footer>
  );
}
