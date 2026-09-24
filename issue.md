# Issue: Bayar 1 BOT Token untuk Mengakses Assessment (Testnet)

## Ringkasan

User harus membayar **1 BOT token** untuk bisa mengakses dan mengerjakan assessment. Saat ini assessment hanya dibatasi connect wallet + cooldown 24 jam, tanpa pembayaran.

**Konteks penting — kondisi sudah berubah sejak rencana awal:**
- Kontrak **sudah di-deploy ke testnet** dan sudah diverifikasi on-chain (lihat di bawah). Jadi pekerjaan deployment **tidak diperlukan lagi**.
- Sisa pekerjaan adalah **menyambungkan frontend/backend ke kontrak yang sudah live** dan menegakkan pembayaran di sisi server.

Semua fakta di bawah **sudah diinvestigasi dan diverifikasi live** — kerjakan dari sini, jangan investigasi ulang.

---

## Kondisi Terkini (terverifikasi on-chain & di kode)

### Kontrak sudah LIVE di testnet — jangan deploy ulang
Dibaca langsung dari RPC testnet (`https://rpc.bohr.life`, chainId **968**):
- Alamat: `0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B` — `eth_getCode` mengembalikan bytecode (kontrak ada; di mainnet 677 alamat ini kosong).
- `name()` / `symbol()` = "ProofOfSkill Soulbound Certificate" / "POS-SBT" → cocok persis dengan `contracts/ProofOfSkillSBT.sol`.
- `assessmentFee()` = **1.0 BOT** (1e18 wei) ✓
- `COOLDOWN_PERIOD()` = **86400 detik = 24 jam** ✓
- `owner()` dan `aiSignerAddress()` = `0xd109648075DC72F2ADCFeA5b5869cd75188Ba294` (satu wallet yang sama, non-zero — deployer sekaligus signer).

Artinya: kontrak pembayaran **siap pakai**. Jangan mengubah/menulis ulang kontrak untuk fitur ini kecuali ada alasan kuat yang dijelaskan lebih dulu.

### Logika pembayaran sudah ada di kontrak
`startAssessment(uint8 skillId) external payable`:
- menolak jika `msg.value != assessmentFee` (harus tepat 1 BOT),
- menolak jika sudah bersertifikat untuk skill itu,
- menolak jika masih dalam cooldown 24 jam,
- lalu `currentAttempts += 1`, set `lastAttemptTime`, emit `AssessmentStarted`.
Pembayaran = **native value** (`value: parseEther('1')`), **BUKAN** ERC-20 approve/transfer. PRD 6.1 mengonfirmasi: "Native BOT Token".

### Frontend BELUM tersambung ke kontrak sama sekali (terverifikasi)
- Nol import `viem`/`ethers` di `src/`, tidak ada file ABI, tidak ada pemanggilan kontrak. Yang dipakai baru `useAccount`/`useConnect`/`useDisconnect`.
- `viem@2.56.8` dan `ethers@6.17.0` **sudah terpasang** sebagai dependency tapi menganggur. Pakai yang sudah ada (viem pasangan natural wagmi), jangan tambah library baru.
- `Web3Provider.tsx` masih di-set ke **Sepolia**, bukan BOT Chain testnet.

### ⚠️ KRITIS — konfigurasi env ada di file yang salah
- Variabel kontrak/chain sudah diisi, tapi di **`.env.example`**. Next.js **TIDAK** membaca `.env.example` — ia membaca **`.env.local`** (dan `.env`). Saat ini `.env.local` **hanya** berisi `OPENAI_API_KEY`.
- Konsekuensi: meskipun `.env.example` sudah lengkap, aplikasi **tidak akan** melihat alamat kontrak / chain config sampai nilainya dipindahkan ke `.env.local`.
- Kode pun saat ini membaca hampir nol dari variabel ini: hanya `NEXT_PUBLIC_BOT_CHAIN_EXPLORER` yang dipakai (`Footer.tsx`). `NEXT_PUBLIC_CONTRACT_ADDRESS`, `*_RPC`, `*_ID`, `*_NAME`, `SIGNER_PRIVATE_KEY`, `DEPLOYER_PRIVATE_KEY` **belum dibaca kode** — menyambungkannya adalah bagian dari pekerjaan ini.

