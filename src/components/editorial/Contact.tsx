import { useState } from "react";
import { sendContactMessage } from "@/lib/api/contact";
import { useReveal } from "./useReveal";
import { Spoken } from "./Spoken";
import { Portrait } from "./Portrait";
import { Arrow } from "./icons";

const SOCIALS = [
  { label: "Telegram", href: "https://t.me/xojasoipov" },
  { label: "Email", href: "mailto:xojasoipov@gmail.com" },
];

type Status = "idle" | "sending" | "sent" | "error";

export function Contact() {
  const { ref, shown } = useReveal<HTMLElement>(0.06);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    setStatus("sending");
    setError(null);

    try {
      const result = await sendContactMessage({
        name: String(fd.get("name") ?? ""),
        contact: String(fd.get("contact") ?? ""),
        message: String(fd.get("message") ?? ""),
        company: String(fd.get("company") ?? ""),
      });

      if (result.ok) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
        setError(result.error ?? "Xatolik yuz berdi.");
      }
    } catch {
      setStatus("error");
      setError("Xabarni yuborib bo'lmadi. Email orqali yozib ko'ring.");
    }
  }

  return (
    <section
      id="contact"
      ref={ref}
      style={{
        paddingBlock: "var(--ed-section)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="ed-shell">
        {/* Lesson and CTA: the reel's last beat, back on paper after the
            one night scene. */}
        <Spoken
          as="h2"
          className="ed-say"
          parts={[
            { text: "Biror narsa", tone: "intro" },
            { text: "birga", tone: "serif", br: true },
            { text: "yaratamizmi?", tone: "key" },
          ]}
        />

        <div className="ed-contact-grid">
          <form onSubmit={onSubmit} className="ed-rise" data-shown={shown}>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <label>
                <span className="ed-label" style={{ opacity: 0.6 }}>
                  Ism
                </span>
                <input
                  name="name"
                  required
                  minLength={2}
                  className="ed-field"
                  placeholder="Ismingiz"
                />
              </label>

              <label>
                <span className="ed-label" style={{ opacity: 0.6 }}>
                  Email yoki Telegram
                </span>
                <input
                  name="contact"
                  required
                  minLength={3}
                  className="ed-field"
                  placeholder="siz@example.com / @username"
                />
              </label>

              <label>
                <span className="ed-label" style={{ opacity: 0.6 }}>
                  Loyiha haqida
                </span>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  rows={4}
                  className="ed-field"
                  placeholder="Nima qurmoqchisiz?"
                  style={{ resize: "vertical" }}
                />
              </label>

              {/* Honeypot — hidden from users, catches naive bots. */}
              <input
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  width: 1,
                  height: 1,
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  className="ed-btn ed-btn-ink"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? (
                    "Yuborilmoqda…"
                  ) : (
                    <>
                      Yuborish <Arrow size="0.85em" />
                    </>
                  )}
                </button>

                {/* One live region, rendered unconditionally rather than
                    mounted when the status changes: a node that appears at
                    the same moment its text does is often missed by screen
                    readers, which watch an existing region for changes. A
                    visitor who submitted used to get silence either way --
                    no confirmation, and no word that it had failed. */}
                <span
                  className="ed-label"
                  role="status"
                  aria-live="polite"
                  style={{ color: "var(--ed-red-tx)" }}
                >
                  {status === "sending"
                    ? "Yuborilmoqda…"
                    : status === "sent"
                      ? "Xabar yuborildi ✓"
                      : status === "error" && error
                        ? error
                        : ""}
                </span>
              </div>
            </div>
          </form>

          <div
            className="ed-rise"
            data-shown={shown}
            style={{
              transitionDelay: "0.15s",
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
            }}
          >
            <div
              className="ed-rise"
              data-shown={shown}
              style={{
                aspectRatio: "1 / 1",
                maxWidth: "16rem",
                background: "#ECEAE6",
              }}
            >
              <Portrait treatment="mono" fit="cover" variant="standing" />
            </div>

            <div>
              <p className="ed-label" style={{ opacity: 0.6, margin: 0 }}>
                To'g'ridan-to'g'ri
              </p>
              <a
                href="mailto:xojasoipov@gmail.com"
                style={{
                  display: "block",
                  marginTop: "0.5rem",
                  fontSize: "1.05rem",
                }}
              >
                xojasoipov@gmail.com
              </a>
              <a
                href="tel:+998910666777"
                style={{
                  display: "block",
                  marginTop: "0.35rem",
                  fontSize: "1.05rem",
                  opacity: 0.75,
                }}
              >
                +998 91 066 67 77
              </a>
            </div>

            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="ed-navlink ed-label"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {s.label} <Arrow direction="upRight" size="0.8em" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
