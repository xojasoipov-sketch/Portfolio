import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

export function Footer() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const p = useTransform(scrollYProgress, (v) => v);
  // The wordmark rises into place as the page reaches its end.
  const y = useTransform(p, [0, 1], ["55%", "0%"]);

  return (
    <footer ref={ref} className="hx-footer">
      <div className="hx-shell">
        <div className="hx-footer-row">
          <p>Saidburxon Xojasoipov</p>
          <nav aria-label="Qo'shimcha havolalar">
            <Link to="/xizmatlar">Narxlar</Link>
            <Link to="/cv">CV</Link>
            <a href="https://t.me/xojasoipov" target="_blank" rel="noreferrer">
              Telegram
            </a>
          </nav>
          <p>© 2026</p>
        </div>
      </div>
      <motion.p
        className="hx-wordmark"
        aria-hidden="true"
        style={reduce ? undefined : { y }}
      >
        sadiprime.lab
      </motion.p>
    </footer>
  );
}
