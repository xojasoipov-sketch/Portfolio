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

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async runTurn(input: AgentTurnInput): Promise<AgentTurnOutput> {
    const model = this.client.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: input.systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    });

    const contents = [
      ...input.history.map((h) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.content }] })),
      { role: "user", parts: [{ text: input.userMessage }] },
    ];

    try {
      const result = await model.generateContent({ contents });
      const text = result.response.text();
      const parsed = JSON.parse(text) as AgentTurnOutput;
      return parsed;
    } catch (err) {
      logger.error({ err }, "gemini runTurn failed");
      throw new AIProviderError("Gemini so'rovi muvaffaqiyatsiz tugadi", err);
    }
  }
}
