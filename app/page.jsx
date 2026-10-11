import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Journey from "@/components/JourneyFrames";
import SiteLoader from "@/components/SiteLoader";
import About from "@/components/About";
import Spices from "@/components/Spices";
import Certifications from "@/components/Certifications";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { CONTACT } from "@/lib/contact";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  legalName: "BOBBY GROUP",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Indian spice exporter headquartered in Bangalore, supplying premium spices to importers, distributors and food manufacturers worldwide.",
  email: CONTACT.email,
  telephone: CONTACT.phoneHref,
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT.address.line1,
    addressLocality: "Bangalore",
    postalCode: "560083",
    addressRegion: "Karnataka",
    addressCountry: "IN",
  },
  sameAs: [CONTACT.social.instagram],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      email: CONTACT.email,
      telephone: CONTACT.phoneHref,
      availableLanguage: ["en"],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
      />
      <SiteLoader />
      <a className="skip" href="#journey">Skip to content</a>
      <Nav />
      <main id="top">
        <Hero />
        <Journey />
        <About />
        <Spices />
        <Certifications />
        <FAQ />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
