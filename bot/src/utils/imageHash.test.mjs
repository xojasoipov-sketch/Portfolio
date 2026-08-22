// Exercises the duplicate detector against the cases it exists for: the same
// photo re-encoded and resized (must match), a cropped copy (should match),
// and a genuinely different product (must not match).
//
// Run: node src/utils/imageHash.test.mjs
import jpeg from "jpeg-js";
import assert from "node:assert";

// Compiled first by the npm script; see "test:imagehash" in package.json.
const { computeImageHash, hammingDistance, DUPLICATE_DISTANCE } = await import(
  "../../dist-test/imageHash.js"
);

/** A deterministic, structured "photograph": smooth gradients plus shapes. */
function render(width, height, seed, { shiftX = 0, brightness = 1 } = {}) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x + shiftX) / width;
      const v = y / height;
      const blob =
        Math.sin((u * 6 + seed) * Math.PI) * Math.cos((v * 4 + seed * 2) * Math.PI);
      const band = Math.sin((u * 2 + v * 3 + seed) * Math.PI);
      const value = Math.max(0, Math.min(255, (0.5 + 0.35 * blob + 0.15 * band) * 255 * brightness));
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = Math.max(0, Math.min(255, value * 0.85));
      data[i + 2] = Math.max(0, Math.min(255, value * 0.6));
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data, width, height }, 85).data;
}

const original = computeImageHash(render(640, 480, 0.3));
assert.ok(original, "the original had to hash");
assert.strictEqual(original.length, 16, "a dHash is 16 hex chars");

// 1. Same picture, half the resolution and re-encoded -- what Telegram does to
//    every photo it serves at a smaller size.
const resized = computeImageHash(render(320, 240, 0.3));
const dResized = hammingDistance(original, resized);

// 2. Same picture at a lower JPEG quality and slightly brighter.
const reencoded = computeImageHash(render(640, 480, 0.3, { brightness: 1.08 }));
const dReencoded = hammingDistance(original, reencoded);

// 3. A different product photo.
const different = computeImageHash(render(640, 480, 1.7));
const dDifferent = hammingDistance(original, different);

console.log(`resized (320px)   distance = ${dResized}  (threshold ${DUPLICATE_DISTANCE})`);
console.log(`re-encoded+bright distance = ${dReencoded}`);
console.log(`different photo   distance = ${dDifferent}`);

assert.ok(dResized <= DUPLICATE_DISTANCE, `a resized copy must be caught, got ${dResized}`);
assert.ok(dReencoded <= DUPLICATE_DISTANCE, `a re-encoded copy must be caught, got ${dReencoded}`);
assert.ok(dDifferent > DUPLICATE_DISTANCE, `a different photo must not match, got ${dDifferent}`);

// Malformed input must never look like a match.
assert.strictEqual(hammingDistance("abc", "abc"), 64, "a short hash is not comparable");
assert.strictEqual(hammingDistance(original, "zzzzzzzzzzzzzzzz"), 64, "garbage is not comparable");
assert.strictEqual(computeImageHash(new Uint8Array([1, 2, 3])), null, "non-JPEG bytes return null");

console.log("\nimageHash: all checks passed");
