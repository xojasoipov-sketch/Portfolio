import { GoogleGenerativeAI, SchemaType, type Schema } from "npm:@google/generative-ai@0.24.1";
import { env } from "../../config.ts";
import { logger } from "../../utils/logger.ts";
import { AIProviderError, type AgentTurnInput, type AgentTurnOutput, type AIProvider } from "../provider.ts";

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
 * True for free-tier rate/quota errors, the ones worth rotating a key for.
 * Anything else fails fast, so a real bug cannot silently burn every key.
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
   * Advances only on a quota error and never resets, so once a key is known
   * exhausted this process stops spending requests on it.
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
    // One pass over the keys from the sticky pointer, so a fully exhausted
    // set fails after trying each exactly once rather than looping.
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
          // Reasoning tokens come out of this same budget: at 1024 the
          // knowledge-base-sized prompt left nothing for the JSON, so replies
          // came back empty and JSON.parse threw. Room to think, plus a reply.
          maxOutputTokens: 8192,
        },
      });

      try {
        const result = await model.generateContent({ contents });
        // finishReason (MAX_TOKENS, SAFETY, ...) is the thing worth knowing
        // when a turn is unusable; without it a truncated response logs "{}".
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
          // err.message explicitly: Error's message is non-enumerable.
          logger.error(
            { err: err instanceof Error ? err.message : String(err), keyIndex: idx },
            "gemini runTurn failed (non-quota error)",
          );
          // Carry the reason up; a generic one hides finishReason again.
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
