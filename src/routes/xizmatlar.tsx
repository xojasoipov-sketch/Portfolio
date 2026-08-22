import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wrench,
  ShieldCheck,
  Globe,
  Smartphone,
  Sparkles,
  Database,
  Repeat,
  Check,
} from "lucide-react";
import { Nav } from "@/components/editorial/Nav";
import { Footer } from "@/components/editorial/Footer";
import { Arrow } from "@/components/editorial/icons";
import { useReveal } from "@/components/editorial/useReveal";
import {
  CATALOG,
  PACKAGES,
  PROCESS,
  TERMS,
  type CatalogCategory,
} from "@/data/services-catalog";

const TITLE = "Xizmatlar katalogi — Saidburxon Xojasoipov";
const DESCRIPTION =
  "To'liq xizmatlar katalogi: audit, veb va marketplace, mobil/Telegram bot, AI integratsiya, CRM va doimiy hamkorlik — narxlar va muddatlar bilan.";

export const Route = createFileRoute("/xizmatlar")({
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
  component: XizmatlarPage,
});

/** SVG glyph per category — no emoji, matches the editorial line-art system. */
const CATEGORY_ICON: Record<
  CatalogCategory["key"],
  React.ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  quick: Wrench,
  audit: ShieldCheck,
  web: Globe,
  mobile: Smartphone,
  ai: Sparkles,
  crm: Database,
  retainer: Repeat,
};

function XizmatlarPage() {
  return (
    <main style={{ background: "var(--ed-offwhite)", overflowX: "clip" }}>
      <Nav />
      <CatalogHero />
      <CatalogSections />
      <PackagesSection />
      <ProcessSection />
      <TermsAndCta />
      <Footer />
    </main>
  );
}

function CatalogHero() {
  const { ref, shown } = useReveal<HTMLElement>(0.1);

  return (
    <section
      ref={ref}
      data-surface="offwhite"
      style={{
        background: "var(--ed-offwhite)",
        paddingTop: "clamp(7rem, 16vw, 10rem)",
        paddingBottom: "var(--ed-section)",
      }}
    >
      <div className="ed-shell">
        <p
          className="ed-label ed-rise"
          data-shown={shown}
          style={{ margin: 0, color: "var(--ed-red)" }}
        >
          Xizmatlar katalogi · 2026
        </p>

        <h1
          className="ed-display"
          style={{
            fontSize: "clamp(2.5rem, 9vw, 6.5rem)",
            margin: "0.75rem 0 0",
          }}
        >
          <span className="ed-clip" data-shown={shown}>
            <span>Har bir xizmat,</span>
          </span>
          <span
            className="ed-clip"
            data-shown={shown}
            style={{ transitionDelay: "0.08s" }}
          >
            <span
              style={{ color: "var(--ed-red-br)", transitionDelay: "0.08s" }}
            >
              aniq narx bilan.
            </span>
          </span>
        </h1>

        <p
          className="ed-rise"
          data-shown={shown}
          style={{
            transitionDelay: "0.2s",
            marginTop: "clamp(1.5rem, 3vw, 2.25rem)",
            maxWidth: "38rem",
            fontSize: "clamp(1rem, 1.35vw, 1.15rem)",
            lineHeight: 1.7,
            color: "var(--ed-gray-tx)",
          }}
        >
          Har bir xizmat alohida buyurtma qilinishi yoki tayyor paketlar
          tarkibida olinishi mumkin. Kichik tuzatishdan to to'liq ekotizim
          qurishgacha — barcha narxlar dollarda ko'rsatilgan.
        </p>
      </div>
    </section>
  );
}

function CatalogSections() {
  return (
    <section
      data-surface="offwhite"
      style={{ background: "var(--ed-offwhite)" }}
    >
      <div className="ed-shell">
        {CATALOG.map((category) => (
          <CategoryBlock key={category.key} category={category} />
        ))}
      </div>
    </section>
  );
}

