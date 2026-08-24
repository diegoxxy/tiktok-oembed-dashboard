# Catatan Upgrade — TikTok Campaign Analytics Dashboard

Rekonstruksi dari `app/page.tsx` + `app/api/tiktok/route.ts` versi awal, mengikuti
`Dokumen_Spesifikasi_Sistem_Tiktok_Campaign.pdf`.

## Cara pakai

1. Ganti/tambahkan file-file di repo kamu dengan struktur di ZIP ini (semuanya relatif ke root project).
2. `npm install` (ada beberapa dependency baru — lihat di bawah).
3. `npm run dev` untuk cek lokal, lalu push ke GitHub seperti biasa → Vercel auto-deploy.

## Dependency baru yang ditambahkan

| Package | Guna |
|---|---|
| `idb-keyval` | Cache hasil scan di IndexedDB browser (skip re-fetch URL yang sama) |
| `papaparse` + `@types/papaparse` | Parsing CSV saat import |
| `xlsx` | Parsing & export file Excel |
| `@tanstack/react-virtual` | Virtual scrolling di Master Table (biar tetap 60fps di 1.000+ baris) |
| `jspdf` + `jspdf-autotable` | Export ringkasan PDF |
| `lucide-react` | Ikon (ganti emoji lama biar terlihat lebih enterprise) |

`cheerio` yang sudah ada di `package.json` lama tidak dipakai lagi oleh `route.ts` baru ini —
saya biarkan tetap ada kalau-kalau dipakai di bagian lain repo yang tidak saya lihat.

⚠️ **Soal `xlsx`**: `npm audit` akan menandai package ini (`GHSA-4r6h-8v6p-xvw6`,
`GHSA-5pgg-2g8v-p4x9`, prototype pollution & ReDoS) karena versi terbaru yang
sudah dipatch tidak dipublish ke npm registry oleh SheetJS — mereka sarankan
install dari `https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`. Karena di
proyek ini `xlsx` cuma dipakai di sisi klien (baca file yang di-upload user
sendiri, dan generate file export), risikonya rendah — tapi tetap saya
sebutkan biar kamu yang putuskan. Alternatif kalau mau lebih hati-hati:
ganti ke `exceljs`.

## Apa yang berubah dari versi lama

- **API route**: dulu loop sekuensial + delay 400ms per video (bisa >6 menit
  untuk 1.000 link → pasti timeout di Vercel). Sekarang klien memecah URL
  jadi chunk 12 URL, dikirim paralel (3 chunk bersamaan) ke `/api/tiktok`,
  dan tiap chunk diproses paralel juga di server + retry otomatis (maks 2x)
  kalau kena rate-limit/gagal. Server menolak request >30 URL sekaligus
  sebagai pengaman.
- **Video yang gagal fetch tidak lagi hilang diam-diam** — sekarang selalu
  punya status `error` + pesan error, muncul di tabel/filter, bukan cuma
  disaring keluar.
- **Cache IndexedDB**: refresh halaman dan scan ulang URL yang sama tidak
  fetch ulang, kecuali centang "Abaikan cache". Status qualified/unqualified
  dihitung ulang dari hashtag yang aktif saat itu (bukan ikut ke-cache), jadi
  ganti hashtag lalu scan ulang tetap akurat.
- **Import Excel/CSV**: baca semua sel di semua sheet, ambil apa pun yang
  match pola URL TikTok — tidak butuh nama/posisi kolom tertentu.
- **Dual view mode**: Folder (grid kreator + slide-over drawer) dan Master
  Table (virtualized, 1.000+ baris tetap ringan).
- **Executive Summary Ribbon**, **search/sort/filter** (status + minimum
  views), dan **export Excel (3 sheet: ringkasan, per kreator, semua video)
  + PDF (ringkasan eksekutif)** — semua sesuai dokumen spesifikasi.
- Desain tetap pakai token warna yang sama dari spec/versi lama (`#0b0f19`,
  `#131b2e`, `#1e293b`, cyan `#00d2ff`, emerald `#10b981`, amber `#f59e0b`) —
  tidak diganti supaya konsisten dengan brand yang sudah ada.

## Yang belum/tidak saya buat

- `app/layout.tsx` dan `app/globals.css` saya buat ulang mengikuti default
  `create-next-app` (Geist font, dsb) karena kamu cuma upload `page.tsx` dan
  `route.ts`. Kalau repo asli kamu sudah punya kustomisasi di dua file itu,
  cek ulang sebelum overwrite.
- Concurrency (`CHUNK_SIZE=12`, `CONCURRENCY=3` di `app/page.tsx`) itu titik
  awal yang aman — kalau di produksi masih kena rate-limit TikWM, turunkan
  angkanya; kalau ternyata longgar, boleh dinaikkan untuk mempercepat scan
  1.000+ link.
