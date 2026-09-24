# Issue: Pindah ke Mainnet + Rebrand "Proofly" + Ganti Logo

## Ringkasan

Tiga pekerjaan dalam satu issue, dikerjakan berurutan:

1. **Finalisasi perpindahan testnet → mainnet.** Kontrak sudah di-deploy ke mainnet dan env sudah diarahkan ke mainnet — sisa pekerjaannya membersihkan sisa-sisa "testnet" di kode dan memperkuat keamanan karena sekarang menyangkut dana asli.
2. **Ganti logo**: pakai logo baru dari folder `assets/` untuk branding aplikasi (navbar, favicon, metadata), dan pasang **logo resmi BOT Chain** di footer.
3. **Rebrand nama**: semua penyebutan "Proof of Skill" / "ProofOfSkill" di UI, kode, dan metadata diganti menjadi **"Proofly"** (dengan pengecualian yang dijelaskan di bawah).

Semua temuan di bawah **sudah diinvestigasi dan diverifikasi live** — kerjakan dari sini, jangan investigasi ulang.

---

## Kondisi Terkini (terverifikasi)

### Mainnet: kontrak SUDAH live dan env SUDAH benar
Dibaca langsung dari RPC mainnet (`https://rpc.botchain.ai`, chainId **677**):
- Kontrak ada di alamat yang **sama** dengan testnet: `0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B`. Ini normal — deploy dari wallet + nonce yang sama menghasilkan alamat identik di chain EVM mana pun. Bytecode di mainnet dan testnet terverifikasi **identik**.
- `assessmentFee` = 1 BOT ✓, cooldown = 24 jam ✓, `owner` = `aiSignerAddress` = `0xd109648075DC72F2ADCFeA5b5869cd75188Ba294`.
- `.env.local` sudah berisi konfigurasi mainnet (chainId 677, RPC `rpc.botchain.ai`, explorer `scan.botchain.ai`, nama "BOT Chain Mainnet"). `src/lib/contract.ts` membaca chain config dari env, jadi wagmi otomatis menunjuk mainnet. **Bagian env tidak perlu dikerjakan lagi.**
- Wallet user yang sebelumnya tersambung ke testnet akan di-prompt pindah network oleh alur switch-chain yang sudah ada — pastikan ini benar saat uji manual.

### Sisa-sisa "testnet" yang masih tertanam di kode (harus dibersihkan)
- `src/lib/contract.ts`: flag `testnet: true` hardcoded pada definisi chain; nilai fallback default masih menunjuk testnet (968 / `rpc.bohr.life` / explorer bohr).
- `src/app/assessment/[skillId]/page.tsx`: label UI `(Testnet)` di info network; pesan error menyebut "BOT Chain testnet" (beberapa tempat); **`FAUCET_URL` + copy yang menyuruh user minta token gratis dari faucet** — di mainnet tidak ada faucet, copy ini menyesatkan dan harus diganti (mis. arahan membeli/menyiapkan BOT + gas).
- `src/lib/payment-verification.ts`: pesan error menyebut "BOT Chain testnet".

### Keamanan mainnet (dana asli — wajib diperhatikan)
- **Store anti-replay masih in-memory** (`assessment-store.ts`): restart server menghapus daftar txHash terpakai → membuka jendela replay pembayaran. Kode `payment-verification.ts` sendiri sudah menandai limitasi ini di komentarnya. Untuk mainnet, minimal dokumentasikan risikonya secara eksplisit dan siapkan mitigasi (ideal: store persisten seperti Redis/DB).
- **owner = signer masih satu wallet**: signer adalah hot key backend; kalau jebol, penyerang ikut memegang kendali admin + `withdrawFees()`. Pisahkan lewat `setAiSignerAddress()` (transaksi owner, tanpa redeploy).
- Opsional tapi disarankan: tunggu beberapa konfirmasi blok sebelum menerima pembayaran, dan verifikasi source kontrak di `scan.botchain.ai`.

