import { env } from "./config.js";
import { createBot } from "./bot/bot.js";
import { sweepStaleRateLimitBuckets } from "./security/rateLimit.js";
import { logger } from "./utils/logger.js";

async function main() {
  const bot = createBot();

  await bot.api.setMyCommands([
    { command: "start", description: "Botni boshlash" },
    { command: "admin", description: "Admin panel (faqat admin uchun)" },
    { command: "leads", description: "Leadlar ro'yxati (admin)" },
    { command: "stats", description: "Haftalik statistika (admin)" },
    { command: "broadcast", description: "Barchaga xabar yuborish (admin)" },
  ]);

  const sweepTimer = setInterval(sweepStaleRateLimitBuckets, 60_000);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    clearInterval(sweepTimer);
    await bot.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  logger.info(
    { adminCount: env.TELEGRAM_ADMIN_IDS.length, aiProvider: env.AI_PROVIDER, hasGeminiKey: Boolean(env.GEMINI_API_KEY) },
    "bot starting (long polling)",
  );

  await bot.start({
    onStart: (info) => logger.info({ username: info.username }, "bot online"),
  });
}

main().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});
