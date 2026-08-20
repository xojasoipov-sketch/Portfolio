import { useReveal } from "./useReveal";
import { Portrait } from "./Portrait";
import { RedArc } from "./Curve";

export function Hero() {
  const { ref, shown } = useReveal<HTMLElement>(0.05);

  return (
    <section
      id="top"
      ref={ref}
      data-surface="offwhite"
      style={{
        position: "relative",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        paddingTop: "clamp(6rem, 14vh, 9rem)",
        paddingBottom: "clamp(2rem, 5vh, 3.5rem)",
        background: "var(--ed-offwhite)",
        overflow: "hidden",
      }}
    >
      <RedArc
        style={{
          width: "min(150vw, 1200px)",
          aspectRatio: "1",
          left: "50%",
          top: "46%",
          transform: "translate(-50%, -50%)",
          opacity: 0.5,
        }}
      />

      {/* Name and portrait share one stacking context so the type can sit
          behind the shoulders while the wordmark stays readable. */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateAreas: '"stack"',
          placeItems: "end center",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            gridArea: "stack",
            width: "100%",
            alignSelf: "start",
            paddingInline: "var(--ed-gutter)",
            textAlign: "center",
            zIndex: 1,
          }}
        >
          <h1
            className="ed-display"
            style={{ fontSize: "clamp(3rem, 11vw, 11.5rem)", margin: 0 }}
          >
            <span className="ed-clip" data-shown={shown}>
              <span style={{ color: "var(--ed-black)" }}>Saidburxon</span>
            </span>
            <span
              className="ed-clip"
              data-shown={shown}
              style={{ transitionDelay: "0.1s" }}
            >
              <span style={{ color: "var(--ed-red)", transitionDelay: "0.1s" }}>
                Xojasoipov
              </span>
            </span>
          </h1>
        </div>

        <div
          className="ed-rise"
          data-shown={shown}
          style={{
            gridArea: "stack",
            transitionDelay: "0.35s",
            zIndex: 2,
            filter: "drop-shadow(0 32px 60px rgba(142, 7, 16, 0.22))",
          }}
          data-hero-portrait
        >
          <Portrait treatment="natural" />
        </div>
      </div>

      <div
        className="ed-rise"
        data-shown={shown}
        style={{
          transitionDelay: "0.5s",
          position: "relative",
          zIndex: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "1.5rem",
          flexWrap: "wrap",
          paddingInline: "var(--ed-gutter)",
        }}
      >
        <p className="ed-label" style={{ margin: 0, lineHeight: 1.8 }}>
          Full-stack
          <br />
          Developer
          <br />
          &amp; AI Builder
        </p>
        <p
          className="ed-label"
          style={{
            margin: 0,
            lineHeight: 1.8,
            textAlign: "right",
            color: "var(--ed-gray-tx)",
          }}
        >
          Based in
          <br />
          Tashkent, Uzbekistan
        </p>
      </div>
    </section>
  );
}
