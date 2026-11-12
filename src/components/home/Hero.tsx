import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Arrow } from "@/components/editorial/icons";
import { Inbox } from "./Inbox";
import { Magnetic } from "./Magnetic";
import { AVATAR, FIGURE } from "./media";

/**
 * The hook (uslub.md, 5.1): the visitor's three pains in plain ink, the
 * one promise, the one CTA, and next to them the owner and one object,
 * the inbox that sorts itself out.
 *
 * The first paint is the finished frame. The entrance is a short CSS
 * animation that needs no JavaScript (lines rise out of their own mask),
 * so the headline is legible even before hydration.
 *
 * On top of that the stage has depth: the disc, the figure and the card
 * sit on two planes that shift by a few pixels against each other, with
 * the mouse on a desktop and with scroll everywhere. The inbox card has its
 * own place under the copy (the dock) and never covers the portrait; it
 * floats slowly on its own (CSS). All of it is transform only and none of it
 * gates anything.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const p = useTransform(scrollYProgress, (v) => v);
  const figureY = useTransform(p, [0, 1], ["0%", "-7%"]);
  const figureScale = useTransform(p, [0, 1], [1, 1.04]);
  const discY = useTransform(p, [0, 1], ["0%", "12%"]);

  // Pointer position over the hero, -1..1 on both axes, eased by a spring
  // so the planes glide instead of tracking the cursor rigidly.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 60, damping: 18, mass: 0.6 };
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);
  const figX = useTransform(sx, (v) => v * 10);
  const figPY = useTransform(sy, (v) => v * 6);
  const discX = useTransform(sx, (v) => v * -16);
  const discPY = useTransform(sy, (v) => v * -10);

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onPointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section
      id="top"
      ref={ref}
      className="hx-hero"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="hx-dots" aria-hidden="true" />
      <div className="hx-shell hx-hero-grid">
        <div className="hx-hero-copy">
          <p
            className="hx-eyebrow hx-in"
            style={{ "--d": 0 } as React.CSSProperties}
          >
            <img
              src={AVATAR}
              alt=""
              width={44}
              height={44}
              className="hx-avatar"
              decoding="async"
            />
            <span>
              Saidburxon Xojasoipov
              <span className="hx-eyebrow-sub">SadiPrime Lab asoschisi</span>
            </span>
          </p>

          <h1 className="hx-h1">
            {[
              ["Javobsiz", "xabarlar."],
              ["Yo'qolgan", "arizalar."],
              ["Charchagan", "admin."],
            ].map(([a, b], i) => (
              <span className="hx-line" key={a}>
                <span style={{ "--d": i + 1 } as React.CSSProperties}>
                  {a} <b>{b}</b>
                </span>
              </span>
            ))}
          </h1>

          <p
            className="hx-sub hx-in"
            style={{ "--d": 5 } as React.CSSProperties}
          >
            Bularni <em>tinch</em> ishlaydigan tizimga aylantiraman.
          </p>

          <div
            className="hx-cta hx-in"
            style={{ "--d": 6 } as React.CSSProperties}
          >
            <Magnetic>
              <a href="#contact" className="hx-btn hx-btn-accent">
                Bepul tahlil <Arrow size="0.95em" />
              </a>
            </Magnetic>
            <a href="#work" className="hx-textlink">
              Ishlarni ko'rish <Arrow direction="down" size="0.9em" />
            </a>
          </div>
        </div>

        <div
          className="hx-stage hx-in"
          style={{ "--d": 4 } as React.CSSProperties}
        >
          <motion.div
            className="hx-plane"
            aria-hidden="true"
            style={reduce ? undefined : { x: discX, y: discPY }}
          >
            <motion.div
              className="hx-disc"
              style={reduce ? undefined : { y: discY }}
            />
          </motion.div>
          <motion.div
            className="hx-plane"
            style={reduce ? undefined : { x: figX, y: figPY }}
          >
            <motion.div
              className="hx-figure"
              style={reduce ? undefined : { y: figureY, scale: figureScale }}
            >
              <img
                src={FIGURE}
                alt="Saidburxon Xojasoipov"
                width={760}
                height={1446}
                loading="eager"
                decoding="sync"
                fetchPriority="high"
              />
            </motion.div>
          </motion.div>
        </div>

        <div
          className="hx-dock hx-in"
          style={{ "--d": 7 } as React.CSSProperties}
        >
          <Inbox />
        </div>
      </div>
    </section>
  );
}
