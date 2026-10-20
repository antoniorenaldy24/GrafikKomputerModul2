/**
 * tests.mjs - Rangkaian Uji Otomatis Lengkap (Modul 2)
 * 
 * Memverifikasi 13 asersi ketat sesuai Modul 2 & SSOT:
 * 1. lineDDA menghasilkan 8 piksel referensi Contoh E2 untuk (2,1) -> (9,5)
 * 2. lineBresenham menghasilkan 8 piksel yang identik untuk (2,1) -> (9,5)
 * 3. 8 oktan garis diuji lewat 8 refleksi segmen
 * 4. Uji asterisk 24-arah memenuhi toleransi Euclidean radius ±1 piksel
 * 5. Nilai edge function untuk P1, P2, P3 dan total luas segitiga Contoh E4
 * 6. Koordinat barycentric P1 sama dengan [3/7, 2/7, 2/7] dan jumlah bobot = 1.0
 * 7. Raster segitiga from-scratch cocok 100% dengan ref/tri_ref.ppm (max |diff| = 0)
 * 8. Shared edge dengan top-left: once = 36, twice = 0, gaps = 0
 * 9. Shared edge tanpa top-left: twice = 6 (overlap ganda)
 * 10. Shared edge dengan strict-greater (> 0): gaps = 6 (celah retak)
 * 11. draw_square fill cocok 100% dengan ref/square_fill_ref.ppm (PSNR = inf dB)
 * 12. Sample-centre (x+0.5, y+0.5) menghasilkan blok 2x2 (4 px) vs corner 3x3 (9 px)
 * 13. Perbaikan pitfall auto-flip winding mengisi segitiga yang urutan vertex-nya terbalik
 */

import { Framebuffer, lineDDA, lineBresenham, edge, barycentric, triangle, triangleNaive, readPPM } from './raster.mjs';
import { computeMetrics } from './metrics.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [OK] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('=== MENJALANKAN RANGKAIAN TES MODUL 2 ===\n');

// 1 & 2. DDA & Bresenham pada (2,1) -> (9,5)
const expected8 = [[2, 1], [3, 2], [4, 2], [5, 3], [6, 3], [7, 4], [8, 4], [9, 5]];
const dda8 = lineDDA([2, 1], [9, 5]);
const bres8 = lineBresenham([2, 1], [9, 5]);

assert(JSON.stringify(dda8) === JSON.stringify(expected8), '1. lineDDA menghasilkan 8 piksel referensi (2,1) -> (9,5)');
assert(JSON.stringify(bres8) === JSON.stringify(expected8), '2. lineBresenham menghasilkan 8 piksel identik dengan DDA');

// 3. Uji 8 Oktan Bresenham
let all8OctantsPass = true;
const octantTests = [
  { A: [0, 0], B: [7, 4] },   // Oktan 1
  { A: [0, 0], B: [4, 7] },   // Oktan 2
  { A: [0, 0], B: [-4, 7] },  // Oktan 3
  { A: [0, 0], B: [-7, 4] },  // Oktan 4
  { A: [0, 0], B: [-7, -4] }, // Oktan 5
  { A: [0, 0], B: [-4, -7] }, // Oktan 6
  { A: [0, 0], B: [4, -7] },  // Oktan 7
  { A: [0, 0], B: [7, -4] }   // Oktan 8
];

for (const { A, B } of octantTests) {
  const pts = lineBresenham(A, B);
  const startOk = pts[0][0] === A[0] && pts[0][1] === A[1];
  const endOk = pts[pts.length - 1][0] === B[0] && pts[pts.length - 1][1] === B[1];
  const expLen = Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1])) + 1;
  if (!startOk || !endOk || pts.length !== expLen) all8OctantsPass = false;
}
assert(all8OctantsPass, '3. lineBresenham menangani seluruh 8 oktan dengan titik awal/akhir dan panjang step benar');

