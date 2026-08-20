/**
 * Curved section transitions — the signature shape language of the layout.
 * `variant` picks which surface the arc is carving into.
 */
export function CurveDivider({
  from,
  to,
  flip = false,
}: {
  from: "offwhite" | "black";
  to: "offwhite" | "black";
  flip?: boolean;
}) {
  const fill = to === "black" ? "var(--ed-black)" : "var(--ed-offwhite)";
  const bg = from === "black" ? "var(--ed-black)" : "var(--ed-offwhite)";

  return (
    <div aria-hidden="true" style={{ background: bg, lineHeight: 0 }}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{
          display: "block",
          width: "100%",
          height: "clamp(56px, 9vw, 120px)",
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      >
        <path
          d="M0,120 C420,0 1020,0 1440,120 L1440,120 L0,120 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

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
