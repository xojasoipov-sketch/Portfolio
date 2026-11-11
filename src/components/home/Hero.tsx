import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Arrow } from "@/components/editorial/icons";
import { Inbox } from "./Inbox";
import { AVATAR, FIGURE, HERO_VIDEO } from "./media";

/**
 * The hook (uslub.md, 5.1): the visitor's three pains in plain ink, the
 * one promise, the one CTA, and next to them the owner and one object,
 * the inbox that sorts itself out.
 *
 * The first paint is the finished frame. The entrance is a short CSS
 * animation that needs no JavaScript (lines rise out of their own mask),
 * so the headline is legible even before hydration. Scroll only adds a
 * slow parallax to the figure; it gates nothing.
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
  const discY = useTransform(p, [0, 1], ["0%", "10%"]);

  return (
    <section id="top" ref={ref} className="hx-hero">
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
              width={36}
              height={36}
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
            <a href="#contact" className="hx-btn hx-btn-accent">
              Bepul tahlil <Arrow size="0.95em" />
            </a>
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
            className="hx-disc"
            aria-hidden="true"
            style={reduce ? undefined : { y: discY }}
          />
          <motion.div
            className="hx-figure"
            style={reduce ? undefined : { y: figureY, scale: figureScale }}
          >
            {HERO_VIDEO && !reduce ? (
              <video
                src={HERO_VIDEO}
                poster={FIGURE}
                autoPlay
                muted
                playsInline
                preload="metadata"
                aria-label="Saidburxon Xojasoipov"
              />
            ) : (
              <img
                src={FIGURE}
                alt="Saidburxon Xojasoipov"
                width={760}
                height={1446}
                loading="eager"
                decoding="sync"
                fetchPriority="high"
              />
            )}
          </motion.div>
          <Inbox />
        </div>
      </div>
    </section>
  );
}
