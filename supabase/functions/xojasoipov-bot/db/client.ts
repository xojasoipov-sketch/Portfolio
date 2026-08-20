import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { env } from "../config.ts";

/**
 * Service-role client — used server-side only, bypasses RLS. Every xbot.*
 * table has RLS enabled with zero policies, so this key is the only way in;
 * it must never reach the client/browser.
 */
export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: "xbot" },
  auth: { persistSession: false },
});
