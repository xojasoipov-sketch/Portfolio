import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Arrow } from "./icons";

// `hash` links always go through the home route: from any other page (e.g.
// /xizmatlar) they navigate home and land on the right section instead of
// scrolling nowhere on the current page. TanStack's <Link> resolves the
// deploy-time base path itself, so this stays correct under GitHub Pages'
// /Portfolio/ subpath too.
//
// Labels are Uzbek throughout — the rest of the site's copy is Uzbek, and a
// nav row mixing "Work / About / Skills" with Uzbek section content read as
// inconsistent (client feedback: "biroz tushunarsiz").
const LINKS: { to: string; hash?: string; label: string }[] = [
  { to: "/", hash: "work", label: "Ishlarim" },
  { to: "/", hash: "about", label: "Men haqimda" },
  { to: "/", hash: "skills", label: "Ko'nikmalar" },
  { to: "/", hash: "services", label: "Xizmatlar" },
  { to: "/", hash: "contact", label: "Aloqa" },
];

const MotionLink = motion.create(Link);

/**
 * Subtle magnetic pull toward the cursor — mouse only (pointerType check),
 * and a no-op under prefers-reduced-motion. Reserved for the single most
 * prominent CTA on the page (the catalog pill) rather than every link, so
 * it reads as one deliberate "premium" touch instead of noise.
 */
function useMagnetic(strength = 10) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.4 });

  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(((e.clientX - rect.left - rect.width / 2) / rect.width) * strength);
    y.set(((e.clientY - rect.top - rect.height / 2) / rect.height) * strength);
  };
  const onPointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  return {
    ref,
    style: { x: springX, y: springY },
    onPointerMove,
    onPointerLeave,
  };
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const [onDark, setOnDark] = useState(false);
  const magnet = useMagnetic();

  // The nav sits over both light and dark sections; sample what is behind it
  // so the type stays legible without painting a card behind the bar.
  /**
   * The menu declares aria-modal="true" and, below 860px, is the only route
   * to every section of the site -- so it has to behave like a modal rather
   * than just claim to be one. Before this: focus stayed on the page behind
   * it, Tab walked out into the header links still rendered underneath,
   * Escape did nothing, and closing dropped focus to <body>.
   */
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const returnTo = toggleRef.current;
    closeRef.current?.focus();

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
      // Returned to the control that opened it, not left on a removed node.
      returnTo?.focus();
    };
  }, [open]);

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

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
            {/* Points at the real CV page. It used to carry a download
                arrow and go to the contact form -- a promise the site could
                not keep, since no CV existed anywhere. */}
            <Link
              to="/cv"
              className="ed-label ed-navcv"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              CV <Arrow size="0.85em" />
            </Link>
          </nav>

          {/* Kept outside data-desktop-nav so it's the one nav item that
              stays visible on mobile without opening the menu -- the
              catalog is the site's main conversion path and shouldn't be
              a tap-to-reveal secret. */}
          <MotionLink
            to="/xizmatlar"
            ref={magnet.ref}
            style={magnet.style}
            onPointerMove={magnet.onPointerMove}
            onPointerLeave={magnet.onPointerLeave}
            className="ed-label ed-navpricing"
          >
            XIZMATLAR
          </MotionLink>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Menyuni ochish"
            aria-expanded={open}
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
        </div>
      </header>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          // Was unnamed, which is a straight axe-core `aria-dialog-name`
          // failure -- a screen reader announced "dialog" with nothing else.
          aria-label="Menyu"
          tabIndex={-1}
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
            ref={closeRef}
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
          <Link
            to="/xizmatlar"
            onClick={() => setOpen(false)}
            className="ed-display"
            style={{
              fontSize: "clamp(2.25rem, 11vw, 4rem)",
              color: "var(--ed-red-tx)",
            }}
          >
            XIZMATLAR
          </Link>
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
          <Link
            to="/cv"
            onClick={() => setOpen(false)}
            className="ed-display"
            style={{ fontSize: "clamp(2.25rem, 11vw, 4rem)" }}
          >
            CV
          </Link>
        </div>
      )}
    </>
  );
}
