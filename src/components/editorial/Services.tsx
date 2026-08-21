import { Link } from "@tanstack/react-router";
import { useReveal } from "./useReveal";
import { Arrow } from "./icons";

const SERVICES = [
  {
    num: "01",
    name: "Full-stack Development",
    note: "Sayt, marketplace, dashboard va mobil ilova — bitta izchil arxitektura bilan.",
  },
  {
    num: "02",
    name: "AI Systems",
    note: "Real ma'lumot bazasiga ulangan AI xizmat, agentlar va model routing.",
  },
  {
    num: "03",
    name: "SaaS Products",
    note: "Ko'p-tenantli CRM va boshqaruv tizimlari, obuna va to'lov davrlari bilan.",
  },
  {
    num: "04",
    name: "Automation",
    note: "Telegram botlar, mini-ilovalar va takroriy jarayonlarni avtomatlashtirish.",
  },
];

export function Services() {
  const { ref, shown } = useReveal<HTMLElement>(0.08);

  return (
    <section
      id="services"
      ref={ref}
      data-surface="offwhite"
      style={{
        background: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
      }}
    >
      <div
        className="ed-shell"
        style={{ marginBottom: "clamp(2rem, 5vw, 3.5rem)" }}
      >
        <p
          className="ed-label ed-rise"
          data-shown={shown}
          style={{ margin: 0, color: "var(--ed-red)" }}
        >
          03 — Services
        </p>
      </div>

      <div>
        {SERVICES.map((s, i) => (
          <a
            key={s.num}
            href="#contact"
            className="ed-service ed-rise"
            data-shown={shown}
            style={{ transitionDelay: `${i * 0.07}s` }}
          >
            <span className="ed-service-num">{s.num}</span>
            <span>
              <span className="ed-service-name" style={{ display: "block" }}>
                {s.name}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: "0.5rem",
                  fontSize: "0.9rem",
                  opacity: 0.7,
                  maxWidth: "34rem",
                }}
              >
                {s.note}
              </span>
            </span>
            <span className="ed-service-arrow" aria-hidden="true">
              <Arrow />
            </span>
          </a>
        ))}
      </div>

      <div
        className="ed-shell ed-rise"
        data-shown={shown}
        style={{
          marginTop: "clamp(2.5rem, 6vw, 4rem)",
          transitionDelay: "0.35s",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Link
          to="/xizmatlar"
          className="ed-btn"
          style={{
            background: "var(--ed-red-br)",
            borderColor: "var(--ed-red-br)",
            color: "var(--ed-offwhite)",
          }}
        >
          Barcha narxlarni ko'rish <Arrow size="0.85em" />
        </Link>
      </div>
    </section>
  );
}
