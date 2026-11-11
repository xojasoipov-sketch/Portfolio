import { useReveal } from "./useReveal";
import { Portrait } from "./Portrait";
import { Spoken } from "./Spoken";
import { Arrow } from "./icons";

/**
 * Hook. The page reads like one of the owner's reels (uslub.md, section 5):
 * it opens on the visitor's pain, in plain words, not on technology. The
 * three lines are "spoken" word by word on load; the portrait floats very
 * slowly and the whole frame makes one slow camera push (1.00 -> 1.04).
 */
export function Hero() {
  const { ref, shown } = useReveal<HTMLElement>(0.05);

  return (
    <section id="top" ref={ref} className="ed-hero">
      <div className="ed-hero-frame">
        <div className="ed-shell ed-hero-grid">
          <div className="ed-hero-copy">
            <p className="ed-rise ed-hero-name" data-shown={shown}>
              Saidburxon Xojasoipov
            </p>

            <Spoken
              as="h1"
              className="ed-hook"
              threshold={0.05}
              delay={0.25}
              step={0.16}
              parts={[
                { text: "Javobsiz", tone: "intro" },
                { text: "xabarlar.", tone: "key" },
                { text: "Yo'qolgan", tone: "intro", br: true },
                { text: "arizalar.", tone: "key" },
                { text: "Charchagan", tone: "intro", br: true },
                { text: "admin.", tone: "key" },
              ]}
            />

            <Spoken
              className="ed-hook-sub"
              threshold={0.05}
              delay={1.35}
              step={0.06}
              parts={[
                { text: "Bularni" },
                { text: "tinch", tone: "serif" },
                { text: "ishlaydigan tizimga aylantiraman." },
              ]}
            />

            <div
              className="ed-rise"
              data-shown={shown}
              style={{ transitionDelay: "1.9s" }}
            >
              <a href="#contact" className="ed-btn ed-btn-solid">
                Bepul tahlil <Arrow size="0.85em" />
              </a>
            </div>
          </div>

          <div
            className="ed-rise ed-hero-figure"
            data-shown={shown}
            style={{ transitionDelay: "0.4s" }}
          >
            <div className="ed-float">
              <Portrait treatment="mono" priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
