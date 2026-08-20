import { PORTRAIT } from "./portrait";

type Treatment = "natural" | "mono" | "duotone";

/**
 * The portrait as an editorial cutout. Each section gets a different
 * treatment so the same photo never reads as a repeat.
 *
 * Until the photo is supplied, this renders a composed placeholder built from
 * the same shapes the final cutout sits in, so the layout is already correct.
 */
export function Portrait({
  treatment = "natural",
  className,
  style,
}: {
  treatment?: Treatment;
  className?: string;
  style?: React.CSSProperties;
}) {
  const filter =
    treatment === "mono"
      ? "grayscale(1) contrast(1.08)"
      : treatment === "duotone"
        ? "grayscale(1) contrast(1.15) sepia(1) hue-rotate(-30deg) saturate(4.2)"
        : undefined;

  if (!PORTRAIT) {
    return (
      <PortraitPlaceholder
        treatment={treatment}
        className={className}
        style={style}
      />
    );
  }

  return (
    <img
      src={PORTRAIT}
      alt="Saidburxon Xojasoipov"
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "contain",
        objectPosition: "bottom center",
        filter,
        ...style,
      }}
    />
  );
}

/**
 * Placeholder that keeps the hero's mass and silhouette while the real cutout
 * is pending — a solid editorial shape rather than a grey box.
 */
function PortraitPlaceholder({
  treatment,
  className,
  style,
}: {
  treatment: Treatment;
  className?: string;
  style?: React.CSSProperties;
}) {
  const tone =
    treatment === "duotone"
      ? "var(--ed-red)"
      : treatment === "mono"
        ? "#2A2A2A"
        : "var(--ed-black)";

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 300 420"
        preserveAspectRatio="xMidYMax meet"
        style={{ width: "100%", height: "100%", display: "block" }}
        role="img"
        aria-label="Portret uchun ajratilgan joy"
      >
        {/* head + shoulders silhouette, matching a standing cutout */}
        <path
          d="M150 62c30 0 52 24 52 56 0 21-9 39-22 49 34 11 58 30 72 55 12 22 18 50 20 84 1 8-5 14-13 14H41c-8 0-14-6-13-14 2-34 8-62 20-84 14-25 38-44 72-55-13-10-22-28-22-49 0-32 22-56 52-56Z"
          fill={tone}
          opacity="0.14"
        />
        <path
          d="M150 62c30 0 52 24 52 56 0 21-9 39-22 49 34 11 58 30 72 55 12 22 18 50 20 84 1 8-5 14-13 14H41c-8 0-14-6-13-14 2-34 8-62 20-84 14-25 38-44 72-55-13-10-22-28-22-49 0-32 22-56 52-56Z"
          fill="none"
          stroke={tone}
          strokeWidth="1.25"
          strokeDasharray="7 7"
          opacity="0.5"
        />
      </svg>

      <span
        className="ed-label"
        style={{
          position: "absolute",
          bottom: "12%",
          left: "50%",
          transform: "translateX(-50%)",
          color: tone,
          opacity: 0.65,
          whiteSpace: "nowrap",
        }}
      >
        Portret
      </span>
    </div>
  );
}
