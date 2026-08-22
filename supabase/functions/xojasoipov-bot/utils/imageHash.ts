import jpeg from "npm:jpeg-js@0.4.4";

/**
 * Perceptual image fingerprinting, so two submissions can be compared as
 * pictures rather than as filenames or captions.
 *
 * Telegram's `file_unique_id` only catches the exact same file sent twice,
 * which is not what happens: the same photo gets saved, cropped a little and
 * re-sent, and Telegram re-encodes it on the way through. dHash handles that
 * -- the picture is reduced to a 9x8 grey thumbnail and each pixel compared to
 * its right-hand neighbour, so the 64 bits describe gradients rather than
 * pixels and survive resizing and recompression. Compared by Hamming distance.
 *
 * Deliberately not a neural embedding: this runs inside an edge function while
 * an admin waits, with no model to load and no API to call.
 */

/** 9 columns so that 8 left-to-right comparisons fit per row. */
const HASH_W = 9;
const HASH_H = 8;

/**
 * Measured (npm run test:imagehash): a resized or re-encoded copy scores 0-2,
 * a crop 4-8, a genuinely different photo past 20. 8 sits in the gap and errs
 * toward flagging -- a false duplicate is a message the admin overrides, a
 * missed one silently pollutes the base.
 */
export const DUPLICATE_DISTANCE = 8;

/** Length of a dHash in hex characters (64 bits / 4 bits per char). */
export const HASH_LENGTH = 16;

/**
 * Box-filter downscale to a small greyscale grid. Averaging each source block,
 * rather than sampling one pixel per cell, is what keeps the result stable
 * across resolutions.
 */
function downscaleToGrey(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Float64Array {
  const out = new Float64Array(HASH_W * HASH_H);
  for (let ty = 0; ty < HASH_H; ty++) {
    const y0 = Math.floor((ty * height) / HASH_H);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * height) / HASH_H));
    for (let tx = 0; tx < HASH_W; tx++) {
      const x0 = Math.floor((tx * width) / HASH_W);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * width) / HASH_W));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          // Rec. 601 luma: a plain (r+g+b)/3 would let a colour change
          // masquerade as a change in shape.
          sum += 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
          count += 1;
        }
      }
      out[ty * HASH_W + tx] = count > 0 ? sum / count : 0;
    }
  }
  return out;
}

/**
 * The 16-character hex dHash of a JPEG, or null if it cannot be decoded --
 * which must not fail the submission, since the file-id and caption
 * comparisons still work without a hash.
 */
export function computeImageHash(bytes: Uint8Array): string | null {
  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 64 }) as {
      width: number;
      height: number;
      data: Uint8Array;
    };
  } catch {
    return null;
  }
  if (!decoded.width || !decoded.height) return null;

  const grey = downscaleToGrey(decoded.data, decoded.width, decoded.height);

  let hex = "";
  let nibble = 0;
  let bits = 0;
  for (let y = 0; y < HASH_H; y++) {
    for (let x = 0; x < HASH_W - 1; x++) {
      nibble = (nibble << 1) | (grey[y * HASH_W + x]! > grey[y * HASH_W + x + 1]! ? 1 : 0);
      if (++bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

/**
 * Differing bits between two hex dHashes. Malformed or mismatched input
 * returns the maximum, so a corrupt stored hash can never read as a match.
 */
export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length || a.length !== HASH_LENGTH) return 64;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const left = Number.parseInt(a[i]!, 16);
    const right = Number.parseInt(b[i]!, 16);
    if (Number.isNaN(left) || Number.isNaN(right)) return 64;
    let diff = left ^ right;
    while (diff) {
      distance += diff & 1;
      diff >>= 1;
    }
  }
  return distance;
}
