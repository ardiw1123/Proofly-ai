# Issue: Perbaiki Layout Frontend yang Berantakan (Reset Global Bentrok dengan Tailwind v4)

## Gejala

Layout semua halaman terlihat "berantakan": navbar tipis tanpa padding, kartu-kartu menempel ke tepi layar dan saling berhimpit, spacing antar section hilang, konten hero tidak overlap seperti yang diharapkan. Padahal class Tailwind (`p-6`, `mt-12`, `px-4`, `-mt-24`, dll.) ada di markup.

Hasil inspeksi computed style di browser membuktikan: SEMUA padding dan margin dari utility Tailwind ternilai `0px`, sementara utility non-spacing (grid, warna, max-width, backdrop-blur) tetap bekerja.

## Akar Masalah (sudah diinvestigasi — langsung ke titik ini)

Project memakai **Tailwind CSS v4**, yang menempatkan semua utility-nya di dalam `@layer utilities`. Sesuai spesifikasi CSS Cascade Layers, **style yang ditulis tanpa layer (unlayered) selalu menang atas style di dalam layer, apa pun specificity-nya**.

Di `src/app/globals.css` terdapat rule reset unlayered:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

Rule ini menimpa (zero-out) setiap padding & margin yang di-set utility Tailwind di seluruh situs. Ini pola reset dari era Tailwind v3 yang menjadi bug saat migrasi ke v4. Preflight Tailwind v4 sudah menangani reset box-sizing/margin/padding di dalam layer-nya sendiri, jadi rule di atas sepenuhnya redundan.

## Tahapan Perbaikan

### Tahap 1 — Hapus reset global yang bentrok
- Hapus rule `* { box-sizing ... margin: 0; padding: 0 }` dari `src/app/globals.css`. Tidak perlu diganti apa pun — preflight Tailwind sudah mencakupnya.
- Jika masih ingin mempertahankan CSS kustom lain di file itu (variabel `:root`, style `body`, scrollbar, dll.), boleh dibiarkan, tapi pastikan tidak ada selector universal atau rule unlayered yang menyetel padding/margin/display yang bisa menimpa utility. Best practice: bungkus CSS kustom berbasis elemen dalam `@layer base { ... }`.

### Tahap 2 — Perbaiki hydration mismatch pada komponen animasi
- `src/components/ui/black-hole-vortex-animation.tsx` membangkitkan 150 path acak dengan `Math.random()` pada module load. Karena komponen ini ikut di-render di server (SSR) lalu di-hydrate di client, hasil random server ≠ client → error hydration React besar-besaran di console (sudah terekam di log dev server).
- Pilih pendekatan paling sederhana agar output server dan client identik, misalnya: PRNG deterministik dengan seed tetap, atau bangkitkan path hanya di client setelah mount.
- Tampilan dan perilaku animasi tidak boleh berubah.

### Tahap 3 — Bersihkan warning kecil
- Tambahkan atribut `data-scroll-behavior="smooth"` pada elemen `<html>` di `src/app/layout.tsx` (Next.js memperingatkan ini karena `scroll-behavior: smooth` di globals.css).

### Tahap 4 — Verifikasi
- Jalankan `npm run dev`, buka halaman utama dan periksa secara visual: navbar punya padding wajar, tiga kartu track tampil dalam grid dengan spacing dan padding dalam, badge/heading/section punya margin, konten overlap dengan hero.
- Buka console browser: tidak boleh ada error hydration.
- Cek juga halaman lain (`/assessment/1`, `/badges`, `/verify`) — reset global ini sebelumnya merusak semua halaman, jadi semuanya harus ikut pulih.
- Cek responsive di lebar mobile (~390px) dan desktop (~1440px).
- Jalankan `npm run lint` dan pastikan lolos tanpa error baru.

## Kriteria Selesai (Definition of Done)

- [ ] Utility padding/margin Tailwind bekerja di semua halaman (verifikasi computed style atau visual).
- [ ] Tidak ada error hydration di console browser.
- [ ] Tidak ada warning baru dari Next.js/React.
- [ ] Layout halaman utama sesuai desain yang sudah ada (hero + kartu menyatu, grid 1→2→3 kolom responsif).
- [ ] `npm run lint` lolos.

## Catatan untuk Implementer

- Ini murni bug fix — JANGAN redesign, JANGAN ubah struktur JSX atau class Tailwind yang sudah ada di `page.tsx` dan komponen lain.
- Jangan menambah dependency baru.
- Perubahan diharapkan kecil dan terfokus: terutama di `globals.css`, satu penyesuaian di `black-hole-vortex-animation.tsx`, satu atribut di `layout.tsx`.
