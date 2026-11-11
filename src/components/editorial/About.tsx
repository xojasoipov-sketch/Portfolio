import { useReveal } from "./useReveal";
import { Portrait } from "./Portrait";
import { Spoken } from "./Spoken";

export function About() {
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <section id="about" ref={ref} style={{ paddingBlock: "var(--ed-section)" }}>
      <div className="ed-shell">
        <div className="ed-about-grid">
          <div>
            <Spoken
              as="h2"
              className="ed-display"
              style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", margin: 0 }}
              parts={[
                { text: "Men", tone: "intro" },
                { text: "kimman?", tone: "key" },
              ]}
            />

            <div
              className="ed-rise"
              data-shown={shown}
              style={{
                marginTop: "clamp(2rem, 4vw, 3rem)",
                aspectRatio: "4 / 5",
                maxWidth: "22rem",
                background: "#ECEAE6",
              }}
            >
              <Portrait treatment="mono" fit="cover" variant="standing" />
            </div>
          </div>

          <div
            className="ed-rise"
            data-shown={shown}
            style={{
              transitionDelay: "0.2s",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              fontSize: "clamp(1rem, 1.35vw, 1.15rem)",
              lineHeight: 1.7,
            }}
          >
            <p style={{ margin: 0 }}>
              Men to'liq stack dasturchiman: frontend, backend va mobil. So'nggi
              yillarda asosiy yo'nalishim sun'iy intellekt bilan integratsiya
              qilingan tizimlar: AI mijozlarga xizmat botlari, ko'p-provayderli
              AI infratuzilma, avtomatlashtirilgan SMM tizimlari va CRM'lar.
            </p>
            <p style={{ margin: 0, color: "var(--ed-gray-tx)" }}>
              Zamonaviy AI-yordamchi vositalar bilan ishlaganim uchun
              loyihalarni an'anaviy agentliklarga nisbatan sezilarli tezroq
              yetkazib bera olaman. Birinchi ishlaydigan natijani odatda 3-7 kun
              ichida ko'rasiz.
            </p>
            <p
              style={{
                margin: 0,
                paddingLeft: "1.25rem",
                borderLeft: "2px solid var(--ed-black)",
                fontStyle: "italic",
              }}
            >
              Har bir taklif taxmin emas, real tekshiruv natijasiga asoslanadi.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
