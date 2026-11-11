/**
 * A thin red arc that floats over a section as a decorative editorial line.
 * Purely ornamental, so it is hidden from assistive tech.
 */
export function RedArc({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 600"
      className={className}
      style={{ position: "absolute", pointerEvents: "none", ...style }}
    >
      <circle
        cx="300"
        cy="300"
        r="290"
        fill="none"
        stroke="var(--ed-red)"
        strokeWidth="1"
        opacity="0.45"
      />
    </svg>
  );
}
