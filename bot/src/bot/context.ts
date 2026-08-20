import type { Context } from "grammy";
import type { UserRow } from "../db/types.js";

/** Custom context: the upserted user row, attached once by bot.ts's entry middleware. */
export interface BotContext extends Context {
  user: UserRow;
}
