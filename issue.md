# Issue: Limit Assessment 24 Jam, Hapus Badge Hero, Fix Hydration Error, dan Percepat Connect Wallet

## Ringkasan

Empat perbaikan pada aplikasi:

1. **Limit akses assessment**: 1 wallet hanya bisa mengerjakan soal **1 kali dalam 24 jam**.
2. **Hapus badge** "AI-evaluated · 3 problems per session" di halaman utama.
3. **Fix error console Next.js**: `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties` di halaman utama.
4. **Percepat respons Connect Wallet**: tombol connect/disconnect wallet saat ini lambat merespons (terukur ~3,7 detik dari klik sampai modal muncul, bahkan di browser bersih tanpa ekstensi).

Kerjakan berurutan per tahap. Semua akar masalah di bawah **sudah diinvestigasi** — langsung ke titiknya, jangan cari ulang dari nol.

---

## Konteks & Temuan Investigasi (baca dulu sebelum koding)

### Item 1 — Limit 24 jam
- Semua soal dibuat lewat API `src/app/api/assessment/generate/route.ts`; penilaian lewat `evaluate/route.ts`. **Enforcement WAJIB di sisi server** (API route) — kalau hanya di frontend, user bisa bypass lewat console/devtools.
- Sudah ada store sesi server-side di `src/lib/assessment-store.ts` (Map di `globalThis`, menyimpan `walletAddress` + `createdAt`). **Tapi hati-hati**: sesi dihapus otomatis setelah `SESSION_TTL_MS` = 2 jam, jadi Map sesi TIDAK BISA dipakai langsung untuk limit 24 jam — perlu catatan attempt terpisah per wallet dengan TTL 24 jam.
- Di `evaluate/route.ts` sudah ada konstanta `COOLDOWN_SECONDS = 24 jam` dan field `cooldownUntil` yang dikirim saat user gagal — tapi **tidak pernah di-enforce** saat generate berikutnya. Fitur ini menyambungkan logika yang sudah setengah jadi itu.
- Saat ini halaman assessment sudah di-gating wallet (PR #10), jadi setiap request generate selalu membawa `walletAddress` asli — itu kunci limitnya.

### Item 2 — Badge hero
- Lokasinya di `src/app/page.tsx`: blok `<div className="inline-flex ...">` berisi dot hijau `animate-pulse` + teks "AI-evaluated · 3 problems per session" (sekitar baris 41–44).

### Item 3 — Hydration error (akar masalah sudah ketemu)
- Bersumber dari `src/components/ui/black-hole-vortex-animation.tsx`. Perbaikan sebelumnya (PRNG seeded) sudah membuat urutan angka deterministik, tapi error masih muncul karena masalah presisi floating-point:
  ```
  server: d="M 164.42798499891663 5.651054624392572 C ..."
  client: d="M 164.42798499891663 5.6510546243926 C ..."
  ```
  Selisih hanya di digit terakhir. Penyebabnya: koordinat path dihitung dengan `Math.cos`/`Math.sin`, dan hasil fungsi trigonometri bisa berbeda 1 ULP antar versi V8 (Node di server vs Chrome di browser). `strokeWidth` (murni aritmetika PRNG) cocok persis — hanya koordinat hasil trigonometri yang melenceng.
- **Arah fix**: bulatkan semua angka koordinat ke presisi tetap (mis. 2 desimal) saat merangkai string `d` — hasil pembulatan dijamin identik lintas engine. Jangan pakai `suppressHydrationWarning` (itu menutupi, bukan memperbaiki).

### Item 4 — Connect wallet lambat
- Terukur objektif: klik tombol "Connect Wallet" → modal tampil = **~3.700 ms** di browser headless bersih. Jadi lambatnya bukan (hanya) dari MetaMask — halaman sendiri yang berat.
- Tersangka utama: **150 path SVG dianimasikan tanpa henti oleh framer-motion** (repeat infinity, animasi `pathLength` per path = kerja JS terus-menerus di main thread), sehingga klik dan render modal tersendat.
- Konsekuensinya sama untuk disconnect (modal akun juga dibuka dari halaman yang sama).

---

## Tahapan Implementasi

### Tahap 1 — Limit assessment 1x per 24 jam per wallet
- Tambahkan pencatatan attempt per wallet di `src/lib/assessment-store.ts` (atau modul kecil terpisah): simpan kapan terakhir kali sebuah `walletAddress` memulai assessment, dengan umur data 24 jam. Ikuti pola Map-di-globalThis yang sudah ada (dengan komentar bahwa produksi sebaiknya pakai Redis/KV).
- Enforce di `POST /api/assessment/generate`: jika wallet masih dalam masa cooldown, tolak dengan status HTTP yang tepat (mis. 429) dan sertakan **sisa waktu tunggu** dalam respons agar frontend bisa menampilkannya.
- Frontend (`src/app/assessment/[skillId]/page.tsx`): tangani respons 429 dengan layar/pesan yang ramah — mis. "Kamu sudah mengerjakan assessment. Kembali lagi dalam X jam Y menit." Jangan biarkan muncul sebagai error generik.
- Putuskan dan dokumentasikan di komentar: jam 24 dimulai saat **generate** (soal diambil) — pilihan paling sederhana dan menutup celah "generate berkali-kali cari soal gampang".
- Samakan perilakunya dengan `cooldownUntil` yang sudah ada di evaluate route agar tidak ada dua mekanisme cooldown yang saling bertentangan.

### Tahap 2 — Hapus badge hero
- Hapus blok badge "AI-evaluated · 3 problems per session" dari `src/app/page.tsx`.
- Rapikan spacing elemen di sekitar bekas badge (heading di bawahnya punya `mt-6` yang tadinya bergantung pada badge) agar hero tetap seimbang.
- Jangan sentuh elemen hero lain.

### Tahap 3 — Fix hydration error
- Terapkan pembulatan presisi tetap pada koordinat di `black-hole-vortex-animation.tsx` sesuai temuan investigasi di atas.
- Verifikasi: buka halaman utama dengan console browser — error hydration harus hilang total (bukan berkurang).

### Tahap 4 — Percepat connect/disconnect wallet
- Ukur dulu baseline (klik → modal tampil) supaya ada pembanding sebelum/sesudah.
- Kurangi beban main thread dari animasi black hole. Pilih pendekatan paling sederhana yang efektif, misalnya: kurangi jumlah path secara signifikan, dan/atau hentikan animasi saat tab tidak aktif / saat modal wallet terbuka. Pertahankan nuansa visual hero.
- Ukur ulang setelah perubahan; target: modal connect terbuka < 1 detik di kondisi normal.
- Jika masih lambat setelah animasi diringankan, cek konfigurasi wagmi/RainbowKit di `src/providers/Web3Provider.tsx` (mis. setup `ssr: true` tanpa cookie storage) — tapi kerjakan pengurangan animasi lebih dulu karena itu tersangka terkuat.

### Tahap 5 — Verifikasi keseluruhan
- `npm run dev`, uji manual:
  - Wallet A generate soal → coba generate lagi (reload / track lain) → tertolak dengan pesan sisa waktu yang jelas.
  - Badge di hero hilang, layout hero tetap rapi.
  - Console browser bersih dari error hydration di semua halaman.
  - Klik Connect Wallet → modal muncul cepat; disconnect juga responsif.
  - Regresi: alur assessment normal (generate → kerjakan → submit → evaluasi) tetap jalan untuk attempt pertama.
- `npm run lint` dan `npm run build` lolos tanpa error baru.

---

## Kriteria Selesai (Definition of Done)

- [ ] Wallet yang sama tidak bisa generate soal kedua dalam 24 jam — ditolak **server-side** dengan pesan sisa waktu yang jelas di UI.
- [ ] Badge "AI-evaluated · 3 problems per session" hilang dari halaman utama tanpa merusak layout hero.
- [ ] Tidak ada error hydration di console pada halaman mana pun.
- [ ] Modal connect wallet terbuka < 1 detik di kondisi normal; disconnect juga responsif.
- [ ] Alur assessment existing tidak regress.
- [ ] `npm run lint` dan `npm run build` lolos.

---

## Catatan untuk Implementer

- **Jangan menambah dependency baru** — semua perbaikan bisa dilakukan dengan stack yang ada.
- **Jangan melemahkan enforcement ke client-side saja** (mis. cuma menyimpan timestamp di localStorage) — itu gampang di-reset user dan tidak memenuhi requirement.
- Jangan pakai `suppressHydrationWarning` untuk menyapu error hydration ke bawah karpet.
- Perubahan diharapkan terfokus pada: `assessment-store.ts` (atau modul limit baru), `generate/route.ts`, `assessment/[skillId]/page.tsx`, `page.tsx`, `black-hole-vortex-animation.tsx`, dan bila perlu `Web3Provider.tsx`.
- Store in-memory hilang saat server restart — untuk MVP ini diterima; tuliskan batasannya di komentar kode, jangan diam-diam.
- Kerjakan bertahap per Tahap, verifikasi tiap tahap sebelum lanjut ke berikutnya.
