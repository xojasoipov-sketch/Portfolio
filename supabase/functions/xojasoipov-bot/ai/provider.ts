import type { Intent, LeadDraft, Language } from "../db/types.ts";

export interface AgentTurnInput {
  systemPrompt: string;
  /** Recent conversation turns, oldest first. */
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
}

/**
 * The model's entire contribution per turn. Everything with a real-world
 * side effect (creating a lead, notifying the admin, promising a price or
 * deadline) is deliberately NOT here — the model only proposes; application
 * code (agent.ts) decides whether and how to act (item 29: tool
 * permissions). `draftUpdates` and `readyForSummary` are proposals the
 * caller merges/validates, not direct writes.
 */
export interface AgentTurnOutput {
  reply: string;
  language: Language;
  intent: Intent;
  draftUpdates: Partial<LeadDraft>;
  readyForSummary: boolean;
  needsHandoff: boolean;
  confidence: "low" | "medium" | "high";
}

export interface AIProvider {
  readonly name: string;
  runTurn(input: AgentTurnInput): Promise<AgentTurnOutput>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
