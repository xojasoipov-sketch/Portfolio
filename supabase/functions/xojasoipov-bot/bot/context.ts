import type { Context } from "npm:grammy@1.31.0";
import type { UserRow } from "../db/types.ts";

/** Custom context: the upserted user row, attached once by bot.ts's entry middleware. */
export interface BotContext extends Context {
  user: UserRow;
}
