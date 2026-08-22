import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { env } from "../config.ts";

/**
 * Service-role client: server-side only, bypasses RLS, must never reach a
 * browser. Tables live in `public` under an xbot_ prefix because PostgREST
 * only serves schemas on its exposed list, which SQL cannot change. Every
 * xbot_ table has RLS on with zero policies and no anon/authenticated grants,
 * so this key is the only way in.
 */
export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
