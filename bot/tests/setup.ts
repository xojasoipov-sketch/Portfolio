// Pure-logic tests (scoring, dedupe hashing, validation) import modules that
// construct a Supabase client at module scope for side-effect reasons
// unrelated to what these tests exercise. These are placeholder values —
// no test in this suite makes a network call — just enough for `config.ts`'s
// env validation and the Supabase client constructor to not throw on import.
process.env.SUPABASE_URL ??= "https://placeholder.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "placeholder-service-role-key-for-tests-only";
process.env.TELEGRAM_BOT_TOKEN ??= "0000000000:placeholder-token-for-tests-only";
