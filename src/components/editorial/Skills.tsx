import { useReveal } from "./useReveal";

const TECH = [
  "React",
  "Next.js",
  "TypeScript",
  "Python",
  "FastAPI",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "AI Agents",
  "LLM APIs",
  "Telegram API",
  "Cloudflare",
];

export function Skills() {
  const { ref, shown } = useReveal<HTMLElement>(0.08);

  return (
    <section
      id="skills"
      ref={ref}
      data-surface="offwhite"
      style={{
        background: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
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
            marginBottom: "clamp(2rem, 5vw, 3.5rem)",
            gap: "1rem",
          }}
        >
          <p className="ed-label" style={{ margin: 0, color: "var(--ed-red)" }}>
            02 — Technologies
          </p>
          <p
            className="ed-label"
            style={{ margin: 0, color: "var(--ed-gray-tx)" }}
          >
            {TECH.length}
          </p>
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {TECH.map((name, i) => (
            <li
              key={name}
              className="ed-skill ed-rise"
              data-shown={shown}
              style={{ transitionDelay: `${Math.min(i * 0.045, 0.5)}s` }}
            >
              <span className="ed-skill-name">{name}</span>
              <span className="ed-label" style={{ color: "var(--ed-gray-tx)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
