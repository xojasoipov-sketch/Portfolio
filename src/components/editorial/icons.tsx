/**
 * Decorative arrow glyphs, drawn as SVG rather than the Unicode arrow
 * characters (→ ↗ ↓ ←) the site used before.
 *
 * Those characters are exactly the ones most likely to fall back to a
 * colourful platform emoji glyph instead of a plain text glyph (confirmed on
 * iOS Safari for ↗ specifically) -- the font stack has no control over that,
 * only a real vector guarantees the same thin editorial line on every
 * device. `rotate` reuses one path for every direction instead of drawing
 * four near-identical arrows.
 */
export function Arrow({
  direction = "right",
  size = "1em",
  style,
}: {
  direction?: "right" | "upRight" | "down" | "left";
  size?: number | string;
  style?: React.CSSProperties;
}) {
  const rotate = { right: 0, upRight: -45, down: 90, left: 180 }[direction];
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        display: "inline-block",
        verticalAlign: "-0.125em",
        transform: `rotate(${rotate}deg)`,
        flexShrink: 0,
        ...style,
      }}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
