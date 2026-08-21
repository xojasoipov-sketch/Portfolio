import { InlineKeyboard, Keyboard } from "grammy";
import type { Language } from "../db/types.js";
import { t } from "./i18n.js";
import { env } from "../config.js";

/**
 * The live services catalog page — same site the "XIZMATLAR" pill on the
 * portfolio's own nav bar links to. A plain URL button (not a Telegram
 * WebApp) since the catalog page isn't set up as a mini app.
 */
const CATALOG_URL = "https://xojasoipov-sketch.github.io/Portfolio/xizmatlar";

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

/** Katalog tugmasi bosilganda — to'g'ridan-to'g'ri xizmatlar katalogi sahifasiga olib boradi. */
export function catalogKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard().url(t(lang, "catalogOpen"), CATALOG_URL);
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

export function smartStartKeyboard(lang: Language): InlineKeyboard {
  return new InlineKeyboard().text(t(lang, "startHint"), "smart_start");
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
    .text("🆕 New Leads", "admin_leads:NEW");
}
