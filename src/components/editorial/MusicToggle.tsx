import { useEffect, useRef, useState } from "react";

/**
 * A spinning vinyl in the corner of every page. First tap starts the ambient
 * track and the disc turns; a second tap pauses it and the disc coasts to a
 * stop.
 *
 * The audio element is kept out of the DOM tree entirely and constructed
 * lazily on the first tap: browsers block autoplay of anything with sound
 * until a user gesture has been observed, and creating the element early
 * would just log a rejected `play()` promise on load.
 *
 * The label deliberately shows the track, not the state -- a visitor who saw
 * "Play" would expect the button to open a player. Here the disc's motion is
 * the state: turning means it is playing.
 */
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      // Leaving the page is a stop; a paused element still holds the file
      // buffered, which the browser will only free once nothing references it.
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.src = "";
      }
    };
  }, []);

  const toggle = async () => {
    let el = audioRef.current;
    if (!el) {
      el = new Audio("/audio/ambient.mp3");
      el.loop = true;
      el.preload = "none";
      // Softer than the site's other sounds so it sits under whatever the
      // visitor is looking at rather than over it.
      el.volume = 0.4;
      audioRef.current = el;
    }

    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }

    try {
      await el.play();
      setPlaying(true);
    } catch {
      // The first tap counts as the user gesture, so a rejected play() here
      // is unusual -- an offline network or a missing file. Leave the disc
      // still and the label unchanged; a second tap will retry.
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
      <span className="ed-music-disc" aria-hidden="true">
        <span className="ed-music-groove" />
        <span className="ed-music-groove" />
        <span className="ed-music-groove" />
        <span className="ed-music-label">
          <span className="ed-music-hole" />
        </span>
      </span>
    </button>
  );
}
