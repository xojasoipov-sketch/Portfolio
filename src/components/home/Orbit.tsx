import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { PROJECTS, type Project } from "@/data/projects";
import { asset } from "@/lib/asset";
import { Arrow } from "@/components/editorial/icons";
import { FIGURE } from "./media";

/**
 * The projects carousel: the work turns around Saidburxon like a ring.
 *
 * Drag it, flick it, press the arrows or the dots, or just scroll: the
 * ring also turns with the page. One card faces the visitor at a time and
 * its name, summary and links are written out under the ring, so the 3D
 * never carries the reading on its own.
 *
 * Physics (kept from the earlier ring, which was the part worth keeping):
 * a slow base drift, plus an extra angular velocity from drag and scroll
 * that decays exponentially back to rest. Arrows and dots set an exact
 * target angle instead, so one press is always exactly one card. The frame
 * loop writes a single CSS variable; everything else is static CSS, so a
 * frame costs one style write and no React render.
 */

const COUNT = PROJECTS.length;
/** Degrees between neighbours. */
const STEP = 360 / COUNT;
/** Idle drift, degrees per second. */
const BASE_SPEED = 7;
/** How long a deliberate action keeps the idle drift off. */
const HOLD_MS = 6000;
/** Half-life, in seconds, of the leftover velocity from a flick. */
const HALF_LIFE = 0.9;
const DECAY = Math.log(2) / HALF_LIFE;
/** Degrees per second imparted by one pixel per second of drag. */
const DRAG_GAIN = 0.5;
/** Degrees of ring turn per pixel of page scroll. */
const SCROLL_GAIN = 0.1;
/** Movement beyond this many pixels is a drag, not a click. */
const DRAG_PX = 6;
/** Ceiling on detent ticks per second. */
const MAX_TICKS_PER_SEC = 18;
/** Gap between one card leaving the stack and the next. */
const ENTRY_STAGGER_MS = 110;

const nameOf = (p: Project) => [p.title, p.titleAlt].filter(Boolean).join(" ");

type Audio = {
  ctx: AudioContext;
  buffer: AudioBuffer | null;
  bus: GainNode;
};

