import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { env } from "../config.ts";

/**
 * Service-role client — server-side only, bypasses RLS.
 *
 * The bot's tables live in `public` under an xbot_ prefix rather than in a
 * schema of their own: PostgREST (which supabase-js speaks to) only serves
 * the schemas on its exposed list, and that list is a project API setting,
 * not something SQL can change. The prefix keeps them from colliding with
 * the other apps sharing this project.
 *
 * Every xbot_ table has RLS enabled with zero policies and no grants to anon
 * or authenticated, so this service-role key is the only way in — it must
 * never reach the client/browser.
 */
export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
