/**
 * viewer.mjs - Viewer Denah Pusaka3D Berbasis Three.js (Modul 2 Lab 3)
 * 
 * Merender denah pusaka_plan.json pada canvas 800x600:
 * - Orthographic camera selaras 1:1 dengan sistem piksel layar
 * - Polyline sebagai THREE.Line
 * - Siluet terisi sebagai THREE.Mesh (Shape / BufferGeometry)
 * - setPixelRatio(1) untuk mencegah distorsi perbandingan retina
 * - Tombol ekspor canvas ke plan_three.png
 */

import * as THREE from './three.module.js';

let scene, camera, renderer;
let planData = null;

export async function init() {
  const canvas = document.getElementById('webgl-canvas');
  const width = 800;
  const height = 600;

  // Nonaktifkan color management otomatis agar Three.js tidak mengkonversi sRGB gamma
  THREE.ColorManagement.enabled = false;

  // 1. Renderer dengan preserveDrawingBuffer: true agar canvas dapat diekspor
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true,
    alpha: false
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(1); // Wajib setPixelRatio(1) sesuai SSOT
  renderer.setSize(width, height, false);
  renderer.setClearColor(new THREE.Color(15 / 255, 23 / 255, 42 / 255), 1.0); // #0f172a

  // 2. Scene
  scene = new THREE.Scene();

  // 3. Orthographic Camera: left=0, right=800, top=0, bottom=600 (y ke BAWAH)
  camera = new THREE.OrthographicCamera(0, width, 0, height, -100, 100);
  camera.position.z = 10;

  // 4. Muat Denah
  try {
    const res = await fetch('./pusaka_plan.json');
    planData = await res.json();
    buildScene(planData);
    render();
    console.log('Denah berhasil dimuat dan dirender di Three.js.');

    // Kirim dataURL canvas ke server lokal untuk menyimpan plan_three.png
    try {
      const dataURL = canvas.toDataURL('image/png');
      await fetch('/save-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: dataURL
      });
      console.log('Canvas otomatis terkirim ke /save-canvas');
    } catch (e) {
      // Abaikan jika server tidak memiliki endpoint ini
    }
  } catch (err) {
    console.error('Gagal memuat denah:', err);
  }

  setupUI();
}

function worldToScreen(pt, scale, origin) {
  const sx = origin[0] + pt[0] * scale;
  const sy = origin[1] - pt[1] * scale; // Pembalikan sumbu Y konsisten
  return [sx, sy];
}

function buildScene(plan) {
  const scale = plan.scale;
  const origin = plan.origin;

  // Peta warna kategori
  const colorMap = new Map();
  const fillMap = new Map();
  if (plan.categories) {
    for (const cat of plan.categories) {
      const c = cat.color;
      colorMap.set(cat.id, new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255));
      const fc = cat.fillColor || cat.color;
      fillMap.set(cat.id, new THREE.Color(fc[0] / 255, fc[1] / 255, fc[2] / 255));
    }
  }

  // 1. Render Siluet Terisi (Fills) sebagai THREE.Mesh
  if (plan.fills) {
    for (const item of plan.fills) {
      const fillColor = fillMap.get(item.category) || new THREE.Color(0.5, 0.5, 0.5);

      const positions = [];
      for (const tri of item.triangles) {
        for (const pt of tri) {
          const s = worldToScreen(pt, scale, origin);
          positions.push(s[0], s[1], -1); // z = -1 di belakang garis
        }
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.MeshBasicMaterial({ color: fillColor });
      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);
    }
  }

  // 2. Render Polylines sebagai THREE.Line
  if (plan.polylines) {
    for (const poly of plan.polylines) {
      const col = colorMap.get(poly.category) || new THREE.Color(1, 1, 1);
      const pts = poly.points;
      const count = pts.length;
      if (count < 2) continue;

      const positions = [];
      const numSegs = poly.closed ? count : count - 1;
      for (let i = 0; i < numSegs; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % count];
        const s0 = worldToScreen(p0, scale, origin);
        const s1 = worldToScreen(p1, scale, origin);
        positions.push(s0[0], s0[1], 0);
        positions.push(s1[0], s1[1], 0);
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: col, linewidth: 1 });
      const lines = new THREE.LineSegments(geom, mat);
      scene.add(lines);
    }
  }
}

function render() {
  renderer.render(scene, camera);
}

function setupUI() {
  // Toggle Simulasi Deuteranopia
  const toggle = document.getElementById('deuteranopia-toggle');
  const targetArea = document.getElementById('accessible-target-area');

  toggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      targetArea.classList.add('deuteranopia-active');
    } else {
      targetArea.classList.remove('deuteranopia-active');
    }
  });

  // Tombol Ekspor Canvas ke PNG
  const exportBtn = document.getElementById('export-btn');
  exportBtn.addEventListener('click', () => {
    exportCanvas();
  });
}

export function exportCanvas() {
  render(); // Pastikan render terbaru
  const canvas = document.getElementById('webgl-canvas');
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'plan_three.png';
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log('Canvas berhasil diekspor sebagai plan_three.png');
}

// Ekspos ke global window untuk kemudahan automation/testing
window.exportCanvas = exportCanvas;

window.addEventListener('DOMContentLoaded', init);
