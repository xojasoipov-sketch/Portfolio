import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { PROJECTS } from "@/data/projects";
import { Odometer } from "./Odometer";
import { STACK } from "./About";
import { Reveal, useInView } from "./Reveal";

/**
 * Three plain facts, every one of them already stated elsewhere on the
 * page (the projects in the ring, the tools in the stack, the "3-7 kun"
 * promise), so nothing here is a new claim. They arrive like a mechanical
 * counter: the reels spin from zero and settle, and a hairline draws
 * under each one.
 *
 * Without JavaScript, or with reduced motion, the reels simply show the
 * final numbers: they are only rewound once the page has hydrated.
 */
const TOOLS = STACK.reduce((n, g) => n + g.items.length, 0);

const FACTS = [
  { value: String(PROJECTS.length), label: "ishlab turgan loyiha" },
  { value: String(TOOLS), label: "ishlatadigan texnologiya" },
  { value: "3–7", label: "kunda birinchi natija" },
] as const;

export function Facts() {
  const reduce = useReducedMotion();
  const [ref, shown] = useInView<HTMLDivElement>();
  const [armed, setArmed] = useState(false);

  // Rewind the reels only after hydration, so the server-rendered markup
  // (and a visitor without JS) keeps the real numbers.
  useEffect(() => {
    if (!reduce) setArmed(true);
  }, [reduce]);

  const rewound = armed && !shown;

  return (
    <section className="hx-section hx-facts-sec" aria-label="Raqamlarda">
      <div className="hx-shell">
        <Reveal as="p" className="hx-label">
          Raqamlarda
        </Reveal>
        <div ref={ref} className="hx-facts" data-shown={shown}>
          {FACTS.map((f, i) => (
            <div
              className="hx-fact"
              key={f.label}
              style={{ "--f": i } as React.CSSProperties}
            >
              <Odometer
                className="hx-fact-num"
                value={rewound ? f.value.replace(/\d/g, "0") : f.value}
                label={f.value}
                instant={rewound}
              />
              <span className="hx-fact-rule" aria-hidden="true" />
              <span className="hx-fact-label">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
