import portrait from "@/assets/portrait.png";

/**
 * Single swap point for the portrait. Every section that renders it reads
 * from here, so replacing the photo is a one-file change.
 *
 * The asset is a background-removed cutout on transparency: a wide, seated
 * three-quarter pose, figure weighted to the right of the frame.
 */
export const PORTRAIT: string | null = portrait;

/**
 * Where the face sits in the cutout, as percentages. Used as object-position
 * for the cropped (cover) treatments so the head never gets cut off.
 */
export const FACE_FOCUS = "76% 16%";
