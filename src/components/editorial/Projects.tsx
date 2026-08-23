import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PROJECTS } from "@/data/projects";
import { asset } from "@/lib/asset";
import orbitPortrait from "@/assets/orbit-portrait.webp";
import { useReveal } from "./useReveal";
import { useSpotlight } from "./useSpotlight";
import { Arrow } from "./icons";

/**
 * One slot per project, so the ring has five cards and 72 degrees between
 * neighbours.
 *
 * The ring carried each project twice before, which halved the spacing and put
 * all five on the front half at once -- read as one clump rather than a
 * carousel. At full spacing the cards have air between them and arrive one at
 * a time, which is what turning is supposed to look like.
 */
const RING_SLOTS = PROJECTS.length;

/** Degrees between neighbours on the ring. */
const STEP = 360 / RING_SLOTS;

/** Base drift, degrees per second — the rhythm the ring returns to. */
const BASE_SPEED = 9;

/** How long an arrow press or a focus holds the drift off before it resumes. */
const HOLD_MS = 6000;

/**
 * Exponential-decay half-life for a drag's leftover angular velocity, in
 * seconds. Shorter = the ring snaps back to its rhythm sooner; longer = it
 * keeps coasting. 0.9 gives a couple of solid revolutions after a hard flick
 * before it settles.
 */
const VELOCITY_HALF_LIFE = 0.9;
const VELOCITY_DECAY = Math.log(2) / VELOCITY_HALF_LIFE;

/** How many degrees per second a single pixel of horizontal drag imparts. */
const DRAG_SENSITIVITY = 0.5;

/** Movement further than this counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 6;

/**
 * Ceiling on detent clicks per second. A hard flick crosses a slot every few
 * frames, and firing one click each would be a machine-gun rattle rather than
 * the tick of a mechanism; past this rate the extra crossings pass silently.
 */
const MAX_TICKS_PER_SEC = 22;

/**
 * The work section: the projects turn around the portrait, and clicking one
 * opens it full size.
 *
 * The rotation is a small physics model. There is a base angular velocity
 * (BASE_SPEED) and an extra angular velocity the visitor can add by dragging
 * or by pressing an arrow. The extra decays exponentially back to zero, so
 * after a hard flick the ring slows on its own to its normal rhythm rather
 * than either stopping dead or spinning forever. The only sound is a detent
 * click each time a card reaches the front -- silent at rest and between
 * cards. The physics carries the rest of it: the gaps between ticks widen
 * on their own as the ring slows, so the deceleration is audible without
 * anything having to hum underneath it.
 *
 * The audio graph is built lazily on the first pointer press: browsers reject
 * an AudioContext.resume() that has not seen a user gesture, so constructing
 * it at mount would leave a suspended context sitting around on every page
 * load. The pointer press IS the gesture, so first drag = first sound.
 */
