"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CONTACT } from "@/lib/contact";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? " is-scrolled" : ""}`}>
      <a className="nav-logo" href="#top" aria-label="Bobby Group home">
        <Image src="/logo.png" alt="Bobby Group" width={680} height={264} priority />
      </a>
      <nav className="nav-links" aria-label="Main">
        <a href="#journey">How we ship</a>
        <a href="#about">About</a>
        <a href="#spices">Spices</a>
        <a href="#certifications">Certifications</a>
        <a href="#contact">Contact</a>
      </nav>
      <a
        className="btn btn-blue nav-cta"
        href={CONTACT.enquiryForm}
        target="_blank"
        rel="noopener noreferrer"
      >
        Get a quote
      </a>
    </header>
  );
}
