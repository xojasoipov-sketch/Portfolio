import { Fragment, useRef, type ElementType } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

/**
 * Kinetic "spoken" text, the core motion of the uslub guide. Every word is
 * on screen from the start in the muted, 6px-blurred "not yet said" state
 * and turns to ink, sharp, one after another. The reveal is scrubbed by
 * scroll: the visitor's scroll is the voice, so scrolling back un-says the
 * words again.
 *
 * Progress comes from framer-motion's useScroll (one shared, batched scroll
 * source, no per-component listener and no React re-render per frame), or
 * from a caller-supplied MotionValue so a pinned scene can choreograph
 * several lines on one timeline.
 *
 * tone:
 *  - "intro"  small lead-in words (weight 500)
 *  - "key"    the heavy key word(s) (weight 800)
 *  - "serif"  the single tonal word, Instrument Serif Italic
 *  - "accent" the one red word; use at most once per page
 */
export type SpokenPart = {
  text: string;
  tone?: "intro" | "key" | "serif" | "accent";
  /** Start this part on a new line. */
  br?: boolean;
};

const PAPER = { mute: "#b9b6b0", ink: "#111111", accent: "#b3121e" };
const NIGHT = { mute: "#3b3a38", ink: "#f6f5f2", accent: "#e8404a" };

export function Spoken({
  parts,
  as: Tag = "p",
  className,
  style,
  progress,
  range = [0, 1],
  night = false,
  ink,
}: {
  parts: SpokenPart[];
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
  /** Drive the reveal from an outer timeline instead of this block's scroll. */
  progress?: MotionValue<number>;
  /** The slice of `progress` over which the words are said. */
  range?: [number, number];
  /** Colors for the night surface. */
  night?: boolean;
  /** Final color of plain words, e.g. a grey for body copy. */
  ink?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "start 0.42"],
  });
  // Routed through a plain function transform on purpose: framer-motion
  // otherwise hands opacity/filter mappings of a scroll value to a native
  // ScrollTimeline, which mis-maps multi-stop ranges here (values rose and
  // then fell back past the end of their range). The JS path is exact and
  // still runs off framer's single batched scroll source.
  const own = useTransform(scrollYProgress, (v) => v);
  const p = progress ?? own;
  const palette = night ? NIGHT : PAPER;

  const words: { word: string; tone: string; space: boolean; br: boolean }[] =
    [];
  parts.forEach((part, pi) => {
    const list = part.text.split(/\s+/).filter(Boolean);
    list.forEach((word, wi) => {
      const next = parts[pi + 1];
      words.push({
        word,
        tone: part.tone ?? "plain",
        br: Boolean(part.br && pi > 0 && wi === 0),
        space: wi < list.length - 1 || Boolean(next && !next.br),
      });
    });
  });

  const n = words.length;
  const [r0, r1] = range;
  const span = r1 - r0;
  // Each word takes a little over its share so neighbours overlap a bit
  // and the line reads as speech, not as a ticker.
  const each = Math.min(span, (span / n) * 2.2);

  return (
    <Tag
      ref={ref}
      className={["ed-spoken", className].filter(Boolean).join(" ")}
      style={style}
    >
      {words.map((w, i) => {
        const a = r0 + ((span - each) * i) / Math.max(1, n - 1);
        const final =
          w.tone === "accent" ? palette.accent : (ink ?? palette.ink);
        return (
          <Fragment key={i}>
            {w.br && <br />}
            <Word
              p={p}
              a={a}
              b={a + each}
              mute={palette.mute}
              ink={final}
              tone={w.tone}
              still={Boolean(reduce)}
            >
              {w.word}
            </Word>
            {w.space && <span data-tone={w.tone}> </span>}
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
  mute,
  ink,
  tone,
  still,
  children,
}: {
  p: MotionValue<number>;
  a: number;
  b: number;
  mute: string;
  ink: string;
  tone: string;
  still: boolean;
  children: string;
}) {
  const color = useTransform(p, [a, b], [mute, ink]);
  const filter = useTransform(p, [a, b], ["blur(6px)", "blur(0px)"]);

  if (still) {
    return (
      <span className="ed-word" data-tone={tone} style={{ color: ink }}>
        {children}
      </span>
    );
  }
  return (
    <motion.span className="ed-word" data-tone={tone} style={{ color, filter }}>
      {children}
    </motion.span>
  );
}
