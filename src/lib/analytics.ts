/**
 * Pageview beacon for the self-hosted analytics endpoint.
 *
 * Deliberately tiny and failure-tolerant: analytics must never be able to
 * slow down or break a page. Nothing is stored in the browser (no cookie, no
 * localStorage), so there is nothing to consent to; the server does the
 * de-duplication with a daily-rotating hash instead.
 */

const ENDPOINT =
  "https://tomkxsdkerpbvlumubbg.supabase.co/functions/v1/site-analytics";

/** Honour an explicit opt-out; the numbers are not worth overriding it. */
function optedOut(): boolean {
  const dnt =
    navigator.doNotTrack ??
    (window as { doNotTrack?: string }).doNotTrack ??
    (navigator as { msDoNotTrack?: string }).msDoNotTrack;
  return dnt === "1" || dnt === "yes";
}

function insideTelegram(): boolean {
  return Boolean(
    (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp
      ?.initData,
  );
}

export function trackPageview(path: string): void {
  if (typeof window === "undefined") return;
  if (optedOut()) return;
  // Local dev noise would otherwise pollute the real numbers.
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return;
  }

  const payload = JSON.stringify({
    path,
    referrer: document.referrer || null,
    telegram: insideTelegram(),
  });

  try {
    // keepalive so the request still completes if the visitor navigates away
    // immediately; sendBeacon cannot set Content-Type, which the function
    // needs in order to parse JSON.
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
      mode: "cors",
    }).catch(() => {});
  } catch {
    /* never surface an analytics failure to the visitor */
  }
}
