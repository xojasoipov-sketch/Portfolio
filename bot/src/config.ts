import { z } from "zod";

/**
 * All runtime config in one validated place. Fails fast on boot if a
 * required variable is missing, instead of surfacing as a confusing runtime
 * error deep inside a Telegram update handler.
 */
const EnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20, "TELEGRAM_BOT_TOKEN yo'q yoki noto'g'ri"),
  TELEGRAM_ADMIN_IDS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => Number.isFinite(n)),
    ),
  MINI_APP_URL: z.string().url().optional(),

  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: z.string().min(10).optional(),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY yo'q"),

  CONTACT_EMAIL: z.string().default("xojasoipov@gmail.com"),
  CONTACT_PHONE: z.string().default("+998910666777"),
  CONTACT_TELEGRAM: z.string().default("@xojasoipov"),
  CONTACT_INSTAGRAM: z.string().default(""),

  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Environment sozlamalari noto'g'ri:\n${issues}`);
  }
  if (!parsed.data.GEMINI_API_KEY) {
    // Non-fatal: the bot boots so /start, Mini App, CV, Contact still work;
    // the AI Agent path degrades to the fallback (see ai/agent.ts).
    console.warn(
      "[config] GEMINI_API_KEY o'rnatilmagan — AI Agent fallback rejimida ishlaydi (faqat lead formasi).",
    );
  }
  return parsed.data;
}

export const env = loadEnv();
