import type { CSSProperties } from "react";

/**
 * A number whose digits are reels: each digit is a column of 0-9 that
 * slides to its value, one column after another, the way a mechanical
 * counter settles. Non-digit characters (a dash, a plus) stand still.
 *
 * The final value is always what is in the DOM for assistive tech (the
 * wrapper's label); the reels are decoration. All motion is a single
 * translateY per column, driven by CSS transitions (.hx-odo in home.css).
 */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Odometer({
  value,
  label,
  instant = false,
  className,
}: {
  value: string;
  /** Accessible name; defaults to the value. */
  label?: string;
  /** Jump to the value without animating (used to rewind before a play). */
  instant?: boolean;
  className?: string;
}) {
  return (
    <span
      className={["hx-odo", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={label ?? value}
      data-instant={instant || undefined}
    >
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span
            key={i}
            className="hx-odo-col"
            aria-hidden="true"
            style={{ "--k": i } as CSSProperties}
          >
            <span
              className="hx-odo-reel"
              style={{
                transform: `translateY(calc(${-Number(ch)} * var(--odo-h)))`,
              }}
            >
              {DIGITS.map((d) => (
                <i key={d}>{d}</i>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className="hx-odo-ch" aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
