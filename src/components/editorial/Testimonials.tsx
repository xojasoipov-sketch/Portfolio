import { TESTIMONIALS } from "@/data/testimonials";
import { useReveal } from "./useReveal";

/**
 * Renders nothing until there is at least one real testimonial, so an empty
 * section can never ship to the live site. See src/data/testimonials.ts.
 */
export function Testimonials() {
  const { ref, shown } = useReveal<HTMLElement>(0.08);

  if (TESTIMONIALS.length === 0) return null;

  return (
    <section
      id="testimonials"
      ref={ref}
      data-surface="offwhite"
      style={{
        background: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
      }}
    >
      <div className="ed-shell">
        <p
          className="ed-label ed-rise"
          data-shown={shown}
          style={{
            margin: "0 0 clamp(2rem, 5vw, 3.5rem)",
            color: "var(--ed-red)",
          }}
        >
          05 — Mijozlar fikri
        </p>

        <ul className="ed-quotes">
          {TESTIMONIALS.map((t, i) => (
            <li
              key={`${t.author}-${i}`}
              className="ed-quote ed-rise"
              data-shown={shown}
              style={{ transitionDelay: `${Math.min(i * 0.08, 0.4)}s` }}
            >
              <blockquote className="ed-quote-text">{`“${t.quote}”`}</blockquote>
              <footer className="ed-quote-by">
                <span className="ed-quote-author">{t.author}</span>
                <span className="ed-quote-role">
                  {[t.role, t.company].filter(Boolean).join(", ")}
                </span>
                {t.project && (
                  <span className="ed-label ed-quote-project">{t.project}</span>
                )}
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
