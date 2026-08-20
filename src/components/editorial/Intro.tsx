import { useReveal } from "./useReveal";

export function Intro() {
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      data-surface="offwhite"
      style={{
        background: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
      }}
    >
      <div className="ed-shell">
        <h2
          className="ed-display"
          style={{ fontSize: "clamp(2.5rem, 10vw, 9rem)", margin: 0 }}
        >
          {[
            { text: "Men", color: "var(--ed-black)" },
            { text: "Raqamli", color: "var(--ed-red)" },
            { text: "Mahsulotlar", color: "var(--ed-black)" },
            { text: "Yarataman.", color: "var(--ed-black)" },
          ].map((line, i) => (
            <span
              key={line.text}
              className="ed-clip"
              data-shown={shown}
              style={{ transitionDelay: `${i * 0.09}s` }}
            >
              <span
                style={{ color: line.color, transitionDelay: `${i * 0.09}s` }}
              >
                {line.text}
              </span>
            </span>
          ))}
        </h2>

        <p
          className="ed-rise"
          data-shown={shown}
          style={{
            transitionDelay: "0.45s",
            marginTop: "clamp(2rem, 5vw, 3.5rem)",
            marginLeft: "auto",
            maxWidth: "34rem",
            fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
            lineHeight: 1.65,
            color: "var(--ed-gray-tx)",
          }}
        >
          Men full-stack development, sun'iy intellekt, avtomatlashtirish va
          SaaS mahsulotlar yaratish bilan shug'ullanaman. Ishimning yadrosi —
          avval chuqur audit, keyin aniq yechim.
        </p>
      </div>
    </section>
  );
}
