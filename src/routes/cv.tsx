import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CV_CHIPS,
  CV_HIGHLIGHTS,
  CV_PROFILE,
  CV_PROJECTS,
  CV_SKILLS,
} from "@/data/cv";
import { Arrow } from "@/components/editorial/icons";
import { asset } from "@/lib/asset";
import portrait from "@/assets/portrait-standing.webp";

const TITLE = "CV — Saidburxon Xojasoipov";
const DESCRIPTION =
  "Saidburxon Xojasoipov — full-stack dasturchi va AI integratsiya mutaxassisi. Kuchli tomonlar, ishlab turgan loyihalar va texnologiyalar.";

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

/* The bot sends this same file (bot/src/bot/keyboards.ts CV_PDF_URL), so the
   name must stay as is. */
const CV_PDF = asset("Saidburxon-Xojasoipov-CV.pdf");
const CV_PDF_RU = asset("Saidburxon-Xojasoipov-CV-RU.pdf");

/**
 * Dark sheet, one red accent: the same layout as the downloadable PDF, so
 * what a visitor reads here is what they get in the file. Two columns on
 * wide screens, one column in the Telegram Mini App.
 */
function Cv() {
  return (
    <main className="cvx">
      <div className="cvx-sheet">
        <TopBar />
        <div className="cvx-grid">
          <div className="cvx-col">
            <Intro />
            <Section title="Men haqimda">
              {CV_PROFILE.about.map((p) => (
                <p key={p} className="cvx-about">
                  {p}
                </p>
              ))}
            </Section>
            <Section title="Kuchli tomonlarim">
              <ul className="cvx-strengths">
                {CV_HIGHLIGHTS.map((h) => (
                  <li key={h.label}>
                    <span className="cvx-star" aria-hidden="true">
                      ✱
                    </span>
                    <div>
                      <strong>{h.label}</strong>
                      <span>{h.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
          <div className="cvx-col">
            <Section title="Loyihalar">
              <ul className="cvx-projects">
                {CV_PROJECTS.map((p) => (
                  <li key={p.title}>
                    <h3>
                      {p.title} <span className="cvx-cat">— {p.category}</span>
                      {p.link &&
                        (p.href ? (
                          <a
                            href={p.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {p.link}
                          </a>
                        ) : (
                          <span className="cvx-link">{p.link}</span>
                        ))}
                    </h3>
                    <p>{p.summary}</p>
                    <p className="cvx-tech">{p.tech.join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Texnik ko'nikmalar" divided>
              <ul className="cvx-chips">
                {CV_CHIPS.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Section>
            <Section title="Stek" divided>
              <dl className="cvx-stack">
                {CV_SKILLS.map((s) => (
                  <div key={s.group}>
                    <dt>{s.group}</dt>
                    <dd>{s.items.join(" · ")}</dd>
                  </div>
                ))}
              </dl>
            </Section>
            <Section title="Aloqa" divided>
              <ul className="cvx-contact">
                <li>
                  <span aria-hidden="true">☎</span>
                  <a href={`tel:${CV_PROFILE.phoneHref}`}>{CV_PROFILE.phone}</a>
                </li>
                <li>
                  <span aria-hidden="true">@</span>
                  <a href={`mailto:${CV_PROFILE.email}`}>{CV_PROFILE.email}</a>
                </li>
                <li>
                  <span aria-hidden="true">✈</span>
                  <a
                    href={`https://t.me/${CV_PROFILE.telegram.replace(/^@/, "")}`}
                  >
                    t.me/{CV_PROFILE.telegram.replace(/^@/, "")}
                  </a>
                </li>
                <li>
                  <span aria-hidden="true">◉</span>
                  {CV_PROFILE.location}
                </li>
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <div className="cvx-toolbar">
      <Link to="/" className="cvx-back">
        <Arrow direction="left" size="0.8em" /> Portfolio
      </Link>
      <div className="cvx-actions">
        <a className="cvx-btn cvx-btn-ghost" href={CV_PDF_RU} download>
          PDF (RU)
        </a>
        <a className="cvx-btn" href={CV_PDF} download>
          PDF yuklab olish <Arrow direction="down" size="0.85em" />
        </a>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <header className="cvx-intro">
      <div className="cvx-photo">
        <img
          src={portrait}
          alt="Saidburxon Xojasoipov"
          width={932}
          height={1165}
          decoding="async"
        />
        <i className="cvx-corner" style={{ top: -4, left: -4 }} />
        <i className="cvx-corner" style={{ top: -4, right: -4 }} />
        <i className="cvx-corner" style={{ bottom: -4, left: -4 }} />
        <i className="cvx-corner" style={{ bottom: -4, right: -4 }} />
      </div>
      <p className="cvx-hello">Salom,</p>
      <h1 className="cvx-name">
        Men <em>{CV_PROFILE.firstName.charAt(0)}</em>
        {CV_PROFILE.firstName.slice(1)}
        <br />
        {CV_PROFILE.lastName}
      </h1>
      <p className="cvx-role">{CV_PROFILE.title}</p>
    </header>
  );
}

function Section({
  title,
  divided = false,
  children,
}: {
  title: string;
  divided?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={divided ? "cvx-section cvx-divided" : "cvx-section"}>
      <h2 className="cvx-tag">{title}</h2>
      {children}
    </section>
  );
}
