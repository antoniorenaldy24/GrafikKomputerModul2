/**
 * bench.mjs - Benchmark Forward (Object-Order) vs Backward (Image-Order) (Lab 3.3)
 * 
 * Mengukur performa rendering denah Pusaka3D (13 polyline, 37 segmen) pada Framebuffer 800x600:
 * - Forward: Loop atas 37 segmen, rasterisasi piksel garis via lineBresenham (kompleksitas ~ O(segmen * panjang_garis))
 * - Backward: Loop atas 800x600 = 480,000 piksel, uji jarak terdekat ke 37 segmen (kompleksitas ~ O(W * H * segmen))
 * 
 * Pengujian pada Zoom 1x (scale = 18) dan Zoom 10x (scale = 180).
 */

import { performance } from 'perf_hooks';
import { Framebuffer, lineBresenham } from './raster.mjs';
import { loadPlan, worldToScreen } from './plan.mjs';

function distSqPointToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - x0) ** 2 + (py - y0) ** 2;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq));
  const projX = x0 + t * dx;
  const projY = y0 + t * dy;
  return (px - projX) ** 2 + (py - projY) ** 2;
}

function getSegments(plan, scale, origin) {
  const segments = [];
  for (const poly of plan.polylines) {
    const pts = poly.points;
    const count = pts.length;
    const numSegs = poly.closed ? count : count - 1;
    for (let i = 0; i < numSegs; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % count];
      const s0 = worldToScreen(p0, scale, origin);
      const s1 = worldToScreen(p1, scale, origin);
      segments.push({ s0, s1, cat: poly.category });
    }
  }
  return segments;
}

function renderForward(fb, segments) {
  fb.clear([15, 23, 42, 255]);
  for (const seg of segments) {
    const pixels = lineBresenham(seg.s0, seg.s1);
    for (const [x, y] of pixels) {
      fb.set(x, y, [255, 255, 255, 255]);
    }
  }
}

function renderBackward(fb, segments) {
  fb.clear([15, 23, 42, 255]);
  const w = fb.w, h = fb.h;
  const thresholdSq = 0.8 * 0.8; // Radius hitung 0.8 piksel untuk garis 1-piksel
  const numSegs = segments.length;

  for (let y = 0; y < h; y++) {
    const py = y + 0.5;
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      let hit = false;
      for (let s = 0; s < numSegs; s++) {
        const seg = segments[s];
        const dSq = distSqPointToSegment(px, py, seg.s0[0], seg.s0[1], seg.s1[0], seg.s1[1]);
        if (dSq <= thresholdSq) {
          hit = true;
          break;
        }
      }
      if (hit) {
        fb.set(x, y, [255, 255, 255, 255]);
      }
    }
  }
}

function benchmark(fn, iterations = 7) {
  // Warm-up
  fn();
  fn();
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    times.push(t1 - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  return { median, min: times[0], max: times[times.length - 1], raw: times };
}

console.log('================================================================');
console.log('BENCHMARK: FORWARD (OBJECT-ORDER) vs BACKWARD (IMAGE-ORDER)');
console.log('Dimensi Framebuffer: 800 x 600 (480,000 piksel)');
console.log('Jumlah Segmen Garis: 37 segmen (13 polyline)');
console.log('Pengulangan: 7 iterasi (diambil nilai median ms)');
console.log('================================================================\n');

const plan = loadPlan('pusaka_plan.json');
const fb = new Framebuffer(800, 600);

// 1. Zoom 1x
console.log('--- ZOOM 1X (scale = 18, origin = [400, 280]) ---');
const segs1x = getSegments(plan, 18.0, [400, 280]);

const fwd1x = benchmark(() => renderForward(fb, segs1x), 7);
console.log(`Forward 1x  : median = ${fwd1x.median.toFixed(2)} ms (min: ${fwd1x.min.toFixed(2)} ms, max: ${fwd1x.max.toFixed(2)} ms)`);

const bwd1x = benchmark(() => renderBackward(fb, segs1x), 5);
console.log(`Backward 1x : median = ${bwd1x.median.toFixed(2)} ms (min: ${bwd1x.min.toFixed(2)} ms, max: ${bwd1x.max.toFixed(2)} ms)`);
const ratio1x = bwd1x.median / fwd1x.median;
console.log(`Rasio Kecepatan Zoom 1x : Forward ~${ratio1x.toFixed(1)}x lebih cepat dari Backward.\n`);

// 2. Zoom 10x
console.log('--- ZOOM 10X (scale = 180, origin = [400, 280]) ---');
const segs10x = getSegments(plan, 180.0, [400, 280]);

const fwd10x = benchmark(() => renderForward(fb, segs10x), 7);
console.log(`Forward 10x : median = ${fwd10x.median.toFixed(2)} ms (min: ${fwd10x.min.toFixed(2)} ms, max: ${fwd10x.max.toFixed(2)} ms)`);

const bwd10x = benchmark(() => renderBackward(fb, segs10x), 5);
console.log(`Backward 10x: median = ${bwd10x.median.toFixed(2)} ms (min: ${bwd10x.min.toFixed(2)} ms, max: ${bwd10x.max.toFixed(2)} ms)`);
const ratio10x = bwd10x.median / fwd10x.median;
console.log(`Rasio Kecepatan Zoom 10x: Forward ~${ratio10x.toFixed(1)}x lebih cepat dari Backward.\n`);

console.log('================================================================');
console.log('RINGKASAN HASIL BENCHMARK AKTUAL:');
console.log(`Zoom 1x : Forward = ${fwd10x ? fwd1x.median.toFixed(2) : ''} ms | Backward = ${bwd1x.median.toFixed(2)} ms | Rasio: ~${ratio1x.toFixed(0)}x`);
console.log(`Zoom 10x: Forward = ${fwd10x.median.toFixed(2)} ms | Backward = ${bwd10x.median.toFixed(2)} ms | Rasio: ~${ratio10x.toFixed(0)}x`);
console.log('================================================================');
