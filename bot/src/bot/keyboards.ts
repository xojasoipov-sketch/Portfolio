import { InlineKeyboard, Keyboard } from "grammy";
import type { Language } from "../db/types.js";
import { t } from "./i18n.js";
import { env } from "../config.js";

/**
 * Everything the bot links to lives on the deployed portfolio, so the origin
 * is named once here rather than repeated per URL.
 *
 * None of these addresses may be shown to a user. The catalog and the CV page
 * are opened as Telegram WebApps (not plain URL buttons) so they launch
 * full-screen inside Telegram itself, with no address bar — a `.url()` button
 * was popping the raw host open in Safari/Chrome instead.
 */
const SITE_ORIGIN = "https://xojasoipov-sketch.github.io/Portfolio";
const CATALOG_URL = `${SITE_ORIGIN}/xizmatlar`;
const CV_URL = `${SITE_ORIGIN}/cv`;

/**
 * Never becomes a button target. The download button is a callback, and the
 * bot hands this address to Telegram to fetch server-side, so the file arrives
 * as an ordinary document and the host stays on this side of the wire.
 */
export const CV_PDF_URL = `${SITE_ORIGIN}/Saidburxon-Xojasoipov-CV.pdf`;

export function mainMenuKeyboard(lang: Language): Keyboard {
  return new Keyboard()
    .text(t(lang, "menuPortfolio"))
    .text(t(lang, "menuAI"))
    .row()
    .text(t(lang, "menuHire"))
    .text(t(lang, "menuCV"))
    .row()
    .text(t(lang, "menuContact"))
    .text(t(lang, "menuCatalog"))
    .resized();
}

/** Katalog tugmasi bosilganda — to'g'ridan-to'g'ri xizmatlar katalogi sahifasiga, mini ilova sifatida ochiladi. */
export function catalogKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard().webApp(t(lang, "catalogOpen"), CATALOG_URL);
}

/**
 * The CV menu item used to reply with the bare string "📄 CV" and nothing
 * else — a dead end. It now opens the real CV page inside Telegram, with a
 * button beside it that sends the PDF as a document.
 */
export function cvKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .webApp(t(lang, "cvView"), CV_URL)
    .row()
    .text(t(lang, "cvDownload"), "cv_pdf");
}

export function portfolioKeyboard(lang: Language): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (env.MINI_APP_URL) {
    kb.webApp(t(lang, "menuPortfolio"), env.MINI_APP_URL);
  } else {
    kb.url(t(lang, "menuPortfolio"), "https://t.me/Xojasoipovbot");
  }
  return kb;
}

export function leadConfirmKeyboard(lang: Language, leadDraftKey: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "confirmSend"), `lead_confirm:${leadDraftKey}`)
    .text(t(lang, "confirmEdit"), `lead_edit:${leadDraftKey}`)
    .row()
    .text(t(lang, "confirmCancel"), `lead_cancel:${leadDraftKey}`);
}

export function handoffKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "handoffSend"), "handoff_send")
    .text(t(lang, "handoffCancel"), "handoff_cancel");
}

/** Buttons under the admin's "new lead" notification (item 18). */
export function adminLeadKeyboard(leadId: string, telegramUsername: string | null): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (telegramUsername) {
    kb.url("💬 Mijoz bilan bog'lanish", `https://t.me/${telegramUsername.replace(/^@/, "")}`);
  }
  return kb
    .row()
    .text("📋 Batafsil", `lead_detail:${leadId}`)
    .text("✅ Qabul qilish", `lead_status:${leadId}:QUALIFIED`)
    .row()
    .text("🔄 Reviewing", `lead_status:${leadId}:REVIEWING`)
    .text("❌ Reject", `lead_status:${leadId}:REJECTED`)
    .row()
    .text("⭐ High Priority", `lead_priority:${leadId}:URGENT`);
}

export function adminPanelKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📊 Statistics", "admin_stats")
    .row()
    .text("💼 Leads", "admin_leads:ALL")
    .text("🔥 Hot Leads", "admin_leads:HOT")
    .row()
    .text("🆕 New Leads", "admin_leads:NEW")
    .row()
    .text("💰 Xizmatlar narxlari", "adm:cat")
    .row()
    .text("📦 Paketlar", "adm:pk")
    .row()
    .text("👥 Foydalanuvchilar", "adm:u:0");
}
