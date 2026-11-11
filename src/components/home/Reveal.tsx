import { useEffect, useRef, useState, type ElementType } from "react";

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
  const ref = useRef<HTMLElement>(null);
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
