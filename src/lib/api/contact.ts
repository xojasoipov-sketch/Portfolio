/**
 * Contact form submission.
 *
 * This used to be a TanStack server function, but the site is now prerendered
 * and served by GitHub Pages, which has no server runtime — so the submission
 * goes to a Supabase Edge Function instead. The Telegram bot token stays
 * server-side there and never reaches the browser, exactly as before.
 */
const ENDPOINT =
  import.meta.env.VITE_CONTACT_ENDPOINT ??
  "https://tomkxsdkerpbvlumubbg.supabase.co/functions/v1/contact";

export interface ContactInput {
  name: string;
  contact: string;
  message: string;
  /** Honeypot — real users never fill this. */
  company?: string;
}

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  // The endpoint answers with this shape on both success and handled errors;
  // anything else (network failure, gateway HTML) throws and is caught by the
  // caller, which shows the generic "write to me directly" fallback.
  const data = (await res.json()) as ContactResult;
  return data;
}
