import { Fragment, type ElementType } from "react";
import { useReveal } from "./useReveal";

/**
 * Kinetic "spoken" text, the core motion of the uslub guide: every word is
 * already on screen in the muted, blurred "not yet said" state and turns to
 * ink, sharp, one after another when the line scrolls into view, as if it
 * were being read aloud. Pure CSS transitions on color and filter, driven by
 * one IntersectionObserver per block, so there is no scroll listener and no
 * animation-frame loop.
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

export function Spoken({
  parts,
  as: Tag = "p",
  className,
  style,
  step = 0.07,
  delay = 0,
  threshold = 0.35,
}: {
  parts: SpokenPart[];
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
  /** Seconds between two words. */
  step?: number;
  /** Seconds before the first word. */
  delay?: number;
  threshold?: number;
}) {
  const { ref, shown } = useReveal<HTMLElement>(threshold);
  let i = 0;

  return (
    <Tag
      ref={ref}
      className={["ed-spoken", className].filter(Boolean).join(" ")}
      data-shown={shown}
      style={style}
    >
      {parts.map((part, p) => (
        <Fragment key={p}>
          {part.br && p > 0 && <br />}
          {part.text
            .split(/\s+/)
            .filter(Boolean)
            .map((word, w, all) => {
              const idx = i++;
              return (
                <Fragment key={w}>
                  <span
                    className="ed-word"
                    data-tone={part.tone ?? "plain"}
                    style={
                      {
                        "--d": `${(delay + idx * step).toFixed(2)}s`,
                      } as React.CSSProperties
                    }
                  >
                    {word}
                  </span>
                  {/* The space carries the word's tone so it is sized like
                    the word next to it, not like the (much larger) block. */}
                  {w < all.length - 1 || needsSpace(parts, p) ? (
                    <span data-tone={part.tone ?? "plain"}> </span>
                  ) : null}
                </Fragment>
              );
            })}
        </Fragment>
      ))}
    </Tag>
  );
}

/** A space after a part's last word unless the next part opens a new line. */
function needsSpace(parts: SpokenPart[], p: number) {
  const next = parts[p + 1];
  return Boolean(next && !next.br);
}
