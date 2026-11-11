import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Arrow } from "@/components/editorial/icons";

// Hash links go through the home route, so the same header would still
// land on the right section if it were mounted on another page.
const LINKS: { hash: string; label: string }[] = [
  { hash: "process", label: "Jarayon" },
  { hash: "services", label: "Xizmatlar" },
  { hash: "work", label: "Ishlar" },
  { hash: "about", label: "Men haqimda" },
  { hash: "contact", label: "Aloqa" },
];

/**
 * The home page header: a quiet bar that is transparent over the hero,
 * turns into an opaque paper strip with a hairline once the page scrolls
 * (so nothing ever shows through it), and switches to its night colours
 * while the one night scene is under it.
 *
 * Inside a Telegram Mini App the bar starts below Telegram's own close and
 * menu controls (--hx-top, see home.css), so the two never overlap.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  // One passive scroll listener, coalesced to a frame. State only changes
  // when a threshold is crossed, so scrolling does not re-render the bar.
  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
      const night = document.querySelector<HTMLElement>("[data-night]");
      if (night) {
        const r = night.getBoundingClientRect();
        setDark(r.top <= 40 && r.bottom > 40);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // The menu is a real modal: focus moves in, Tab stays inside, Escape
  // closes it and focus returns to the button that opened it.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const returnTo = toggleRef.current;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      returnTo?.focus();
    };
  }, [open]);

  return (
    <>
      <header
        className="hx-bar"
        data-scrolled={scrolled || undefined}
        data-dark={dark || undefined}
      >
        <div className="hx-shell hx-bar-row">
          <a href="#top" className="hx-brand" aria-label="Bosh sahifa">
            <span className="hx-brand-mark">SX</span>
            <span className="hx-brand-name">SadiPrime Lab</span>
          </a>

          <nav className="hx-nav" aria-label="Asosiy menyu">
            {LINKS.map((l) => (
              <Link key={l.hash} to="/" hash={l.hash} className="hx-navlink">
                {l.label}
              </Link>
            ))}
            <Link to="/cv" className="hx-navlink">
              CV
            </Link>
          </nav>

          <div className="hx-bar-end">
            {/* The price catalog stays one tap away on every screen size:
                it is the site's main path to an order. */}
            <Link to="/xizmatlar" className="hx-pill">
              Narxlar <Arrow size="0.9em" />
            </Link>
            <button
              ref={toggleRef}
              type="button"
              className="hx-burger"
              onClick={() => setOpen(true)}
              aria-label="Menyuni ochish"
              aria-expanded={open}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          ref={panelRef}
          className="hx-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menyu"
          tabIndex={-1}
        >
          <div className="hx-menu-top">
            <span className="hx-brand-mark">SX</span>
            <button
              ref={closeRef}
              type="button"
              className="hx-menu-close"
              onClick={() => setOpen(false)}
              aria-label="Menyuni yopish"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>
          <nav className="hx-menu-list" aria-label="Menyu">
            {LINKS.map((l, i) => (
              <Link
                key={l.hash}
                to="/"
                hash={l.hash}
                onClick={() => setOpen(false)}
                className="hx-menu-link"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="hx-menu-no">0{i + 1}</span>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hx-menu-foot">
            <Link
              to="/xizmatlar"
              onClick={() => setOpen(false)}
              className="hx-pill"
            >
              Narxlar <Arrow size="0.9em" />
            </Link>
            <Link to="/cv" onClick={() => setOpen(false)} className="hx-pill">
              CV <Arrow size="0.9em" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