// 4. Asterisk 24-Arah
let astOk = true;
const cx = 50, cy = 50, R = 40;
for (let deg = 0; deg < 360; deg += 15) {
  const rad = (deg * Math.PI) / 180;
  const ex = Math.round(cx + R * Math.cos(rad));
  const ey = Math.round(cy + R * Math.sin(rad));
  const pts = lineBresenham([cx, cy], [ex, ey]);
  const endPt = pts[pts.length - 1];
  const dist = Math.hypot(endPt[0] - cx, endPt[1] - cy);
  if (Math.abs(dist - R) > 1.0 || endPt[0] !== ex || endPt[1] !== ey) {
    astOk = false;
  }
}
assert(astOk, '4. Asterisk 24-arah memenuhi toleransi Euclidean radius R ± 1 px pada semua sudut');

// 5. Edge Functions & Luas Segitiga Contoh E4
const tA = [1, 1], tB = [6, 2], tC = [3, 7];
const totalArea2 = edge(tA[0], tA[1], tB[0], tB[1], tC[0], tC[1]);
const p1eAB = edge(tA[0], tA[1], tB[0], tB[1], 3, 3);
const p1eBC = edge(tB[0], tB[1], tC[0], tC[1], 3, 3);
const p1eCA = edge(tC[0], tC[1], tA[0], tA[1], 3, 3);

const p2eBC = edge(tB[0], tB[1], tC[0], tC[1], 5, 5);
const p3eCA = edge(tC[0], tC[1], tA[0], tA[1], 1, 4);

assert(totalArea2 === 28, '5a. 2 * Area E_AB(C) = 28 (Luas = 14 satuan luas)');
assert(p1eAB === 8 && p1eBC === 12 && p1eCA === 8, '5b. P1(3,3) bernilai (8, 12, 8) -> di dalam');
assert(p2eBC === -4, '5c. P2(5,5) memiliki E_BC = -4 < 0 -> di luar');
assert(p3eCA === -6, '5d. P3(1,4) memiliki E_CA = -6 < 0 -> di luar');

// 6. Barycentric P1
const [lA, lB, lC] = barycentric(tA, tB, tC, [3, 3]);
const bSum = lA + lB + lC;
assert(Math.abs(lA - 3/7) < 1e-12 && Math.abs(lB - 2/7) < 1e-12 && Math.abs(lC - 2/7) < 1e-12, '6a. Barycentric P1 = (3/7, 2/7, 2/7)');
assert(Math.abs(bSum - 1.0) < 1e-12, '6b. Jumlah koordinat barycentric = 1.0');

// 7. Raster Segitiga Cocok dengan tri_ref.ppm
const fbTri = new Framebuffer(10, 10);
triangle(fbTri, tA, tB, tC, [255, 255, 255]);
const refTri = readPPM('ref/tri_ref.ppm');
const resTri = computeMetrics(fbTri, refTri);
assert(resTri.maxDiff === 0 && resTri.identicalPixels === 100, '7. Raster segitiga cocok pixel-demi-pixel dengan ref/tri_ref.ppm (max |diff| = 0, PSNR = inf)');

// 8, 9, 10. Shared Edge Top-Left, No Top-Left, Strict Greater
const sTri1 = [[2, 2], [8, 2], [8, 8]];
const sTri2 = [[2, 2], [8, 8], [2, 8]];

function testSquareFill(useTopLeft, strictGreater) {
  const cov = new Uint8Array(12 * 12);
  for (const tri of [sTri1, sTri2]) {
    const dummy = new Framebuffer(12, 12);
    if (useTopLeft) {
      triangle(dummy, tri[0], tri[1], tri[2], [255, 255, 255], { topLeft: true });
    } else {
      triangleNaive(dummy, tri[0], tri[1], tri[2], [255, 255, 255], { strictGreater });
    }
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 12; x++) {
        if (dummy.get(x, y)[0] > 0) cov[y * 12 + x]++;
      }
    }
  }
  let once = 0, twice = 0, gaps = 0;
  for (let y = 2; y <= 7; y++) {
    for (let x = 2; x <= 7; x++) {
      const c = cov[y * 12 + x];
      if (c === 1) once++;
      else if (c >= 2) twice++;
      else if (c === 0) gaps++;
    }
  }
  return { once, twice, gaps };
}

