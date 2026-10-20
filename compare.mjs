/**
 * compare.mjs - CLI Komparasi Dua Citra Raster (PPM / PNG) (Modul 2)
 * 
 * Penggunaan:
 * node compare.mjs <fileA> <fileB> [--diff <diffOutput.png>]
 */

import path from 'path';
import { readPPM, readPNG, writePNG, Framebuffer } from './raster.mjs';
import { computeMetrics } from './metrics.mjs';

function loadImage(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === '.ppm') {
    return readPPM(filepath);
  } else if (ext === '.png') {
    return readPNG(filepath);
  } else {
    throw new Error(`Unsupported image format: ${filepath}`);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Penggunaan: node compare.mjs <fileA> <fileB> [--diff <diffOutput.png>]');
  process.exit(1);
}

const fileA = args[0];
const fileB = args[1];
let diffOut = null;
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--diff' && i + 1 < args.length) diffOut = args[++i];
}

const fbA = loadImage(fileA);
const fbB = loadImage(fileB);

const res = computeMetrics(fbA, fbB);
const psnrStr = res.psnr === Infinity ? 'inf dB' : `${res.psnr.toFixed(2)} dB`;
const ssimStr = res.ssim.toFixed(3);

console.log(`same size ${res.w}x${res.h} identical pixels : ${res.identicalPixels}/${res.totalPixels} (${(res.matchRatio * 100).toFixed(2)}%) PSNR : ${psnrStr} SSIM : ${ssimStr} max |diff|: ${res.maxDiff}`);

if (diffOut) {
  const fbDiff = new Framebuffer(res.w, res.h);
  fbDiff.data.set(res.diffData);
  writePNG(fbDiff, diffOut);
  console.log(`Wrote difference image (amplified x6) to ${diffOut}`);
}
