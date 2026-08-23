import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PROJECTS } from "@/data/projects";
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

/** Extra velocity an arrow button injects, in deg/s. Felt like a real shove. */
const ARROW_KICK = 260;

/**
 * The work section: the projects turn around the portrait, and clicking one
 * opens it full size.
 *
 * The rotation is a small physics model. There is a base angular velocity
 * (BASE_SPEED) and an extra angular velocity the visitor can add by dragging
 * or by pressing an arrow. The extra decays exponentially back to zero, so
 * after a hard flick the ring slows on its own to its normal rhythm rather
 * than either stopping dead or spinning forever. The sound is the air the
 * ring moves: filtered noise whose band and level follow the speed, so a
 * flick is a soft whoosh that thins out as the ring coasts down -- silent
 * at rest.
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

  const [zoomed, setZoomed] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);

  /** Current angle (deg), lives outside React. */
  const spin = useRef(0);
  /** Excess angular velocity above the base drift (deg/s), lives outside React. */
  const extraVel = useRef(0);
  /** Timestamp until which the idle drift stays out of the way. */
  const holdUntil = useRef(0);

  /** Was the pointer moved far enough during the press to count as a drag? */
  const draggedFar = useRef(false);

  /**
   * The audio graph, running from the first press until unmount. The gain is
   * what turns the sound on and off; the source never stops.
   *
   * A sawtooth through a lowpass was the obvious choice and the wrong one:
   * its harmonics are evenly spaced, which the ear hears as a pitched buzz --
   * a power tool, not a moving object. What a spinning thing actually makes
   * is broadband air noise, so the source here is white noise through a
   * bandpass. Sweeping the band with speed gives the rising-and-falling
   * whoosh of something passing you, and because noise has no fundamental
   * there is no note to clash with the ambient track.
   *
   * The quiet triangle underneath is body, not pitch -- one soft partial so
   * the whoosh has some weight behind it. Triangle rather than saw: only odd
   * harmonics, and they fall off fast.
   */
  const audio = useRef<{
    ctx: AudioContext;
    noise: AudioBufferSourceNode;
    band: BiquadFilterNode;
    tone: OscillatorNode;
    toneGain: GainNode;
    gain: GainNode;
  } | null>(null);

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

      // Two seconds of white noise, looped. Long enough that the loop point
      // is inaudible; short enough to be cheap to generate.
      const frames = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // The band the whoosh lives in. A gentle Q: sharper would whistle,
      // flatter would just be hiss.
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 320;
      band.Q.value = 1.1;

      const tone = ctx.createOscillator();
      tone.type = "triangle";
      tone.frequency.value = 70;
      const toneGain = ctx.createGain();
      toneGain.gain.value = 0.35;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      noise.connect(band).connect(gain);
      tone.connect(toneGain).connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      tone.start();
      audio.current = { ctx, noise, band, tone, toneGain, gain };
    } catch {
      // No Web Audio -- the ring still turns, just without the whoosh.
    }
  };

  const step = useCallback((dir: 1 | -1) => {
    holdUntil.current = performance.now() + HOLD_MS;
    extraVel.current += dir * ARROW_KICK;
    ensureAudio();
  }, []);

  const bringToFront = useCallback((index: number) => {
    holdUntil.current = performance.now() + HOLD_MS;
    // Nudge the ring so the target card ends up near the front, but as a
    // one-off velocity kick rather than a target lock -- the drift takes it
    // from there.
    const slotAngle = index * STEP;
    const wanted = -slotAngle;
    const current = (((spin.current % 360) + 540) % 360) - 180;
    let delta = wanted - current;
    // Choose the short way around.
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    extraVel.current += delta * 1.5;
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

      // Base drift only when idle and past the hold. The visitor's extra
      // velocity is honoured regardless -- a paused page should still finish
      // whatever flick was in flight when they hovered away.
      if (!paused && now > holdUntil.current && !reduced.matches) {
        spin.current += BASE_SPEED * dt;
      }
      spin.current += extraVel.current * dt;

      // Exponential decay of the extra: fast at first, slowing as it nears
      // zero. Half-life is VELOCITY_HALF_LIFE seconds by construction.
      extraVel.current *= Math.exp(-VELOCITY_DECAY * dt);
      if (Math.abs(extraVel.current) < 0.5) extraVel.current = 0;

      // Drive the audio from the same |extraVel|. Below a small floor the
      // sound is off entirely -- otherwise the idle drift would hiss at rest.
      if (audio.current) {
        const { ctx, band, tone, toneGain, gain } = audio.current;
        const t = ctx.currentTime;
        const excess = Math.abs(extraVel.current);
        const audible = Math.max(0, excess - 30); // deadzone
        // How hard the ring is going, 0..1, curved so the loud end arrives
        // gradually instead of pinning the moment you flick it.
        const drive = Math.min(1, audible / 520);
        const curve = Math.pow(drive, 0.7);

        // Quiet on purpose: this plays under the ambient track, and a whoosh
        // that competes with the music is the same mistake as the buzz.
        const targetGain = reduced.matches ? 0 : curve * 0.085;
        // Slower ramp than the old 0.04 -- air builds and falls away, it does
        // not switch on.
        gain.gain.setTargetAtTime(targetGain, t, 0.12);

        // The band sweeps up as the ring speeds up: that rise and fall is
        // what makes it read as something passing rather than as static.
        band.frequency.setTargetAtTime(240 + curve * 900, t, 0.09);
        // Opening the Q slightly at speed narrows the band, which sharpens
        // the whoosh right when the motion is most obvious.
        band.Q.setTargetAtTime(1.1 + curve * 1.4, t, 0.09);

        // Body underneath, held well below the noise and moving less, so it
        // reads as weight rather than as a note.
        tone.frequency.setTargetAtTime(62 + curve * 38, t, 0.12);
        toneGain.gain.setTargetAtTime(0.22 + curve * 0.2, t, 0.12);
      }

      world.style.setProperty("--ed-spin", `${spin.current}deg`);
      for (let i = 0; i < slotsRef.current.length; i++) {
        const node = slotsRef.current[i];
        if (!node) continue;
        const angle = ((i * STEP + spin.current) * Math.PI) / 180;
        const facing = Math.cos(angle);
        const depth = (facing + 1) / 2;
        node.style.setProperty("--ed-depth", depth.toFixed(3));
        node.style.pointerEvents = facing > 0 ? "auto" : "none";
        node.style.zIndex = String(Math.round(depth * 100));
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [zoomed, focused, onScreen]);

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

  // Escape closes the open card; arrows turn the ring.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zoomed !== null) {
        setZoomed(null);
        slotsRef.current[zoomed]?.focus();
        return;
      }
      if (zoomed !== null) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed, step]);

  // Cleanup the audio graph on unmount so we do not leak an oscillator.
  useEffect(() => {
    return () => {
      const a = audio.current;
      if (!a) return;
      try {
        a.noise.stop();
        a.tone.stop();
      } catch {
        // already stopped
      }
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
          <p
            className="ed-label"
            style={{ margin: 0, color: "var(--ed-red-br)" }}
          >
            04 — Tanlangan loyihalar
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "var(--ed-gray-tx)",
            }}
          >
            Sudrab aylantiring — bosgansangiz ochiladi
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
                <img src={orbitPortrait} alt="" aria-hidden="true" />
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
                          <img src={project.shot} alt="" aria-hidden="true" />
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
            <span
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.18em",
                color: "var(--ed-gray-tx)",
              }}
            >
              {String(PROJECTS.length).padStart(2, "0")} ta loyiha
            </span>
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
        <div
          className="ed-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={() => setZoomed(null)}
        >
          <div className="ed-zoom-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ed-zoom-close"
              onClick={() => setZoomed(null)}
              aria-label="Yopish"
            >
              ✕
            </button>

            {open.shot && (
              <div className="ed-zoom-shot">
                <img src={open.shot} alt={`${open.title} ekrani`} />
              </div>
            )}

            <p
              className="ed-label"
              style={{ margin: 0, color: "var(--ed-red-br)" }}
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
