/**
 * Builds a URL for a file that lives in `public/`.
 *
 * Files in `public/` are copied verbatim and never run through the bundler,
 * so a hardcoded "/audio/x.mp3" points at the *domain* root. The site is
 * served from a subpath (GitHub Pages puts it under /Portfolio/, and
 * vite.config.ts feeds that to Vite as SITE_BASE), so such a path 404s in
 * production while working perfectly in local dev, where the base is "/".
 *
 * That failure mode is quiet and easy to mistake for something else: an
 * `<audio>` whose src 404s just refuses to play, and a `fetch()` for a sound
 * that 404s leaves the buffer null and the sound silently absent. Route every
 * public/ reference through here so the base is never forgotten.
 */
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}/${path}`.replace(/\/{2,}/g, "/");
