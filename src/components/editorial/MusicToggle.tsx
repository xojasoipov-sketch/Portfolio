import { useEffect, useRef, useState } from "react";

/** Where the element's volume lands once it has faded in. */
const VOLUME = 0.85;

/** How long the fade at play/pause takes, in ms. */
const FADE_MS = 700;

/**
 * A turntable in the corner of every page. First tap lowers the arm and the
 * record turns; a second tap lifts it and the record coasts to a stop.
 *
 * The audio element is constructed lazily on the first tap: browsers block
 * autoplay of anything with sound until a user gesture has been observed, so
 * creating it at mount would only log a rejected `play()` on every page load.
 *
 * The fade lives here rather than in the file. Baking a long fade into the
 * mp3 meant the first seconds after a tap were near-silence, which reads as
 * a broken button; a ramp on `volume` gives the same ease-in while the first
 * audible moment lands immediately.
 */
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.src = "";
      }
    };
  }, []);

  /** Ramp the element's volume, then optionally pause once it reaches zero. */
  const fadeTo = (target: number, thenPause: boolean) => {
    const el = audioRef.current;
    if (!el) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const from = el.volume;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      el.volume = from + (target - from) * t;
      if (t < 1) {
        fadeRef.current = requestAnimationFrame(tick);
      } else {
        fadeRef.current = null;
        if (thenPause) el.pause();
      }
    };
    fadeRef.current = requestAnimationFrame(tick);
  };

  const toggle = async () => {
    let el = audioRef.current;
    if (!el) {
      el = new Audio("/audio/ambient.mp3");
      el.loop = true;
      el.preload = "none";
      el.volume = 0;
      audioRef.current = el;
    }

    if (playing) {
      setPlaying(false);
      fadeTo(0, true);
      return;
    }

    try {
      el.volume = 0;
      await el.play();
      setPlaying(true);
      fadeTo(VOLUME, false);
    } catch {
      // The tap is the user gesture, so a rejected play() here means the file
      // could not be fetched. Leave the record still; a second tap retries.
    }
  };

  return (
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
          {/* A rotationally symmetric disc looks identical at every angle, so
              spinning it changed nothing on screen. This sheen is the
              asymmetry that makes the rotation visible: a bright wedge that
              sweeps past as the record turns. */}
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
  );
}
