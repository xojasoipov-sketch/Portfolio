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

    // Coalesced to one write per frame. A mouse reports pointermove faster
    // than the display refreshes on many machines, and each event used to
    // force a layout (getBoundingClientRect) and repaint the whole section's
    // background -- several times per frame for a glow that can only move
    // once per frame anyway.
    let raf = 0;
    let x = 0;
    let y = 0;
    const flush = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--spot-x", `${x - rect.left}px`);
      node.style.setProperty("--spot-y", `${y - rect.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(flush);
    };

    node.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener("pointermove", onMove);
    };
  }, []);

  return ref;
}
