import { Reveal } from "./Reveal";
import { Said } from "./Said";
import { Orbit } from "./Orbit";

/**
 * The one night scene (uslub.md: --night for the "burilish" only). After
 * the words, the proof: real, running projects, turning around the owner
 * on a ring. The section slides up over the paper as a dark sheet with
 * rounded shoulders.
 */
export function Work() {
  return (
    <section id="work" className="hx-night" data-night>
      <div className="hx-shell">
        <div className="hx-head">
          <Reveal as="p" className="hx-label">
            Ishlar
          </Reveal>
          <Said
            night
            className="hx-big hx-big-night"
            parts={[
              { text: "Lekin gap so'zda emas.", tone: "intro" },
              { text: "Mana,", tone: "key", br: true },
              { text: "ishlab turgan", tone: "serif" },
              { text: "tizimlar.", tone: "key" },
            ]}
          />
        </div>

        <Orbit />
      </div>
    </section>
  );
}
