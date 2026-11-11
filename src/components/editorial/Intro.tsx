import { Spoken } from "./Spoken";

/** Trust, part one: who he is, in the owner's own framing (uslub.md, 1). */
export function Intro() {
  return (
    <section style={{ paddingBlock: "var(--ed-section)" }}>
      <div className="ed-shell">
        <Spoken
          as="h2"
          className="ed-say"
          parts={[
            { text: "Kod yozuvchi emas.", tone: "intro" },
            { text: "Muammoni tahlil qilib,", tone: "key", br: true },
            { text: "tizim", tone: "serif", br: true },
            { text: "quraman.", tone: "key" },
          ]}
        />
        <Spoken
          className="ed-say-note"
          delay={0.2}
          step={0.05}
          parts={[{ text: "Avval chuqur audit. Keyin aniq yechim." }]}
        />
      </div>
    </section>
  );
}
