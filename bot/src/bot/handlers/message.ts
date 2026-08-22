import type { Context } from "grammy";
import { generateAgentReply } from "../../ai/agent.js";
import { buildClientSummary, buildConversationSummaryPlain } from "../../ai/summary.js";
import { scoreLead } from "../../ai/scoring.js";
import { trackEvent } from "../../db/analytics.js";
import {
  appendMessage,
  getConversation,
  bumpLowConfidence,
  clearDraft,
  endConversation,
  getOrCreateActiveConversation,
  getRecentMessages,
  mergeDraft,
  setConversationIntent,
  setPendingConfirmation,
} from "../../db/conversations.js";
import { computeDedupeHash, createLead, findRecentDuplicateLead } from "../../db/leads.js";
import type { UserRow } from "../../db/types.js";
import { CONTACT } from "../../ai/knowledgeData.js";
import { notifyHumanHandoff, notifyNewLead } from "../../notifications/admin.js";
import { checkRateLimit } from "../../security/rateLimit.js";
import { clampMessage, looksLikeSpam } from "../../security/validation.js";
import { logger } from "../../utils/logger.js";
import { catalogKeyboard, cvKeyboard, handoffKeyboard, leadConfirmKeyboard, portfolioKeyboard } from "../keyboards.js";
import { t } from "../i18n.js";

const MENU_LOOKUP: Record<string, "portfolio" | "ai" | "hire" | "cv" | "contact" | "catalog"> = {};
for (const lang of ["uz", "en"] as const) {
  MENU_LOOKUP[t(lang, "menuPortfolio")] = "portfolio";
  MENU_LOOKUP[t(lang, "menuAI")] = "ai";
  MENU_LOOKUP[t(lang, "menuHire")] = "hire";
  MENU_LOOKUP[t(lang, "menuCV")] = "cv";
  MENU_LOOKUP[t(lang, "menuContact")] = "contact";
  MENU_LOOKUP[t(lang, "menuCatalog")] = "catalog";
}

export async function handleTextMessage(ctx: Context, user: UserRow) {
  const text = ctx.message?.text;
  if (!text) return;

  // The AI lead flow is a one-to-one conversation. Once the bot was added to a
  // group it answered every message posted there -- turning a working group
  // into a chatbot that interrupts constantly, and burning model quota on
  // conversations between other people. Groups get commands only.
  if (ctx.chat && ctx.chat.type !== "private") return;

  const verdict = checkRateLimit(user.telegram_user_id);
  if (verdict === "throttle_silent") return;
  if (verdict === "throttle_notice") {
    await ctx.reply(t(user.language, "rateLimited"));
    return;
  }

  const menuAction = MENU_LOOKUP[text.trim()];
  if (menuAction) return handleMenuAction(ctx, user, menuAction);

  if (looksLikeSpam(text)) return; // silently drop obvious spam, no engagement signal to give it

  await handleFreeText(ctx, user, clampMessage(text));
}

async function handleMenuAction(ctx: Context, user: UserRow, action: "portfolio" | "ai" | "hire" | "cv" | "contact" | "catalog") {
  const lang = user.language;
  switch (action) {
    case "portfolio":
      await trackEvent(user.id, "mini_app_open");
      await ctx.reply(t(lang, "menuPortfolio"), { reply_markup: portfolioKeyboard(lang) });
      return;
    case "catalog":
      await trackEvent(user.id, "catalog_open");
      await ctx.reply(t(lang, "catalogPrompt"), { reply_markup: catalogKeyboard(lang) });
      return;
    case "ai":
      await ctx.reply(t(lang, "aiPrompt"));
      return;
    case "hire": {
      const conversation = await getOrCreateActiveConversation(user.id);
      await setConversationIntent(conversation.id, "HIRE");
      await trackEvent(user.id, "project_inquiry");
      await ctx.reply(t(lang, "aiPrompt"));
      return;
    }
    case "cv":
      await trackEvent(user.id, "cv_view");
      await ctx.reply(t(lang, "cvText"), { reply_markup: cvKeyboard(lang) });
      return;
    case "contact": {
      await trackEvent(user.id, "contact_click");
      await ctx.reply(
        [
          t(lang, "contactHeader"),
          `📧 ${CONTACT.email}`,
          `💬 ${CONTACT.telegram}`,
        ].join("\n"),
      );
      return;
    }
  }
}

