// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Deploy target: node-server. It emits .output/public (client assets) next to
  // .output/server, which is what scripts/build-static.sh boots and harvests
  // into a fully static site -- nitro's own prerenderer is broken under the
  // vite builder in this version (it rebuilds with rolldown, loses the SSR
  // wiring, and prerenders every route as a 404), and the "static" and
  // "github-pages" presets fail the build outright.
  nitro: { preset: "node-server" },

  vite: {
    // The static build is served from a subpath (Supabase Storage serves every
    // object under /storage/v1/object/public/<bucket>/), so asset URLs cannot
    // be root-relative. SITE_BASE is set to the absolute public prefix at build
    // time; it defaults to "/" so local dev and any root-served host are
    // unaffected.
    base: process.env.SITE_BASE || "/",
  },
});
