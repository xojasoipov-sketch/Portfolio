import { useEffect, useRef, useState, type ElementType } from "react";

/**
 * True once the element has scrolled into view (and stays true). Shared by
 * every "play once when it arrives" piece of the home page so there is a
 * single observer recipe.
 */
export function useInView<T extends HTMLElement>() {
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
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return [ref, shown] as const;
}

/**
 * Fades its children up once they scroll into view, then stops observing.
 * The motion itself lives in CSS (.hx-rv in home.css): this only flips a
 * data attribute, so nothing re-renders while the visitor scrolls.
 *
 * `i` staggers siblings through the --i custom property.
 */
export function Reveal({
  as: Tag = "div",
  className,
  i = 0,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  i?: number;
  children?: React.ReactNode;
} & Record<string, unknown>) {
  const [ref, shown] = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={["hx-rv", className].filter(Boolean).join(" ")}
      data-shown={shown}
      style={{ "--i": i } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * A heading whose words rise out of their own mask, one after another,
 * when it arrives (the same move the hero headline makes on load). Parts
 * marked `b` keep the heavy weight the headings use for their key word.
 * The heading is plain text for assistive tech; only the wrappers move.
 */
export function Rise({
  as: Tag = "h2",
  className,
  i = 0,
  parts,
}: {
  as?: ElementType;
  className?: string;
  i?: number;
  parts: { t: string; b?: boolean }[];
}) {
  const [ref, shown] = useInView<HTMLElement>();
  let n = 0;
  return (
    <Tag
      ref={ref}
      className={["hx-rise", className].filter(Boolean).join(" ")}
      data-shown={shown}
      style={{ "--i": i } as React.CSSProperties}
    >
      {parts.map((part, pi) => {
        const words = part.t.split(/\s+/).filter(Boolean);
        const inner = words.map((w, wi) => (
          <span key={wi}>
            {wi > 0 ? " " : null}
            <span className="hx-w">
              <span style={{ "--w": n++ } as React.CSSProperties}>{w}</span>
            </span>
          </span>
        ));
        return (
          <span key={pi}>
            {pi > 0 ? " " : null}
            {part.b ? <b>{inner}</b> : inner}
          </span>
        );
      })}
    </Tag>
  );
}
