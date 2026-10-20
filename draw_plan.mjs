/**
 * draw_plan.mjs - CLI untuk merender denah Pusaka3D headless
 * 
 * Penggunaan:
 * node draw_plan.mjs --w 800 --h 600 [--fill] [--plan pusaka_plan.json]
 */

import path from 'path';
import { Framebuffer, writePPM, writePNG } from './raster.mjs';
import { loadPlan, renderPlan } from './plan.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    w: 800,
    h: 600,
    fill: false,
    plan: 'pusaka_plan.json',
    out: 'out/plan_scratch.ppm'
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--w' && i + 1 < args.length) options.w = parseInt(args[++i], 10);
    else if (args[i] === '--h' && i + 1 < args.length) options.h = parseInt(args[++i], 10);
    else if (args[i] === '--fill') options.fill = true;
    else if (args[i] === '--plan' && i + 1 < args.length) options.plan = args[++i];
    else if (args[i] === '--out' && i + 1 < args.length) options.out = args[++i];
  }
  return options;
}

const opts = parseArgs();
const plan = loadPlan(opts.plan);
const fb = new Framebuffer(opts.w, opts.h);

// Latar belakang gelap (RGB: 15, 23, 42)
fb.clear([15, 23, 42, 255]);

const stats = renderPlan(fb, plan, { fill: opts.fill });

writePPM(fb, opts.out);
console.log(`Rendered ${stats.polylinesCount} polylines, ${stats.segmentsCount} segments${opts.fill ? `, ${stats.trianglesCount} triangles` : ''}`);
console.log(`Wrote PPM to ${opts.out} (${opts.w}x${opts.h})`);

// Tulis juga versi PNG untuk aset visual laporan
const pngPath = path.join('assets', 'plan_scratch.png');
writePNG(fb, pngPath);
console.log(`Wrote PNG copy to ${pngPath}`);
