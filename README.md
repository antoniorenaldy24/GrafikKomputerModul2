# Modul 2: Rendering Pipeline & Primitif 2D
**Praktikum Grafika Komputer (Program Sarjana S1 Informatika)**  
Fakultas Teknik — Universitas Muhammadiyah Surabaya  
*Terakhir diperbarui: 21 Oktober 2026*

---

## 1. Toolchain & Lingkungan Aktual
Pengujian dan benchmarking dijalankan pada lingkungan nyata:
- **Operating System:** Windows 11 Home Single Language (Build 26100, win32 x64)
- **Node.js:** `v22.14.0`
- **npm:** `11.3.0`
- **Three.js:** `r170` (v0.170.0)
- **Browser:** Microsoft Edge 133.0 / Chrome Headless (Blink engine)
- **Tanggal Pengujian:** 21 Oktober 2026

---

## 2. Struktur Proyek
```text
.
├── SSOT_Modul_2_Google_Antigravity.md  # Single Source of Truth
├── Laporan_Modul_2.md                  # Laporan akademik lengkap (Q1-Q5, Lab 1-3, A1-A5)
├── README.md                           # Dokumentasi & instruksi eksekusi
├── package.json                        # Definisi module ES & dependency (three, serve)
├── raster.mjs                          # Core software rasteriser from-scratch (JS murni)
├── plan.mjs                            # Parser & transformer denah (worldToScreen, meter->pixel)
├── draw_plan.mjs                       # CLI renderer denah headless (PPM & PNG)
├── draw_square.mjs                     # CLI contoh terpandu persegi 6x6 (outline & fill)
├── triangle_gap_bug.mjs                # Script diagnosis bug shared-edge & uji pitfalls
├── bench.mjs                           # Script benchmark forward vs backward (1x & 10x)
├── metrics.mjs                         # Kalkulasi PSNR, SSIM, MSE, dan % pixel identik
├── compare.mjs                         # CLI pembanding 2 citra raster (PPM/PNG) & generator selisih
├── tests.mjs                           # Test suite 17 asersi otomatis (E2, E3, E4, E5, pitfalls)
├── pusaka_plan.json                    # Denah candi skematis (13 polyline, 37 segmen, 5 kategori)
├── myplan.json                         # Denah input terverifikasi untuk Lab 1-3
├── ref/
│   ├── tri_ref.ppm                     # Golden reference segitiga Contoh E4
│   └── square_fill_ref.ppm             # Golden reference persegi terisi watertight
├── out/
│   ├── plan_scratch.ppm                # Output raster denah manual (800x600)
│   ├── square_fill.ppm                 # Output persegi terisi watertight (12x12)
│   ├── square_outline.ppm              # Output outline persegi Bresenham
│   ├── square_fill_no_top_left.ppm     # Output shared-edge cacat (double-drawn)
│   └── square_fill_strict_greater.ppm  # Output shared-edge cacat (cracks/gaps)
├── assets/                             # Gambar bukti aktual yang disematkan pada laporan
└── web/
    ├── index.html                      # Viewer WebGL Three.js & legenda aksesibel
    ├── viewer.mjs                      # Logika Three.js, kamera ortografis, tombol export
    ├── cvd.css                         # Styling modern & filter SVG simulasi deuteranopia
    ├── three.module.js                 # Bundle lokal Three.js r170 (self-contained)
    └── pusaka_plan.json                # Aset denah untuk fetch browser
```

---

## 3. Perintah Eksekusi & Pengujian
Seluruh perintah telah diverifikasi dan dapat dijalankan langsung:

### A. Menjalankan Rangkaian Pengujian Otomatis
```bash
npm test
# atau
node tests.mjs
```
*Hasil:* 17/17 asersi lulus (100% OK), mencakup DDA/Bresenham 8 piksel, 8 oktan, asterisk 24-arah, edge function P1-P3, barycentric sum = 1, watertight shared-edge (36/0/0 vs 30/6/0 vs 30/0/6), serta pitfall auto-flip winding.

