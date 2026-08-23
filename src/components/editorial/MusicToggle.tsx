import { useCallback, useEffect, useRef, useState } from "react";

import { asset } from "@/lib/asset";

/** Where the gain lands once the fade-in finishes. */
const VOLUME = 0.85;

/** How long the fade at play/pause takes, in ms. */
const FADE_MS = 700;

/**
 * Remembers a visitor who switched the music off, so a reload does not force
 * it back on them. Only the "off" choice is stored: leaving it on is the
 * default, so there is nothing to remember about it.
 */
const OFF_KEY = "sx-music:v1:off";

function mutedByChoice(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(OFF_KEY) === "1";
  } catch {
    // Private mode or site data blocked -- treat as "no stored choice".
    return false;
  }
}

function rememberChoice(off: boolean) {
  try {
    if (off) window.localStorage.setItem(OFF_KEY, "1");
    else window.localStorage.removeItem(OFF_KEY);
  } catch {
    /* nothing to do: the choice just will not survive this reload */
  }
}

/**
 * A turntable in the corner of every page. The record starts on its own when
 * a visitor arrives; anyone who would rather not hear it taps the deck once
 * and it lifts the arm and stays off, on this visit and on the next.
 *
 * Autoplay cannot simply be called and trusted. Every current browser refuses
 * to start audible media before the page has seen a user gesture, and the
 * rejection is a promise rejection rather than an error you can feature-test
 * for in advance. So this tries to play immediately, and when that is refused
 * it arms a one-shot listener and starts on the visitor's very first
 * interaction instead -- a tap, a scroll, a key. In practice that is the same
 * moment for anyone who actually engages with the page, and it is the closest
 * to "plays on arrival" that is achievable without fighting the platform.
 *
 * Playback runs through the Web Audio API rather than a bare
 * `HTMLMediaElement.volume` ramp. Two problems pushed it there: some mobile
 * WebViews (Telegram's in-app browser among them) do not reliably play audio
 * from an `<audio>` element that was constructed in JS and never attached to
 * the document, and several of them also silently ignore writes to
 * `.volume` -- the element just plays at whatever it started at, so a fade
 * built on that property can end up either silent or stuck at full volume
 * depending on the engine. Both problems disappear once the element feeds a
 * GainNode: the element is real markup in the tree, and the fade lives on
 * the node graph instead of on the element.
 *
 * A context is `suspended` the moment it is constructed, and it takes an
 * explicit `resume()` to start it -- Chromium is lenient about this when the
 * constructor itself ran inside a gesture handler and will often start the
 * context running on its own, but WebKit (which is what Telegram's in-app
 * browser uses on iOS) does not extend that courtesy: it stays suspended
 * until `resume()` is called and awaited, gesture or not.
 */
