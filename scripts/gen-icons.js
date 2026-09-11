/*
 * Generates the extension icons (16/32/48/128) without any dependency.
 * Renders with 4x supersampling and hand-encodes PNGs (IHDR/IDAT/IEND).
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---------- PNG encoding ---------- */

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- icon drawing ---------- */

const CROSS = { arm: 0.34, gap: 0.1, thickness: 0.085, dot: 0.05, radius: 0.16 };
const BG = [20, 20, 28];      // #14141c
const FG = [255, 61, 61];     // #ff3d3d

function insideBg(x, y) {
  const r = 0.16;
  const qx = Math.abs(x - 0.5) - (0.5 - r);
  const qy = Math.abs(y - 0.5) - (0.5 - r);
  const d = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  return d <= 0;
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function insideCross(x, y) {
  const { arm, gap, thickness, dot } = CROSS;
  const cx = 0.5, cy = 0.5;
  const segs = [
    [cx, cy - gap, cx, cy - arm],
    [cx, cy + gap, cx, cy + arm],
    [cx - gap, cy, cx - arm, cy],
    [cx + gap, cy, cx + arm, cy]
  ];
  for (const [x1, y1, x2, y2] of segs) {
    if (distToSeg(x, y, x1, y1, x2, y2) <= thickness / 2) return true;
  }
  return (x - cx) ** 2 + (y - cy) ** 2 <= dot * dot;
}

function makeIcon(S) {
  const SS = 4;
  const N = S * SS;
  const SS2 = SS * SS;
  const out = Buffer.alloc(S * S * 4);
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      let cov = 0, r = 0, g = 0, b = 0;
      for (let a = 0; a < SS; a++) {
        for (let bq = 0; bq < SS; bq++) {
          const x = (px * SS + a + 0.5) / N;
          const y = (py * SS + bq + 0.5) / N;
          const cross = insideCross(x, y);
          if (!cross && !insideBg(x, y)) continue;
          cov++;
          const c = cross ? FG : BG;
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const i = (py * S + px) * 4;
      if (cov === 0) { out[i + 3] = 0; continue; }
      out[i] = Math.round(r / cov);
      out[i + 1] = Math.round(g / cov);
      out[i + 2] = Math.round(b / cov);
      out[i + 3] = Math.round((255 * cov) / SS2);
    }
  }
  return out;
}

/* ---------- run ---------- */

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const png = encodePNG(size, size, makeIcon(size));
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}