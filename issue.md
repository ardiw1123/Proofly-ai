# Issue: Hero Copywriting, Tombol Connect Wallet, dan Gating Assessment

## Ringkasan

Tiga penyempurnaan pada pengalaman pengguna sebelum mengerjakan assessment:

1. **Hero copywriting** yang menarik perhatian di section hero (sebelum scroll).
2. **Tombol Connect Wallet** di navbar kanan atas yang langsung membuka wallet yang sudah terpasang di browser (MetaMask / wallet lain).
3. **Gating assessment**: user baru bisa mengakses dan mengerjakan soal **setelah** connect wallet. Saat ini siapa pun (tanpa wallet) masih bisa mengerjakan soal.

Ini fitur product/UX — bukan bug. Kerjakan bertahap, jangan merombak total struktur yang sudah ada.

---

## Konteks Kondisi Saat Ini (baca dulu sebelum koding)

- **Hero** (`src/app/page.tsx` + `src/components/ui/black-hole-vortex-animation.tsx`): judul hero saat ini di-render oleh `BlackHoleScene` lewat prop `title="Prove your skills. On chain."`, lalu ada badge dan sub-judul di bawahnya. Jadi kerangka hero **sudah ada** — tugasnya memperkuat copywriting, bukan membuat section baru.
- **Navbar** (`src/components/Navbar.tsx`): **sudah** ada `<ConnectButton>` dari RainbowKit di kanan atas. RainbowKit otomatis mendeteksi wallet yang terpasang. Tugasnya memastikan tombol ini benar-benar mengarahkan user untuk connect ke wallet terpasang (bukan sekadar hiasan), dan tampilannya konsisten.
- **Wallet provider** (`src/providers/Web3Provider.tsx`): sudah pakai Wagmi + RainbowKit + React Query. Hook `useAccount()` dari `wagmi` tersedia untuk cek status koneksi.
- **Assessment** (`src/app/assessment/[skillId]/page.tsx`): saat ini memakai fallback `GUEST_WALLET = 0x000...000` ketika tidak ada wallet (`const walletAddress = address ?? GUEST_WALLET`), sehingga **guest tetap bisa generate dan mengerjakan soal**. Perilaku inilah yang harus dikunci.
- **Prop komponen hero**: `BlackHoleScene` saat ini hanya menerima `title` dan `children`. Untuk menaruh sub-headline/CTA di dalam area hero (di sekitar judul), prop komponen ini perlu diperluas — atau konten tambahan ditempatkan lewat `children`. Pilih cara yang paling sederhana.

> **Baseline penting:** bug layout (#6) sudah diperbaiki dan merged (PR #7), jadi kerjakan dari kode terbaru. Namun integrasi hero di `src/app/page.tsx` (pemakaian `BlackHoleScene`, issue #5) **masih berupa perubahan lokal yang belum di-commit** — di branch `main`, `page.tsx` belum memakai komponen tersebut. Pastikan dulu status perubahan lokal ini jelas (di-commit atau disepakati sebagai baseline) sebelum menumpuk pekerjaan baru di atasnya.

---

## Tahapan Implementasi

### Tahap 1 — Perkuat copywriting hero
- Susun ulang copy di section hero agar punya daya tarik: headline utama yang kuat (mis. "Prove your skills. On chain."), sub-headline pendukung yang menjelaskan value (AI-generated case study, dinilai independen, bukti on-chain), dan idealnya satu **CTA** (ajakan bertindak) yang jelas, misalnya tombol "Connect wallet to start" atau "Start assessment".
- Boleh menyesuaikan prop `title` pada `BlackHoleScene` dan/atau konten di `src/app/page.tsx` — tanpa mengubah struktur layout hero yang sudah menyatu dengan kartu track.
- Jaga keterbacaan teks di atas efek animasi (kontras cukup).

### Tahap 2 — Tombol Connect Wallet di navbar
- Pastikan tombol connect di kanan atas navbar berfungsi dan langsung membuka/menghubungkan ke wallet yang terpasang di browser (MetaMask atau wallet lain yang terdeteksi). RainbowKit umumnya sudah menangani ini; jika perlu, arahkan agar wallet ter-install diprioritaskan/di-trigger langsung.
- Ketika sudah terhubung, tampilkan alamat wallet (atau ringkasannya) — perilaku default RainbowKit sudah cukup.
- Pastikan tampilan tombol rapi dan konsisten dengan tema gelap, di desktop maupun mobile.

### Tahap 3 — Gating assessment berdasarkan koneksi wallet
- Kunci halaman assessment (`src/app/assessment/[skillId]/page.tsx`): jika wallet **belum** terhubung (cek via `useAccount()`), jangan tampilkan/muat soal. Tampilkan layar "Connect wallet untuk melanjutkan" dengan tombol yang memicu connect (bisa memakai tombol/komponen connect yang sama seperti di navbar).
- Hentikan alur guest: jangan memanggil generate soal untuk user tanpa wallet. Hilangkan/batasi pemakaian `GUEST_WALLET` agar tidak lagi memberi akses mengerjakan soal.
- Setelah wallet terhubung, assessment berjalan normal seperti sekarang (generate soal → kerjakan → submit → evaluasi).
- Pertimbangkan juga CTA "Start assessment" di halaman utama: boleh diarahkan agar mendorong connect wallet lebih dulu (opsional, selama tidak membingungkan).

### Tahap 4 — Verifikasi
- Jalankan `npm run dev`, uji manual:
  - Hero tampil dengan copy baru dan CTA sebelum scroll, tetap rapi dan terbaca.
  - Tombol connect navbar membuka wallet terpasang; setelah connect, status wallet muncul.
  - Akses `/assessment/1` **tanpa** wallet → muncul layar "connect wallet", soal tidak dimuat.
  - Setelah **connect wallet** → soal bisa diakses dan dikerjakan sampai submit/evaluasi.
  - Cek di mobile & desktop.
- Pastikan tidak ada error hydration/console baru.
- Jalankan `npm run lint` (dan typecheck bila ada) sampai lolos tanpa error baru.

---

## Kriteria Selesai (Definition of Done)

- [ ] Hero punya copywriting menarik (headline + sub-headline + CTA) yang tampil sebelum scroll.
- [ ] Tombol Connect Wallet di navbar kanan atas berfungsi membuka wallet terpasang.
- [ ] Assessment tidak bisa diakses/dikerjakan sebelum wallet terhubung; tampil prompt connect.
- [ ] Setelah connect wallet, alur assessment berjalan normal end-to-end.
- [ ] Responsif di mobile/tablet/desktop; tidak ada error hydration/console baru.
- [ ] `npm run lint` lolos tanpa error baru.

---

## Catatan untuk Implementer

- **Jangan menambah dependency baru** kecuali benar-benar perlu — Wagmi + RainbowKit yang sudah ada umumnya cukup untuk connect wallet & cek status.
- **Jangan merombak total** struktur halaman/komponen yang sudah ada; lakukan perubahan terfokus.
- Prioritaskan konsistensi desain (tema gelap yang sudah dipakai) daripada efek rumit.
- Reuse komponen connect yang sudah ada (RainbowKit) daripada membuat mekanisme wallet sendiri.
- Kerjakan bertahap per Tahap; verifikasi tiap tahap sebelum lanjut.