### Aset logo (sudah ada di folder `assets/`, belum di-track git)
- `assets/logo.png` — logo baru aplikasi: emblem isometrik pita gradien ungu→biru→cyan dengan kartu dokumen di tengah, 1254×1254. **Punya channel alpha tapi latar belakangnya SOLID off-white/abu terang** — di navbar bertema gelap akan terlihat sebagai kotak putih. Perlu diolah dulu (hapus background / jadikan transparan, atau perlakukan sebagai avatar rounded).
- `assets/BOT chain Logo.png` — logo resmi BOT Chain, 1254×1254 RGB (tanpa alpha, latar solid).
- Keduanya ~500 KB — terlalu besar untuk web; resize/kompresi dulu sebelum dipakai (mis. ≤128–256px untuk navbar/footer, kualitas wajar).
- File sumber sudah ada di folder `assets/` pada repo (sudah di-commit). Folder itu tidak di-serve Next.js — versi final hasil olahan yang harus ditaruh di `public/` (atau di-import sebagai modul gambar).

### Tempat branding lama berada
- **Navbar** (`src/components/Navbar.tsx`): ikon `Award` (lucide) dalam kotak gradien + teks "ProofOfSkill" + subtitle "BOT Chain".
- **Footer** (`src/components/Footer.tsx`): teks "Powered by BOT Chain Ecosystem" + badge "B" palsu dalam lingkaran gradien — PRD memang mensyaratkan **logo resmi BOT Chain** di footer, jadi ganti badge palsu itu dengan `BOT chain Logo.png`.
- **Favicon**: `src/app/favicon.ico` masih favicon default Next.js — ganti dari logo baru.
- **Metadata**: `src/app/layout.tsx` title masih "ProofOfSkill a Decentralized AI Skill Verification".

### Di mana nama lama muncul (inventaris untuk rename)
- String user-facing: teks "ProofOfSkill" di Navbar; title metadata di `layout.tsx`; pesan error "ProofOfSkill contract" di `payment-verification.ts` (2 tempat).
- Identifier internal (kosmetik, boleh ikut diganti): `proofOfSkillAbi` di `contract.ts` + pemakainya, nama file `abi/ProofOfSkillSBT.json`, komentar di `types/index.ts` & `assessment-store.ts`.
- Meta project: `package.json` name `proof-of-skills`, `README.md` (masih template create-next-app).
- **Pengecualian — JANGAN diubah**: `contracts/ProofOfSkillSBT.sol` dan isi ABI. Kontrak sudah ter-deploy di testnet & mainnet; nama ERC-721 ("ProofOfSkill Soulbound Certificate" / "POS-SBT") **terbakar permanen di bytecode** dan tidak bisa diganti tanpa redeploy (alamat baru → env baru → SBT yang sudah ter-mint tertinggal di alamat lama). Biarkan apa adanya.

---

## Tahapan Implementasi

### Tahap 1 — Bersihkan sisa testnet di kode
- Ganti semua label/pesan "testnet" menjadi netral atau "mainnet" (sumber daftar ada di bagian Kondisi Terkini). Flag `testnet` di definisi chain wagmi: buat mengikuti env (atau set `false`) — jangan biarkan hardcoded `true`.
- Ganti copy faucet dengan arahan yang benar untuk mainnet (siapkan saldo BOT untuk fee 1 BOT + gas).
- Samakan fallback default di `contract.ts` agar tidak lagi diam-diam menunjuk testnet; idealnya config wajib dari env dan gagal jelas jika tidak ada.

### Tahap 2 — Perkuat keamanan mainnet
- Pisahkan signer dari owner via `setAiSignerAddress()` (wallet signer baru disiapkan pemilik proyek; implementer menyiapkan langkah/verifikasinya, key TIDAK masuk repo).
- Tangani risiko replay store in-memory: minimal dokumentasikan + tambah mitigasi yang realistis untuk deployment saat ini; ideal persisten.
- Opsional: konfirmasi blok ganda sebelum menerima tx; verifikasi source kontrak di explorer.

### Tahap 3 — Siapkan aset & pasang logo baru
- Olah `assets/logo.png`: buat versi transparan/rounded yang cocok untuk tema gelap, resize & kompresi untuk kebutuhan navbar + favicon; simpan hasil final di `public/`.
- Pasang di **Navbar** (menggantikan ikon Award + teks "ProofOfSkill" → logo + teks "Proofly"), **favicon** (generate `.ico` dari logo), dan **metadata** (title → "Proofly …"; rapikan judul yang sekarang kehilangan tanda pisah).
- Pastikan logo terbaca jelas di atas latar gelap navbar, di desktop maupun mobile.

