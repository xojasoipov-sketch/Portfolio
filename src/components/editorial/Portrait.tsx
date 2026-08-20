import { FACE_FOCUS, PORTRAIT } from "./portrait";

type Treatment = "natural" | "mono" | "duotone";

/** Unique ids so the SVG filter can be referenced from CSS. */
const DUOTONE_ID = "ed-duotone-red";

/**
 * The portrait as an editorial cutout.
 *
 * `fit="contain"` keeps the whole figure (hero); `fit="cover"` crops to the
 * face using FACE_FOCUS (about, contact). Treatments differentiate the three
 * appearances so the same photo never reads as a repeat.
 */
export function Portrait({
  treatment = "natural",
  fit = "contain",
  className,
  style,
}: {
  treatment?: Treatment;
  fit?: "contain" | "cover";
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!PORTRAIT) {
    return (
      <PortraitPlaceholder
        treatment={treatment}
        className={className}
        style={style}
      />
    );
  }

  const filter =
    treatment === "duotone"
      ? `url(#${DUOTONE_ID})`
      : treatment === "mono"
        ? "grayscale(1) contrast(1.12)"
        : undefined;

  return (
    <>
      {treatment === "duotone" && <DuotoneFilter />}
      <img
        src={PORTRAIT}
        alt="Saidburxon Xojasoipov"
        className={className}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: fit,
          objectPosition: fit === "cover" ? FACE_FOCUS : "bottom center",
          filter,
          ...style,
        }}
      />
    </>
  );
}

/**
 * Maps luminance onto a black → editorial-red ramp while preserving the
 * cutout's alpha, which a CSS sepia/hue-rotate chain cannot do cleanly.
 */
function DuotoneFilter() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute" }}
    >
      <filter id={DUOTONE_ID} colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          {/* lifted black #1A0405 → bright red #C2101C */}
          <feFuncR type="linear" slope="0.659" intercept="0.102" />
          <feFuncG type="linear" slope="0.047" intercept="0.016" />
          <feFuncB type="linear" slope="0.090" intercept="0.020" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}

/**
 * Kept for the case where the photo is swapped out again: holds the hero's
 * mass with an editorial shape rather than an empty box.
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
        <path
          d="M150 62c30 0 52 24 52 56 0 21-9 39-22 49 34 11 58 30 72 55 12 22 18 50 20 84 1 8-5 14-13 14H41c-8 0-14-6-13-14 2-34 8-62 20-84 14-25 38-44 72-55-13-10-22-28-22-49 0-32 22-56 52-56Z"
          fill={tone}
          opacity="0.14"
        />
      </svg>
    </div>
  );
}
