/**
 * raster.mjs - Core Software Rasteriser 2D (Modul 2 Grafika Komputer)
 * 
 * Implementasi primitif 2D dari nol dalam JavaScript murni (ES Modules) tanpa framework:
 * - Framebuffer: buffer piksel RGBA (Uint8ClampedArray)
 * - lineDDA: rasterisasi garis dengan Digital Differential Analyzer
 * - lineBresenham: rasterisasi garis integer untuk seluruh 8 oktan
 * - triangle: rasterisasi segitiga terisi berbasis edge function (Pineda 1988)
 *             dengan sample-centre (x+0.5, y+0.5) dan aturan top-left watertight
 * - barycentric: penghitungan koordinat barycentric untuk interpolasi
 * - Ekspor / Impor PPM (P6 binary dan P3 ASCII) serta encode/decode PNG bawaan Node.js
 * 
 * KONVENSI KOORDINAT & WINDING:
 * - Sumbu x: ke kanan [0, w-1]
 * - Sumbu y: ke BAWAH [0, h-1] (koordinat layar)
 * - Winding: vertex diberikan sedemikian hingga total edge(A, B, C) > 0
 * - Sample-centre: piksel (x, y) disampel pada pusat kontinu (x + 0.5, y + 0.5)
 */

import fs from 'fs';
import zlib from 'zlib';

export class Framebuffer {
  constructor(w, h) {
    this.w = Math.floor(w);
    this.h = Math.floor(h);
    this.data = new Uint8ClampedArray(this.w * this.h * 4);
    this.clear([0, 0, 0, 255]);
  }

  clear(rgba = [0, 0, 0, 255]) {
    const [r, g, b, a = 255] = rgba;
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = a;
    }
  }

  set(x, y, rgba) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const idx = (y * this.w + x) * 4;
    this.data[idx] = rgba[0];
    this.data[idx + 1] = rgba[1];
    this.data[idx + 2] = rgba[2];
    this.data[idx + 3] = rgba.length > 3 ? rgba[3] : 255;
  }

  get(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return [0, 0, 0, 0];
    const idx = (y * this.w + x) * 4;
    return [
      this.data[idx],
      this.data[idx + 1],
      this.data[idx + 2],
      this.data[idx + 3]
    ];
  }
}

/**
 * lineDDA(A, B)
 * Digital Differential Analyzer
 */
export function lineDDA(A, B) {
  const x0 = A[0], y0 = A[1];
  const x1 = B[0], y1 = B[1];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const step = Math.max(Math.abs(dx), Math.abs(dy));
  if (step === 0) return [[Math.round(x0), Math.round(y0)]];

  const xInc = dx / step;
  const yInc = dy / step;
  const pixels = [];

  let x = x0;
  let y = y0;
  for (let k = 0; k <= step; k++) {
    pixels.push([Math.round(x), Math.round(y)]);
    x += xInc;
    y += yInc;
  }
  return pixels;
}

/**
 * lineBresenham(A, B)
 * Algoritma garis Bresenham integer penuh untuk semua 8 oktan.
 */