### Tahap 4 — Logo BOT Chain di footer
- Olah `assets/BOT chain Logo.png` (resize/kompresi; perhatikan latarnya solid — perlakukan konsisten dengan logo utama).
- Ganti badge "B" palsu di Footer dengan logo resmi, tautan explorer tetap jalan. Ini sekaligus memenuhi requirement PRD (branding kemitraan: logo resmi + tautan BOT Chain di footer).

### Tahap 5 — Rename "ProofOfSkill" → "Proofly"
- Ganti semua string user-facing dan identifier internal sesuai inventaris di atas; `package.json` name → `proofly`; perbarui `README.md` sekalian (masih template default — tulis singkat apa adanya).
- **Jangan sentuh** `contracts/ProofOfSkillSBT.sol`, ABI, dan apa pun yang sudah ter-deploy on-chain.
- Setelah selesai, grep ulang (`proof of skill`, `proofofskill`, `proof-of-skill`) di `src/`, `package.json`, `README.md` — sisa satu-satunya yang boleh tertinggal adalah kontrak + ABI (+ dokumen historis seperti `PRD.md`, boleh dibiarkan).

### Tahap 6 — Verifikasi
- `npm run lint` dan `npm run build` lolos.
- Uji manual di mainnet (wallet asli, saldo kecil):
  - Network yang diminta wallet = **BOT Chain mainnet (677)**; prompt switch muncul untuk wallet yang masih di network lain.
  - Tidak ada lagi kata "testnet"/"faucet" di UI mana pun.
  - Alur bayar 1 BOT → soal muncul → submit → evaluasi tetap jalan; tx terlihat di `scan.botchain.ai`.
  - Logo Proofly tampil di navbar + favicon + judul tab; logo BOT Chain tampil di footer dengan link benar.
  - Tidak ada sisa nama "ProofOfSkill" di UI.
- Cek mobile & desktop.

---

## Kriteria Selesai (Definition of Done)

- [ ] Kode bebas referensi testnet (label, pesan, flag chain, faucet); aplikasi menunjuk mainnet 677 sepenuhnya lewat env.
- [ ] Signer terpisah dari owner (atau setidaknya langkahnya disiapkan & terdokumentasi); risiko replay in-memory terdokumentasi + mitigasi.
- [ ] Logo baru terpasang di navbar, favicon, dan metadata; logo BOT Chain resmi terpasang di footer; keduanya terkompresi wajar dan terbaca di tema gelap.
- [ ] Semua penyebutan "ProofOfSkill/Proof of Skill" yang user-facing dan level proyek berganti "Proofly"; kontrak & ABI tidak tersentuh.
- [ ] Alur assessment (bayar → kerjakan → evaluasi) teruji di mainnet; `lint` & `build` lolos.
- [ ] Tidak ada secret/key yang masuk commit; `assets/` mentah tidak ikut membebani bundle (versi final di `public/`).

---

## Catatan untuk Implementer

- **Jangan redeploy atau mengubah kontrak.** Yang sudah live di mainnet adalah sumber kebenaran; rename on-chain tidak mungkin tanpa alamat baru dan itu di luar scope issue ini.
- **Jangan mengubah nilai env** — konfigurasi mainnet di `.env.local` sudah benar dan terverifikasi.
- Jangan menambah dependency baru untuk pengolahan gambar; tools bawaan/online atau script sederhana cukup (mis. sharp sudah umum di proyek Next, tapi cek dulu — kalau tidak ada, pakai cara lain tanpa memaksa install).
- Perubahan kosmetik (rename identifier, pindah file ABI) boleh dilakukan asal tidak mengubah perilaku; jalankan build penuh setelahnya.
- Untuk transaksi owner (`setAiSignerAddress`), private key hanya dipakai pemilik proyek di wallet-nya sendiri — implementer tidak boleh meminta, menyimpan, atau menjalankan key itu dari repo.
- Uji mainnet pakai dana kecil; kalau ada langkah yang gagal (RPC, wallet, tx), laporkan jujur — jangan memalsukan keberhasilan atau mengarang txHash.
- Kerjakan bertahap per Tahap, verifikasi tiap tahap sebelum lanjut.