async function handleFreeText(ctx: Context, user: UserRow, text: string) {
  const lang = user.language;
  const conversation = await getOrCreateActiveConversation(user.id);

  if (conversation.pending_confirmation) {
    // New free text while a confirmation card is open reads as "let me add/
    // change something" — fold back into the normal AI flow instead of
    // leaving a stale Ha/Yo'q prompt hanging (item 35: don't cage the user
    // in buttons).
    await setPendingConfirmation(conversation.id, false);
  }

  const history = (await getRecentMessages(conversation.id, 20)).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  await appendMessage(conversation.id, "user", text);

  const previousIntent = conversation.intent;
  const { output, usedFallback } = await generateAgentReply({
    currentDraft: conversation.draft,
    history,
    userMessage: text,
    languageHint: lang,
  });

  await appendMessage(conversation.id, "assistant", output.reply);
  await ctx.reply(output.reply);

  if (usedFallback) {
    await trackEvent(user.id, "ai_fallback_used");
    return; // no draft/intent/handoff logic to run on a canned reply
  }

  await trackEvent(user.id, "ai_question", { intent: output.intent });
  if (output.intent === "PROJECT_INQUIRY" || output.intent === "HIRE") {
    await trackEvent(user.id, "project_inquiry");
  }

  if (output.intent && output.intent !== previousIntent) {
    await setConversationIntent(conversation.id, output.intent);
  }

  const mergedDraft = await mergeDraft(conversation.id, conversation.draft, output.draftUpdates);
  const lowStreak = await bumpLowConfidence(conversation.id, output.confidence === "low");

  if (output.readyForSummary) {
    await setPendingConfirmation(conversation.id, true);
    await ctx.reply(buildClientSummary(mergedDraft), {
      parse_mode: "HTML",
      reply_markup: leadConfirmKeyboard(lang, conversation.id),
    });
    return;
  }

  // Offer human handoff once the model signals it, or after repeated
  // low-confidence turns (item 24/25) — but not on every single low-
  // confidence turn, so the offer doesn't nag.
  if (output.needsHandoff || lowStreak >= 3) {
    await ctx.reply(t(lang, "handoffOffer"), { reply_markup: handoffKeyboard(lang) });
  }
}

export async function handleLeadConfirm(ctx: Context, user: UserRow, conversationId: string) {
  const lang = user.language;
  const conversation = await getConversation(conversationId);
  if (!conversation) return ctx.answerCallbackQuery();

  const draft = conversation.draft ?? {};
  const dedupeHash = await computeDedupeHash(user.id, draft);
  const duplicate = await findRecentDuplicateLead(dedupeHash);
  if (duplicate) {
    await ctx.answerCallbackQuery();
    await ctx.reply(t(lang, "leadDuplicate"));
    await clearDraft(conversationId);
    return;
  }

  const score = scoreLead(draft);
  const conversationSummary = buildConversationSummaryPlain(draft);

  const lead = await createLead({
    ...draft,
    conversationId,
    userId: user.id,
    telegramUsername: user.telegram_username,
    firstName: user.first_name,
    language: lang,
    conversationSummary,
    aiSummary: conversationSummary,
    leadScore: score.score,
    priority: score.priority,
    source: user.source,
  });

  await notifyNewLead(lead);
  await endConversation(conversationId, conversationSummary);
  await clearDraft(conversationId);
  await trackEvent(user.id, "lead_created", { lead_id: lead.id, score: score.score, priority: score.priority });

  await ctx.answerCallbackQuery();
  await ctx.reply(t(lang, "leadSent"));
  logger.info({ leadId: lead.id, score: score.score, priority: score.priority }, "lead created");
}

export async function handleLeadEdit(ctx: Context, user: UserRow, conversationId: string) {
  await setPendingConfirmation(conversationId, false);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(user.language, "editPrompt"));
}

export async function handleLeadCancel(ctx: Context, user: UserRow, conversationId: string) {
  await clearDraft(conversationId);
  await ctx.answerCallbackQuery();
  await ctx.reply(t(user.language, "leadCancelled"));
}

export async function handleHandoffSend(ctx: Context, user: UserRow) {
  const conversation = await getOrCreateActiveConversation(user.id);
  const summary = buildConversationSummaryPlain(conversation.draft);
  await notifyHumanHandoff({ firstName: user.first_name, telegramUsername: user.telegram_username, summary });
  await ctx.answerCallbackQuery();
  await ctx.reply(t(user.language, "handoffSent"));
}

export async function handleHandoffCancel(ctx: Context) {
  await ctx.answerCallbackQuery();
}
