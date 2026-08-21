import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Arrow } from "./icons";

// `hash` links always go through the home route: from any other page (e.g.
// /xizmatlar) they navigate home and land on the right section instead of
// scrolling nowhere on the current page. TanStack's <Link> resolves the
// deploy-time base path itself, so this stays correct under GitHub Pages'
// /Portfolio/ subpath too.
const LINKS: { to: string; hash?: string; label: string }[] = [
  { to: "/", hash: "work", label: "Work" },
  { to: "/", hash: "about", label: "About" },
  { to: "/", hash: "skills", label: "Skills" },
  { to: "/", hash: "services", label: "Services" },
  { to: "/xizmatlar", label: "Katalog" },
  { to: "/", hash: "contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [onDark, setOnDark] = useState(false);

  // The nav sits over both light and dark sections; sample what is behind it
  // so the type stays legible without painting a card behind the bar.
  useEffect(() => {
    const sections = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-surface]"));

    const sync = () => {
      const probe = 34; // just under the nav's own baseline
      const hit = sections().find((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= probe && r.bottom > probe;
      });
      setOnDark(hit?.dataset.surface === "black");
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const ink = onDark ? "var(--ed-offwhite)" : "var(--ed-black)";
  const scrim = onDark
    ? "linear-gradient(to bottom, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.55) 55%, rgba(5,5,5,0) 100%)"
    : "linear-gradient(to bottom, rgba(245,242,239,0.94) 0%, rgba(245,242,239,0.6) 55%, rgba(245,242,239,0) 100%)";

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.5rem var(--ed-gutter)",
          paddingBottom: "2.25rem",
          background: scrim,
          color: ink,
          transition: "color 0.35s ease, background 0.35s ease",
        }}
      >
        <a
          href="#top"
          className="ed-display"
          style={{ fontSize: "1.1rem", letterSpacing: "-0.02em" }}
        >
          SX
        </a>

        <nav
          aria-label="Asosiy menyu"
          style={{
            display: "flex",
            gap: "clamp(1rem, 2.4vw, 2.4rem)",
            alignItems: "center",
          }}
          data-desktop-nav
        >
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={l.hash}
              className="ed-label ed-navlink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/"
            hash="contact"
            className="ed-label ed-navcv"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            CV <Arrow direction="down" size="0.85em" />
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menyuni ochish"
          data-mobile-toggle
          style={{
            display: "none",
            flexDirection: "column",
            gap: 5,
            background: "none",
            border: 0,
            cursor: "pointer",
            padding: 4,
          }}
        >
          <span style={{ width: 24, height: 1.5, background: ink }} />
          <span style={{ width: 24, height: 1.5, background: ink }} />
        </button>
      </header>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "var(--ed-black)",
            color: "var(--ed-offwhite)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "1.25rem",
            padding: "var(--ed-gutter)",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Menyuni yopish"
            style={{
              position: "absolute",
              top: "1.5rem",
              right: "var(--ed-gutter)",
              background: "none",
              border: 0,
              color: "inherit",
              fontSize: "2rem",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              hash={l.hash}
              onClick={() => setOpen(false)}
              className="ed-display"
              style={{ fontSize: "clamp(2.25rem, 11vw, 4rem)" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
