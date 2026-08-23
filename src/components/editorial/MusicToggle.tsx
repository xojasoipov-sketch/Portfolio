import { useEffect, useRef, useState } from "react";

/** Where the gain lands once the fade-in finishes. */
const VOLUME = 0.85;

/** How long the fade at play/pause takes, in ms. */
const FADE_MS = 700;

/**
 * A turntable in the corner of every page. First tap lowers the arm and the
 * record turns; a second tap lifts it and the record coasts to a stop.
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
 * The AudioContext is built lazily on the first tap: browsers reject
 * `resume()` on a context that has not seen a user gesture, so constructing
 * it at mount would leave a suspended context sitting around on every load.
 *
 * A context is `suspended` the moment it is constructed, and it takes an
 * explicit `resume()` to start it -- Chromium is lenient about this when the
 * constructor itself ran inside a gesture handler and will often start the
 * context running on its own, but WebKit (which is what Telegram's in-app
 * browser uses on iOS) does not extend that courtesy: it stays suspended
 * until `resume()` is called and awaited, gesture or not. Testing only in
 * Chromium hid this for a while -- the fix is to always resume and await it
 * before doing anything that depends on the context actually running.
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

  const ensureGraph = async () => {
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
    // Always resume and wait for it, every tap -- not only the first. A
    // context left idle can drift back to suspended on its own on some
    // engines, and this is the call WebKit will not do for us.
    if (g.ctx.state !== "running") {
      try {
        await g.ctx.resume();
      } catch {
        // Resume can reject if the gesture was somehow lost between the
        // click and here; the play() call right after this will fail the
        // same way and the existing catch there handles it.
      }
    }
    return g;
  };

  useEffect(() => {
    const el = elRef.current;
    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      el?.pause();
      void graph.current?.ctx.close();
    };
  }, []);

  /** Ramp the gain, then optionally pause the element once it reaches zero. */
  const fadeTo = (target: number, thenPause: boolean) => {
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
  };

  const toggle = async () => {
    const el = elRef.current;
    if (!el) return;

    if (playing) {
      setPlaying(false);
      fadeTo(0, true);
      return;
    }

    // Build (or resume) the graph before play(): on WebKit, a suspended
    // context passes no audio to its destination even while the element
    // itself is happily playing, which is silence with every other symptom
    // of success -- currentTime advancing, no error, `playing` state true.
    const g = await ensureGraph();

    try {
      await el.play();
      setPlaying(true);
      if (g) fadeTo(VOLUME, false);
    } catch {
      // The tap is the user gesture, so a rejected play() here means the
      // file could not be fetched. Leave the record still; a second tap
      // retries.
    }
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
        src="/audio/ambient.mp3"
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