export function lineBresenham(A, B) {
  let x0 = Math.round(A[0]);
  let y0 = Math.round(A[1]);
  const x1 = Math.round(B[0]);
  const y1 = Math.round(B[1]);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  const pixels = [];
  while (true) {
    pixels.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return pixels;
}

/**
 * edge(ax, ay, bx, by, px, py)
 * Komponen-z dari cross product (B - A) x (P - A).
 * Positif bila P berada di sisi dalam sisi berarah A -> B (dengan konvensi winding CCW matematis / CW layar).
 */
export const edge = (ax, ay, bx, by, px, py) =>
  (bx - ax) * (py - ay) - (by - ay) * (px - ax);

/**
 * topLeftBias(xx, xy, yx, yy)
 * Bias aturan top-left untuk edge X -> Y pada koordinat layar (y ke bawah):
 * - Top edge: horizontal dengan arah ke kiri (dx < 0, dy === 0, interior di bawahnya)
 * - Left edge: edge yang mengarah ke bawah layar (dy > 0)
 * Mengembalikan 0 untuk top/left, dan -1 untuk edge lainnya.
 */
export const topLeftBias = (xx, xy, yx, yy) => {
  const dx = yx - xx;
  const dy = yy - xy;
  const isTop = (dy === 0 && dx < 0);
  const isLeft = (dy > 0);
  return (isTop || isLeft) ? 0 : -1;
};

/**
 * barycentric(A, B, C, P)
 * Mengembalikan bobot barycentric [lambdaA, lambdaB, lambdaC] di mana:
 * P = lambdaA * A + lambdaB * B + lambdaC * C
 * lambdaA + lambdaB + lambdaC = 1
 */
export function barycentric(A, B, C, P) {
  const det = edge(A[0], A[1], B[0], B[1], C[0], C[1]);
  if (Math.abs(det) < 1e-12) return [0, 0, 0];
  const wA = edge(B[0], B[1], C[0], C[1], P[0], P[1]) / det;
  const wB = edge(C[0], C[1], A[0], A[1], P[0], P[1]) / det;
  const wC = edge(A[0], A[1], B[0], B[1], P[0], P[1]) / det;
  return [wA, wB, wC];
}

/**
 * triangle(fb, A, B, C, rgb, options)
 * Rasterisasi segitiga dengan edge functions, sample-centre, dan top-left rule.
 */
export function triangle(fb, A, B, C, rgb, { topLeft = true, autoWinding = true, sampleCorner = false } = {}) {
  let [pA, pB, pC] = [A, B, C];
  let det = edge(pA[0], pA[1], pB[0], pB[1], pC[0], pC[1]);
  if (Math.abs(det) < 1e-12) return; // segitiga degenerasi

  // Perbaikan Pitfall: auto-flip winding bila vertex berlawanan urutan
  if (autoWinding && det < 0) {
    [pB, pC] = [pC, pB];
    det = -det;
  }

  // Bounding box diklem ke batas framebuffer
  const minX = Math.max(0, Math.floor(Math.min(pA[0], pB[0], pC[0])));
  const maxX = Math.min(fb.w - 1, Math.ceil(Math.max(pA[0], pB[0], pC[0])));
  const minY = Math.max(0, Math.floor(Math.min(pA[1], pB[1], pC[1])));
  const maxY = Math.min(fb.h - 1, Math.ceil(Math.max(pA[1], pB[1], pC[1])));

  const bBC = topLeft ? topLeftBias(pB[0], pB[1], pC[0], pC[1]) : 0;
  const bCA = topLeft ? topLeftBias(pC[0], pC[1], pA[0], pA[1]) : 0;
  const bAB = topLeft ? topLeftBias(pA[0], pA[1], pB[0], pB[1]) : 0;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // SAMPLE-CENTRE (x + 0.5, y + 0.5) vs CORNER SAMPLING (x, y)
      const px = sampleCorner ? x : x + 0.5;
      const py = sampleCorner ? y : y + 0.5;

      const wA = edge(pB[0], pB[1], pC[0], pC[1], px, py) + bBC;
      const wB = edge(pC[0], pC[1], pA[0], pA[1], px, py) + bCA;
      const wC = edge(pA[0], pA[1], pB[0], pB[1], px, py) + bAB;

      if (wA >= 0 && wB >= 0 && wC >= 0) {
        fb.set(x, y, rgb);
      }
    }
  }
}

/**
 * triangleNaive(fb, A, B, C, rgb, options)
 * Implementasi tanpa aturan top-left untuk tujuan diagnosis shared-edge bug.
 */
export function triangleNaive(fb, A, B, C, rgb, { strictGreater = false } = {}) {
  let [pA, pB, pC] = [A, B, C];
  const det = edge(pA[0], pA[1], pB[0], pB[1], pC[0], pC[1]);
  if (det < 0) [pB, pC] = [pC, pB];

  const minX = Math.max(0, Math.floor(Math.min(pA[0], pB[0], pC[0])));
  const maxX = Math.min(fb.w - 1, Math.ceil(Math.max(pA[0], pB[0], pC[0])));
  const minY = Math.max(0, Math.floor(Math.min(pA[1], pB[1], pC[1])));
  const maxY = Math.min(fb.h - 1, Math.ceil(Math.max(pA[1], pB[1], pC[1])));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const wA = edge(pB[0], pB[1], pC[0], pC[1], px, py);
      const wB = edge(pC[0], pC[1], pA[0], pA[1], px, py);
      const wC = edge(pA[0], pA[1], pB[0], pB[1], px, py);

      if (strictGreater) {
        if (wA > 0 && wB > 0 && wC > 0) fb.set(x, y, rgb);
      } else {
        if (wA >= 0 && wB >= 0 && wC >= 0) fb.set(x, y, rgb);
      }
    }
  }
}

/**
 * writePPM(fb, filepath)
 * Menulis frame buffer ke format binary PPM (P6).
 */
export function writePPM(fb, filepath) {
  const header = `P6\n${fb.w} ${fb.h}\n255\n`;
  const headerBuf = Buffer.from(header, 'ascii');
  const rgbBuf = Buffer.alloc(fb.w * fb.h * 3);
  let src = 0, dst = 0;
  for (let i = 0; i < fb.w * fb.h; i++) {
    rgbBuf[dst++] = fb.data[src];
    rgbBuf[dst++] = fb.data[src + 1];
    rgbBuf[dst++] = fb.data[src + 2];
    src += 4;
  }
  const fileBuf = Buffer.concat([headerBuf, rgbBuf]);
  fs.writeFileSync(filepath, fileBuf);
}

