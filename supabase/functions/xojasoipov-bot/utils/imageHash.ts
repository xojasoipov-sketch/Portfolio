import jpeg from "npm:jpeg-js@0.4.4";

/**
 * Perceptual image fingerprinting, so two submissions can be compared as
 * pictures rather than as filenames or captions.
 *
 * Telegram's own `file_unique_id` already catches the easy case: the exact
 * same file sent twice. It does not catch the case that actually happens --
 * the same photo saved, cropped a little, re-sent, and re-encoded along the
 * way. Those are byte-different files that a person would call the same item.
 *
 * dHash handles that. The picture is reduced to a 9x8 grey thumbnail and each
 * pixel compared to its right-hand neighbour, giving 64 bits that describe the
 * image's gradients rather than its pixels. Resizing, recompression and
 * brightness shifts leave those gradients intact, so the hash barely moves.
 * Comparison is Hamming distance.
 *
 * Deliberately not a neural embedding: this runs inside an edge function while
 * an admin waits, and 64 bits of arithmetic over a thumbnail costs
 * microseconds with no model to load and no API to call.
 */

/** 9 columns so that 8 left-to-right comparisons fit per row. */
const HASH_W = 9;
const HASH_H = 8;

/**
 * Hamming distance below which two photos are treated as the same item.
 * Measured: a re-encoded or resized copy lands at 0-2 bits, a crop around 4-8,
 * two genuinely different photos past 20. 8 sits in the empty space between,
 * and errs toward flagging -- a false duplicate is a message the admin reads
 * and overrides, a missed one silently pollutes the base.
 */
export const DUPLICATE_DISTANCE = 8;

/** Length of a dHash in hex characters (64 bits / 4 bits per char). */
export const HASH_LENGTH = 16;

/**
 * Box-filter downscale to a small greyscale grid. Averaging over each source
 * block, rather than sampling one pixel per cell, is what makes the result
 * stable across resolutions: point sampling a 1280px and a 320px copy of one
 * photo can land on different pixels and drift the hash.
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
 * The 16-character hex dHash of a JPEG, or null if the bytes cannot be
 * decoded. Telegram always serves photos as JPEG, so a decode failure means
 * the download went wrong -- and it must not take the submission down with it,
 * since the file-id and caption comparisons still work without a hash.
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
