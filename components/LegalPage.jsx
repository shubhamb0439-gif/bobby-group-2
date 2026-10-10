import Link from "next/link";
import Image from "next/image";
import { CONTACT } from "@/lib/contact";

/* Shared shell for the policy pages: simple header, readable prose column, contact block. */
export default function LegalPage({ title, effective, updated, children }) {
  return (
    <div className="legal">
      <header className="legal-bar">
        <Link href="/" className="legal-logo" aria-label="Bobby Group home">
          <Image src="/logo.png" alt="Bobby Group" width={680} height={264} priority />
        </Link>
        <Link href="/" className="btn btn-line legal-back">← Back to site</Link>
      </header>

      <main className="legal-main">
        <p className="eyebrow"><span className="dot" /> Legal</p>
        <h1>{title}</h1>
        <p className="legal-dates">
          <strong>Effective Date:</strong> {effective} &nbsp;·&nbsp;
          <strong>Last Updated:</strong> {updated}
        </p>
        <div className="legal-body">{children}</div>

        <section className="legal-contact">
          <h2>Contact</h2>
          <p>
            <strong>BOBBY GROUP</strong><br />
            {CONTACT.address.line1}<br />
            {CONTACT.address.line2}<br />
            {CONTACT.address.line3}
          </p>
          <p>
            <strong>Email:</strong>{" "}
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><br />
            <strong>Phone:</strong>{" "}
            <a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phoneDisplay}</a><br />
            <strong>Website:</strong>{" "}
            <a href="https://www.bobbygroup.in" target="_blank" rel="noopener noreferrer">
              https://www.bobbygroup.in
            </a>
          </p>
        </section>
      </main>

      <footer className="legal-foot">
        <p>© 2026 Bobby Group. All rights reserved.</p>
        <nav className="legal-foot-links">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms-conditions">Terms &amp; Conditions</Link>
          <Link href="/disclaimer">Disclaimer</Link>
          <Link href="/cookie-policy">Cookie Policy</Link>
        </nav>
      </footer>
    </div>
  );
}
