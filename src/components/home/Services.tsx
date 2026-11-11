import { Link } from "@tanstack/react-router";
import { Arrow } from "@/components/editorial/icons";
import { Reveal } from "./Reveal";

/**
 * Four services as one calm list: large names on hairlines, the note
 * beside them, and an arrow that turns when the row is pointed at.
 */
const SERVICES = [
  {
    name: "To'liq stack ishlab chiqish",
    note: "Sayt, marketplace, dashboard va mobil ilova. Bitta izchil arxitektura bilan.",
  },
  {
    name: "AI tizimlari",
    note: "Real ma'lumot bazasiga ulangan AI xizmat, agentlar va model routing.",
  },
  {
    name: "SaaS mahsulotlar",
    note: "Ko'p-tenantli CRM va boshqaruv tizimlari, obuna va to'lov davrlari bilan.",
  },
  {
    name: "Avtomatlashtirish",
    note: "Telegram botlar, mini-ilovalar va takroriy jarayonlarni avtomatlashtirish.",
  },
] as const;

export function Services() {
  return (
    <section id="services" className="hx-section">
      <div className="hx-shell">
        <div className="hx-head">
          <Reveal as="p" className="hx-label">
            Xizmatlar
          </Reveal>
          <Reveal as="h2" className="hx-h2" i={1}>
            Nima <b>quraman</b>
          </Reveal>
        </div>

        <ul className="hx-rows">
          {SERVICES.map((s, i) => (
            <Reveal as="li" key={s.name} i={i}>
              <a href="#contact" className="hx-row">
                <span className="hx-row-no">0{i + 1}</span>
                <span className="hx-row-name">{s.name}</span>
                <span className="hx-row-note">{s.note}</span>
                <span className="hx-row-arrow" aria-hidden="true">
                  <Arrow direction="upRight" />
                </span>
              </a>
            </Reveal>
          ))}
        </ul>

        <Reveal className="hx-rows-foot">
          <Link to="/xizmatlar" className="hx-textlink">
            Barcha narxlar <Arrow size="0.9em" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
