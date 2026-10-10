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

export default function Home() {
  return (
    <>
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
