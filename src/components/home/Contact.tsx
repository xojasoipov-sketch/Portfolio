import { useState } from "react";
import { sendContactMessage } from "@/lib/api/contact";
import { Arrow } from "@/components/editorial/icons";
import { Reveal } from "./Reveal";
import { Said } from "./Said";
import { AVATAR } from "./media";

type Status = "idle" | "sending" | "sent" | "error";

/** The last beat: one question, one form, and the direct lines. */
export function Contact() {
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
    <section id="contact" className="hx-section hx-contact">
      <div className="hx-dots hx-dots-low" aria-hidden="true" />
      <div className="hx-shell">
        <Said
          className="hx-big"
          parts={[
            { text: "Biror narsa", tone: "intro" },
            { text: "birga", tone: "serif", br: true },
            { text: "yaratamizmi?", tone: "key" },
          ]}
        />

        <div className="hx-contact-grid">
          <Reveal as="form" className="hx-form" onSubmit={onSubmit}>
            <label className="hx-field">
              <span>Ism</span>
              <input
                name="name"
                required
                minLength={2}
                autoComplete="name"
                placeholder="Ismingiz"
              />
            </label>

            <label className="hx-field">
              <span>Email yoki Telegram</span>
              <input
                name="contact"
                required
                minLength={3}
                placeholder="siz@example.com yoki @username"
              />
            </label>

            <label className="hx-field">
              <span>Loyiha haqida</span>
              <textarea
                name="message"
                required
                minLength={10}
                rows={4}
                placeholder="Biznesingizda nima eng ko'p vaqt olyapti?"
              />
            </label>

            {/* Honeypot: hidden from people, catches naive bots. */}
            <input
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hx-honey"
            />

            <div className="hx-form-foot">
              <button
                type="submit"
                className="hx-btn hx-btn-ink"
                disabled={status === "sending"}
              >
                {status === "sending" ? (
                  "Yuborilmoqda…"
                ) : (
                  <>
                    Yuborish <Arrow size="0.95em" />
                  </>
                )}
              </button>

              {/* One live region, always in the tree: a node that appears
                  together with its text is often missed by screen readers. */}
              <span className="hx-form-status" role="status" aria-live="polite">
                {status === "sent"
                  ? "Xabar yuborildi ✓"
                  : status === "error" && error
                    ? error
                    : ""}
              </span>
            </div>
          </Reveal>

          <Reveal className="hx-direct" i={1}>
            <div className="hx-direct-who">
              <img
                src={AVATAR}
                alt=""
                width={56}
                height={56}
                className="hx-avatar hx-avatar-lg"
                loading="lazy"
                decoding="async"
              />
              <p>
                Saidburxon Xojasoipov
                <span>To'g'ridan-to'g'ri yozishingiz mumkin.</span>
              </p>
            </div>

            <ul className="hx-direct-list">
              <li>
                <span>Telegram</span>
                <a
                  href="https://t.me/xojasoipov"
                  target="_blank"
                  rel="noreferrer"
                >
                  @xojasoipov <Arrow direction="upRight" size="0.85em" />
                </a>
              </li>
              <li>
                <span>Email</span>
                <a href="mailto:xojasoipov@gmail.com">xojasoipov@gmail.com</a>
              </li>
              <li>
                <span>Telefon</span>
                <a href="tel:+998910666777">+998 91 066 67 77</a>
              </li>
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