/**
 * readPPM(filepath)
 * Membaca file binary PPM (P6) atau ASCII PPM (P3) ke Framebuffer.
 */
export function readPPM(filepath) {
  const buf = fs.readFileSync(filepath);
  let pos = 0;

  function nextToken() {
    while (pos < buf.length) {
      while (pos < buf.length && /\s/.test(String.fromCharCode(buf[pos]))) pos++;
      if (pos < buf.length && String.fromCharCode(buf[pos]) === '#') {
        while (pos < buf.length && buf[pos] !== 10 && buf[pos] !== 13) pos++;
        continue;
      }
      break;
    }
    if (pos >= buf.length) return null;
    const start = pos;
    while (pos < buf.length && !/\s/.test(String.fromCharCode(buf[pos]))) pos++;
    return buf.toString('ascii', start, pos);
  }

  const magic = nextToken();
  if (magic !== 'P6' && magic !== 'P3') {
    throw new Error(`Unsupported PPM magic: ${magic}`);
  }
  const w = parseInt(nextToken(), 10);
  const h = parseInt(nextToken(), 10);
  const maxVal = parseInt(nextToken(), 10);

  // Skip exactly one whitespace character after maxVal
  if (pos < buf.length && /\s/.test(String.fromCharCode(buf[pos]))) pos++;

  const fb = new Framebuffer(w, h);
  if (magic === 'P6') {
    let dst = 0;
    for (let i = 0; i < w * h; i++) {
      fb.data[dst++] = buf[pos++];
      fb.data[dst++] = buf[pos++];
      fb.data[dst++] = buf[pos++];
      fb.data[dst++] = 255;
    }
  } else {
    let dst = 0;
    for (let i = 0; i < w * h; i++) {
      fb.data[dst++] = parseInt(nextToken(), 10);
      fb.data[dst++] = parseInt(nextToken(), 10);
      fb.data[dst++] = parseInt(nextToken(), 10);
      fb.data[dst++] = 255;
    }
  }
  return fb;
}

/**
 * writePNG(fb, filepath)
 * Menulis frame buffer ke format PNG murni menggunakan built-in zlib Node.js.
 */
export function writePNG(fb, filepath) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(fb.w, 0);
  ihdrData.writeUInt32BE(fb.h, 4);
  ihdrData[8] = 8;  // bit depth: 8
  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // filter 0
  ihdrData[12] = 0; // non-interlaced

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    let c = 0xffffffff;
    for (const b of [typeBuf, data]) {
      for (let i = 0; i < b.length; i++) {
        c ^= b[i];
        for (let j = 0; j < 8; j++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
      }
    }
    crcBuf.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const scanlines = Buffer.alloc(fb.h * (fb.w * 4 + 1));
  let srcPos = 0, dstPos = 0;
  for (let y = 0; y < fb.h; y++) {
    scanlines[dstPos++] = 0; // Filter: None
    for (let x = 0; x < fb.w * 4; x++) {
      scanlines[dstPos++] = fb.data[srcPos++];
    }
  }

  const idat = zlib.deflateSync(scanlines, { level: 9 });
  const outBuf = Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(filepath, outBuf);
}

/**
 * readPNG(filepath)
 * Membaca file PNG ke Framebuffer.
 */
export function readPNG(filepath) {
  const buf = fs.readFileSync(filepath);
  let pos = 8;
  let w = 0, h = 0;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      w = buf.readUInt32BE(pos + 8);
      h = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const fb = new Framebuffer(w, h);
  const stride = w * 4;
  let srcPos = 0;
  for (let y = 0; y < h; y++) {
    const filter = decompressed[srcPos++];
    const rowStart = y * stride;
    for (let i = 0; i < stride; i++) {
      const xVal = decompressed[srcPos++];
      const a = (i >= 4) ? fb.data[rowStart + i - 4] : 0;
      const b = (y > 0) ? fb.data[(y - 1) * stride + i] : 0;
      const c = (y > 0 && i >= 4) ? fb.data[(y - 1) * stride + i - 4] : 0;
      let val = 0;
      if (filter === 0) val = xVal;
      else if (filter === 1) val = (xVal + a) & 0xff;
      else if (filter === 2) val = (xVal + b) & 0xff;
      else if (filter === 3) val = (xVal + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (xVal + pr) & 0xff;
      }
      fb.data[rowStart + i] = val;
    }
  }
  return fb;
}
