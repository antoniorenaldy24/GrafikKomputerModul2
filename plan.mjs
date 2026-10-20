/**
 * plan.mjs - Modul Geometri dan Render Denah Pusaka3D (Modul 2)
 * 
 * Memuat berkas denah JSON, melakukan transformasi koordinat dari World (meter, y-UP)
 * ke Screen (piksel, y-DOWN), serta merender polyline dan siluet segitiga ke Framebuffer.
 */

import fs from 'fs';
import { lineBresenham, triangle } from './raster.mjs';

/**
 * loadPlan(filepath)
 * Memuat dan memvalidasi struktur JSON denah lantai.
 */
export function loadPlan(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const plan = JSON.parse(content);
  return plan;
}

/**
 * worldToScreen(pt, scale, origin)
 * Transformasi koordinat dari meter (y-UP) ke piksel layar (y-DOWN):
 * x_screen = origin[0] + x_world * scale
 * y_screen = origin[1] - y_world * scale (pembalikan sumbu Y terdokumentasi)
 */
export function worldToScreen(pt, scale, origin) {
  const sx = Math.round(origin[0] + pt[0] * scale);
  const sy = Math.round(origin[1] - pt[1] * scale);
  return [sx, sy];
}

/**
 * renderPlan(fb, plan, options)
 * Merender seluruh polyline dan siluet terisi (opsional) dari denah ke framebuffer.
 */
export function renderPlan(fb, plan, { fill = false, scale = null, origin = null } = {}) {
  const actualScale = scale !== null ? scale : plan.scale;
  const actualOrigin = origin !== null ? origin : plan.origin;

  // Bangun peta warna kategori
  const colorMap = new Map();
  const fillMap = new Map();
  if (plan.categories) {
    for (const cat of plan.categories) {
      colorMap.set(cat.id, cat.color);
      fillMap.set(cat.id, cat.fillColor || cat.color);
    }
  }

  let polylinesCount = 0;
  let segmentsCount = 0;
  let trianglesCount = 0;

  // 1. Gambar siluet terisi jika opsi fill aktif
  if (fill && plan.fills) {
    for (const item of plan.fills) {
      const fillColor = fillMap.get(item.category) || [128, 128, 128];
      for (const tri of item.triangles) {
        const sA = worldToScreen(tri[0], actualScale, actualOrigin);
        const sB = worldToScreen(tri[1], actualScale, actualOrigin);
        const sC = worldToScreen(tri[2], actualScale, actualOrigin);
        triangle(fb, sA, sB, sC, fillColor, { topLeft: true, autoWinding: true });
        trianglesCount++;
      }
    }
  }

  // 2. Gambar outline garis polyline dengan lineBresenham
  if (plan.polylines) {
    for (const poly of plan.polylines) {
      polylinesCount++;
      const catColor = colorMap.get(poly.category) || [255, 255, 255];
      const pts = poly.points;
      const count = pts.length;
      if (count < 2) continue;

      const numSegs = poly.closed ? count : count - 1;
      for (let i = 0; i < numSegs; i++) {
        segmentsCount++;
        const p0 = pts[i];
        const p1 = pts[(i + 1) % count];
        const s0 = worldToScreen(p0, actualScale, actualOrigin);
        const s1 = worldToScreen(p1, actualScale, actualOrigin);

        const pixels = lineBresenham(s0, s1);
        for (const [px, py] of pixels) {
          fb.set(px, py, catColor);
        }
      }
    }
  }

  return { polylinesCount, segmentsCount, trianglesCount };
}