### ⚠️ KEAMANAN — secret asli masuk ke `.env.example`
- `.env.example` sekarang berisi nilai ASLI: `OPENAI_API_KEY=*** private key signer & deployer.
- File ini memang sedang ter-gitignore (`.env*`) sehingga belum ikut ter-commit — **tapi** `.env.example` secara konvensi adalah file template yang *boleh* dishare/di-commit. Menaruh secret asli di sana berbahaya.
- Perbaiki: secret asli (private key, API key) **hanya** di `.env.local`; kembalikan `.env.example` ke placeholder. Jangan pernah menaruh private key di variabel `NEXT_PUBLIC_*` (ikut ter-bundle ke browser).

### Dua sumber kebenaran cooldown masih bertentangan
- Kontrak: cooldown 24 jam per **(wallet, skillId)**, on-chain, tahan restart.
- Server (`src/lib/assessment-store.ts`): cooldown 24 jam per **wallet global**, in-memory (hilang saat restart).
- Dibiarkan bersamaan → bug nyata: user bayar track Solidity tapi ditolak server karena 20 jam lalu mengerjakan track SQL. Harus disatukan (Tahap 4).

### Celah keamanan yang wajib ditutup
Soal dibuat oleh `POST /api/assessment/generate` tanpa cek pembayaran. Jika pembayaran hanya dipasang di tombol frontend, user bisa memanggil API langsung lewat console dan **dapat soal gratis**. Pembayaran harus diverifikasi server-side (prinsip sama seperti limit 24 jam di issue #11).

---

## Tahapan Implementasi

### Tahap 0 — Bereskan konfigurasi env (prasyarat, lakukan pertama)
- Pindahkan nilai kontrak & chain dari `.env.example` ke **`.env.local`** agar benar-benar dibaca Next.js. Untuk testnet:
  - `NEXT_PUBLIC_CONTRACT_ADDRESS=0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B`
  - `NEXT_PUBLIC_BOT_CHAIN_ID=968`, `NEXT_PUBLIC_BOT_CHAIN_RPC=https://rpc.bohr.life`
  - `NEXT_PUBLIC_BOT_CHAIN_NAME` (label UI, bebas mis. "BOT Chain Testnet"), `NEXT_PUBLIC_BOT_CHAIN_EXPLORER=https://scan.bohr.life`
- Kembalikan `.env.example` ke **placeholder** (tanpa secret asli). Secret asli hanya di `.env.local`.
- Verifikasi nilai chain dari sumber resmi BOT Chain, jangan percaya angka lama: testnet = **968** (`rpc.bohr.life`, explorer `scan.bohr.life`, faucet `faucet.botchain.ai/basic`); mainnet = **677** (`rpc.botchain.ai`, explorer `scan.botchain.ai`) — dipakai nanti saat pindah mainnet.
- Catat: signing evaluasi (`SIGNER_PRIVATE_KEY`) belum dipakai sampai flow mint SBT dibangun; tidak menghalangi fitur pembayaran ini.

### Tahap 1 — Sambungkan frontend ke BOT Chain testnet
- Daftarkan BOT Chain testnet sebagai custom chain di konfigurasi wagmi (id 968, RPC, native currency "BOT", explorer `scan.bohr.life`), menggantikan Sepolia di `Web3Provider.tsx`.
- Buat satu modul kontrak kecil (mis. `src/lib/contract.ts`) yang membaca `NEXT_PUBLIC_CONTRACT_ADDRESS` + ABI `ProofOfSkillSBT` dari hasil compile (ekspor ABI ke modul, jangan copy-paste manual yang bisa basi).
- Tambahkan penanganan switch/add network: jika wallet user di chain lain, arahkan pindah ke BOT Chain testnet dengan pesan jelas; jangan biarkan transaksi gagal misterius. Indikator chain di navbar harus menampilkan BOT Chain.