const cTopLeft = testSquareFill(true, false);
assert(cTopLeft.once === 36 && cTopLeft.twice === 0 && cTopLeft.gaps === 0, '8. Shared edge dengan top-left: once = 36, twice = 0, gaps = 0 (watertight)');

const cNoTopLeft = testSquareFill(false, false);
assert(cNoTopLeft.once === 30 && cNoTopLeft.twice === 6 && cNoTopLeft.gaps === 0, '9. Shared edge tanpa top-left: twice = 6 (overlap ganda pada shared edge)');

const cStrict = testSquareFill(false, true);
assert(cStrict.once === 30 && cStrict.twice === 0 && cStrict.gaps === 6, '10. Shared edge dengan strict-greater (> 0): gaps = 6 (celah pada shared edge)');

// 11. draw_square cocok dengan ref/square_fill_ref.ppm
const fbSquare = readPPM('out/square_fill.ppm');
const refSquare = readPPM('ref/square_fill_ref.ppm');
const resSquare = computeMetrics(fbSquare, refSquare);
assert(resSquare.maxDiff === 0 && resSquare.identicalPixels === 144, '11. out/square_fill.ppm cocok byte-demi-byte dengan ref/square_fill_ref.ppm (PSNR = inf dB)');

// 12. Sample-Centre vs Corner Sampling
const fbSC = new Framebuffer(6, 6);
const fbCS = new Framebuffer(6, 6);
const rT1 = [[1, 1], [3, 1], [3, 3]];
const rT2 = [[1, 1], [3, 3], [1, 3]];

triangle(fbSC, rT1[0], rT1[1], rT1[2], [255, 255, 255], { topLeft: true, sampleCorner: false });
triangle(fbSC, rT2[0], rT2[1], rT2[2], [255, 255, 255], { topLeft: true, sampleCorner: false });

triangle(fbCS, rT1[0], rT1[1], rT1[2], [255, 255, 255], { topLeft: false, sampleCorner: true });
triangle(fbCS, rT2[0], rT2[1], rT2[2], [255, 255, 255], { topLeft: false, sampleCorner: true });

let scLit = 0, csLit = 0;
for (let y = 0; y < 6; y++) {
  for (let x = 0; x < 6; x++) {
    if (fbSC.get(x, y)[0] > 0) scLit++;
    if (fbCS.get(x, y)[0] > 0) csLit++;
  }
}
assert(scLit === 4 && csLit === 9, '12. Sample-centre (x+0.5, y+0.5) menghasilkan 4 px (2x2) vs Corner (x, y) menghasilkan 9 px (3x3)');

// 13. Auto-Flip Winding Pitfall Fix
const fbNorm = new Framebuffer(20, 20);
const fbRev = new Framebuffer(20, 20);
const triCW = [[2, 2], [10, 2], [6, 12]];
const triCCW = [[2, 2], [6, 12], [10, 2]]; // Inverted order

triangle(fbNorm, triCW[0], triCW[1], triCW[2], [255, 255, 255], { autoWinding: true });
triangle(fbRev, triCCW[0], triCCW[1], triCCW[2], [255, 255, 255], { autoWinding: true });

const resWind = computeMetrics(fbNorm, fbRev);
assert(resWind.maxDiff === 0 && resWind.identicalPixels === 400, '13. Perbaikan pitfall: auto-flip winding menghasilkan raster identik untuk segitiga terbalik');

console.log(`\n========================================`);
console.log(`HASIL AKHIR: ${passed} LULUS, ${failed} GAGAL`);
if (failed === 0) {
  console.log('ALL CHECKS PASSED (100% OK)');
} else {
  console.error('BEBERAPA TES GAGAL!');
  process.exit(1);
}
