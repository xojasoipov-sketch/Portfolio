import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PROJECTS } from "@/data/projects";
import { useReveal } from "./useReveal";
import { useSpotlight } from "./useSpotlight";
import { Arrow } from "./icons";

export function Projects() {
  const { ref, shown } = useReveal<HTMLElement>(0.06);
  const spotlightRef = useSpotlight<HTMLElement>();
  const [active, setActive] = useState(0);
  const total = PROJECTS.length;

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + total) % total),
    [total],
  );

  // Arrow keys drive the carousel once it is the section in view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const node = ref.current;
    node?.addEventListener("keydown", onKey as EventListener);
    return () => node?.removeEventListener("keydown", onKey as EventListener);
  }, [go, ref]);

  // Touch swipe
  const touch = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touch.current === null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 55) go(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  const project = PROJECTS[active];

  return (
    <section
      id="work"
      ref={(node) => {
        ref.current = node;
        spotlightRef.current = node;
      }}
      tabIndex={-1}
      data-surface="black"
      className="ed-spotlight"
      style={{
        backgroundColor: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
        outline: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
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
            marginBottom: "clamp(1.5rem, 4vw, 3rem)",
          }}
        >
          <p
            className="ed-label"
            style={{ margin: 0, color: "var(--ed-red-br)" }}
          >
            04 — Tanlangan loyihalar
          </p>
          <p className="ed-label" style={{ margin: 0, opacity: 0.55 }}>
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </p>
        </div>

        <article key={project.id} className="ed-proj">
          <div className="ed-proj-head">
            <span className="ed-display ed-proj-index" aria-hidden="true">
              {project.index}
            </span>
            <h3 className="ed-display ed-proj-title">
              {project.title}
              {project.titleAlt && (
                <>
                  <br />
                  <span style={{ color: "var(--ed-red-br)" }}>
                    {project.titleAlt}
                  </span>
                </>
              )}
            </h3>
          </div>

          <div className="ed-proj-visual">
            {project.shot ? (
              <img
                src={project.shot}
                alt={`${project.title} bosh sahifasi`}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <ProjectPlate title={project.title} category={project.category} />
            )}
          </div>

          <div className="ed-proj-meta">
            <div>
              <p
                className="ed-label"
                style={{ margin: 0, color: "var(--ed-red-br)" }}
              >
                {project.category}
              </p>
              <p
                style={{
                  margin: "0.9rem 0 0",
                  fontSize: "clamp(1.05rem, 1.6vw, 1.3rem)",
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                {project.summary}
              </p>
              <p
                style={{
                  margin: "1rem 0 0",
                  fontSize: "0.95rem",
                  lineHeight: 1.7,
                  opacity: 0.68,
                  maxWidth: "40rem",
                }}
              >
                {project.detail}
              </p>
            </div>

            <div>
              <ul className="ed-proj-tech">
                {project.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  marginTop: "1.5rem",
                }}
              >
                {project.demo && (
                  <Link className="ed-btn" to={project.demo}>
                    Jonli demo <Arrow direction="right" size="0.85em" />
                  </Link>
                )}
                {project.site && (
                  <a
                    className="ed-btn"
                    href={project.site}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Saytni ochish <Arrow direction="upRight" size="0.85em" />
                  </a>
                )}
                {project.bot && (
                  <a
                    className="ed-btn"
                    href={`https://t.me/${project.bot}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Telegram bot <Arrow direction="upRight" size="0.85em" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>

        <div className="ed-proj-nav">
          <button type="button" className="ed-btn" onClick={() => go(-1)}>
            <Arrow direction="left" size="0.85em" />{" "}
            {PROJECTS[(active - 1 + total) % total].title}
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            {PROJECTS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${p.title} loyihasiga o'tish`}
                aria-current={i === active}
                style={{
                  width: i === active ? 28 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: 0,
                  cursor: "pointer",
                  background:
                    i === active ? "var(--ed-red-br)" : "rgba(245,242,239,0.3)",
                  transition:
                    "width 0.4s cubic-bezier(0.22,1,0.36,1), background 0.3s ease",
                }}
              />
            ))}
          </div>

          <button type="button" className="ed-btn" onClick={() => go(1)}>
            {PROJECTS[(active + 1) % total].title} <Arrow size="0.85em" />
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Stand-in visual for a project with no screenshot yet: an oversized
 * typographic plate rather than an empty frame.
 */
function ProjectPlate({
  title,
  category,
}: {
  title: string;
  category: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background:
          "repeating-linear-gradient(135deg, rgba(142,7,16,0.12) 0 2px, transparent 2px 14px), #0E0E0E",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <span
          className="ed-display"
          style={{
            fontSize: "clamp(2.5rem, 8vw, 6rem)",
            color: "rgba(245,242,239,0.14)",
            display: "block",
          }}
        >
          {title}
        </span>
        <span
          className="ed-label"
          style={{ color: "var(--ed-red-br)", opacity: 0.85 }}
        >
          {category}
        </span>
      </div>
    </div>
  );
}