function CategoryBlock({ category }: { category: CatalogCategory }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.1);
  const Icon = CATEGORY_ICON[category.key];

  return (
    <div ref={ref} className="ed-cat">
      <div className="ed-cat-head ed-rise" data-shown={shown}>
        <span className="ed-cat-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.5} />
        </span>
        <div>
          <p className="ed-label" style={{ margin: 0, color: "var(--ed-red)" }}>
            {category.num}
          </p>
          <h2
            className="ed-display"
            style={{
              fontSize: "clamp(1.4rem, 3vw, 2.1rem)",
              margin: "0.2rem 0 0",
            }}
          >
            {category.title}
          </h2>
        </div>
      </div>

      <div>
        {category.items.map((item, i) => (
          <div
            key={item.name}
            className="ed-cat-item ed-rise"
            data-shown={shown}
            style={{ transitionDelay: `${Math.min(i * 0.06, 0.3)}s` }}
          >
            <span className="ed-cat-item-name">{item.name}</span>
            <span className="ed-cat-item-price">{item.price}</span>
            <span className="ed-cat-item-duration">{item.duration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackagesSection() {
  const { ref, shown } = useReveal<HTMLElement>(0.08);

  return (
    <section
      ref={ref}
      id="paketlar"
      data-surface="black"
      style={{
        background: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
      }}
    >
      <div className="ed-shell">
        <p
          className="ed-label ed-rise"
          data-shown={shown}
          style={{ margin: 0, color: "var(--ed-red-br)" }}
        >
          5 — Tayyor paketlar
        </p>
        <h2
          className="ed-display"
          style={{
            fontSize: "clamp(2rem, 6vw, 4rem)",
            margin: "0.5rem 0 clamp(2rem, 5vw, 3.5rem)",
          }}
        >
          <span className="ed-clip" data-shown={shown}>
            <span>Yoki tayyor tarif tanlang.</span>
          </span>
        </h2>

        <div className="ed-pkg-grid">
          {PACKAGES.map((pkg, i) => (
            <div
              key={pkg.name}
              className="ed-pkg ed-rise"
              data-shown={shown}
              data-popular={pkg.popular ? "true" : undefined}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {pkg.popular && <span className="ed-pkg-badge">Eng mashhur</span>}

              <div>
                <p className="ed-label" style={{ margin: 0, opacity: 0.6 }}>
                  {pkg.name}
                </p>
                <p className="ed-pkg-price" style={{ margin: "0.6rem 0 0" }}>
                  {pkg.price}
                </p>
                <p
                  style={{
                    margin: "0.2rem 0 0",
                    fontSize: "0.85rem",
                    opacity: 0.55,
                  }}
                >
                  {pkg.duration}
                </p>
              </div>

              <ul className="ed-pkg-features">
                {pkg.features.map((f) => (
                  <li key={f}>
                    <Check size={16} strokeWidth={2} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/"
                hash="contact"
                className="ed-btn"
                style={{ alignSelf: "flex-start" }}
              >
                Shu paketni tanlash <Arrow size="0.85em" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const { ref, shown } = useReveal<HTMLElement>(0.1);

  return (
    <section
      ref={ref}
      data-surface="offwhite"
      style={{
        background: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
      }}
    >
      <div className="ed-shell">
        <p
          className="ed-label ed-rise"
          data-shown={shown}
          style={{ margin: 0, color: "var(--ed-red)" }}
        >
          6 — Ish jarayoni
        </p>
        <div
          className="ed-process-grid"
          style={{ marginTop: "clamp(1.75rem, 4vw, 2.5rem)" }}
        >
          {PROCESS.map((p, i) => (
            <div
              key={p.step}
              className="ed-process-step ed-rise"
              data-shown={shown}
              style={{ transitionDelay: `${i * 0.07}s` }}
            >
              <span className="ed-process-num">{p.step}</span>
              <p className="ed-process-title">{p.title}</p>
              <p className="ed-process-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TermsAndCta() {
  const { ref, shown } = useReveal<HTMLElement>(0.1);

  return (
    <section
      ref={ref}
      data-surface="offwhite"
      style={{
        background: "var(--ed-offwhite)",
        paddingBottom: "var(--ed-section)",
      }}
    >
      <div className="ed-shell">
        <div
          className="ed-rise"
          data-shown={shown}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: "clamp(2rem, 5vw, 4rem)",
            alignItems: "start",
          }}
        >
          <div>
            <p
              className="ed-label"
              style={{ margin: 0, color: "var(--ed-red)" }}
            >
              7 — Shartlar va kafolat
            </p>
            <ul className="ed-terms" style={{ marginTop: "1.25rem" }}>
              {TERMS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "1.5rem",
              paddingTop: "clamp(0.5rem, 1vw, 1rem)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "clamp(1.15rem, 2vw, 1.5rem)",
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              Xizmat tanladingizmi? 30 daqiqalik bepul suhbatdan boshlaymiz.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/" hash="contact" className="ed-btn">
                Bog'lanish <Arrow size="0.85em" />
              </Link>
              <Link to="/demo" className="ed-btn">
                Jonli demo <Arrow size="0.85em" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
