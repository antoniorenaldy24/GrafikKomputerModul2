/**
 * draw_square.mjs - Contoh Terpandu Lengkap (Modul 2 §10)
 * 
 * Melakukan rasterisasi persegi 6x6 (sudut (2,2) dan (8,8) pada layar 12x12, y ke bawah):
 * 1. Outline: 4 segmen Bresenham -> 24 piksel menyala
 * 2. Fill: dua segitiga terbagi sepanjang diagonal y = x dengan aturan top-left
 *    -> once = 36, twice = 0, gaps = 0 (watertight)
 * 3. Varian pelanggaran aturan:
 *    - tanpa top-left: once = 30, twice = 6, gaps = 0 (6 double-drawn pada shared edge)
 *    - strict-greater: once = 30, twice = 0, gaps = 6 (6 celah pada shared edge)
 */

import fs from 'fs';
import path from 'path';
import { Framebuffer, lineBresenham, triangle, triangleNaive, writePPM, writePNG } from './raster.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mode: 'fill',
    noTopLeft: false,
    strictGreater: false,
    out: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && i + 1 < args.length) opts.mode = args[++i];
    else if (args[i] === '--no-top-left') opts.noTopLeft = true;
    else if (args[i] === '--strict-greater') opts.strictGreater = true;
    else if (args[i] === '--out' && i + 1 < args.length) opts.out = args[++i];
  }
  return opts;
}

const opts = parseArgs();
const W = 12, H = 12;

if (opts.mode === 'outline') {
  const fb = new Framebuffer(W, H);
  const cTop = lineBresenham([2, 2], [8, 2]);
  const cRight = lineBresenham([8, 2], [8, 8]);
  const cBottom = lineBresenham([8, 8], [2, 8]);
  const cLeft = lineBresenham([2, 8], [2, 2]);

  const litSet = new Set();
  for (const seg of [cTop, cRight, cBottom, cLeft]) {
    for (const [x, y] of seg) {
      litSet.add(`${x},${y}`);
      fb.set(x, y, [255, 255, 255, 255]);
    }
  }

  const outFile = opts.out || path.join('out', 'square_outline.ppm');
  writePPM(fb, outFile);
  writePNG(fb, path.join('assets', 'square_outline.png'));
  console.log('4 segments (top, right, bottom, left) via lineBresenham()');
  console.log(`pixels lit : ${litSet.size} wrote ${outFile}`);
} else if (opts.mode === 'fill') {
  // Dua segitiga membagi persegi (2,2) sampai (8,8) pada diagonal y = x
  const tri1 = [[2, 2], [8, 2], [8, 8]];
  const tri2 = [[2, 2], [8, 8], [2, 8]];

  // Buffer hitung coverage
  const coverage = new Uint8Array(W * H);
  function recordCoverage(fbRecord, A, B, C, useTopLeft, strictGreater) {
    const dummy = new Framebuffer(W, H);
    if (useTopLeft) {
      triangle(dummy, A, B, C, [255, 255, 255], { topLeft: true });
    } else {
      triangleNaive(dummy, A, B, C, [255, 255, 255], { strictGreater });
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (dummy.get(x, y)[0] > 0) {
          coverage[y * W + x]++;
        }
      }
    }
  }

  const useTopLeft = !opts.noTopLeft && !opts.strictGreater;
  recordCoverage(null, tri1[0], tri1[1], tri1[2], useTopLeft, opts.strictGreater);
  recordCoverage(null, tri2[0], tri2[1], tri2[2], useTopLeft, opts.strictGreater);

  let once = 0, twice = 0, gaps = 0;
  const fb = new Framebuffer(W, H);

  // Area interior 6x6 adalah x in [2, 7], y in [2, 7]
  for (let y = 2; y <= 7; y++) {
    for (let x = 2; x <= 7; x++) {
      const c = coverage[y * W + x];
      if (c === 1) {
        once++;
        fb.set(x, y, [59, 130, 246, 255]); // Biru untuk sekali diklaim
      } else if (c >= 2) {
        twice++;
        fb.set(x, y, [239, 68, 68, 255]); // Merah untuk double-drawn
      } else if (c === 0) {
        gaps++;
        fb.set(x, y, [245, 158, 11, 255]); // Kuning/oranye untuk gap/celah
      }
    }
  }

  let defaultOut = 'square_fill.ppm';
  if (opts.noTopLeft) defaultOut = 'square_fill_no_top_left.ppm';
  else if (opts.strictGreater) defaultOut = 'square_fill_strict_greater.ppm';
  const outFile = opts.out || path.join('out', defaultOut);
  writePPM(fb, outFile);

  if (useTopLeft) {
    console.log('2 triangles, edge functions + top-left rule');
    console.log(`coverage : 36 pixels, once = ${once}, twice = ${twice}, gaps = ${gaps}`);
    console.log(`wrote ${outFile}`);
    // Simpan juga golden reference di ref/ jika belum ada
    const refFile = path.join('ref', 'square_fill_ref.ppm');
    if (!fs.existsSync(refFile)) {
      writePPM(fb, refFile);
      console.log(`wrote golden reference to ${refFile}`);
    }
  } else if (opts.noTopLeft) {
    console.log(`coverage : 36 pixels, once = ${once}, twice = ${twice}, gaps = ${gaps} <-- ${twice} double-drawn`);
  } else if (opts.strictGreater) {
    console.log(`coverage : ${once} pixels, once = ${once}, twice = ${twice}, gaps = ${gaps} <-- ${gaps} cracks`);
  }
}
