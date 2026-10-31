#!/usr/bin/env node
/**
 * Rasterises the Themvora mark into `media/icon.png`.
 *
 * The mark is not redrawn here — the geometry below is transcribed from the
 * canonical artwork at `apps/docs/app/icon.svg` (42×42 viewBox, rounded-rect
 * outline plus three circles at descending opacity), so the extension icon and
 * the website logo are the same drawing at different sizes.
 *
 * Written as a script rather than committed as an opaque binary for two reasons:
 * the output is reproducible, and a reviewer can see that the icon is the
 * product's mark rather than something an image generator invented.
 *
 * A hand-rolled PNG encoder is used because the repository has no image
 * dependency, and adding one to produce a single 128×128 asset would be a poor
 * trade. Only what a PNG needs is implemented: IHDR, one IDAT, IEND, filter 0.
 *
 * @see apps/docs/app/icon.svg — the source geometry
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

/** Output size in pixels. VS Code requires at least 128×128. */
const SIZE = 128;
/** Samples per axis, per output pixel. 4 gives clean edges without a blur pass. */
const SUPERSAMPLE = 4;
/** The artwork's own coordinate space. */
const VIEWBOX = 42;
/** The brand colour, from the canonical icon. */
const BRAND = [0x4f, 0x46, 0xe5];

/** The rounded-rect outline: centre, half-extents and corner radius. */
const FRAME = { cx: 21, cy: 21, half: 19, radius: 10, stroke: 1 };
/** The three circles, outermost first: cx, cy, r, opacity. */
const CIRCLES = [
  { cx: 14, cy: 27, r: 6, opacity: 1 },
  { cx: 22, cy: 16, r: 5, opacity: 0.65 },
  { cx: 29, cy: 25, r: 4, opacity: 0.35 },
];

/** Signed distance from a point to a rounded box outline. Negative inside. */
function signedDistanceToFrame(x, y) {
  const dx = Math.abs(x - FRAME.cx) - (FRAME.half - FRAME.radius);
  const dy = Math.abs(y - FRAME.cy) - (FRAME.half - FRAME.radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - FRAME.radius;
}

/**
 * Coverage of one sample point.
 *
 * Every shape is the same colour, so layers composite to a single alpha with
 * `1 - Π(1 - a)` — no per-shape colour needs tracking.
 */
function coverageAt(x, y) {
  let alpha = Math.abs(signedDistanceToFrame(x, y)) <= FRAME.stroke ? 1 : 0;

  for (const circle of CIRCLES) {
    const inside = Math.hypot(x - circle.cx, y - circle.cy) <= circle.r;
    if (inside) alpha = 1 - (1 - alpha) * (1 - circle.opacity);
  }

  return alpha;
}

/** Box-filter the supersampled alpha grid down to the output size. */
function rasteriseAlpha() {
  const alpha = new Float64Array(SIZE * SIZE);
  const step = VIEWBOX / (SIZE * SUPERSAMPLE);

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      let total = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          // Sample at pixel centres so the grid is symmetric about the artwork.
          const x = (px * SUPERSAMPLE + sx + 0.5) * step;
          const y = (py * SUPERSAMPLE + sy + 0.5) * step;
          total += coverageAt(x, y);
        }
      }

      alpha[py * SIZE + px] = total / (SUPERSAMPLE * SUPERSAMPLE);
    }
  }

  return alpha;
}

/** CRC-32, as PNG chunks require. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Assemble one PNG chunk: length, type, payload, CRC. */
function chunk(type, payload) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length, 0);

  const typed = Buffer.concat([Buffer.from(type, "ascii"), payload]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);

  return Buffer.concat([length, typed, crc]);
}

/** Encode 8-bit RGBA pixels as a PNG. */
function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(6, 9); // colour type: RGBA
  header.writeUInt8(0, 10); // deflate
  header.writeUInt8(0, 11); // adaptive filtering
  header.writeUInt8(0, 12); // no interlace

  // Every scanline is prefixed with filter type 0 (none). Filtering exists to
  // improve compression; at this size the difference is not worth the code.
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const alpha = rasteriseAlpha();

const rgba = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < alpha.length; i++) {
  const offset = i * 4;
  rgba[offset] = BRAND[0];
  rgba[offset + 1] = BRAND[1];
  rgba[offset + 2] = BRAND[2];
  rgba[offset + 3] = Math.round(alpha[i] * 255);
}

const output = join(dirname(fileURLToPath(import.meta.url)), "..", "media", "icon.png");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, encodePng(SIZE, SIZE, rgba));

console.log(`Wrote ${output} (${SIZE}×${SIZE})`);
