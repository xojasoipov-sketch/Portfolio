import { Link } from "@tanstack/react-router";
import { useReveal } from "./useReveal";
import { Arrow } from "./icons";
import { Spoken } from "./Spoken";

/**
 * Four services as an asymmetric 2+2 bento (wide/narrow, then
 * narrow/wide) instead of four identical numbered rows. Each cell has its
 * own quiet surface (white, stone, dotted) so the grid does not read as
 * four copies.
 */
const SERVICES = [
  {
    name: "To'liq stack ishlab chiqish",
    note: "Sayt, marketplace, dashboard va mobil ilova. Bitta izchil arxitektura bilan.",
    tone: "white",
  },
  {
    name: "AI tizimlari",
    note: "Real ma'lumot bazasiga ulangan AI xizmat, agentlar va model routing.",
    tone: "stone",
  },
  {
    name: "SaaS mahsulotlar",
    note: "Ko'p-tenantli CRM va boshqaruv tizimlari, obuna va to'lov davrlari bilan.",
    tone: "dots",
  },
  {
    name: "Avtomatlashtirish",
    note: "Telegram botlar, mini-ilovalar va takroriy jarayonlarni avtomatlashtirish.",
    tone: "white",
  },
] as const;

export function Services() {
  const { ref, shown } = useReveal<HTMLElement>(0.08);

  return (
    <section
      id="services"
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
          parts={[{ text: "Xizmatlar", tone: "key" }]}
        />

        <div className="ed-bento">
          {SERVICES.map((s, i) => (
            <a
              key={s.name}
              href="#contact"
              className="ed-bento-cell ed-rise"
              data-tone={s.tone}
              data-shown={shown}
              style={{ transitionDelay: `${i * 0.07}s` }}
            >
              <span className="ed-bento-name">{s.name}</span>
              <span className="ed-bento-note">{s.note}</span>
              <span className="ed-bento-arrow" aria-hidden="true">
                <Arrow direction="upRight" />
              </span>
            </a>
          ))}
        </div>

        <div
          className="ed-rise"
          data-shown={shown}
          style={{
            marginTop: "clamp(2rem, 5vw, 3rem)",
            transitionDelay: "0.35s",
          }}
        >
          <Link to="/xizmatlar" className="ed-label ed-navlink">
            Barcha narxlar <Arrow size="0.85em" />
          </Link>
        </div>
      </div>
    </section>
  );
}
