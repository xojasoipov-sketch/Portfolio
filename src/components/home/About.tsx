import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Reveal, Rise } from "./Reveal";
import { CLOSEUP } from "./media";

/**
 * Tools grouped by what they serve, so twelve names read at a glance
 * instead of as one long list.
 */
export const STACK: { title: string; items: string[] }[] = [
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

export function About() {
  const reduce = useReducedMotion();
  const photo = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: photo,
    offset: ["start end", "end start"],
  });
  const p = useTransform(scrollYProgress, (v) => v);
  // The portrait eases back from a slight close-up while it crosses the
  // screen, like a slow camera pull.
  const scale = useTransform(p, [0, 1], [1.14, 1]);

  return (
    <section id="about" className="hx-section">
      <div className="hx-shell">
        <div className="hx-about">
          <Reveal className="hx-about-photo">
            <motion.img
              style={reduce ? undefined : { scale }}
              src={CLOSEUP}
              alt="Saidburxon Xojasoipov"
              width={932}
              height={1165}
              loading="lazy"
              decoding="async"
            />
            <div ref={photo} className="hx-about-probe" aria-hidden="true" />
          </Reveal>

          <div className="hx-about-copy">
            <Reveal as="p" className="hx-label">
              Men haqimda
            </Reveal>
            <Rise
              className="hx-h2"
              i={1}
              parts={[{ t: "Men" }, { t: "kimman?", b: true }]}
            />
            <Reveal as="p" className="hx-lead" i={2}>
              Men to'liq stack dasturchiman: frontend, backend va mobil. So'nggi
              yillarda asosiy yo'nalishim sun'iy intellekt bilan integratsiya
              qilingan tizimlar: AI mijozlarga xizmat botlari, ko'p-provayderli
              AI infratuzilma, avtomatlashtirilgan SMM tizimlari va CRM'lar.
            </Reveal>
            <Reveal as="p" className="hx-body" i={3}>
              Zamonaviy AI-yordamchi vositalar bilan ishlaganim uchun
              loyihalarni an'anaviy agentliklarga nisbatan sezilarli tezroq
              yetkazib bera olaman. Birinchi ishlaydigan natijani odatda 3–7 kun
              ichida ko'rasiz.
            </Reveal>
            <Reveal as="p" className="hx-quote" i={4}>
              Har bir taklif taxmin emas, real tekshiruv natijasiga asoslanadi.
            </Reveal>
          </div>
        </div>

        <div id="skills" className="hx-stack">
          {STACK.map((g, i) => (
            <Reveal key={g.title} className="hx-stack-group" i={i}>
              <h3 className="hx-stack-title">{g.title}</h3>
              <ul className="hx-stack-list">
                {g.items.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
