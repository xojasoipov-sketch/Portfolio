import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/Header";
import { Hero } from "@/components/home/Hero";
import { Manifest } from "@/components/home/Manifest";
import { Process } from "@/components/home/Process";
import { Drift } from "@/components/home/Drift";
import { Facts } from "@/components/home/Facts";
import { Services } from "@/components/home/Services";
import { Work } from "@/components/home/Work";
import { About } from "@/components/home/About";
import { Contact } from "@/components/home/Contact";
import { Footer } from "@/components/home/Footer";
import { Testimonials } from "@/components/editorial/Testimonials";

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
  // The page is built like one of the owner's reels (uslub.md): a hook on
  // the visitor's pain, trust (who, how, what), one night "turn" into real
  // projects, then a single call to action. Paper, ink and one red accent;
  // only the projects scene goes to night. Styles live in src/home.css.
  return (
    <main className="hx">
      <Header />
      <Hero />
      <Manifest />
      <Process />
      <Drift />
      <Facts />
      <Services />
      <Work />
      <About />
      {/* Renders only once real testimonials exist. */}
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  );
}