export function Projects() {
  const { ref, shown } = useReveal<HTMLElement>(0.06);
  const spotlightRef = useSpotlight<HTMLElement>();
  const worldRef = useRef<HTMLDivElement | null>(null);
  const slotsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [zoomed, setZoomed] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  /**
   * Which project is currently facing the viewer. Written from the rAF loop,
   * but only when it actually changes -- the ring moves every frame and the
   * front card does not, so setting this unconditionally would re-render the
   * whole section sixty times a second to redraw five dots.
   */
  const [frontIndex, setFrontIndex] = useState(0);

  /** Current angle (deg), lives outside React. */
  const spin = useRef(0);
  /** Excess angular velocity above the base drift (deg/s), lives outside React. */
  const extraVel = useRef(0);
  /** Timestamp until which the idle drift stays out of the way. */
  const holdUntil = useRef(0);
  /**
   * Angle the ring is being driven to land on exactly, or null when it is
   * free-running. The arrows and a focus jump set this; drag clears it.
   *
   * The arrows used to inject a velocity kick and let the decay carry the
   * ring wherever it ended up, which is not what an arrow means: one press
   * should advance exactly one card, and pressing three times should land
   * three cards along, not somewhere between the third and fourth. A target
   * the frame eases toward is the only way to make that exact.
   */
  const snapTo = useRef<number | null>(null);
  /** Mirror of frontIndex outside React, so the loop can compare without a read. */
  const frontRef = useRef(0);

  /** Was the pointer moved far enough during the press to count as a drag? */
  const draggedFar = useRef(false);

  /**
   * The audio graph, built on the first press and torn down at unmount.
   *
   * The ring used to hum as well as tick -- filtered noise swept with speed,
   * meant to read as the air a turning object moves. It didn't earn its
   * place: against the ambient track it was just a layer of hiss, and the
   * detent already carries the motion on its own, since the gaps between
   * ticks widen as the ring slows. Ticks only now, so the ring is silent
   * except at the moment a card actually reaches the front.
   */
  const audio = useRef<{
    ctx: AudioContext;
    /**
     * The detent click, decoded from a real recording rather than
     * synthesized -- null until the fetch below resolves, so the first tick
     * or two of a very fast first flick can silently no-op rather than play
     * a placeholder sound.
     */
    clickBuffer: AudioBuffer | null;
    /** Every tick plays through here, so one node sets the ring's level. */
    tickBus: GainNode;
  } | null>(null);

  /** Timestamp of the last detent click, so the rate cap can be enforced. */
  const lastTickAt = useRef(0);
  /** Which detent the ring was sitting in last frame. */
  const lastDetent = useRef<number | null>(null);

  const ensureAudio = () => {
    if (audio.current) {
      // A context created before a gesture starts suspended; a real press
      // is the gesture that lets it resume.
      if (audio.current.ctx.state === "suspended") {
        void audio.current.ctx.resume();
      }
      return;
    }
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();

      const tickBus = ctx.createGain();
      tickBus.gain.value = 1;
      tickBus.connect(ctx.destination);

      audio.current = { ctx, clickBuffer: null, tickBus };

      // A real recorded tick, not a synthesized one -- fetched and decoded
      // once and reused for every detent for the rest of the session. Fire
      // and forget: a slow network just means the ring stays quiet on
      // detents until this resolves, same as a browser with no Web Audio.
      void fetch(asset("audio/tick.wav"))
        .then((res) => {
          // Without this a 404 feeds an HTML error page into decodeAudioData,
          // which rejects into a silent catch -- exactly the shape of the
          // base-path bug that took a while to find last time.
          if (!res.ok) throw new Error(`tick.wav ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          if (audio.current) audio.current.clickBuffer = decoded;
        })
        .catch((err: unknown) => {
          console.warn("[orbit] detent click unavailable:", err);
        });
    } catch {
      // No Web Audio -- the ring still turns, just without the ticks.
    }
  };

  /**
   * One detent click, played from a 22 ms recording rather than
   * synthesized -- a synthesized noise burst read as a buzz or a pop no
   * matter how it was filtered; an actual mechanical click sample is what a
   * real detent sounds like. Short enough on its own that a fast spin turns
   * repeated plays into a run of ticks rather than a smear.
   *
   * `strength` (0..1) scales loudness and pitch with how fast the ring is
   * turning, so a slow drift ticks softly and a flick ticks harder and a
   * touch higher. A small random detune on top keeps a run of identical
   * samples from reading as one sound looping instead of many small events.
   */
  const tick = (strength: number) => {
    const a = audio.current;
    if (!a || !a.clickBuffer) return;
    const { ctx, clickBuffer, tickBus } = a;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = clickBuffer;
    const jitter = 0.97 + Math.random() * 0.06;
    src.playbackRate.value = (0.94 + strength * 0.22) * jitter;

    const g = ctx.createGain();
    g.gain.value = 0.55 + strength * 0.7;

    src.connect(g).connect(tickBus);
    src.start(t);
  };

  /**
   * Advance exactly one card. `dir` is +1 for the right arrow, which turns
   * the ring so the cards travel to the right.
   *
   * The target is measured from the pending target when there is one, not
   * from the live angle, so three quick presses queue into three cards
   * rather than three attempts to leave from wherever the animation happens
   * to be at that instant.
   */
  const step = useCallback((dir: 1 | -1) => {
    holdUntil.current = performance.now() + HOLD_MS;
    extraVel.current = 0;
    const from = snapTo.current ?? spin.current;
    snapTo.current = Math.round(from / STEP) * STEP + dir * STEP;
    ensureAudio();
  }, []);

  /** Turn a specific card to the front, by the shortest way round. */
  const bringToFront = useCallback((index: number) => {
    holdUntil.current = performance.now() + HOLD_MS;
    extraVel.current = 0;
    // Same as the arrows: a dot is a deliberate press and should tick.
    ensureAudio();
    // Card i faces the viewer when i * STEP + spin is a multiple of 360, so
    // the angle that fronts it is -i * STEP plus any whole number of turns.
    // Picking the nearest turn is what stops the ring taking the long way.
    const wanted = -index * STEP;
    const from = snapTo.current ?? spin.current;
    snapTo.current = wanted + Math.round((from - wanted) / 360) * 360;
  }, []);

  /**
   * The main rAF loop. Drives both the ring and the audio from the same
   * physics numbers, so what you hear tracks what you see with no separate
   * bookkeeping.
   */
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const paused = zoomed !== null || focused || !onScreen || document.hidden;

      // Two modes. Snapping wins: while a target is set the ring is being
      // driven to an exact angle, and neither the drift nor any leftover
      // flick may push it off that mark.
      const snapping = snapTo.current !== null;
      if (snapping) {
        const diff = snapTo.current! - spin.current;
        if (Math.abs(diff) < 0.05) {
          // Land on the number rather than asymptotically near it, or the
          // rounding in the next press would drift a fraction each time.
          spin.current = snapTo.current!;
          snapTo.current = null;
        } else {
          spin.current += diff * Math.min(dt * 9, 1);
        }
      } else {
        // Base drift only when idle and past the hold. The visitor's extra
        // velocity is honoured regardless -- a paused page should still
        // finish whatever flick was in flight when they hovered away.
        if (!paused && now > holdUntil.current && !reduced.matches) {
          spin.current += BASE_SPEED * dt;
        }
        spin.current += extraVel.current * dt;

        // Exponential decay of the extra: fast at first, slowing as it nears
        // zero. Half-life is VELOCITY_HALF_LIFE seconds by construction.
        extraVel.current *= Math.exp(-VELOCITY_DECAY * dt);
        if (Math.abs(extraVel.current) < 0.5) extraVel.current = 0;
      }

      // Detents. A card faces front every STEP degrees, so the number of
      // slots the ring has passed is just floor(spin / STEP); each time that
      // integer changes, one card has come round to the front.
      if (audio.current) {
        const excess = Math.abs(extraVel.current);
        // How hard the ring is going, 0..1, curved so the loud end arrives
        // gradually instead of pinning the moment you flick it. The deadzone
        // keeps the idle drift from counting as "fast".
        const drive = Math.min(1, Math.max(0, excess - 30) / 520);
        // A snap carries no velocity to read, so it gets a fixed strength --
        // an arrow press is a deliberate act and should land a firm tick,
        // not the near-silent one that zero velocity would produce.
        const curve = snapping ? 0.45 : Math.pow(drive, 0.7);

        const detent = Math.floor(spin.current / STEP);
        if (lastDetent.current === null) {
          lastDetent.current = detent;
        } else if (detent !== lastDetent.current && !reduced.matches) {
          lastDetent.current = detent;
          // The cap is what keeps a hard flick a run of ticks rather than a
          // rattle: crossings past the rate simply do not sound.
          if (now - lastTickAt.current > 1000 / MAX_TICKS_PER_SEC) {
            lastTickAt.current = now;
            // Idle drift ticks quietly; a flick ticks hard. Never silent,
            // because a card reaching the front is worth hearing either way.
            tick(Math.min(1, 0.18 + curve * 0.9));
          }
        }
      }

      // Card i fronts at spin = -i * STEP, so the nearest front card is
      // -spin/STEP rounded, wrapped into range.
      const front =
        ((Math.round(-spin.current / STEP) % PROJECTS.length) +
          PROJECTS.length) %
        PROJECTS.length;
      if (front !== frontRef.current) {
        frontRef.current = front;
        setFrontIndex(front);
      }

      world.style.setProperty("--ed-spin", `${spin.current}deg`);
      for (let i = 0; i < slotsRef.current.length; i++) {
        const node = slotsRef.current[i];
        if (!node) continue;
        const angle = ((i * STEP + spin.current) * Math.PI) / 180;
        const facing = Math.cos(angle);
        // The only per-frame write left. --ed-depth and z-index were written
        // here too; nothing reads --ed-depth since the opacity fade was
        // removed, and z-index does not order children inside a preserve-3d
        // context -- the 3D sort does. Both were no-op style writes on five
        // nodes, sixty times a second.
        node.style.pointerEvents = facing > 0 ? "auto" : "none";
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [zoomed, focused, onScreen]);

  /**
   * Focus management for the zoom dialog.
   *
   * aria-modal="true" is a promise to a screen reader that the rest of the
   * page is unreachable. It was a promise nothing kept: focus stayed on the
   * card behind the scrim, and Tab walked straight out into the arrows, the
   * dots and the contact form -- content the visitor could not see through an
   * opaque backdrop. This moves focus in and keeps Tab inside.
   */
  useEffect(() => {
    if (zoomed === null) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      // Wrapping by hand rather than trusting the browser: the panel itself is
      // focusable (tabIndex -1) and is not in this list, so without the
      // explicit wrap the first Tab from the panel would escape it.
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [zoomed]);

  // Only turn while the section is actually on screen.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? true),
      { threshold: 0.15 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [ref]);

  /**
   * Pointer drag. Listeners are attached to WINDOW during a drag rather than
   * via setPointerCapture, because capture routes pointerup off the card and
   * a card's click event -- which is what opens the zoom -- would never fire.
   * Window listeners preserve native click while still tracking a drag that
   * runs off the edge of the stage.
   */
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    let dragging = false;
    let lastT = 0;
    let lastX = 0;
    let totalDx = 0;

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      // A hand on the ring outranks a pending arrow press.
      snapTo.current = null;
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      const dx = e.clientX - lastX;
      lastT = now;
      lastX = e.clientX;
      totalDx += Math.abs(dx);
      if (totalDx > DRAG_THRESHOLD_PX) draggedFar.current = true;
      // Blend the new drag velocity with what is already there, so a quick
      // series of small moves builds up smoothly rather than snapping to
      // whichever frame's dx was largest.
      const dragVel = (dx / dt) * DRAG_SENSITIVITY;
      extraVel.current = extraVel.current * 0.55 + dragVel * 0.45;
      holdUntil.current = now + HOLD_MS;
    };

    const onUp = () => {
      dragging = false;
      // Cleared on the next macrotask, after the synthetic click that follows
      // this pointerup has had its chance to be suppressed. Leaving it set
      // meant a drag ending on empty stage swallowed the next Enter on a
      // focused card -- keyboard users get no pointerdown to reset it.
      setTimeout(() => {
        draggedFar.current = false;
      }, 0);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    const onDown = (e: PointerEvent) => {
      // Ignore right-click / middle-click -- they should not shove the ring.
      if (e.button !== 0 && e.pointerType === "mouse") return;
      ensureAudio();
      dragging = true;
      draggedFar.current = false;
      lastT = performance.now();
      lastX = e.clientX;
      totalDx = 0;
      holdUntil.current = performance.now() + HOLD_MS;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };

    world.addEventListener("pointerdown", onDown);
    return () => {
      world.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  /**
   * The single close path. Every route out of the dialog goes through here so
   * focus lands back on the card that opened it -- Escape used to restore it
   * while the close button and the scrim dropped focus to <body>, sending the
   * visitor back to the top of the document.
   */
  const closeZoom = useCallback(() => {
    const i = zoomed;
    setZoomed(null);
    if (i !== null) slotsRef.current[i]?.focus();
  }, [zoomed]);

  // Escape closes the open card; arrows turn the ring.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zoomed !== null) {
        closeZoom();
        return;
      }
      if (zoomed !== null) return;
      // Arrows belong to whatever the visitor is typing in. Without this the
      // ring snapped a card -- and fired a detent click -- on every caret
      // move in the contact form, which is on the same page.
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
  }, [zoomed, step, closeZoom]);

  // Close the context on unmount. Nothing runs continuously any more -- each
  // tick is its own short-lived source node that stops on its own -- so there
  // is no oscillator left to stop first.
  useEffect(() => {
    return () => {
      const a = audio.current;
      if (!a) return;
      void a.ctx.close();
      audio.current = null;
    };
  }, []);

  const openCard = (i: number) => {
    // A press that turned into a drag should not also open the card the
    // pointer happened to be on when it went down.
    if (draggedFar.current) {
      draggedFar.current = false;
      return;
    }
    setZoomed(i);
  };

  const open = zoomed === null ? null : PROJECTS[zoomed];

  return (
    <section
      id="work"
      ref={(node) => {
        ref.current = node;
        spotlightRef.current = node;
      }}
      data-surface="black"
      className="ed-spotlight"
      style={{
        backgroundColor: "var(--ed-black)",
        color: "var(--ed-offwhite)",
        paddingBlock: "var(--ed-section)",
        overflow: "hidden",
      }}
    >
      <div className="ed-shell">
        <div
          className="ed-rise"
          data-shown={shown}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            marginBottom: "clamp(1.5rem, 4vw, 2.5rem)",
            flexWrap: "wrap",
          }}
        >
          <h2
            className="ed-label"
            style={{ margin: 0, color: "var(--ed-red-tx)" }}
          >
            04 — Tanlangan loyihalar
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "var(--ed-gray-tx)",
            }}
          >
            Sudrab aylantiring — bossangiz ochiladi
          </p>
        </div>

        <div className="ed-rise" data-shown={shown}>
          <div className="ed-orbit-stage">
            <div
              className="ed-orbit-world"
              ref={worldRef}
              onFocusCapture={() => setFocused(true)}
              onBlurCapture={() => setFocused(false)}
              style={{ touchAction: "pan-y" }}
            >
              {/* A standing pose, unlike the seated cutout the rest of the
                  site uses: the ring has to turn around a figure, and a seated
                  one puts the head exactly where the front card passes.
                  Decorative — the about section names and describes him. */}
              <div className="ed-orbit-figure">
                <img
                  src={orbitPortrait}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              {PROJECTS.map((project, i) => {
                return (
                  <button
                    key={i}
                    type="button"
                    ref={(node) => {
                      slotsRef.current[i] = node;
                    }}
                    className="ed-orbit-slot"
                    style={{ ["--ed-slot" as string]: `${i * STEP}deg` }}
                    onFocus={() => bringToFront(i)}
                    onClick={() => openCard(i)}
                    aria-label={`${project.title} — loyihani ochish`}
                  >
                    <span
                      className="ed-orbit-face"
                      style={{ display: "block" }}
                    >
                      <span className="ed-orbit-index">{project.index}</span>
                      <h3 className="ed-orbit-title">
                        {project.title}
                        {project.titleAlt ? ` ${project.titleAlt}` : ""}
                      </h3>
                      <p className="ed-orbit-cat">{project.category}</p>
                      {project.shot && (
                        <span className="ed-orbit-shot">
                          <img
                            src={project.shot}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      )}
                      <span className="ed-orbit-open">
                        Ochish <Arrow direction="upRight" size="0.8em" />
                      </span>
                    </span>
                    {/* Blank reverse: shows the number of the card that is
                        turning away, so a card behind the figure reads as
                        "turned around" rather than "vanished". */}
                    <span className="ed-orbit-back" aria-hidden="true">
                      <span className="ed-orbit-back-index">
                        {project.index}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.25rem",
              marginTop: "clamp(1rem, 3vw, 2rem)",
            }}
          >
            <button
              type="button"
              className="ed-btn"
              onClick={() => step(-1)}
              aria-label="Oldingi loyiha"
              style={{ padding: "0.7rem 1.2rem" }}
            >
              <Arrow direction="left" size="0.85em" />
            </button>
            {/* Dots instead of a count. "05 ta loyiha" told a visitor
                nothing they could act on; these say which card is in front
                and take them straight to any other one. */}
            <div className="ed-orbit-dots">
              {PROJECTS.map((project, i) => (
                <button
                  key={project.index}
                  type="button"
                  className="ed-orbit-dot"
                  data-active={i === frontIndex || undefined}
                  onClick={() => bringToFront(i)}
                  aria-label={`${project.title} loyihasiga o'tish`}
                  aria-current={i === frontIndex ? "true" : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              className="ed-btn"
              onClick={() => step(1)}
              aria-label="Keyingi loyiha"
              style={{ padding: "0.7rem 1.2rem" }}
            >
              <Arrow size="0.85em" />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="ed-zoom" onClick={closeZoom}>
          {/* The dialog role lives on the panel, not on the full-viewport
              scrim it used to sit on -- the scrim is the click-to-dismiss
              backdrop, and giving it the role made the dialog's bounding box
              the whole window. tabIndex lets the effect below focus it. */}
          <div
            ref={panelRef}
            className="ed-zoom-panel"
            role="dialog"
            aria-modal="true"
            aria-label={open.title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ed-zoom-close"
              onClick={closeZoom}
              aria-label="Yopish"
            >
              ✕
            </button>

            {open.shot && (
              <div className="ed-zoom-shot">
                <img
                  src={open.shot}
                  alt={`${open.title} ekrani`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            )}

            <p
              className="ed-label"
              style={{ margin: 0, color: "var(--ed-red-tx)" }}
            >
              {open.index} — {open.category}
            </p>
            <h3
              style={{
                margin: "0.5rem 0 0.75rem",
                fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {open.title}
              {open.titleAlt ? ` ${open.titleAlt}` : ""}
            </h3>
            <p
              style={{
                margin: "0 0 1rem",
                fontSize: "clamp(1rem, 2vw, 1.25rem)",
                lineHeight: 1.45,
                maxWidth: "60ch",
              }}
            >
              {open.summary}
            </p>
            <p
              style={{
                margin: "0 0 1.5rem",
                color: "var(--ed-gray-tx)",
                lineHeight: 1.7,
                maxWidth: "70ch",
              }}
            >
              {open.detail}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              {open.tech.map((t) => (
                <span
                  key={t}
                  style={{
                    borderRadius: "999px",
                    border: "1px solid rgba(245,242,239,0.18)",
                    padding: "0.35rem 0.85rem",
                    fontSize: "0.62rem",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ed-gray-tx)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {open.demo && (
                <Link className="ed-btn" to={open.demo}>
                  Jonli demo <Arrow size="0.85em" />
                </Link>
              )}
              {open.site && (
                <a
                  className="ed-btn"
                  href={open.site}
                  target="_blank"
                  rel="noreferrer"
                >
                  Saytni ochish <Arrow direction="upRight" size="0.85em" />
                </a>
              )}
              {open.bot && (
                <a
                  className="ed-btn"
                  href={`https://t.me/${open.bot}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Telegram bot <Arrow direction="upRight" size="0.85em" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
