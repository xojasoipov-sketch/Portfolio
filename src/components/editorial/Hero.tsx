import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Portrait } from "./Portrait";
import { Spoken } from "./Spoken";
import { Arrow } from "./icons";

/**
 * The hook, played as a pinned scene: the page opens like one of the
 * owner's reels (uslub.md, 5.1). The frame holds still while the visitor
 * scrolls, and the scroll plays it:
 *
 *   load     "Javobsiz xabarlar."   an unanswered chat card drops in
 *   scroll   "Yo'qolgan arizalar."  a lost request card
 *            "Charchagan admin."    the same question, again
 *   turn     the three pains dim, the cards straighten into one neat
 *            column and each flips to its solved state
 *            "Bularni tinch ishlaydigan tizimga aylantiraman."
 *   end      the one CTA
 *
 * Everything moves through transform, opacity, color and filter on
 * MotionValues: no React re-render per frame, no layout reads on scroll.
 * Under prefers-reduced-motion the scene is not pinned and shows its
 * final, solved state at once.
 */
export function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Line one is said on load, so the page never opens on blurred text.
  const intro = useMotionValue(0);
  useEffect(() => {
    if (reduce) {
      intro.set(1);
      return;
    }
    const c = animate(intro, 1, {
      duration: 1.1,
      delay: 0.25,
      ease: [0.215, 0.61, 0.355, 1],
    });
    return () => c.stop();
  }, [intro, reduce]);

  // Reduced motion: a fixed 1, i.e. the scene shown solved.
  const still = useMotionValue(1);
  // Routed through a plain function transform on purpose: framer-motion
  // otherwise hands opacity/filter mappings of a scroll value to a native
  // ScrollTimeline, which mis-maps multi-stop ranges here (values rose and
  // then fell back past the end of their range). The JS path is exact and
  // still runs off framer's single batched scroll source.
  const scrolled = useTransform(scrollYProgress, (v) => v);
  const p: MotionValue<number> = reduce ? still : scrolled;

  const hookOpacity = useTransform(p, [0.5, 0.64], [1, 0.22]);
  const hookY = useTransform(p, [0.5, 0.64], [0, -18]);
  const ctaOpacity = useTransform(p, [0.7, 0.8], [0, 1]);
  const ctaY = useTransform(p, [0.7, 0.8], [16, 0]);
  const camera = useTransform(p, [0, 1], [1, 1.04]);
  const figureY = useTransform(p, [0, 1], ["0%", "-6%"]);

  return (
    <section
      id="top"
      ref={ref}
      className="ed-scene"
      data-still={reduce ? "true" : undefined}
    >
      <motion.div className="ed-scene-frame" style={{ scale: camera }}>
        <div className="ed-shell ed-scene-grid">
          <div className="ed-scene-copy">
            <p className="ed-hero-name">Saidburxon Xojasoipov</p>

            <motion.h1
              className="ed-hook"
              style={{ opacity: hookOpacity, y: hookY }}
            >
              <Spoken
                as="span"
                className="ed-hook-line"
                progress={intro}
                parts={[
                  { text: "Javobsiz", tone: "intro" },
                  { text: "xabarlar.", tone: "key" },
                ]}
              />
              <Spoken
                as="span"
                className="ed-hook-line"
                progress={p}
                range={[0.1, 0.24]}
                parts={[
                  { text: "Yo'qolgan", tone: "intro" },
                  { text: "arizalar.", tone: "key" },
                ]}
              />
              <Spoken
                as="span"
                className="ed-hook-line"
                progress={p}
                range={[0.27, 0.41]}
                parts={[
                  { text: "Charchagan", tone: "intro" },
                  { text: "admin.", tone: "key" },
                ]}
              />
            </motion.h1>

            <Spoken
              className="ed-hook-sub"
              progress={p}
              range={[0.56, 0.7]}
              parts={[
                { text: "Bularni" },
                { text: "tinch", tone: "serif" },
                { text: "ishlaydigan tizimga aylantiraman." },
              ]}
            />

            <motion.div style={{ opacity: ctaOpacity, y: ctaY }}>
              <a href="#contact" className="ed-btn ed-btn-solid">
                Bepul tahlil <Arrow size="0.85em" />
              </a>
            </motion.div>
          </div>

          <div className="ed-scene-stage" aria-hidden="true">
            <motion.div className="ed-scene-figure" style={{ y: figureY }}>
              <div className="ed-float">
                <Portrait treatment="mono" priority />
              </div>
            </motion.div>

            <SceneCard
              p={p}
              intro={intro}
              index={0}
              meta="Telegram · 23:47"
              body="Assalomu alaykum, narxi qancha?"
              before="Javobsiz"
              after="Avtomatik javob berildi"
            />
            <SceneCard
              p={p}
              index={1}
              meta="Ariza · sayt formasi"
              body="Dilnoza, ingliz tili kursi"
              before="Hech kim ko'rmadi"
              after="Menejerga yuborildi"
            />
            <SceneCard
              p={p}
              index={2}
              meta="Admin · bugun"
              body="Yana o'sha savol: manzil qayerda?"
              before="Qo'lda, yana va yana"
              after="Takroriy savollar avtomatik"
            />

            <span className="ed-maket">Maket</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/**
 * Where each card sits while things are a mess (x/y in % of its own box,
 * degrees) and when each one appears on the scroll timeline. The solved
 * state is the card's own CSS slot: a neat column, no rotation.
 */
const CHAOS = [
  { x: 34, y: -18, r: -9, at: [0, 0] },
  { x: 62, y: 22, r: 7, at: [0.12, 0.2] },
  { x: 10, y: 34, r: -5, at: [0.29, 0.37] },
] as const;

function SceneCard({
  p,
  intro,
  index,
  meta,
  body,
  before,
  after,
}: {
  p: MotionValue<number>;
  intro?: MotionValue<number>;
  index: number;
  meta: string;
  body: string;
  before: string;
  after: string;
}) {
  const c = CHAOS[index];
  const appear = intro ?? p;
  const [a0, a1] = intro ? [0.2, 0.8] : c.at;

  const opacity = useTransform(appear, [a0, a1], [0, 1]);
  const drop = useTransform(appear, [a0, a1], [24, 0]);
  // Straighten up, all three together, as the sentence turns.
  const order = useTransform(p, [0.5, 0.66], [0, 1]);
  const x = useTransform(order, [0, 1], [`${c.x}%`, "0%"]);
  const y = useTransform(
    [order, drop] as MotionValue<number>[],
    ([o, d]) => `calc(${(1 - (o as number)) * c.y}% + ${d as number}px)`,
  );
  const rotate = useTransform(order, [0, 1], [c.r, 0]);
  const solved = useTransform(p, [0.6, 0.7], [0, 1]);
  const unsolved = useTransform(solved, [0, 1], [1, 0]);

  return (
    <motion.div
      className="ed-card"
      data-slot={index}
      style={{ opacity, x, y, rotate }}
    >
      <span className="ed-card-meta">{meta}</span>
      <span className="ed-card-body">{body}</span>
      <span className="ed-card-status">
        <motion.span style={{ opacity: unsolved }}>{before}</motion.span>
        <motion.span className="ed-card-done" style={{ opacity: solved }}>
          ✓ {after}
        </motion.span>
      </span>
    </motion.div>
  );
}
