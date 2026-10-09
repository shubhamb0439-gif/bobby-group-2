import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Journey from "@/components/Journey3D";
import About from "@/components/About";
import Spices from "@/components/Spices";
import Certifications from "@/components/Certifications";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <a className="skip" href="#journey">Skip to content</a>
      <Nav />
      <main id="top">
        <Hero />
        <Journey />
        <About />
        <Spices />
        <Certifications />
      </main>
      <Footer />
    </>
  );
}
