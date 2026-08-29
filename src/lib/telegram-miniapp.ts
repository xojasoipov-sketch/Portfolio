/**
 * Telegram Mini App integration.
 *
 * The site is a normal public portfolio first and a Mini App second: the
 * Telegram SDK only exists when the page is opened from inside a Telegram
 * client, so every access here is guarded and the site behaves exactly as
 * before in a plain browser.
 */
import { useEffect, useState } from "react";

/** Only the handful of SDK members this app touches. */
interface TelegramWebApp {
  ready(): void;
  expand(): void;
  requestFullscreen?(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  colorScheme?: "light" | "dark";
  viewportStableHeight?: number;
  onEvent?(event: string, handler: () => void): void;
  offEvent?(event: string, handler: () => void): void;
}

/** Matches --ed-offwhite in styles.css, so Telegram's chrome blends into the page. */
const CANVAS = "#f5f2ef";

export function getTelegramWebApp(): TelegramWebApp | null {
  const tg = (globalThis as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
    ?.WebApp;
  return tg ?? null;
}

/**
 * Initialises the Mini App and reports whether we're running inside Telegram,
 * so components can adapt (the site's own nav is redundant inside a Mini App,
 * which already has Telegram's header and close button).
 *
 * Returns false during SSR and in ordinary browsers.
 */
export function useTelegramMiniApp(): boolean {
  const [inTelegram, setInTelegram] = useState(false);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;

    setInTelegram(true);
    // Marks the document so CSS can react without prop-drilling.
    document.documentElement.dataset.telegram = "true";

    // ready() dismisses Telegram's loading placeholder; expand() opens to full
    // height instead of the default half-sheet -- but on Telegram Desktop the
    // Mini App still renders in a small, roughly-phone-sized floating window
    // regardless of expand(). requestFullscreen() (Bot API 8.0+) is what
    // actually makes Desktop clients open the window at a desktop-appropriate
    // size; guarded with `?.()` since older clients simply don't have it.
    tg.ready();
    tg.expand();
    tg.requestFullscreen?.();

    // The portfolio is one long scrolling page, so Telegram's swipe-to-close
    // gesture fights the content. Not available on older clients.
    tg.disableVerticalSwipes?.();

    // Paint Telegram's own chrome in the site's canvas colour rather than
    // leaving the default Telegram blue/white above an off-white page.
    tg.setHeaderColor?.(CANVAS);
    tg.setBackgroundColor?.(CANVAS);

    // Telegram's usable height excludes its header and any keyboard; exposing
    // it lets full-height sections size correctly instead of overflowing.
    const applyViewport = () => {
      if (typeof tg.viewportStableHeight === "number") {
        document.documentElement.style.setProperty(
          "--tg-viewport",
          `${tg.viewportStableHeight}px`,
        );
      }
    };
    applyViewport();
    tg.onEvent?.("viewportChanged", applyViewport);

    return () => {
      tg.offEvent?.("viewportChanged", applyViewport);
    };
  }, []);

  return inTelegram;
}
