import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

/**
 * One oversized line that slides sideways as the page scrolls: the path
 * every project takes, in four words. It is decoration (the same steps are
 * spelled out in the process section above), so it is hidden from
 * assistive tech. Scroll drives a single translateX; under
 * prefers-reduced-motion the line stands still.
 */
const WORDS = ["Audit", "Reja", "Tizim", "Natija"];

export function Drift() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const p = useTransform(scrollYProgress, (v) => v);
  const x = useTransform(p, [0, 1], ["2%", "-38%"]);

  return (
    <div ref={ref} className="hx-drift" aria-hidden="true">
      <motion.div className="hx-drift-line" style={reduce ? undefined : { x }}>
        {[0, 1, 2].map((k) =>
          WORDS.map((w, i) => (
            <span key={`${k}-${w}`} style={{ display: "contents" }}>
              {i === 2 ? <i>{w}</i> : w}
              <span>—</span>
            </span>
          )),
        )}
      </motion.div>
    </div>
  );
}
