import { useEffect, useRef } from "react";

/**
 * The dot-and-ring cursor.
 *
 * Two elements rather than one, because they do different jobs: the dot
 * tracks the pointer with no smoothing at all, so pointing accuracy is
 * exactly what the system cursor gave you, and the ring lags behind on a
 * spring so the movement reads as weight. Smoothing the dot as well is the
 * usual mistake -- it looks nice on a slow demo drag and feels broken the
 * moment someone actually tries to click a small target.
 *
 * Only mounts for a fine pointer and only when motion is welcome. On a
 * touch screen there is no cursor to replace, and under
 * prefers-reduced-motion a lagging object chasing the pointer is exactly
 * the kind of thing the setting exists to switch off -- in both cases the
 * component renders nothing and the native cursor is left alone.
 */

/** Fraction of the remaining distance the ring closes each frame at 60fps. */
const RING_EASE = 0.18;

/** What counts as "you can click this", and so grows the ring. */
const INTERACTIVE =
  'a, button, input, textarea, select, summary, [role="button"], [tabindex]:not([tabindex="-1"])';

export function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Marks <html>, so the native cursor is hidden only once this effect has
    // actually run. A CSS-only `cursor: none` would take the real cursor away
    // on a browser where this script never executes, leaving no cursor at all.
    document.documentElement.setAttribute("data-cursor", "custom");

    let px = -100;
    let py = -100;
    let rx = px;
    let ry = py;
    let raf = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      // Only a real mouse. A pen or a trackpad-as-touch event would drag the
      // ring across the screen from wherever it was left.
      if (e.pointerType !== "mouse") return;
      px = e.clientX;
      py = e.clientY;
      // The dot is written here rather than in the frame loop: pointermove
      // already fires at the display's rate, so routing it through rAF would
      // only add up to a frame of lag to the one element that must not have any.
      dot.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      if (!visible) {
        visible = true;
        // First move also seeds the ring, so it eases out from under the
        // pointer instead of flying in from the last corner it was left in.
        rx = px;
        ry = py;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };

    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      ring.setAttribute(
        "data-hot",
        target?.closest?.(INTERACTIVE) ? "true" : "false",
      );
      // The ring is fixed to <html>, so it sits outside every section and
      // cannot inherit the surface-aware colour tokens the rest of the site
      // uses -- left to itself it painted the light theme's dark red while
      // floating over the black project section, and an offwhite ring over
      // the cream hero, i.e. invisible on one surface or the other. Reading
      // the surface out of the element under the pointer puts it back on the
      // site's own convention.
      ring.setAttribute(
        "data-surface",
        target?.closest?.('[data-surface="black"]') ? "black" : "light",
      );
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      rx += (px - rx) * RING_EASE;
      ry += (py - ry) * RING_EASE;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    };
    raf = requestAnimationFrame(frame);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeAttribute("data-cursor");
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="ed-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="ed-cursor-ring" aria-hidden="true" />
    </>
  );
}
