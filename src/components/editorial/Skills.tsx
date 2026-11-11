import { useReveal } from "./useReveal";
import { Spoken } from "./Spoken";

/**
 * Twelve tools used to be one long hairline list, numbered 01-12. Grouped
 * into the three areas they actually serve, the same names read at a
 * glance and the section stops being the longest scroll on the page.
 */
const GROUPS: { title: string; items: string[] }[] = [
  { title: "Frontend", items: ["React", "Next.js", "TypeScript"] },
  {
    title: "Backend va infratuzilma",
    items: [
      "Python",
      "FastAPI",
      "PostgreSQL",
      "MongoDB",
      "Docker",
      "Cloudflare",
    ],
  },
  {
    title: "AI va avtomatlashtirish",
    items: ["AI Agents", "LLM APIs", "Telegram API"],
  },
];

export function Skills() {
  const { ref, shown } = useReveal<HTMLElement>(0.08);

  return (
    <section
      id="skills"
      ref={ref}
      style={{ paddingBlock: "var(--ed-section)" }}
    >
      <div className="ed-shell">
        <Spoken
          as="h2"
          className="ed-display"
          style={{
            fontSize: "clamp(2rem, 5vw, 4rem)",
            margin: "0 0 clamp(2rem, 5vw, 3.5rem)",
          }}
          parts={[{ text: "Texnologiyalar", tone: "key" }]}
        />

        <div className="ed-stack">
          {GROUPS.map((g, i) => (
            <div
              key={g.title}
              className="ed-stack-group ed-rise"
              data-shown={shown}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <h3 className="ed-stack-title">{g.title}</h3>
              <ul className="ed-stack-list">
                {g.items.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
