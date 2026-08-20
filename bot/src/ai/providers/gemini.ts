import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { env } from "../../config.js";
import { logger } from "../../utils/logger.js";
import { AIProviderError, type AgentTurnInput, type AgentTurnOutput, type AIProvider } from "../provider.js";

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING, description: "Foydalanuvchiga yuboriladigan javob matni, uning tilida." },
    language: { type: SchemaType.STRING, format: "enum", enum: ["uz", "en"] },
    intent: {
      type: SchemaType.STRING,
      format: "enum",
      enum: [
        "GENERAL_INFO", "PORTFOLIO", "PROJECT_INQUIRY", "HIRE", "PARTNERSHIP",
        "PRICE_INQUIRY", "TECHNICAL_QUESTION", "CV_REQUEST", "CONTACT_REQUEST", "OTHER",
      ],
    },
    draftUpdates: {
      type: SchemaType.OBJECT,
      description: "Shu turdagi (yoki oldingi) xabarlardan aniqlangan YANGI lead maydonlari. Faqat yangi/aniqlangan qiymatlarni qo'y, taxmin qilma.",
      properties: {
        project_type: { type: SchemaType.STRING, nullable: true },
        project_title: { type: SchemaType.STRING, nullable: true },
        description: { type: SchemaType.STRING, nullable: true },
        goal: { type: SchemaType.STRING, nullable: true },
        features: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
        target_users: { type: SchemaType.STRING, nullable: true },
        business_type: { type: SchemaType.STRING, nullable: true },
        current_system: { type: SchemaType.STRING, nullable: true },
        budget: { type: SchemaType.STRING, nullable: true },
        deadline: { type: SchemaType.STRING, nullable: true },
        contact: { type: SchemaType.STRING, nullable: true },
      },
    },
    readyForSummary: {
      type: SchemaType.BOOLEAN,
      description: "true faqat project_type, description va goal kabi asosiy maydonlar allaqachon ma'lum bo'lsa.",
    },
    needsHandoff: {
      type: SchemaType.BOOLEAN,
      description: "true agar mijoz aniq narx/shartnoma/individual kelishuv so'rasa yoki Saidburxon bilan bevosita gaplashmoqchi bo'lsa.",
    },
    confidence: { type: SchemaType.STRING, format: "enum", enum: ["low", "medium", "high"] },
  },
  required: ["reply", "language", "intent", "draftUpdates", "readyForSummary", "needsHandoff", "confidence"],
};

/**
 * True for Gemini's free-tier rate/quota errors (HTTP 429, RESOURCE_EXHAUSTED)
 * — the ones worth rotating to the next key for. Any other error (bad
 * request, network failure, invalid schema) fails fast instead, so a real
 * bug doesn't silently burn through every configured key.
 */
function isQuotaError(err: unknown): boolean {
  const status = err && typeof err === "object" ? (err as { status?: unknown }).status : undefined;
  const message = err instanceof Error ? err.message : String(err);
  return /429|quota|resource_exhausted|rate.?limit/i.test(`${message} ${status ?? ""}`);
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private readonly clients: GoogleGenerativeAI[];
  /**
   * Sticky pointer into `clients` (item: multi-key rotation for the free
   * tier). Advances only on a quota error and never resets, so once a key
   * is known exhausted this process stops wasting requests on it — the
   * next call picks up right after the last key that worked.
   */
  private keyIndex = 0;

  constructor(apiKeys: string[]) {
    if (apiKeys.length === 0) throw new Error("GeminiProvider requires at least one API key");
    this.clients = apiKeys.map((key) => new GoogleGenerativeAI(key));
  }

  async runTurn(input: AgentTurnInput): Promise<AgentTurnOutput> {
    const contents = [
      ...input.history.map((h) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.content }] })),
      { role: "user", parts: [{ text: input.userMessage }] },
    ];

    let lastErr: unknown;
    // One full pass over the configured keys, starting from the sticky
    // pointer — at most `clients.length` attempts, so a fully-exhausted
    // set fails after trying each key exactly once rather than looping.
    for (let attempt = 0; attempt < this.clients.length; attempt++) {
      const idx = this.keyIndex;
      const client = this.clients[idx];
      if (!client) throw new AIProviderError("Gemini kaliti topilmadi (ichki xato)");
      const model = client.getGenerativeModel({
        model: env.GEMINI_MODEL,
        systemInstruction: input.systemPrompt,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.4,
          // Gemini 3.x is a thinking model and its reasoning tokens are drawn
          // from this same budget (a trivial prompt already spent 566 of them
          // on thoughts). At 1024 the knowledge-base-sized system prompt left
          // nothing for the actual JSON, so responses came back empty and
          // JSON.parse threw. Give thinking room plus the reply.
          maxOutputTokens: 8192,
        },
      });

      try {
        const result = await model.generateContent({ contents });
        // finishReason is the thing worth knowing when a turn comes back
        // unusable (MAX_TOKENS, SAFETY, ...). Without it a truncated response
        // surfaces as a bare SyntaxError that serializes to "{}" in the logs.
        const finishReason = result.response.candidates?.[0]?.finishReason ?? "unknown";
        const text = result.response.text();
        if (!text.trim()) {
          throw new AIProviderError(`Gemini bo'sh javob qaytardi (finishReason=${finishReason})`);
        }
        try {
          return JSON.parse(text) as AgentTurnOutput;
        } catch {
          throw new AIProviderError(
            `Gemini JSON'ga aylanmaydigan javob qaytardi (finishReason=${finishReason}, uzunlik=${text.length})`,
          );
        }
      } catch (err) {
        lastErr = err;
        if (!isQuotaError(err)) {
          // Log err.message explicitly: Error's message is non-enumerable, so
          // passing the Error object itself logs a useless "{}".
          logger.error(
            { err: err instanceof Error ? err.message : String(err), keyIndex: idx },
            "gemini runTurn failed (non-quota error)",
          );
          // Carry the specific reason up: the caller logs this message, and a
          // generic one would hide finishReason/HTTP status again.
          throw new AIProviderError(
            `Gemini so'rovi muvaffaqiyatsiz tugadi: ${err instanceof Error ? err.message : String(err)}`,
            err,
          );
        }
        logger.warn(
          { keyIndex: idx, totalKeys: this.clients.length },
          "gemini key hit its quota, rotating to the next key",
        );
        this.keyIndex = (idx + 1) % this.clients.length;
      }
    }

    logger.error({ err: lastErr, totalKeys: this.clients.length }, "all configured gemini keys are quota-exhausted");
    throw new AIProviderError("Barcha Gemini kalitlari kvotasi tugadi", lastErr);
  }
}
