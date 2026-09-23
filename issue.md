# Issue: Fix Cooldown Reset, Countdown Real-time, Migrasi Teks ke Bahasa Inggris, Perbaikan Connect/Disconnect Wallet, dan Spacing Tagline Hero

## Ringkasan

Lima perbaikan lanjutan setelah fitur limit 24 jam (#11) rilis:

1. **Bug cooldown reset**: tombol "Cek lagi"/retry pada layar cooldown malah me-reset sisa waktu menjadi 24 jam penuh (user melihat "24 jam 1 menit" lagi setiap klik). Sisa waktu seharusnya terus berkurang, tidak pernah bertambah.
2. **Countdown real-time**: sisa waktu cooldown harus tampil **jam:menit:detik** dan berdetak tiap detik (saat ini hanya "X jam Y menit" yang di-update tiap 30 detik).
3. **Migrasi bahasa**: seluruh teks yang ditampilkan ke user diubah ke **Bahasa Inggris** (hackathon berskala global). Masih banyak string Bahasa Indonesia di frontend maupun pesan error API.
4. **Perbaikan wallet**: disconnect tidak berfungsi, dan setiap `npm run dev` wallet selalu otomatis connected tanpa user klik apa pun.
5. **Spacing tagline hero**: teks "The First On-Chain Assessment Platform" perlu sedikit didorong ke bawah agar ada jarak yang enak dilihat terhadap judul hero "Prove your skills. On chain."

Semua akar masalah di bawah **sudah diinvestigasi dan diverifikasi** — langsung kerjakan dari temuan ini, jangan investigasi ulang dari nol.

---

## Konteks & Temuan Investigasi

### Item 1 — Cooldown reset ke 24 jam (akar masalah sudah ketemu, sudah dibuktikan lewat live API)

Rantai bug-nya:

- Server (`src/app/api/assessment/generate/route.ts`): saat cooldown aktif, mengembalikan HTTP 429 lewat helper `jsonError(message, 429, { cooldownUntil, remainingMs }, headers)`.
- Helper `jsonError` di `src/lib/api.ts` menaruh objek ketiga ke dalam field **`details`**. Bentuk respons sebenarnya (terverifikasi):
  ```json
  { "error": "...", "details": { "cooldownUntil": 1234567890, "remainingMs": 86340000 } }
  ```
- Frontend (`src/app/assessment/[skillId]/page.tsx`, handler 429 di fungsi `generate`) membaca **`data?.cooldownUntil` di top level** — selalu `undefined` karena datanya bersarang di `details`.
- Karena `undefined`, fallback client dipakai: `Math.floor(Date.now()/1000) + 24*60*60` → **deadline baru "sekarang + 24 jam"**. Setiap klik "Cek lagi" memanggil `generate` → 429 → fallback → timer reset ke 24 jam (+ delay ≈ jadi "24 jam 1 menit").

**Arah fix**: samakan kontrak data — frontend membaca dari field yang benar (`details.cooldownUntil`), atau server mengirim `cooldownUntil` di top level. Pilih salah satu dan buat konsisten. Hapus/perbaiki fallback client yang mengarang deadline baru; jika server tidak mengirim angka yang valid, jangan pernah menambah durasi cooldown. Bonus: karena countdown sudah real-time (Item 2), tombol "Cek lagi" yang memanggil ulang API bisa dihapus atau dijadikan pengecekan ringan tanpa efek samping.

### Item 2 — Countdown real-time jam:menit:detik

- Lokasinya komponen `CooldownState` di `src/app/assessment/[skillId]/page.tsx`: tick saat ini `setInterval(..., 30_000)` dan format `formatRemaining` menghasilkan teks Indonesia "X jam Y menit".
- Ubah tick menjadi 1 detik dan format menjadi `HH:MM:SS` (Bahasa Inggris/numerik, mis. `23:59:58`). Pastikan timer dibersihkan saat komponen unmount dan tidak negatif (clamp ke 0, lalu tampilkan keadaan bisa-mulai).

### Item 3 — Teks Bahasa Indonesia → Inggris

String Indonesia tersebar di frontend **dan** backend (pesan error API ikut tampil ke user). Inventaris hasil scan (titik awal, sisir ulang saat mengerjakan):

- `src/app/assessment/[skillId]/page.tsx` — ±9 string: `formatRemaining` ("jam/menit"), "Gagal membuat soal…", "Terjadi kesalahan tak terduga.", "Isi minimal satu jawaban…", "Gagal mengevaluasi jawaban…", judul "Assessment belum tersedia", "Kamu sudah mengerjakan assessment. Kembali lagi dalam…", tombol "Cek lagi".
- `src/app/api/assessment/generate/route.ts` — ±4 string: "Input tidak valid.", pesan cooldown 429, "OPENAI_API_KEY belum diset…".
- `src/app/api/assessment/evaluate/route.ts` — ±7 string: "Input tidak valid.", "Sesi tidak ditemukan…", "Sesi ini sudah dievaluasi…", "Sesi ini tidak cocok…", "Sesi ini milik wallet lain.", "Tidak ada jawaban yang dikirim…", pesan API key.
- `src/lib/schemas.ts` (±3), `src/lib/ai.ts` (±5), `src/lib/openai.ts` (1), `src/lib/ai-schemas.ts` (1), `src/app/api/health/route.ts` (±2) — termasuk pesan validasi Zod (contoh nyata dari API: `"skillId maksimal 3"`).

Aturan: terjemahkan semua string yang bisa sampai ke layar user (termasuk pesan error API dan pesan validasi Zod). Komentar kode tidak wajib diubah. Setelah selesai, grep ulang kata kunci Indonesia ("tidak", "belum", "sudah", "silakan", "kamu", "gagal", "jam", "menit") di `src/` untuk memastikan tidak ada yang terlewat.

### Item 4 — Wallet: auto-connect saat dev + disconnect tidak berfungsi

Temuan terverifikasi:

- **Peer dependency invalid**: `npm ls` melaporkan `wagmi@3.7.7 invalid: "^2.9.0" from @rainbow-me/rainbowkit@2.2.11`. RainbowKit 2.2.11 (versi terbaru yang ada) hanya mendukung wagmi 2.x, sedangkan project memasang wagmi 3.x. Kombinasi mismatch seperti ini adalah tersangka utama disconnect tidak berfungsi (state connection tidak sinkron antara RainbowKit dan wagmi).
- **`ssr: true` tanpa storage**: `src/providers/Web3Provider.tsx` memanggil `createConfig({ ssr: true })` tanpa konfigurasi cookie storage — pola SSR wagmi yang tidak lengkap dan bisa membuat state koneksi berperilaku aneh antar server/client.
- **Auto-connect tiap dev start**: wagmi melakukan reconnect-on-mount secara default, dan MetaMask yang sudah pernah authorize situs ini akan langsung memberikan akunnya tanpa prompt — makanya wallet selalu "sudah connected" begitu halaman dibuka.

**Arah fix (urut)**:
1. Selaraskan versi: turunkan wagmi ke 2.x yang didukung RainbowKit 2.2.11 (cek juga viem tetap kompatibel). Jangan menambah library wallet baru.
2. Bereskan konfigurasi SSR provider: ikuti pola resmi wagmi untuk Next.js (cookie storage + initial state dari server), atau — jika tidak dibutuhkan — hapus `ssr: true`. Pilih yang paling sederhana dan stabil.
3. Perilaku auto-connect: matikan reconnect otomatis saat mount agar wallet TIDAK connected sendiri ketika aplikasi dibuka; user harus klik Connect dulu. (Ini perilaku yang diminta owner produk.)
4. Uji siklus penuh dengan wallet sungguhan: connect → reload halaman → disconnect → reload lagi. Disconnect harus benar-benar memutuskan (UI kembali ke tombol "Connect Wallet") dan tidak auto-connect lagi setelah reload.

### Item 5 — Spacing tagline hero

- Struktur: judul "Prove your skills. On chain." di-render `BlackHoleScene` (h1), lalu `children` (berisi h2 "The First On-Chain Assessment Platform" di `src/app/page.tsx`) ditarik naik dengan negative margin (`-mt-24`/`md:-mt-32`) di wrapper children `black-hole-vortex-animation.tsx` — akibatnya tagline terlalu menempel ke judul.
- **Arah fix**: beri jarak tambahan antara h1 dan h2 — mis. kurangi tarikan negative margin pada wrapper children, atau tambah top margin/padding pada section pertama di `page.tsx`. Perubahan kecil saja; jangan ubah struktur hero. Verifikasi visual di mobile dan desktop (hero tetap terasa satu kesatuan, tidak ada teks yang bertumpuk/tenggelam di animasi).

---

## Tahapan Implementasi

### Tahap 1 — Fix bug cooldown reset (Item 1)
- Perbaiki kontrak data 429 sesuai arah fix di atas; pastikan sisa waktu yang ditampilkan berasal dari server dan **tidak pernah bertambah** saat user menekan retry.

### Tahap 2 — Countdown real-time HH:MM:SS (Item 2)
- Ubah interval dan format di `CooldownState`; sekalian hapus/sederhanakan tombol "Cek lagi" bila sudah tidak diperlukan.

### Tahap 3 — Wallet fix (Item 4)
- Selaraskan wagmi/RainbowKit, rapikan konfigurasi SSR, matikan auto-reconnect, lalu uji siklus connect/reload/disconnect dengan wallet sungguhan. Kerjakan sebelum migrasi teks agar tidak ada rework di layar yang sama.

### Tahap 4 — Migrasi seluruh teks ke Bahasa Inggris (Item 3)
- Terjemahkan semua string user-facing sesuai inventaris; grep ulang untuk memastikan bersih. Kerjakan setelah Tahap 1–3 supaya pesan cooldown/wallet yang baru langsung ditulis dalam Bahasa Inggris.

### Tahap 5 — Spacing tagline hero (Item 5)
- Sesuaikan spacing, cek visual desktop & mobile.

### Tahap 6 — Verifikasi keseluruhan
- `npm run dev`, uji manual end-to-end:
  - Trigger cooldown (generate sekali), klik retry beberapa kali → timer terus menurun, tidak pernah reset ke 24 jam.
  - Countdown tampil HH:MM:SS dan berdetak tiap detik.
  - Tidak ada satu pun teks Bahasa Indonesia di UI (termasuk pesan error yang muncul).
  - Fresh load: wallet TIDAK auto-connect; connect manual berjalan; disconnect berfungsi; reload setelah disconnect tetap terputus.
  - Tagline hero punya jarak yang wajar dari judul di mobile & desktop.
- `npm run lint` dan `npm run build` lolos tanpa error baru.

---

## Kriteria Selesai (Definition of Done)

- [ ] Retry/"Cek lagi" pada layar cooldown tidak lagi me-reset waktu; sisa waktu hanya berkurang.
- [ ] Countdown tampil real-time format jam:menit:detik.
- [ ] Seluruh teks yang terlihat user berbahasa Inggris (frontend + pesan error API + pesan validasi).
- [ ] Wallet tidak auto-connect saat aplikasi dibuka; tombol disconnect berfungsi dan statusnya bertahan setelah reload.
- [ ] Tagline "The First On-Chain Assessment Platform" berjarak wajar dari judul hero, rapi di mobile & desktop.
- [ ] Alur assessment normal (generate → kerjakan → submit → evaluasi) tidak regress.
- [ ] `npm run lint` dan `npm run build` lolos.

---

## Catatan untuk Implementer

- Jangan menambah dependency baru; untuk wallet justru **menyelaraskan versi yang sudah ada** (wagmi 2.x sesuai peer requirement RainbowKit 2.2.11).
- Semua enforcement (cooldown, kepemilikan sesi) tetap di sisi server — jangan memindahkan logika pembatasan ke client.
- Perubahan diharapkan terfokus pada: `assessment/[skillId]/page.tsx`, `api/assessment/generate|evaluate/route.ts`, `lib/api.ts` (bila kontrak 429 diubah di sana), `lib/schemas.ts` dkk. untuk teks, `providers/Web3Provider.tsx` + `package.json` untuk wallet, dan `page.tsx`/`black-hole-vortex-animation.tsx` untuk spacing hero.
- Saat mengubah versi wagmi, cek semua pemakaiannya (`useAccount`, `ConnectButton`, dll.) masih kompatibel; jalankan build penuh, jangan hanya dev.
- Kerjakan bertahap per Tahap dan verifikasi tiap tahap sebelum lanjut.
