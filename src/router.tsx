import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // The static build can be served from a subpath (GitHub Pages serves this
    // repo under /Portfolio/, see vite.config.ts's SITE_BASE). Vite injects
    // that same prefix into BASE_URL at build time, so internal <Link>s
    // resolve correctly there instead of assuming the site is at the domain
    // root.
    basepath: import.meta.env.BASE_URL,
  });

  return router;
};
