import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PROJECTS } from "@/data/projects";
import orbitPortrait from "@/assets/orbit-portrait.webp";
import { useReveal } from "./useReveal";
import { useSpotlight } from "./useSpotlight";
import { Arrow } from "./icons";

/** Degrees between neighbours on the ring. */
const STEP = 360 / PROJECTS.length;

/** Degrees per second of the idle rotation — slow enough to read while it moves. */
const SPEED = 9;

/**
 * How long an arrow press or a focus holds the ring still before it drifts on
 * again. Stopping for good would have been simpler, but the turning is the
 * point of the section: one arrow press should not end it permanently.
 */
const HOLD_MS = 6000;

/**
 * The work section: the projects turn around the portrait, and clicking one
 * opens it full size.
 *
 * The rotation is not React state. A single rAF loop writes one custom
 * property, --ed-spin, on the stage and a depth value on each card; the
 * transforms are static CSS reading those. Re-rendering five cards sixty
 * times a second to move a ring would be the same picture at a much worse
 * price.
 *
 * It stops turning whenever turning would be wrong: pointer over it, keyboard
 * focus inside it, a card open, the tab in the background, the section off
 * screen, or the visitor asking for reduced motion. The arrows then take over,
 * which is also what makes every card reachable without motion at all.
 */
export function Projects() {
  const { ref, shown } = useReveal<HTMLElement>(0.06);
  const spotlightRef = useSpotlight<HTMLElement>();
  const worldRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const [zoomed, setZoomed] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);

  /** Where the ring is now and where it is heading; both live outside React. */
  const spin = useRef(0);
  const target = useRef(0);
  /** Timestamp until which the idle drift stays out of the way. */
  const holdUntil = useRef(0);

  const paused = zoomed !== null || hovered || focused || !onScreen;

  const step = useCallback((dir: 1 | -1) => {
    holdUntil.current = performance.now() + HOLD_MS;
    // Snap to the nearest slot first, so an arrow press from mid-rotation
    // lands a card square to the viewer instead of somewhere between two.
    const nearest = Math.round(target.current / STEP) * STEP;
    target.current = nearest + dir * STEP;
  }, []);

  /** Bring one card to the front without opening it — used by focus. */
  const bringToFront = useCallback((index: number) => {
    holdUntil.current = performance.now() + HOLD_MS;
    const slotAngle = index * STEP;
    // The ring turns the other way from the slot's own angle, and the result
    // has to stay near the current position or the ring spins the long way.
    const want = -slotAngle;
    const turns = Math.round((target.current - want) / 360);
    target.current = want + turns * 360;
  }, []);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (
        !paused &&
        now > holdUntil.current &&
        !reduced.matches &&
        !document.hidden
      ) {
        target.current += SPEED * dt;
      }
      // Critically damped enough to feel weighty without overshooting.
      spin.current += (target.current - spin.current) * Math.min(dt * 6, 1);

      world.style.setProperty("--ed-spin", `${spin.current}deg`);
      for (let i = 0; i < slotsRef.current.length; i++) {
        const node = slotsRef.current[i];
        if (!node) continue;
        const angle = ((i * STEP + spin.current) * Math.PI) / 180;
        // 1 when the card faces the viewer, 0 when it is behind the figure.
        const depth = (Math.cos(angle) + 1) / 2;
        node.style.setProperty("--ed-depth", depth.toFixed(3));
        // Opacity on a slot forces it out of the shared 3D context, so the
        // browser's depth sort stops being reliable and a far card could paint
        // over a near one. Stacking order says outright which is in front.
        node.style.zIndex = String(Math.round(depth * 100));
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  // Only turn while the section is actually on screen.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? true),
      { threshold: 0.15 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [ref]);

  // Escape closes the open card; arrows turn the ring.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zoomed !== null) {
        setZoomed(null);
        slotsRef.current[zoomed]?.focus();
        return;
      }
      if (zoomed !== null) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed, step]);

  // Swipe turns the ring on touch.
  const touch = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touch.current;
    if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  const open = zoomed === null ? null : PROJECTS[zoomed];

  return (
    <section
      id="work"
      ref={(node) => {
        ref.current = node;
        spotlightRef.current = node;
      }}
      data-surface="black"
      className="ed-spotlight"
      style={{
        backgroundColor: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
        overflow: "hidden",
      }}
    >
      <div className="ed-shell">
        <div
          className="ed-rise"
          data-shown={shown}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            marginBottom: "clamp(1.5rem, 4vw, 2.5rem)",
            flexWrap: "wrap",
          }}
        >
          <p
            className="ed-label"
            style={{ margin: 0, color: "var(--ed-red-br)" }}
          >
            04 — Tanlangan loyihalar
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "var(--ed-gray-tx)",
            }}
          >
            Kartochkani bosing — to‘liq ochiladi
          </p>
        </div>

        <div
          className="ed-rise"
          data-shown={shown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="ed-orbit-stage">
            <div
              className="ed-orbit-world"
              ref={worldRef}
              onPointerEnter={() => setHovered(true)}
              onPointerLeave={() => setHovered(false)}
              onFocusCapture={() => setFocused(true)}
              onBlurCapture={() => setFocused(false)}
            >
              {/* A standing pose, unlike the seated cutout the rest of the
                  site uses: the ring has to turn around a figure, and a seated
                  one puts the head exactly where the front card passes.
                  Decorative — the about section names and describes him. */}
              <div className="ed-orbit-figure">
                <img src={orbitPortrait} alt="" aria-hidden="true" />
              </div>

              {PROJECTS.map((project, i) => (
                <button
                  key={project.id}
                  type="button"
                  ref={(node) => {
                    slotsRef.current[i] = node;
                  }}
                  className="ed-orbit-slot"
                  style={{ ["--ed-slot" as string]: `${i * STEP}deg` }}
                  onFocus={() => bringToFront(i)}
                  onClick={() => setZoomed(i)}
                  aria-label={`${project.title} — loyihani ochish`}
                >
                  <span className="ed-orbit-face" style={{ display: "block" }}>
                    <span className="ed-orbit-index">{project.index}</span>
                    <h3 className="ed-orbit-title">
                      {project.title}
                      {project.titleAlt ? ` ${project.titleAlt}` : ""}
                    </h3>
                    <p className="ed-orbit-cat">{project.category}</p>
                    {project.shot && (
                      <span className="ed-orbit-shot">
                        <img src={project.shot} alt="" aria-hidden="true" />
                      </span>
                    )}
                    <span className="ed-orbit-open">
                      Ochish <Arrow direction="upRight" size="0.8em" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.25rem",
              marginTop: "clamp(1rem, 3vw, 2rem)",
            }}
          >
            <button
              type="button"
              className="ed-btn"
              onClick={() => step(-1)}
              aria-label="Oldingi loyiha"
              style={{ padding: "0.7rem 1.2rem" }}
            >
              <Arrow direction="left" size="0.85em" />
            </button>
            <span
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.18em",
                color: "var(--ed-gray-tx)",
              }}
            >
              {String(PROJECTS.length).padStart(2, "0")} ta loyiha
            </span>
            <button
              type="button"
              className="ed-btn"
              onClick={() => step(1)}
              aria-label="Keyingi loyiha"
              style={{ padding: "0.7rem 1.2rem" }}
            >
              <Arrow size="0.85em" />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="ed-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={() => setZoomed(null)}
        >
          <div className="ed-zoom-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ed-zoom-close"
              onClick={() => setZoomed(null)}
              aria-label="Yopish"
            >
              ✕
            </button>

            {open.shot && (
              <div className="ed-zoom-shot">
                <img src={open.shot} alt={`${open.title} ekrani`} />
              </div>
            )}

            <p
              className="ed-label"
              style={{ margin: 0, color: "var(--ed-red-br)" }}
            >
              {open.index} — {open.category}
            </p>
            <h3
              style={{
                margin: "0.5rem 0 0.75rem",
                fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {open.title}
              {open.titleAlt ? ` ${open.titleAlt}` : ""}
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "clamp(1rem, 2vw, 1.25rem)",
                lineHeight: 1.45,
                maxWidth: "60ch",
              }}
            >
              {open.summary}
            </p>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: "var(--ed-gray-tx)",
                lineHeight: 1.7,
                maxWidth: "70ch",
              }}
            >
              {open.detail}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {open.tech.map((t) => (
                <span
                  key={t}
                  style={{
                    borderRadius: "999px",
                    border: "1px solid rgba(245,242,239,0.18)",
                    padding: "0.35rem 0.85rem",
                    fontSize: "0.62rem",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ed-gray-tx)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {open.demo && (
                <Link className="ed-btn" to={open.demo}>
                  Jonli demo <Arrow size="0.85em" />
                </Link>
              )}
              {open.site && (
                <a
                  className="ed-btn"
                  href={open.site}
                  target="_blank"
                  rel="noreferrer"
                >
                  Saytni ochish <Arrow direction="upRight" size="0.85em" />
                </a>
              )}
              {open.bot && (
                <a
                  className="ed-btn"
                  href={`https://t.me/${open.bot}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Telegram bot <Arrow direction="upRight" size="0.85em" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
