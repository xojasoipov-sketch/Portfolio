import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CV_HIGHLIGHTS,
  CV_PROFILE,
  CV_PROJECTS,
  CV_SERVICES,
  CV_SKILLS,
} from "@/data/cv";
import { Arrow } from "@/components/editorial/icons";
import { asset } from "@/lib/asset";

const TITLE = "CV — Saidburxon Xojasoipov";
const DESCRIPTION =
  "Saidburxon Xojasoipov — full-stack dasturchi va AI-yechimlar mutaxassisi. Tanlangan loyihalar, texnologiyalar va xizmat yo'nalishlari.";

export const Route = createFileRoute("/cv")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Cv,
});

function Cv() {
  return (
    <main className="cv-page">
      <div className="cv-sheet">
        <TopBar />
        <Header />
        <Summary />
        <Highlights />
        <Projects />
        <Skills />
        <Services />
        <Foot />
      </div>
    </main>
  );
}

const CV_PDF = asset("Saidburxon-Xojasoipov-CV.pdf");

/** Screen-only controls; hidden when printing or saving to PDF. */
function TopBar() {
  return (
    <div className="cv-toolbar">
      <Link to="/" className="ed-label ed-navlink">
        <Arrow direction="left" size="0.8em" /> Portfolio
      </Link>
      <div className="cv-toolbar-actions">
        {/* window.print() renders from the live page, so it can never be
            out of date; the static file is there for clients who just want
            a document to keep (and for the bot to send). */}
        <button type="button" className="ed-btn" onClick={() => window.print()}>
          Chop etish
        </button>
        <a
          className="ed-btn"
          href={CV_PDF}
          download
          style={{
            background: "var(--ed-red-br)",
            borderColor: "var(--ed-red-br)",
            color: "var(--ed-offwhite)",
          }}
        >
          PDF yuklab olish <Arrow direction="down" size="0.85em" />
        </a>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="cv-head">
      <div>
        <h1 className="ed-display cv-name">
          Saidburxon
          <br />
          <span style={{ color: "var(--ed-red)" }}>Xojasoipov</span>
        </h1>
        <p className="ed-label cv-role">{CV_PROFILE.title}</p>
      </div>
      <ul className="cv-contact">
        <li>{CV_PROFILE.location}</li>
        <li>
          <a href={`mailto:${CV_PROFILE.email}`}>{CV_PROFILE.email}</a>
        </li>
        <li>
          <a href={`https://t.me/${CV_PROFILE.telegram.replace(/^@/, "")}`}>
            {CV_PROFILE.telegram}
          </a>
        </li>
        <li className="cv-site">{CV_PROFILE.site}</li>
      </ul>
    </header>
  );
}

function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cv-section">
      <div className="cv-section-head">
        <span className="ed-label cv-num">{num}</span>
        <h2 className="ed-label cv-section-title">{title}</h2>
      </div>
      <div className="cv-section-body">{children}</div>
    </section>
  );
}

function Summary() {
  return (
    <Section num="01" title="Profil">
      <p className="cv-summary">{CV_PROFILE.summary}</p>
    </Section>
  );
}

function Highlights() {
  return (
    <Section num="02" title="Kuchli tomonlar">
      <ul className="cv-highlights">
        {CV_HIGHLIGHTS.map((h) => (
          <li key={h.label}>
            <strong>{h.label}</strong>
            <span>{h.detail}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Projects() {
  return (
    <Section num="03" title="Tanlangan loyihalar">
      <ul className="cv-projects">
        {CV_PROJECTS.map((p) => (
          <li key={p.title} className="cv-project">
            <div className="cv-project-head">
              <h3 className="cv-project-title">{p.title}</h3>
              <span className="ed-label cv-project-cat">{p.category}</span>
            </div>
            <p className="cv-project-summary">{p.summary}</p>
            <div className="cv-project-foot">
              <span className="cv-project-tech">{p.tech.join(" · ")}</span>
              {p.link && <span className="cv-project-link">{p.link}</span>}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Skills() {
  return (
    <Section num="04" title="Texnologiyalar">
      <dl className="cv-skills">
        {CV_SKILLS.map((s) => (
          <div key={s.group} className="cv-skill-row">
            <dt className="ed-label">{s.group}</dt>
            <dd>{s.items.join(" · ")}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function Services() {
  return (
    <Section num="05" title="Xizmat yo'nalishlari">
      <ul className="cv-services">
        {CV_SERVICES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Section>
  );
}

function Foot() {
  return (
    <footer className="cv-foot">
      <span className="ed-label">Saidburxon Xojasoipov</span>
      <span className="ed-label cv-foot-dim">
        To'liq narxlar katalogi: {CV_PROFILE.site}/xizmatlar
      </span>
    </footer>
  );
}
