import { useEffect, useRef } from "react";

/**
 * Cursor-follow ambient glow for dark sections — writes `--spot-x` /
 * `--spot-y` custom properties onto the element itself, which the
 * `.ed-spotlight` CSS class reads into a `background-image` radial-gradient.
 * Living inside `background` (not a positioned overlay) means it always
 * paints behind the section's real content with no z-index bookkeeping.
 *
 * Mouse only, and a no-op under prefers-reduced-motion or a coarse
 * (touch) pointer — there is no cursor to follow on either.
 */
export function useSpotlight<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      node.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    };

    node.addEventListener("pointermove", onMove);
    return () => node.removeEventListener("pointermove", onMove);
  }, []);

  return ref;
}
