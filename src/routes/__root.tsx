import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { useTelegramMiniApp } from "../lib/telegram-miniapp";
import { trackPageview } from "../lib/analytics";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { asset } from "../lib/asset";
import { MusicToggle } from "../components/editorial/MusicToggle";

/**
 * Branded 404, in the site's own editorial language rather than the generic
 * shadcn card -- a wrong URL is often a visitor's first impression (a stale
 * link from a chat), so it should still look like the rest of the site and
 * route them somewhere useful instead of dead-ending.
 */
function NotFoundComponent() {
  return (
    <main
      data-surface="black"
      style={{
        minHeight: "100vh",
        background: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        display: "grid",
        placeItems: "center",
        padding: "var(--ed-gutter)",
      }}
    >
      <div style={{ maxWidth: "44rem", width: "100%" }}>
        <p
          className="ed-label"
          style={{ color: "var(--ed-red-br)", margin: 0 }}
        >
          Xatolik 404
        </p>
        <h1
          className="ed-display"
          style={{
            fontSize: "clamp(3rem, 16vw, 11rem)",
            margin: "0.5rem 0 0",
            lineHeight: 0.86,
          }}
        >
          Sahifa
          <br />
          <span style={{ color: "var(--ed-red-br)" }}>topilmadi.</span>
        </h1>
        <p
          style={{
            marginTop: "clamp(1.5rem, 4vw, 2.5rem)",
            maxWidth: "32rem",
            fontSize: "clamp(1rem, 1.5vw, 1.15rem)",
            lineHeight: 1.65,
            opacity: 0.7,
          }}
        >
          Siz izlagan sahifa mavjud emas yoki ko'chirilgan. Quyidagilardan
          birini tanlashingiz mumkin.
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginTop: "clamp(1.75rem, 4vw, 2.5rem)",
          }}
        >
          <Link
            to="/"
            className="ed-btn"
            style={{
              background: "var(--ed-red-br)",
              borderColor: "var(--ed-red-br)",
              color: "var(--ed-offwhite)",
            }}
          >
            Bosh sahifa
          </Link>
          <Link to="/xizmatlar" className="ed-btn">
            Xizmatlar katalogi
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/** Absolute origin of the deployed site. og:image and og:url must be absolute
 *  URLs -- Telegram, WhatsApp and LinkedIn all refuse to resolve a relative
 *  one, which is why the link preview rendered with no image at all. */
const SITE_ORIGIN = "https://xojasoipov-sketch.github.io";
const absolute = (path: string) => `${SITE_ORIGIN}${asset(path)}`;

const SITE_TITLE = "Saidburxon Xojasoipov — Full-stack Developer & AI Builder";
const SITE_DESCRIPTION =
  "Saidburxon Xojasoipov — full-stack dasturchi va AI-yechimlar mutaxassisi. Web, AI tizimlar, SaaS mahsulotlar va biznes avtomatlashtirish.";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: SITE_TITLE },
        { name: "description", content: SITE_DESCRIPTION },
        { property: "og:title", content: SITE_TITLE },
        { property: "og:description", content: SITE_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Saidburxon Xojasoipov" },
        { property: "og:locale", content: "uz_UZ" },
        { property: "og:url", content: absolute("") },
        // twitter:card promised a large image long before there was one to
        // show, so every share rendered as a bare text card.
        { property: "og:image", content: absolute("og.png") },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        {
          property: "og:image:alt",
          content: "Saidburxon Xojasoipov — Full-stack Developer & AI Builder",
        },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: SITE_TITLE },
        { name: "twitter:description", content: SITE_DESCRIPTION },
        { name: "twitter:image", content: absolute("og.png") },
        { name: "theme-color", content: "#050505" },
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: asset("favicon.svg") },
        { rel: "apple-touch-icon", href: asset("apple-touch-icon.png") },
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
        },
      ],
      scripts: [
        // Telegram Mini App SDK. Defines window.Telegram.WebApp only when the
        // page is opened from a Telegram client; in a normal browser it loads
        // and does nothing, so the public site is unaffected.
        { src: "https://telegram.org/js/telegram-web-app.js" },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Runs the Mini App handshake (ready/expand/theme) when opened inside
  // Telegram; a no-op everywhere else.
  useTelegramMiniApp();

  // One pageview per route, including client-side navigations -- a plain
  // load-time beacon would miss every move between / and /xizmatlar.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      {/* Fixed to the viewport corner, so it rides above every route without
          each of them having to know about it. */}
      <MusicToggle />
    </QueryClientProvider>
  );
}
