import type { LeadDraft, Language } from "../db/types.ts";
import { logger } from "../utils/logger.ts";
import { buildKnowledgeContext } from "./knowledgeBase.ts";
import { getAIProvider } from "./providerFactory.ts";
import type { AgentTurnOutput } from "./provider.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";

const FALLBACK_UZ =
  "Hozir AI assistant vaqtincha band. Murojaatingizni qisqa yozib qoldiring yoki to'g'ridan-to'g'ri Saidburxon bilan bog'laning: @xojasoipov";
const FALLBACK_EN =
  "The AI assistant is temporarily busy. Please leave a short message, or reach Saidburxon directly: @xojasoipov";

export interface AgentTurnResult {
  output: AgentTurnOutput;
  usedFallback: boolean;
}

/**
 * The one entry point handlers call for a free-text message. Owns provider
 * selection, prompt assembly, and failure recovery (item 39) — a caller
 * never needs to know whether Gemini actually answered or the fallback did.
 */
export async function generateAgentReply(params: {
  currentDraft: LeadDraft;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  languageHint: Language;
}): Promise<AgentTurnResult> {
  const provider = getAIProvider();
  if (!provider) {
    return { output: fallbackOutput(params.languageHint), usedFallback: true };
  }

  try {
    const knowledgeContext = await buildKnowledgeContext();
    const systemPrompt = buildSystemPrompt({
      knowledgeContext,
      currentDraft: params.currentDraft,
      languageHint: params.languageHint,
    });

    const output = await provider.runTurn({
      systemPrompt,
      history: params.history,
      userMessage: params.userMessage,
    });

    return { output: sanitizeOutput(output, params.languageHint), usedFallback: false };
  } catch (err) {
    logger.error({ err }, "agent turn failed, using fallback reply");
    return { output: fallbackOutput(params.languageHint), usedFallback: true };
  }
}

function fallbackOutput(languageHint: Language): AgentTurnOutput {
  return {
    reply: languageHint === "en" ? FALLBACK_EN : FALLBACK_UZ,
    language: languageHint,
    intent: "OTHER",
    draftUpdates: {},
    readyForSummary: false,
    needsHandoff: true,
    confidence: "low",
  };
}

/** Defensive normalization — a schema-conformant response can still carry surprising values (empty reply, wrong-shaped arrays). */
function sanitizeOutput(output: AgentTurnOutput, languageHint: Language): AgentTurnOutput {
  return {
    reply: output.reply?.trim() || (languageHint === "en" ? "Sorry, could you rephrase that?" : "Kechirasiz, boshqacharoq izohlab bera olasizmi?"),
    language: output.language === "en" ? "en" : "uz",
    intent: output.intent ?? "OTHER",
    draftUpdates: output.draftUpdates ?? {},
    readyForSummary: Boolean(output.readyForSummary),
    needsHandoff: Boolean(output.needsHandoff),
    confidence: ["low", "medium", "high"].includes(output.confidence) ? output.confidence : "medium",
  };
}
