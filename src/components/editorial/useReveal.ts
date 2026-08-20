import { useEffect, useRef, useState } from "react";

/**
 * Marks an element as shown once it scrolls into view, then stops observing.
 * Drives the `.ed-rise` / `.ed-clip` / `.ed-veil` transitions in styles.css
 * via a `data-shown` attribute so the animation itself stays in CSS.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, shown };
}
