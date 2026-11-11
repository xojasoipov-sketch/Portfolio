import { Fragment, useRef, type ElementType } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

/**
 * A sentence that is "said" as the visitor scrolls (uslub.md, 4): every
 * word is on screen from the start in the quiet grey of a word not yet
 * spoken and turns to ink, one after another, while the block travels up
 * the viewport.
 *
 * Only colour changes. The words are never blurred or hidden, so the line
 * reads at any scroll position and the motion adds to it instead of
 * gating it. It is used below the fold only; the hero headline is plain
 * ink from the first paint.
 *
 * tone: "intro" 500 weight lead-in, "key" 800 weight, "serif" the one
 * Instrument Serif Italic word of a sentence.
 */
export type SaidPart = {
  text: string;
  tone?: "intro" | "key" | "serif";
  /** Start this part on a new line. */
  br?: boolean;
};

const PAPER = { mute: "#b9b6b0", ink: "#111111" };
const NIGHT = { mute: "#4a4947", ink: "#f6f5f2" };

export function Said({
  parts,
  as: Tag = "h2",
  className,
  night = false,
}: {
  parts: SaidPart[];
  as?: ElementType;
  className?: string;
  night?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.88", "start 0.38"],
  });
  // A plain function transform keeps framer-motion on its JS scroll source.
  // Handing a multi-stop colour mapping to a native ScrollTimeline mis-maps
  // the ranges in Chromium (words fell back to grey past the end).
  const p = useTransform(scrollYProgress, (v) => v);
  const palette = night ? NIGHT : PAPER;

  const words: { word: string; tone: string; br: boolean }[] = [];
  parts.forEach((part, pi) => {
    part.text
      .split(/\s+/)
      .filter(Boolean)
      .forEach((word, wi) => {
        words.push({
          word,
          tone: part.tone ?? "intro",
          br: Boolean(part.br && pi > 0 && wi === 0),
        });
      });
  });

  const n = words.length;
  // Each word takes a little over its share so neighbours overlap and the
  // line reads as speech rather than a ticker.
  const each = Math.min(1, (1 / n) * 2.4);

  return (
    <Tag ref={ref} className={["hx-said", className].filter(Boolean).join(" ")}>
      {words.map((w, i) => {
        const a = ((1 - each) * i) / Math.max(1, n - 1);
        return (
          <Fragment key={i}>
            {w.br ? <br /> : i > 0 ? " " : null}
            <Word
              p={p}
              a={a}
              b={a + each}
              from={palette.mute}
              to={palette.ink}
              tone={w.tone}
              still={Boolean(reduce)}
            >
              {w.word}
            </Word>
          </Fragment>
        );
      })}
    </Tag>
  );
}

function Word({
  p,
  a,
  b,
  from,
  to,
  tone,
  still,
  children,
}: {
  p: MotionValue<number>;
  a: number;
  b: number;
  from: string;
  to: string;
  tone: string;
  still: boolean;
  children: string;
}) {
  const color = useTransform(p, [a, b], [from, to]);
  if (still) {
    return (
      <span data-tone={tone} style={{ color: to }}>
        {children}
      </span>
    );
  }
  return (
    <motion.span data-tone={tone} style={{ color }}>
      {children}
    </motion.span>
  );
}
