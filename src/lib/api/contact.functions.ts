import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Contact form → Telegram.
 *
 * The bot token is read from the environment inside the handler (never at
 * module scope, so it resolves correctly on Cloudflare Workers) and never
 * leaves the server — the browser only ever posts the form fields here.
 */
const ContactInput = z.object({
  name: z.string().trim().min(2, "Ism juda qisqa").max(80),
  contact: z.string().trim().min(3, "Aloqa ma'lumoti kerak").max(120),
  message: z.string().trim().min(10, "Xabar juda qisqa").max(2000),
  /** Honeypot — real users never fill this. */
  company: z.string().max(0).optional().or(z.literal("")),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const sendContactMessage = createServerFn({ method: "POST" })
  .validator(ContactInput)
  .handler(async ({ data }) => {
    // Silently accept honeypot hits so bots get no signal.
    if (data.company) {
      return { ok: true as const };
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error(
        "Telegram nofaol: TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID yo'q",
      );
      return {
        ok: false as const,
        error:
          "Xabar yuborish hozircha sozlanmagan. Iltimos, email orqali yozing.",
      };
    }

    const text = [
      "<b>Portfolio — yangi xabar</b>",
      "",
      `<b>Ism:</b> ${escapeHtml(data.name)}`,
      `<b>Aloqa:</b> ${escapeHtml(data.contact)}`,
      "",
      escapeHtml(data.message),
    ].join("\n");

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        },
      );

      if (!res.ok) {
        // Log the status only — the response body can echo the token path.
        console.error("Telegram sendMessage failed:", res.status);
        return {
          ok: false as const,
          error: "Yuborishda xatolik. Keyinroq urinib ko'ring.",
        };
      }

      return { ok: true as const };
    } catch (err) {
      console.error("Telegram request threw:", err);
      return {
        ok: false as const,
        error: "Tarmoq xatosi. Keyinroq urinib ko'ring.",
      };
    }
  });
