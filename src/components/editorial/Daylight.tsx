import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import daylight from "@/assets/daylight.webp";

/**
 * Morning window light falling across the whole page: the "clean room"
 * aura. One grayscale shadow map (generated with Higgsfield, 17 KB) is laid
 * over the page with multiply, so its shadows land on the paper, the cards
 * and the words alike, like real light in a quiet studio.
 *
 * Two slow, compositor-only motions keep it alive:
 *  - CSS "breeze": the leaves sway a few pixels over ~14s (ed-breeze);
 *  - scroll: the light drifts down and across as the visitor reads, the
 *    way the sun moves over a long morning.
 *
 * It sits above content with pointer-events: none and is hidden from
 * assistive tech. Under prefers-reduced-motion it stays still.
 */
export function Daylight() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // Plain function transforms on purpose (see Hero.tsx): keeps framer from
  // handing this to a native ScrollTimeline.
  const y = useTransform(scrollYProgress, (v) => `${-4 + v * 10}%`);
  const x = useTransform(scrollYProgress, (v) => `${v * -6}%`);

  return (
    <div className="ed-daylight" aria-hidden="true">
      <motion.div
        className="ed-daylight-sun"
        style={reduce ? undefined : { x, y }}
      >
        <div
          className="ed-daylight-map"
          style={{ backgroundImage: `url(${daylight})` }}
        />
      </motion.div>
    </div>
  );
}
