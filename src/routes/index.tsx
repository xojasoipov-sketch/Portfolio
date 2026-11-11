import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/editorial/Nav";
import { Hero } from "@/components/editorial/Hero";
import { Intro } from "@/components/editorial/Intro";
import { About } from "@/components/editorial/About";
import { Skills } from "@/components/editorial/Skills";
import { Services } from "@/components/editorial/Services";
import { Projects } from "@/components/editorial/Projects";
import { Testimonials } from "@/components/editorial/Testimonials";
import { Contact } from "@/components/editorial/Contact";
import { Footer } from "@/components/editorial/Footer";

const TITLE = "Saidburxon Xojasoipov | Full-stack Developer & AI Builder";
const DESCRIPTION =
  "Saidburxon Xojasoipov, full-stack dasturchi va AI-yechimlar mutaxassisi. Web, AI tizimlar, SaaS mahsulotlar va biznes avtomatlashtirish.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // The page is built like one of the owner's reels (uslub.md): hook on
  // the visitor's pain, trust (who, how, what), one night "turn" into real
  // projects, then a single call to action. Paper background with a quiet
  // dotted grid; only the projects scene goes to night.
  return (
    <main className="ed-paper" style={{ overflowX: "clip" }}>
      <Nav />
      <Hero />
      <Intro />
      <About />
      <Skills />
      <Services />
      <Projects />
      {/* Renders only once real testimonials exist. */}
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  );
}
