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

  /**
   * Which surface sits under the nav. Watched with an IntersectionObserver
   * whose root is a 1px line across the viewport just under the nav's
   * baseline, so the browser reports surfaces crossing that line off the main
   * thread.
   *
   * This used to be a scroll listener that queried every [data-surface] and
   * called getBoundingClientRect on each one, on every scroll event. Each read
   * forced a synchronous layout in the middle of the scroll -- with the
   * reveal transitions running, that was a full style + layout per event --
   * which is a large part of why scrolling felt heavy.
   */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const PROBE = 34; // just under the nav's own baseline
    // The cursor ring also carries data-surface (to colour itself), but it
    // is a follower, not a surface: it must never decide the nav's colour.
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-surface]:not(.ed-cursor-ring)",
      ),
    );
    const crossing = new Set<HTMLElement>();
    let io: IntersectionObserver | null = null;

    const pick = () => {
      // First in document order, matching how the old probe resolved
      // overlaps between nested surfaces.
      const hit = sections.find((el) => crossing.has(el));
      setOnDark(hit?.dataset.surface === "black");
    };

    const observe = () => {
      io?.disconnect();
      crossing.clear();
      const bottom = Math.max(0, window.innerHeight - PROBE - 1);
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const el = e.target as HTMLElement;
            if (e.isIntersecting) crossing.add(el);
            else crossing.delete(el);
          }
          pick();
        },
        {
          // The document, not the implicit root: inside an iframe (Telegram
          // Web opens the site in one) the implicit root is the top-level
          // viewport, and rootMargin is ignored for it -- the probe line
          // would widen to the whole screen.
          root: document,
          rootMargin: `-${PROBE}px 0px -${bottom}px 0px`,
          threshold: 0,
        },
      );
      for (const el of sections) io.observe(el);
    };

    observe();
    // The probe line is measured in pixels from both edges, so a new
    // viewport height needs a new observer. Resizes are rare and debounced.
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(observe, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      io?.disconnect();
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
