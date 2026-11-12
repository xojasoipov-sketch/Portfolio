import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Reveal, Rise } from "./Reveal";
import { Odometer } from "./Odometer";

/**
 * How the work goes, as one line that draws itself down the page while
 * the visitor reads: each step lights up when the line reaches it. The
 * line is a single scaleY transform driven by scroll; the active step is
 * React state that changes four times over the whole section.
 *
 * Every step is readable before it is reached (it is only quieter), and
 * under prefers-reduced-motion all four are shown at full strength.
 */
const STEPS = [
  {
    title: "Tinglayman",
    text: "Avval biznesingizni ko'raman. Qayerda vaqt ketyapti, qayerda mijoz yo'qolyapti?",
  },
  {
    title: "Bitta ishni tanlaymiz",
    text: "Hammasini birdan emas. Eng ko'p takrorlanadigan bitta ishdan boshlaymiz.",
  },
  {
    title: "Quraman",
    text: "Birinchi ishlaydigan natijani odatda 3–7 kun ichida ko'rasiz.",
  },
  {
    title: "Yoningizda qolaman",
    text: "Tizim ishga tushgach ham kuzataman va yaxshilab boraman.",
  },
] as const;

export function Process() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.72", "end 0.62"],
  });
  const p = useTransform(scrollYProgress, (v) => v);
  const [active, setActive] = useState(0);

  useMotionValueEvent(p, "change", (v) => {
    const next = Math.min(
      STEPS.length - 1,
      Math.max(0, Math.floor(v * STEPS.length + 0.15)),
    );
    setActive((cur) => (cur === next ? cur : next));
  });

  const reached = reduce ? STEPS.length - 1 : active;

  return (
    <section id="process" className="hx-section">
      <div className="hx-shell hx-process">
        <div className="hx-process-head">
          <Reveal as="p" className="hx-label">
            Jarayon
          </Reveal>
          <Rise
            className="hx-h2"
            i={1}
            parts={[{ t: "Tartibsizlikdan" }, { t: "tizimgacha.", b: true }]}
          />
          <div className="hx-counter" aria-hidden="true">
            <span className="hx-counter-now">
              <Odometer value={`0${reached + 1}`} />
            </span>
            <span className="hx-counter-of">/ 0{STEPS.length}</span>
          </div>
        </div>

        <div ref={ref} className="hx-steps-wrap">
          <span className="hx-rail" aria-hidden="true">
            <motion.span
              className="hx-rail-fill"
              style={reduce ? { scaleY: 1 } : { scaleY: p }}
            />
          </span>
          <ol className="hx-steps">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="hx-step"
                data-on={i <= reached || undefined}
              >
                <span className="hx-step-node" aria-hidden="true" />
                <span className="hx-step-no">0{i + 1}</span>
                <h3 className="hx-step-title">{s.title}</h3>
                <p className="hx-step-text">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