export function MusicToggle() {
  const elRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const graph = useRef<{
    ctx: AudioContext;
    source: MediaElementAudioSourceNode;
    gain: GainNode;
  } | null>(null);

  const ensureGraph = useCallback(async () => {
    let g = graph.current;
    if (!g) {
      const el = elRef.current;
      if (!el) return null;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new Ctx();
        const source = ctx.createMediaElementSource(el);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(ctx.destination);
        g = { ctx, source, gain };
        graph.current = g;
      } catch {
        // No Web Audio -- fall through to a silent no-op; the button still
        // toggles and the disc still turns, just without sound.
        return null;
      }
    }
    // Always resume and wait for it, every time -- not only the first. A
    // context left idle can drift back to suspended on its own on some
    // engines, and this is the call WebKit will not do for us.
    //
    // Raced against a timeout because resume() on a context that has not
    // seen a user gesture does not reject -- it returns a promise that
    // simply never settles until an activation arrives. Awaiting it bare
    // meant the whole start() call hung, and the code after it never ran.
    if (g.ctx.state !== "running") {
      try {
        await Promise.race([
          g.ctx.resume(),
          new Promise((resolve) => setTimeout(resolve, 300)),
        ]);
      } catch {
        // Resume can also reject outright on some engines; the play() call
        // right after this will fail the same way and the caller handles it.
      }
    }
    return g;
  }, []);

  /** Ramp the gain, then optionally pause the element once it reaches zero. */
  const fadeTo = useCallback((target: number, thenPause: boolean) => {
    const g = graph.current;
    if (!g) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const from = g.gain.gain.value;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      g.gain.gain.value = from + (target - from) * t;
      if (t < 1) {
        fadeRef.current = requestAnimationFrame(tick);
      } else {
        fadeRef.current = null;
        if (thenPause) elRef.current?.pause();
      }
    };
    fadeRef.current = requestAnimationFrame(tick);
  }, []);

  /** Start playing. Resolves false when the browser refused. */
  const start = useCallback(async () => {
    const el = elRef.current;
    if (!el) return false;
    // Build (or resume) the graph before play(): on WebKit, a suspended
    // context passes no audio to its destination even while the element
    // itself is happily playing, which is silence with every other symptom
    // of success -- currentTime advancing, no error, `playing` state true.
    const g = await ensureGraph();
    try {
      await el.play();
      setPlaying(true);
      if (g) fadeTo(VOLUME, false);
      return true;
    } catch {
      return false;
    }
  }, [ensureGraph, fadeTo]);

  const stop = useCallback(() => {
    setPlaying(false);
    fadeTo(0, true);
  }, [fadeTo]);

  useEffect(() => {
    const el = elRef.current;
    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      el?.pause();
      void graph.current?.ctx.close();
    };
  }, []);

  /**
   * Start on arrival: try outright, and fall back to the first gesture.
   *
   * The listeners deliberately skip gestures that land on the deck itself.
   * Without that, a visitor whose first act is to press the button would see
   * pointerdown start the music and the click that follows immediately stop
   * it again -- they pressed play and got silence.
   */
  useEffect(() => {
    if (mutedByChoice()) return;

    let cancelled = false;
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

    const onGesture = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest?.(".ed-music-toggle")) return;
      disarm();
      void start();
    };

    const disarm = () => {
      for (const name of events) {
        window.removeEventListener(name, onGesture, true);
      }
    };

    // Armed first, before the autoplay attempt is even made. Arming only
    // after that attempt resolved was a real bug: the attempt can take
    // hundreds of milliseconds, and a visitor who taps during that window
    // would land on no listener at all and never hear anything.
    // Capture phase, so a gesture is seen even when something downstream
    // stops propagation.
    for (const name of events) {
      window.addEventListener(name, onGesture, true);
    }

    void start().then((ok) => {
      // Autoplay went through on its own, so the fallback is not needed.
      if (ok && !cancelled) disarm();
    });

    return () => {
      cancelled = true;
      disarm();
    };
  }, [start]);

  const toggle = async () => {
    if (playing) {
      rememberChoice(true);
      stop();
      return;
    }
    rememberChoice(false);
    await start();
  };

  return (
    <>
      {/* Real markup, not a detached `new Audio()` -- several mobile
          WebViews only play reliably from an element that is actually in
          the document. Not muted: `createMediaElementSource` already
          reroutes the element's output through the graph above instead of
          straight to the speakers, and muting on top of that is not
          cosmetic -- it silences what the graph receives too, so the fade
          would have nothing to fade in. */}
      <audio
        ref={elRef}
        src={asset("audio/ambient.mp3")}
        loop
        playsInline
        preload="auto"
        style={{ display: "none" }}
      />
      <button
        type="button"
        className="ed-music-toggle"
        data-playing={playing || undefined}
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Musiqani to'xtatish" : "Fon musiqasini yoqish"}
        title={playing ? "Musiqani to'xtatish" : "Fon musiqasini yoqish"}
      >
        <span className="ed-music-deck" aria-hidden="true">
          {/* Rings that ripple outward while the record plays -- the one cue
              that reads even at a glance, from the far side of the page. */}
          <span className="ed-music-pulse" />
          <span className="ed-music-pulse" />

          <span className="ed-music-disc">
            <span className="ed-music-groove" />
            <span className="ed-music-groove" />
            <span className="ed-music-groove" />
            {/* A rotationally symmetric disc looks identical at every angle,
                so spinning it changed nothing on screen. This sheen is the
                asymmetry that makes the rotation visible: a bright wedge
                that sweeps past as the record turns. */}
            <span className="ed-music-sheen" />
            <span className="ed-music-label">
              {/* Off-centre so it traces a visible circle, the way the paper
                  label's print does on a real record. */}
              <span className="ed-music-mark" />
              <span className="ed-music-hole" />
            </span>
          </span>

          {/* Tone arm: rests off the record, swings down onto it on play. */}
          <span className="ed-music-arm">
            <span className="ed-music-arm-head" />
          </span>
        </span>
      </button>
    </>
  );
}
