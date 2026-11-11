import standing from "@/assets/orbit-portrait.webp";
import closeup from "@/assets/portrait-standing.webp";
import avatar from "@/assets/avatar.webp";

/**
 * Single swap point for the photos the home page uses.
 *
 * FIGURE is the full-height standing cutout in the hero, CLOSEUP the tighter
 * portrait in "Men kimman?", AVATAR the small round face next to the name.
 * All three are shown in grayscale (uslub.md: people and objects in grey
 * tones, colour only for the accent).
 */
export const FIGURE: string = standing;
export const CLOSEUP: string = closeup;
export const AVATAR: string = avatar;

/**
 * Optional walk-in clip for the hero. When a file is set here the hero
 * plays it once (muted, inline) in place of the still figure and keeps the
 * still as its poster and as the reduced-motion fallback. Null means the
 * hero shows the still figure, which is a finished state on its own.
 */
export const HERO_VIDEO: string | null = null;