### Tahap 2 — Alur pembayaran di halaman assessment
- Ubah alur jadi: klik **Start assessment** → wallet mengirim `startAssessment(skillId)` dengan `value` = 1 BOT → tunggu konfirmasi → **baru** soal di-generate.
- Label biaya jelas pada tombol/CTA (mis. "Start assessment — 1 BOT"), Bahasa Inggris (issue #15 menetapkan semua teks user-facing EN).
- Tangani semua keadaan dengan pesan manusiawi (EN): pending, user menolak di wallet, saldo kurang, network salah, cooldown on-chain aktif, sudah bersertifikat, transaksi gagal. Jangan biarkan user terjebak spinner.
- Sertakan link explorer (`scan.bohr.life`) untuk tx yang dikirim.
- Ingatkan di pesan "saldo kurang": user butuh saldo native untuk **gas** selain 1 BOT untuk fee.

### Tahap 3 — Verifikasi pembayaran di server (inti keamanan, jangan dilewati)
- Sebelum `/api/assessment/generate` membuat soal, server memastikan wallet ini benar-benar sudah membayar untuk attempt ini.
- Rancang tahan-forgery & tahan-replay: frontend mengirim **transaction hash**, server memverifikasinya ke chain (alamat tujuan = kontrak, pengirim = wallet pemohon, `value` = 1 BOT, fungsi = `startAssessment`, status sukses), lalu **mencatat hash yang sudah dipakai** agar satu pembayaran tidak bisa dipakai ambil soal berulang kali.
- Tolak dengan status HTTP jelas bila verifikasi gagal. Semua keputusan di server; jangan percaya klaim client.
- Tulis batasan pendekatan di komentar kode (ketergantungan RPC, penguatan untuk produksi, state in-memory hilang saat restart).

### Tahap 4 — Satukan sumber kebenaran cooldown
- Jadikan **kontrak** sumber kebenaran cooldown (on-chain, per wallet+skill, tahan restart); persempit/hilangkan peran store server yang memblokir lintas track.
- Pastikan layar cooldown yang ada (countdown HH:MM:SS dari #15) tetap berfungsi, mengambil sisa waktu dari sumber yang benar.
- Jangan sampai ada dua penolakan berbeda (on-chain vs server) dengan pesan membingungkan.

### Tahap 5 — Test & verifikasi
- Test kontrak minimal untuk `startAssessment`: fee benar diterima; fee salah ditolak; cooldown ditolak; sudah bersertifikat ditolak. Folder `test/` belum ada — buat (`chai` sudah ada di devDependencies).
- Uji end-to-end manual di **testnet** dengan wallet sungguhan yang sudah diisi tBOT dari faucet (`faucet.botchain.ai/basic`):
  - Saldo cukup → bayar 1 BOT → tx sukses → soal muncul → bisa dikerjakan sampai submit/evaluasi.
  - Cek event `AssessmentStarted` tercatat di `scan.bohr.life`.
  - Saldo kurang → pesan jelas, soal tidak muncul.
  - Tolak tx di wallet → UI pulih, tidak terkunci.
  - Panggil API langsung tanpa bayar / pakai ulang txHash yang sama → **ditolak server**.
  - Attempt kedua < 24 jam → ditolak dengan sisa waktu benar.
- `npm run lint` dan `npm run build` lolos tanpa error baru.

---

## Kriteria Selesai (Definition of Done)

- [ ] Nilai kontrak/chain berada di `.env.local` (bukan `.env.example`) dan benar-benar terbaca aplikasi; `.env.example` kembali ke placeholder tanpa secret.
- [ ] Frontend tersambung ke BOT Chain **testnet** (968) dengan penanganan switch network yang jelas; alamat kontrak `0x9EBe…585B` dipakai.
- [ ] User harus membayar 1 BOT (native `msg.value`) dan tx terkonfirmasi sebelum soal bisa diakses.
- [ ] Server menolak permintaan soal tanpa pembayaran valid — termasuk pemanggilan API langsung dan pemakaian ulang txHash yang sama.
- [ ] Cooldown satu sumber kebenaran (kontrak); tidak ada penolakan ganda yang membingungkan.
- [ ] Semua keadaan gagal punya pesan EN yang jelas (saldo kurang, ditolak user, cooldown, network salah).
- [ ] Ada test kontrak untuk logika pembayaran; `lint` & `build` lolos.

---

## Catatan untuk Implementer

- **Jangan deploy ulang / mengubah kontrak** — sudah live & terverifikasi di testnet. Kalau merasa perlu ubah kontrak, jelaskan alasannya dulu.
- **Jangan menambah dependency baru** — viem/ethers, wagmi, RainbowKit, hardhat, chai sudah terpasang.
- Pembayaran = **native value**, bukan ERC-20. Jangan membangun alur approve/transfer ERC-20.
- **Jangan pernah** men-commit private key / menaruhnya di `NEXT_PUBLIC_*`. Secret hanya di `.env.local`.
- Saat ini `owner()` dan `aiSignerAddress()` adalah **wallet yang sama** (`0xd1096…Ba294`) — bisa begitu karena kontrak memakai `Ownable(msg.sender)` dan deployer juga dipakai sebagai signer. Ini wajar untuk testnet. Untuk **mainnet** pertimbangkan memisahkan: signer adalah "hot key" backend yang rawan; jika jebol sekaligus owner, penyerang ikut memegang kendali admin + `withdrawFees()`. Bisa dipisah tanpa redeploy: `setAiSignerAddress(newSigner)` dan `transferOwnership(newOwner)`.
- Untuk testnet sekarang: chainId **968**, RPC `https://rpc.bohr.life`, explorer `https://scan.bohr.life`, faucet `https://faucet.botchain.ai/basic`. (Mainnet nanti: 677 / `rpc.botchain.ai` / `scan.botchain.ai`.)
- `hardhat.config.ts` belum punya `networks` dan belum ada `scripts/`. Hanya diperlukan bila butuh redeploy/interaksi via hardhat; fitur ini utamanya wiring frontend+server ke kontrak live, jadi deployment bukan prasyarat.
- Store in-memory server hilang saat restart & tidak shared antar instance — kalau dipakai untuk state pembayaran, itu celah; catat batasannya, jangan diam-diam.
- Kalau ada langkah yang gagal (mis. RPC/faucet tidak bisa dipakai), **jangan memalsukan** keberhasilan atau mengarang txHash/alamat. Laporkan hambatannya jujur dan berhenti di tahap itu.
- Kerjakan bertahap per Tahap, verifikasi tiap tahap sebelum lanjut. **Tahap 0 dan Tahap 3** adalah yang paling menentukan keberhasilan & keamanan — jangan dilewati demi tampilan.
