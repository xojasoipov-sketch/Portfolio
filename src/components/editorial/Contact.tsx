import { useState } from "react";
import { sendContactMessage } from "@/lib/api/contact";
import { useReveal } from "./useReveal";
import { useSpotlight } from "./useSpotlight";
import { Portrait } from "./Portrait";
import { Arrow } from "./icons";

const SOCIALS = [
  { label: "Telegram", href: "https://t.me/xojasoipov" },
  { label: "Email", href: "mailto:xojasoipov@gmail.com" },
];

type Status = "idle" | "sending" | "sent" | "error";

export function Contact() {
  const { ref, shown } = useReveal<HTMLElement>(0.06);
  const spotlightRef = useSpotlight<HTMLElement>();
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
      ref={(node) => {
        ref.current = node;
        spotlightRef.current = node;
      }}
      data-surface="black"
      className="ed-spotlight"
      style={{
        backgroundColor: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="ed-shell">
        <h2
          className="ed-display"
          style={{ fontSize: "clamp(2.5rem, 11vw, 9.5rem)", margin: 0 }}
        >
          {[
            { t: "Biror", c: "var(--ed-offwhite)" },
            { t: "Narsa", c: "var(--ed-offwhite)" },
            { t: "Yaratamizmi?", c: "var(--ed-red-br)" },
          ].map((l, i) => (
            <span
              key={l.t}
              className="ed-clip"
              data-shown={shown}
              style={{ transitionDelay: `${i * 0.09}s` }}
            >
              <span style={{ color: l.c, transitionDelay: `${i * 0.09}s` }}>
                {l.t}
              </span>
            </span>
          ))}
        </h2>

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
                  className="ed-btn"
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

                {status === "sent" && (
                  <span
                    className="ed-label"
                    style={{ color: "var(--ed-red-br)" }}
                  >
                    Xabar yuborildi ✓
                  </span>
                )}
                {status === "error" && error && (
                  <span
                    className="ed-label"
                    style={{ color: "var(--ed-red-br)" }}
                  >
                    {error}
                  </span>
                )}
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
              className="ed-veil"
              data-shown={shown}
              style={{
                aspectRatio: "1 / 1",
                maxWidth: "16rem",
                background: "#141414",
              }}
            >
              <Portrait treatment="duotone" fit="cover" />
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
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
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
