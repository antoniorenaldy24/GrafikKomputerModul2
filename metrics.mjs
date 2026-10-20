/**
 * metrics.mjs - Metrik Kualitas Citra: PSNR, SSIM, dan Identical Pixel Match (Modul 2)
 */

export function computeMetrics(fbA, fbB) {
  if (fbA.w !== fbB.w || fbA.h !== fbB.h) {
    throw new Error(`Dimension mismatch: (${fbA.w}x${fbA.h}) vs (${fbB.w}x${fbB.h})`);
  }

  const w = fbA.w;
  const h = fbB.h;
  const totalPixels = w * h;
  let identicalPixels = 0;
  let maxDiff = 0;
  let sumSqErr = 0;

  // Framebuffer selisih dengan amplifikasi kontras (x6 seperti petunjuk modul)
  const diffData = new Uint8ClampedArray(w * h * 4);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const rA = fbA.data[idx], gA = fbA.data[idx + 1], bA = fbA.data[idx + 2];
    const rB = fbB.data[idx], gB = fbB.data[idx + 1], bB = fbB.data[idx + 2];

    const dr = Math.abs(rA - rB);
    const dg = Math.abs(gA - gB);
    const db = Math.abs(bA - bB);

    const pixDiff = Math.max(dr, dg, db);
    if (pixDiff > maxDiff) maxDiff = pixDiff;

    if (dr === 0 && dg === 0 && db === 0) {
      identicalPixels++;
    }

    sumSqErr += (rA - rB) ** 2 + (gA - gB) ** 2 + (bA - bB) ** 2;

    // Tulis selisih diamplifikasi 6x ke diffData (RGB)
    diffData[idx] = Math.min(255, dr * 6);
    diffData[idx + 1] = Math.min(255, dg * 6);
    diffData[idx + 2] = Math.min(255, db * 6);
    diffData[idx + 3] = 255;
  }

  const mse = sumSqErr / (totalPixels * 3);
  let psnr = Infinity;
  if (mse > 0) {
    psnr = 10 * Math.log10((255 * 255) / mse);
  }

  // Perhitungan SSIM global sederhana (RGB)
  const ssim = computeSSIM(fbA, fbB);

  return {
    w,
    h,
    totalPixels,
    identicalPixels,
    matchRatio: identicalPixels / totalPixels,
    maxDiff,
    mse,
    psnr,
    ssim,
    diffData
  };
}

function computeSSIM(fbA, fbB) {
  const n = fbA.w * fbA.h;
  if (n === 0) return 1.0;

  let meanA = 0, meanB = 0;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    meanA += (fbA.data[idx] + fbA.data[idx + 1] + fbA.data[idx + 2]) / 3;
    meanB += (fbB.data[idx] + fbB.data[idx + 1] + fbB.data[idx + 2]) / 3;
  }
  meanA /= n;
  meanB /= n;

  let varA = 0, varB = 0, covar = 0;
  for (let i = 0; i < n; i++) {
    const idx = i * 4;
    const valA = (fbA.data[idx] + fbA.data[idx + 1] + fbA.data[idx + 2]) / 3;
    const valB = (fbB.data[idx] + fbB.data[idx + 1] + fbB.data[idx + 2]) / 3;

    varA += (valA - meanA) ** 2;
    varB += (valB - meanB) ** 2;
    covar += (valA - meanA) * (valB - meanB);
  }
  varA /= (n - 1);
  varB /= (n - 1);
  covar /= (n - 1);

  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;

  const num = (2 * meanA * meanB + c1) * (2 * covar + c2);
  const den = (meanA ** 2 + meanB ** 2 + c1) * (varA + varB + c2);

  return den === 0 ? 1.0 : num / den;
}