### B. Menjalankan Contoh Terpandu Persegi 6x6 (§10)
```bash
# Mode outline (24 piksel via Bresenham)
node draw_square.mjs --mode outline

# Mode fill watertight (36 piksel via top-left)
node draw_square.mjs --mode fill

# Mode cacat tanpa top-left (6 piksel double-drawn)
node draw_square.mjs --mode fill --no-top-left

# Mode cacat strict-greater (6 piksel celah retak)
node draw_square.mjs --mode fill --strict-greater
```

### C. Menjalankan Diagnosis Bug Shared-Edge & Pembangkitan Aset
```bash
node triangle_gap_bug.mjs
```
*Hasil:* Membangkitkan bukti diagnosis visual `assets/shared_edge_before.png`, `assets/shared_edge_coverage.png`, `assets/sample_centre_2x2_vs_corner_3x3.png`, `assets/asterisk_24_rays.png`, dan `assets/winding_fix.png`.

### D. Merender Denah Pusaka3D Manual
```bash
node draw_plan.mjs --w 800 --h 600 --fill
```
*Hasil:* Merender 13 polyline, 37 segmen garis, dan 12 segitiga siluet ke `out/plan_scratch.ppm` dan `assets/plan_scratch.png`.

### E. Menjalankan Benchmark Forward vs Backward
```bash
node bench.mjs
```
*Hasil:* Mengukur waktu median forward vs backward pada zoom 1x dan 10x pada framebuffer 800x600.

### F. Komparasi Citra Rasterizer Manual vs Three.js
```bash
node compare.mjs out/plan_scratch.ppm assets/plan_three.png --diff assets/plan_difference.png
```
*Hasil:* Menghitung % piksel identik (98.96%), PSNR (28.13 dB), SSIM (0.928), dan membangkitkan citra selisih `assets/plan_difference.png`.

### G. Melayani Viewer WebGL Lokal
```bash
npx serve -l 3000 web
```
Buka browser pada `http://localhost:3000`.

---

## 4. Reproduksi dari Kondisi Bersih (*Clean Clone*)
1. Clone repositori:
   ```bash
   git clone https://github.com/antoniorenaldy24/GrafikKomputerModul2.git
   cd GrafikKomputerModul2
   ```
2. Instalasi dependency minimal:
   ```bash
   npm install
   ```
3. Verifikasi seluruh tes unit:
   ```bash
   npm test
   ```
4. Render denah dan jalankan benchmark:
   ```bash
   node draw_plan.mjs --w 800 --h 600 --fill
   node bench.mjs
   ```
5. Buka viewer web:
   ```bash
   npx serve -l 3000 web
   ```

---

## 5. Repositori GitHub & Live Demo
- **URL Repositori GitHub:** [https://github.com/antoniorenaldy24/GrafikKomputerModul2](https://github.com/antoniorenaldy24/GrafikKomputerModul2)
- **Live Demo GitHub Pages:** [https://antoniorenaldy24.github.io/GrafikKomputerModul2/](https://antoniorenaldy24.github.io/GrafikKomputerModul2/)
- **Catatan Denah Fallback (§1.1):** File `pusaka_plan.json` dan `myplan.json` disusun secara lokal sebagai fallback skematis sintetis terukur yang merepresentasikan elemen candi warisan budaya: dinding luar, ruang dalam (cella), tangga masuk bertingkat, 4 shrine sudut, dan 2 sumbu ortogonal (total 13 polyline, 37 segmen garis, 5 kategori arsitektural). Data ini bukan hasil survei topografi bangunan nyata, melainkan spesifikasi skematis terstruktur untuk demonstrasi pipeline grafika komputer.
- **Status Publikasi GitHub Pages (§12):** `TERPUBLIKASI`. Repositori telah di-push ke remote GitHub `origin/main` dan branch `gh-pages` serta folder `docs/` disiapkan untuk hosting GitHub Pages.

---

## 6. Verifikasi Akhir
**Verified:** 21 Oktober 2026 on Windows 11 (win32 x64), Node.js v22.14.0, Three.js r170, `npm test` passed 17/17 checks, all assets verified.
