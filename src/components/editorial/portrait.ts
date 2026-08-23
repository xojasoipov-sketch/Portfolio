import portrait from "@/assets/portrait.png";
import portraitStanding from "@/assets/portrait-standing.webp";

/**
 * Single swap point for the portrait. Every section that renders it reads
 * from here, so replacing a photo is a one-file change.
 *
 * PORTRAIT is the wide seated three-quarter pose used in the hero; the
 * figure is weighted to the right of the frame. Both files are cutouts on
 * transparency so they blend into either surface colour.
 *
 * PORTRAIT_STANDING is a tighter standing pose used in About and Contact --
 * a different photo in each section so the same face never reads as a
 * repeat down the page.
 */
export const PORTRAIT: string | null = portrait;
export const PORTRAIT_STANDING: string | null = portraitStanding;

/**
 * Where the face sits in each cutout, as percentages. Used as
 * object-position for the cropped (cover) treatments so the head never
 * gets cut off.
 */
export const FACE_FOCUS = "76% 16%";
export const FACE_FOCUS_STANDING = "40% 22%";
