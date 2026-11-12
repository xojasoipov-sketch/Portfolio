import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Arrow } from "@/components/editorial/icons";
import { Reveal, Rise } from "./Reveal";

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

/**
 * The rows start piled on the first one, like a stack of cards, and
 * unfold downward into the list as the visitor scrolls (a transform per
 * row, linked to scroll). At the end of the range they sit exactly where
 * the plain list would, so nothing depends on the motion having played.
 */
function FanRow({
  p,
  i,
  reduce,
  children,
}: {
  p: MotionValue<number>;
  i: number;
  reduce: boolean;
  children: React.ReactNode;
}) {
  const y = useTransform(p, [0, 1], [`${-i * 100}%`, "0%"]);
  const scale = useTransform(p, [0, 1], [1 - i * 0.035, 1]);
  const opacity = useTransform(p, [i * 0.1, i * 0.1 + 0.35], [i ? 0 : 1, 1]);
  if (reduce) return <>{children}</>;
  return (
    <motion.div style={{ y, scale, opacity, transformOrigin: "50% 0%" }}>
      {children}
    </motion.div>
  );
}

export function Services() {
  const reduce = Boolean(useReducedMotion());
  const list = useRef<HTMLUListElement>(null);
  const { scrollYProgress } = useScroll({
    target: list,
    offset: ["start 0.92", "start 0.42"],
  });
  const p = useTransform(scrollYProgress, (v) => v);

  return (
    <section id="services" className="hx-section">
      <div className="hx-shell">
        <div className="hx-head">
          <Reveal as="p" className="hx-label">
            Xizmatlar
          </Reveal>
          <Rise
            className="hx-h2"
            i={1}
            parts={[{ t: "Nima" }, { t: "quraman", b: true }]}
          />
        </div>

        <ul ref={list} className="hx-rows">
          {SERVICES.map((s, i) => (
            <Reveal as="li" key={s.name} i={i} data-fan={i}>
              <FanRow p={p} i={i} reduce={reduce}>
                <a href="#contact" className="hx-row">
                  <span className="hx-row-no">0{i + 1}</span>
                  <span className="hx-row-name">{s.name}</span>
                  <span className="hx-row-note">{s.note}</span>
                  <span className="hx-row-arrow" aria-hidden="true">
                    <Arrow direction="upRight" />
                  </span>
                </a>
              </FanRow>
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
