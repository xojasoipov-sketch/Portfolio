/**
 * AI operator for the /demo page.
 *
 * The request carries a vertical key and the conversation, never a system
 * prompt: the prompt and the Gemini key both live in the edge function, so the
 * endpoint can only ever answer as one of the five demo businesses and the key
 * never reaches a browser. The function also enforces a per-visitor daily
 * quota, which is what `limited` reports back.
 */
const ENDPOINT =
  import.meta.env.VITE_DEMO_AI_ENDPOINT ??
  "https://tomkxsdkerpbvlumubbg.supabase.co/functions/v1/demo-ai";

export interface DemoTurn {
  role: "user" | "assistant";
  content: string;
}

export type DemoAIResult =
  | { ok: true; reply: string; remaining: number }
  | { ok: false; error: string; limited?: boolean };

/**
 * Long enough for a slow model turn, short enough that a dead connection does
 * not leave the bot's typing indicator running indefinitely — without this the
 * only thing ending the wait is whatever the browser decides, which on a
 * blocked network was twelve seconds of silence.
 */
const TIMEOUT_MS = 25_000;

export async function askDemoAI(
  vertical: string,
  messages: DemoTurn[],
): Promise<DemoAIResult> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical, messages }),
      signal: abort.signal,
    });
    const data = (await res.json()) as DemoAIResult;
    // The function answers with this shape on both success and handled errors.
    // Anything else (a gateway page, a network failure) lands in the catch.
    if (typeof data?.ok !== "boolean") throw new Error("shape");
    return data;
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof DOMException && err.name === "AbortError"
          ? "Javob juda uzoq kutildi. Qayta urinib ko'ring."
          : "Ulanishda xatolik. Qayta urinib ko'ring.",
    };
  } finally {
    clearTimeout(timer);
  }
}