export function Orbit() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [entry, setEntry] = useState<"pending" | "done">("pending");
  const [zoomed, setZoomed] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [front, setFront] = useState(0);

  const spin = useRef(0);
  const extra = useRef(0);
  const holdUntil = useRef(0);
  const snapTo = useRef<number | null>(null);
  const frontRef = useRef(0);
  const dragged = useRef(false);
  const audio = useRef<Audio | null>(null);
  const lastTick = useRef(0);
  const lastDetent = useRef<number | null>(null);

  // The deck opens the first time the ring is really on screen.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setEntry("done");
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        const seen = e?.isIntersecting ?? true;
        setOnScreen(seen);
        if (seen) setEntry("done");
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const ensureAudio = () => {
    if (audio.current) {
      if (audio.current.ctx.state === "suspended")
        void audio.current.ctx.resume();
      return;
    }
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const bus = ctx.createGain();
      bus.gain.value = 0.8;
      bus.connect(ctx.destination);
      audio.current = { ctx, buffer: null, bus };
      void fetch(asset("audio/tick.wav"))
        .then((r) => {
          if (!r.ok) throw new Error(`tick.wav ${r.status}`);
          return r.arrayBuffer();
        })
        .then((b) => ctx.decodeAudioData(b))
        .then((decoded) => {
          if (audio.current) audio.current.buffer = decoded;
        })
        .catch(() => {
          /* the ring still turns without its click */
        });
    } catch {
      /* no Web Audio */
    }
  };

  const tick = (strength: number) => {
    const a = audio.current;
    if (!a || !a.buffer) return;
    const src = a.ctx.createBufferSource();
    src.buffer = a.buffer;
    src.playbackRate.value =
      (0.94 + strength * 0.2) * (0.97 + Math.random() * 0.06);
    const g = a.ctx.createGain();
    g.gain.value = 0.5 + strength * 0.6;
    src.connect(g).connect(a.bus);
    src.start();
  };

  const step = useCallback((dir: 1 | -1) => {
    holdUntil.current = performance.now() + HOLD_MS;
    extra.current = 0;
    const from = snapTo.current ?? spin.current;
    // Card i faces front at spin = -i * STEP, so the next card is a step back.
    snapTo.current = Math.round(from / STEP) * STEP - dir * STEP;
    ensureAudio();
  }, []);

  const bringToFront = useCallback((index: number) => {
    holdUntil.current = performance.now() + HOLD_MS;
    extra.current = 0;
    ensureAudio();
    // Card i faces the viewer when i * STEP + spin is a whole number of
    // turns; the nearest such angle keeps the ring from going the long way.
    const wanted = -index * STEP;
    const from = snapTo.current ?? spin.current;
    snapTo.current = wanted + Math.round((from - wanted) / 360) * 360;
  }, []);

  // The frame loop.
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();
    let lastY = window.scrollY;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const paused = zoomed !== null || focused || !onScreen || document.hidden;

      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;

      const snapping = snapTo.current !== null;
      if (snapping) {
        const diff = snapTo.current! - spin.current;
        if (Math.abs(diff) < 0.05 || reduced.matches) {
          spin.current = snapTo.current!;
          snapTo.current = null;
        } else {
          spin.current += diff * Math.min(dt * 9, 1);
        }
      } else if (!paused) {
        if (now > holdUntil.current && !reduced.matches) {
          spin.current += BASE_SPEED * dt;
        }
        // Scrolling the page turns the ring a little as well.
        if (!reduced.matches && onScreen && Math.abs(dy) < 400) {
          spin.current += dy * SCROLL_GAIN;
        }
        spin.current += extra.current * dt;
        extra.current *= Math.exp(-DECAY * dt);
        if (Math.abs(extra.current) < 0.5) extra.current = 0;
      } else {
        spin.current += extra.current * dt;
        extra.current *= Math.exp(-DECAY * dt);
        if (Math.abs(extra.current) < 0.5) extra.current = 0;
      }

      if (audio.current && !reduced.matches) {
        const detent = Math.floor(spin.current / STEP);
        if (lastDetent.current === null) {
          lastDetent.current = detent;
        } else if (detent !== lastDetent.current) {
          lastDetent.current = detent;
          if (now - lastTick.current > 1000 / MAX_TICKS_PER_SEC) {
            lastTick.current = now;
            const drive = Math.min(
              1,
              Math.max(0, Math.abs(extra.current) - 30) / 520,
            );
            tick(
              Math.min(
                1,
                0.18 + (snapping ? 0.45 : Math.pow(drive, 0.7)) * 0.9,
              ),
            );
          }
        }
      }

      const f =
        (((Math.round(-spin.current / STEP) % COUNT) + COUNT) % COUNT) | 0;
      if (f !== frontRef.current) {
        frontRef.current = f;
        setFront(f);
      }

      world.style.setProperty("--hx-spin", `${spin.current}deg`);
      for (let i = 0; i < slotsRef.current.length; i++) {
        const node = slotsRef.current[i];
        if (!node) continue;
        const a = ((i * STEP + spin.current) * Math.PI) / 180;
        node.style.pointerEvents = Math.cos(a) > 0.2 ? "auto" : "none";
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [zoomed, focused, onScreen]);

  // Pointer drag. Listeners live on window during a drag so the native
  // click that opens a card still fires.
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    let dragging = false;
    let lastT = 0;
    let lastX = 0;
    let total = 0;

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      snapTo.current = null;
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      const dx = e.clientX - lastX;
      lastT = now;
      lastX = e.clientX;
      total += Math.abs(dx);
      if (total > DRAG_PX) dragged.current = true;
      extra.current = extra.current * 0.55 + (dx / dt) * DRAG_GAIN * 0.45;
      holdUntil.current = now + HOLD_MS;
    };
    const onUp = () => {
      dragging = false;
      setTimeout(() => {
        dragged.current = false;
      }, 0);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      ensureAudio();
      dragging = true;
      dragged.current = false;
      lastT = performance.now();
      lastX = e.clientX;
      total = 0;
      holdUntil.current = performance.now() + HOLD_MS;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };
    world.addEventListener("pointerdown", onDown);
    return () => {
      world.removeEventListener("pointerdown", onDown);
      onUp();
    };
  }, []);

  const closeZoom = useCallback(() => {
    const i = zoomed;
    setZoomed(null);
    if (i !== null) slotsRef.current[i]?.focus();
  }, [zoomed]);

  // Keys: Escape closes the card, arrows turn the ring while it is on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zoomed !== null) {
        closeZoom();
        return;
      }
      if (zoomed !== null || !onScreen) return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed, onScreen, step, closeZoom]);

  // The dialog: focus moves in, Tab stays inside, the page behind is locked.
  useEffect(() => {
    if (zoomed === null) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.focus();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const f = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0]!;
      const lastEl = f[f.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKeyDown);
    return () => {
      panel.removeEventListener("keydown", onKeyDown);
      html.style.overflow = prev;
    };
  }, [zoomed]);

  useEffect(
    () => () => {
      const a = audio.current;
      if (a) void a.ctx.close();
      audio.current = null;
    },
    [],
  );

  const openCard = (i: number) => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setZoomed(i);
  };

  const current = PROJECTS[front] ?? PROJECTS[0]!;
  const open = zoomed === null ? null : PROJECTS[zoomed];

  return (
    <div className="hx-orbit" ref={sectionRef}>
      <div className="hx-orbit-stage" ref={stageRef}>
        <div
          className="hx-orbit-world"
          ref={worldRef}
          data-entry={entry}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={() => setFocused(false)}
          style={{ touchAction: "pan-y" }}
        >
          <div className="hx-orbit-disc" aria-hidden="true" />
          <div className="hx-orbit-figure" aria-hidden="true">
            <img src={FIGURE} alt="" loading="lazy" decoding="async" />
          </div>

          {PROJECTS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              ref={(node) => {
                slotsRef.current[i] = node;
              }}
              className="hx-orbit-slot"
              style={
                {
                  "--hx-slot": `${i * STEP}deg`,
                  "--hx-delay": `${i * ENTRY_STAGGER_MS}ms`,
                } as React.CSSProperties
              }
              onFocus={() => bringToFront(i)}
              onClick={() => openCard(i)}
              aria-label={`${nameOf(p)}: batafsil ochish`}
            >
              <span className="hx-orbit-face">
                <span
                  className="hx-orbit-shot"
                  data-poster={p.poster || undefined}
                >
                  {p.shot && (
                    <img
                      src={p.shot}
                      alt=""
                      width={1400}
                      height={788}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  )}
                </span>
                <span className="hx-orbit-meta">
                  <span className="hx-orbit-no">{p.index}</span>
                  <span className="hx-orbit-name">{nameOf(p)}</span>
                </span>
              </span>
              <span className="hx-orbit-back" aria-hidden="true">
                {p.index}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="hx-orbit-caption" aria-live="polite">
        <div className="hx-orbit-now" key={current.id}>
          <p className="hx-orbit-cat">
            <span>{current.index}</span>
            <span>{current.category}</span>
          </p>
          <h3 className="hx-orbit-title">{nameOf(current)}</h3>
          <p className="hx-orbit-sum">{current.summary}</p>
          <button
            type="button"
            className="hx-pill"
            onClick={() => setZoomed(frontRef.current)}
          >
            Batafsil <Arrow size="0.9em" />
          </button>
        </div>

        <div className="hx-orbit-controls">
          <button
            type="button"
            className="hx-orbit-arrow"
            onClick={() => step(-1)}
            aria-label="Oldingi loyiha"
          >
            <Arrow direction="left" size="0.95em" />
          </button>
          <div className="hx-orbit-dots">
            {PROJECTS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className="hx-orbit-dot"
                data-active={i === front || undefined}
                onClick={() => bringToFront(i)}
                aria-label={`${nameOf(p)} loyihasiga o'tish`}
                aria-current={i === front ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className="hx-orbit-arrow"
            onClick={() => step(1)}
            aria-label="Keyingi loyiha"
          >
            <Arrow size="0.95em" />
          </button>
        </div>
        <p className="hx-orbit-hint">Sudrab aylantiring yoki kartani bosing</p>
      </div>

      {open &&
        createPortal(
          <div className="hx-zoom" onClick={closeZoom}>
            <div
              ref={panelRef}
              className="hx-zoom-panel"
              role="dialog"
              aria-modal="true"
              aria-label={nameOf(open)}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="hx-zoom-close"
                onClick={closeZoom}
                aria-label="Yopish"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
              {open.shot && (
                <div
                  className="hx-zoom-shot"
                  data-poster={open.poster || undefined}
                >
                  <img
                    src={open.shot}
                    alt={`${nameOf(open)} loyihasi ekrani`}
                    width={1400}
                    height={788}
                    decoding="async"
                  />
                </div>
              )}
              <p className="hx-case-meta">
                <span>{open.index}</span>
                <span>{open.category}</span>
              </p>
              <h3 className="hx-zoom-title">{nameOf(open)}</h3>
              <p className="hx-case-summary">{open.summary}</p>
              <p className="hx-case-detail">{open.detail}</p>
              {open.tech.length > 0 && (
                <ul className="hx-tags">
                  {open.tech.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              <div className="hx-case-links">
                {open.site && (
                  <a
                    href={open.site}
                    target="_blank"
                    rel="noreferrer"
                    className="hx-pill"
                  >
                    Saytni ochish <Arrow direction="upRight" size="0.9em" />
                  </a>
                )}
                {open.bot && (
                  <a
                    href={`https://t.me/${open.bot}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hx-pill"
                  >
                    Telegram bot <Arrow direction="upRight" size="0.9em" />
                  </a>
                )}
                {open.demo && (
                  <Link to="/demo" className="hx-pill">
                    Demoni ochish <Arrow size="0.9em" />
                  </Link>
                )}
              </div>
            </div>
          </div>,
          // Into the page root, not the night sheet: the sheet is moved by
          // transforms, which would pin a fixed overlay to its own box.
          document.querySelector(".hx") ?? document.body,
        )}
    </div>
  );
}
