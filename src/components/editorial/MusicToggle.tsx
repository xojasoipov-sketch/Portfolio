import { useCallback, useEffect, useRef, useState } from "react";

import { asset } from "@/lib/asset";

/**
 * Where the gain lands once the fade-in finishes. Deliberately well under 1:
 * this starts without being asked for, so it has to sit under whatever the
 * visitor is doing rather than announce itself.
 */
const VOLUME = 0.55;

/** How long the fade at play/pause takes, in ms. */
const FADE_MS = 700;

/**
 * A turntable in the corner of every page. The record starts on its own when
 * a visitor arrives; anyone who would rather not hear it taps the deck once
 * and it lifts the arm for the rest of this visit. Nothing is remembered
 * across visits -- every fresh load, from anyone, including someone who
 * paused it last time, starts the record again on their first touch. An
 * earlier version stored the "off" choice in localStorage and respected it
 * on the next load; that was deliberately removed so the music never stays
 * silent for a returning visitor who never got a chance to hear it play.
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
  /** Lets the off switch take down the first-gesture fallback the effect armed. */
  const disarmRef = useRef<(() => void) | null>(null);
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
        // Resume can also reject outright on some engines.
      }
    }
    // If it is still not running, the timeout won the race and the element
    // would play into a context that passes nothing to the speakers -- which
    // is silence wearing every symptom of success. Report it as a failure so
    // the caller can leave the fallback armed instead.
    return g.ctx.state === "running" ? g : null;
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
    // No graph means the element's own output is what reaches the speakers,
    // and it defaults to 1. Setting volume here is the only thing standing
    // between a browser without Web Audio and full-blast playback.
    if (!g) el.volume = VOLUME;
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
    // Pause unconditionally. The graph path pauses at the end of the fade;
    // without a graph fadeTo returns immediately and would never reach it,
    // which left the music playing forever with the button showing "off".
    if (graph.current) fadeTo(0, true);
    else elRef.current?.pause();
  }, [fadeTo]);

  useEffect(() => {
    const el = elRef.current;
    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      el?.pause();
      void graph.current?.ctx.close();
      // A closed context and a source node bound to the old element are worse
      // than none: a remount would find them, fail to resume, and play
      // unrouted at full volume with a fade that no longer reaches anything.
      graph.current = null;
    };
  }, []);

  /**
   * Start on arrival: try outright, and fall back to the visitor's first
   * interaction when the browser refuses.
   *
   * Three things this has to get right, each of which was wrong at some
   * point and produced a different silent failure:
   *
   * - Only events that actually grant user activation are listened for.
   *   `wheel` and `touchstart` do not (`pointerup`, `click` and `touchend`
   *   do), so firing on those spent the one attempt while `play()` was still
   *   guaranteed to be refused. `keydown` is excluded on purpose and not for
   *   that reason: arrow keys and Tab are how someone reads the page with a
   *   screen reader, and navigating is not asking for music.
   * - The listeners are disarmed only once a start has actually succeeded.
   *   Disarming first meant one refused attempt killed the fallback for the
   *   rest of the visit.
   * - Gestures landing on the deck itself are skipped, or a visitor whose
   *   first act is pressing the button would have pointerdown start the music
   *   and the click that follows stop it again: pressed play, got silence.
   */
  useEffect(() => {
    let cancelled = false;
    const events = ["pointerup", "click", "touchend"] as const;

    const disarm = () => {
      for (const name of events) {
        window.removeEventListener(name, onGesture, true);
      }
    };
    disarmRef.current = disarm;

    function onGesture(e: Event) {
      const target = e.target as Element | null;
      if (target?.closest?.(".ed-music-toggle")) return;
      void start().then((ok) => {
        if (ok) disarm();
      });
    }

    // Armed before the autoplay attempt is made, not after it resolves: that
    // attempt takes hundreds of milliseconds, and a visitor who tapped inside
    // that window would land on no listener at all. Capture phase, so a
    // gesture is seen even when something downstream stops propagation.
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
      disarmRef.current = null;
    };
  }, [start]);

  const toggle = async () => {
    if (playing) {
      // Takes down the first-gesture fallback too, or the next scroll or tap
      // on the page would start the music right back up a moment after this
      // press turned it off -- nothing is remembered past this visit, but a
      // pause is still a pause for the rest of it.
      disarmRef.current?.();
      stop();
      return;
    }
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
        loop
        playsInline
        // "none", not "auto". This element is baked into the static HTML of
        // every route, so preloading meant the browser began pulling the
        // whole track while still parsing <head>, competing with the hero
        // image for bandwidth on every page load whether or not anyone ever
        // pressed play. Nothing here depends on it being preloaded --
        // start() calls play(), which loads it then.
        preload="none"
        style={{ display: "none" }}
      >
        {/* Two sources, one download: the browser takes the first it can
            decode and never requests the other. AAC is smaller and is what
            almost everything picks, but it is a licensed codec that
            Chromium builds without proprietary codecs genuinely cannot play
            -- shipping it alone made play() reject with
            NotSupportedError. mp3 is the floor that every engine supports. */}
        <source src={asset("audio/ambient.m4a")} type="audio/mp4" />
        <source src={asset("audio/ambient.mp3")} type="audio/mpeg" />
      </audio>
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
