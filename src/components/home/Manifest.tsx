import { Said } from "./Said";
import { Reveal } from "./Reveal";

/** Trust, part one: who he is, in the owner's own framing (uslub.md, 1). */
export function Manifest() {
  return (
    <section className="hx-section hx-manifest">
      <div className="hx-shell">
        <Said
          className="hx-big"
          parts={[
            { text: "Kod yozuvchi emas.", tone: "intro" },
            { text: "Muammoni tahlil qilib,", tone: "key", br: true },
            { text: "tizim", tone: "serif", br: true },
            { text: "quraman.", tone: "key" },
          ]}
        />
        <Reveal as="p" className="hx-manifest-note">
          Avval chuqur audit. Keyin aniq yechim.
        </Reveal>
      </div>
    </section>
  );
}
