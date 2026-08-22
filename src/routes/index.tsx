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
import { CurveDivider } from "@/components/editorial/Curve";

const TITLE = "Saidburxon Xojasoipov — Full-stack Developer & AI Builder";
const DESCRIPTION =
  "Saidburxon Xojasoipov — full-stack dasturchi va AI-yechimlar mutaxassisi. Web, AI tizimlar, SaaS mahsulotlar va biznes avtomatlashtirish.";

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
  return (
    <main style={{ background: "var(--ed-offwhite)", overflowX: "clip" }}>
      <Nav />
      <Hero />
      <Intro />
      <About />
      <Skills />
      <Services />

      <CurveDivider from="offwhite" to="black" />
      <Projects />

      <CurveDivider from="black" to="offwhite" flip />
      {/* Renders only once real testimonials exist; until then the spacer
          alone keeps the two dark panels apart. */}
      <Testimonials />
      <ServicesSpacer />

      <CurveDivider from="offwhite" to="black" />
      <Contact />
      <Footer />
    </main>
  );
}

/**
 * A short off-white breath between the two dark blocks so the black
 * projects panel and the black contact panel do not read as one slab.
 */
function ServicesSpacer() {
  return (
    <div
      data-surface="offwhite"
      aria-hidden="true"
      style={{
        background: "var(--ed-offwhite)",
        height: "clamp(3rem, 10vw, 8rem)",
      }}
    />
  );
}
