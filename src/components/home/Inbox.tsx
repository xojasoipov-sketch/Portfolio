import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * The hero's one object (uslub.md: mijoz, murojaat = chat oynasi). Three
 * incoming requests, the three pains of the headline, sit unanswered and
 * are then handled one by one: the red "unread" dot becomes a drawn check
 * and the status line changes. After a pause it starts over.
 *
 * It is a drawn mock-up, not a client's data, so it carries the "Maket"
 * tag the style guide requires.
 *
 * The first paint (and the server-rendered HTML) is the complete card with
 * all three requests waiting, so it never opens empty. It only runs while
 * it is on screen, and under prefers-reduced-motion it simply shows the
 * solved state.
 */
const ROWS = [
  {
    meta: "Telegram · 23:47",
    body: "Assalomu alaykum, narxi qancha?",
    wait: "Javobsiz",
    done: "Avtomatik javob berildi",
  },
  {
    meta: "Ariza · sayt formasi",
    body: "Dilnoza, ingliz tili kursi",
    wait: "Hech kim ko'rmadi",
    done: "Menejerga yuborildi",
  },
  {
    meta: "Admin · bugun",
    body: "Yana o'sha savol: manzil qayerda?",
    wait: "Qo'lda, yana va yana",
    done: "Endi avtomatik",
  },
] as const;

const FIRST_MS = 1700;
const STEP_MS = 1500;
const HOLD_MS = 3600;
const RESET_MS = 1500;

export function Inbox() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.3 });
  const [solved, setSolved] = useState(0);

  useEffect(() => {
    if (reduce) {
      setSolved(ROWS.length);
      return;
    }
    if (!inView) return;
    const wait =
      solved === 0 ? FIRST_MS : solved < ROWS.length ? STEP_MS : HOLD_MS;
    const t = window.setTimeout(
      () => setSolved((s) => (s >= ROWS.length ? 0 : s + 1)),
      solved === 0 ? Math.max(wait, RESET_MS) : wait,
    );
    return () => window.clearTimeout(t);
  }, [solved, inView, reduce]);

  return (
    <div ref={ref} className="hx-inbox" aria-hidden="true">
      <div className="hx-inbox-head">
        <span className="hx-inbox-title">Murojaatlar</span>
        <span className="hx-inbox-count">
          {solved}/{ROWS.length}
        </span>
        <span className="hx-maket">Maket</span>
      </div>
      <ul className="hx-inbox-list">
        {ROWS.map((r, i) => (
          <li
            key={r.meta}
            className="hx-msg"
            data-done={i < solved || undefined}
          >
            <span className="hx-msg-mark">
              <span className="hx-msg-dot" />
              <svg viewBox="0 0 16 16" className="hx-msg-check">
                <path d="M3.5 8.4l3 3 6-6.6" pathLength={1} />
              </svg>
            </span>
            <span className="hx-msg-text">
              <span className="hx-msg-meta">{r.meta}</span>
              <span className="hx-msg-body">{r.body}</span>
              <span className="hx-msg-status">
                <span className="hx-msg-wait">{r.wait}</span>
                <span className="hx-msg-ok">{r.done}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="hx-inbox-bar">
        <span style={{ transform: `scaleX(${solved / ROWS.length})` }} />
      </div>
    </div>
  );
}
