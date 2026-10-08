import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Journey from "@/components/Journey";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <a className="skip" href="#journey">Skip to content</a>
      <Nav />
      <main id="top">
        <Hero />
        <Journey />

        {/* PLACEHOLDER: content continues after the plane */}
        <section id="about" className="after">
          <p className="eyebrow">Next section</p>
          <h2>Your content continues here.</h2>
          <p>
            This block marks the end of the scroll story (after the plane). Send the content for the
            following sections and it slots in here.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
