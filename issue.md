# 🗂️ ProofOfSkill — Master Implementation Plan

> **Project:** ProofOfSkill (PoS) — Decentralized AI-Evaluated Skill Verification Protocol  
> **Repo:** `D:\Project\Proof-Of-Skills`  
> **Deadline:** 25 September 2026, 23:59 WIB  
> **Reference:** [PRD.md](file:///d:/Project/Proof-Of-Skills/PRD.md)
> **GitHub Issue:** [Issue #1](https://github.com/ardiw1123/Proof-Of-Skill/issues/1)

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Tech Stack & Dependensi Utama](#2-tech-stack--dependensi-utama)
3. [Fase 0 — Project Scaffolding & Setup](#fase-0--project-scaffolding--setup)
4. [Fase 1 — Smart Contract (Blockchain Layer)](#fase-1--smart-contract-blockchain-layer)
5. [Fase 2 — Frontend Foundation](#fase-2--frontend-foundation)
6. [Fase 3 — AI Evaluation Engine (API Layer)](#fase-3--ai-evaluation-engine-api-layer)
7. [Fase 4 — Integrasi Frontend ↔ Smart Contract](#fase-4--integrasi-frontend--smart-contract)
8. [Fase 5 — Decentralized Storage & Metadata](#fase-5--decentralized-storage--metadata)
9. [Fase 6 — Halaman Verifikasi Publik](#fase-6--halaman-verifikasi-publik)
10. [Fase 7 — Polish, Testing & Deployment](#fase-7--polish-testing--deployment)
11. [Fase 8 — Submission & Dokumentasi](#fase-8--submission--dokumentasi)
12. [Catatan Penting & Referensi](#catatan-penting--referensi)

---

## 1. Ringkasan Proyek

ProofOfSkill adalah dApp yang memungkinkan kandidat tech membuktikan skill mereka (SQL, Python, Solidity) melalui ujian studi kasus yang di-generate dan di-evaluasi oleh AI. Kandidat yang lulus (skor ≥ 80) mendapatkan **Soulbound Token (SBT)** di BOT Chain sebagai bukti kompetensi permanen yang tidak bisa ditransfer.

### Alur Utama:
1. User connect wallet → pilih skill track → bayar fee 1 BOT token → mulai ujian
2. AI generate soal studi kasus secara dinamis
3. User submit jawaban → AI evaluasi dan kasih skor (0-100)
4. Jika skor ≥ 80 → mint SBT ke wallet user
5. Jika gagal → cooldown 24 jam sebelum bisa coba lagi
6. Rekruter/publik bisa verifikasi badge via halaman `/verify/[walletAddress]`

---

## 2. Tech Stack & Dependensi Utama

| Layer | Teknologi | Keterangan |
|:------|:----------|:-----------|
| **Frontend** | Next.js 14 (App Router) + TypeScript | Framework utama |
| **Styling** | Tailwind CSS + Lucide Icons | UI/UX design system |
| **Web3 Client** | Wagmi + Viem + RainbowKit | Koneksi wallet & interaksi smart contract |
| **State Management** | Zustand | Local state & session |
| **Smart Contract** | Solidity ^0.8.20 | ERC-721 Soulbound Token |
| **Blockchain** | BOT Chain (EVM Compatible) | Target network |
| **AI Engine** | OpenAI GPT-4o API | Generate soal & evaluasi jawaban |
| **Decentralized Storage** | IPFS via Pinata / Web3.Storage | Metadata & badge NFT |
| **Deployment** | Vercel | Hosting frontend + API serverless |

---

## Fase 0 — Project Scaffolding & Setup

**Tujuan:** Inisialisasi project monolith Next.js dan install semua dependensi yang diperlukan.

### Langkah-langkah:

- [ ] **0.1** Inisialisasi project Next.js 14 dengan App Router dan TypeScript di folder `D:\Project\Proof-Of-Skills`. Gunakan perintah `npx create-next-app@latest` dengan opsi:
  - TypeScript: Yes
  - Tailwind CSS: Yes
  - ESLint: Yes
  - App Router: Yes
  - src/ directory: Yes

- [ ] **0.2** Install dependensi Web3:
  ```
  npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
  ```

- [ ] **0.3** Install dependensi lain:
  ```
  npm install zustand lucide-react openai ethers
  ```

- [ ] **0.4** Install dev dependensi untuk smart contract:
  ```
  npm install -D hardhat @openzeppelin/contracts @nomicfoundation/hardhat-toolbox
  ```

- [ ] **0.5** Setup struktur folder project:
  ```
  src/
  ├── app/                    # Next.js App Router pages
  │   ├── layout.tsx          # Root layout
  │   ├── page.tsx            # Landing/Dashboard
  │   ├── assessment/
  │   │   └── [skillId]/
  │   │       └── page.tsx    # Assessment Studio
  │   ├── badges/
  │   │   └── page.tsx        # My Badges page
  │   ├── verify/
  │   │   └── [wallet]/
  │   │       └── page.tsx    # Public Verification page
  │   └── api/
  │       ├── assessment/
  │       │   ├── generate/route.ts
  │       │   └── evaluate/route.ts
  │       └── metadata/
  │           └── [tokenId]/route.ts
  ├── components/             # Reusable UI components
  ├── hooks/                  # Custom React hooks
  ├── lib/                    # Utilities, constants, config
  ├── providers/              # Context providers (Web3, etc.)
  ├── stores/                 # Zustand stores
  └── types/                  # TypeScript types/interfaces
  contracts/
  ├── ProofOfSkillSBT.sol     # Smart contract
  └── ...
  ```

- [ ] **0.6** Buat file `.env.local` dengan variabel environment:
  ```
  OPENAI_API_KEY=
  SIGNER_PRIVATE_KEY=          # Private key untuk ECDSA signature
  NEXT_PUBLIC_CONTRACT_ADDRESS= # Setelah deploy contract
  NEXT_PUBLIC_BOT_CHAIN_RPC=    # RPC URL BOT Chain
  NEXT_PUBLIC_BOT_CHAIN_ID=     # Chain ID BOT Chain
  PINATA_API_KEY=
  PINATA_SECRET_API_KEY=
  ```

- [ ] **0.7** Setup konfigurasi Tailwind CSS sesuai design system PRD (warna, font):
  - Background: `#0A0E17`, Surface: `#131B2E`, Border: `#1E293B`
  - Primary: `#38BDF8`, Success: `#10B981`, Warning: `#F59E0B`
  - Text: `#F8FAFC` (primary), `#94A3B8` (secondary)
  - Font: Inter (body), JetBrains Mono (code editor)

---

## Fase 1 — Smart Contract (Blockchain Layer)

**Tujuan:** Buat, test, dan deploy smart contract `ProofOfSkillSBT.sol` ke BOT Chain.

### Langkah-langkah:

- [ ] **1.1** Buat smart contract `ProofOfSkillSBT.sol` mengikuti spesifikasi di PRD Section 6. Contract harus:
  - Extend ERC-721 dari OpenZeppelin
  - Implement struct `Certificate` dan `CandidateState` sesuai PRD
  - Implement fungsi `startAssessment(uint8 skillId)` — bayar fee, catat attempt & cooldown
  - Implement fungsi `mintCertificate(...)` — verifikasi ECDSA signature, mint SBT
  - Override fungsi `_update()` untuk memblokir transfer (Soulbound)
  - Implement getter publik: `getCandidateState()`, `getCertificate()`
  - State variable: `assessmentFee`, `COOLDOWN_PERIOD = 24 hours`, `aiSignerAddress`
  - Event: `AssessmentStarted`, `CertificateIssued`

- [ ] **1.2** Tulis unit test untuk contract:
  - Test `startAssessment`: bayar fee, cooldown enforcement, double certification prevention
  - Test `mintCertificate`: valid signature, invalid signature, score < 80 ditolak
  - Test Soulbound: transfer antar wallet harus revert

- [ ] **1.3** Setup Hardhat config untuk BOT Chain network (RPC, chain ID, deployer account)

- [ ] **1.4** Buat deployment script (`scripts/deploy.ts`)

- [ ] **1.5** Deploy contract ke BOT Chain Testnet, lalu verify di block explorer

- [ ] **1.6** Catat contract address yang sudah dideploy ke `.env.local`

---

## Fase 2 — Frontend Foundation

**Tujuan:** Bangun layout dasar, koneksi wallet, dan komponen UI utama.

### Langkah-langkah:

- [ ] **2.1** Setup Web3 Provider:
  - Buat `providers/Web3Provider.tsx` yang wrapping RainbowKit + Wagmi + React Query
  - Konfigurasi custom chain untuk BOT Chain (chain ID, RPC, native currency, block explorer)
  - Integrasikan provider di `app/layout.tsx`

- [ ] **2.2** Buat komponen **Navbar**:
  - Logo "ProofOfSkill (PoS)" di kiri
  - Menu navigasi: Assessments, My Badges, Verify Profile
  - Tombol Connect Wallet (dari RainbowKit) di kanan
  - Indikator network (BOT Chain)

- [ ] **2.3** Buat komponen **Footer**:
  - Teks "Powered by BOT Chain Ecosystem"
  - Logo resmi BOT Chain dengan link ke situs resmi
  - Ini **wajib** ada untuk compliance hackathon

- [ ] **2.4** Buat halaman **Dashboard / Assessment Catalog** (`app/page.tsx`):
  - Hero section singkat (judul + deskripsi ProofOfSkill)
  - 3 buah **Assessment Card** untuk setiap skill track:
    - **Track 1:** SQL for Data Analytics
    - **Track 2:** Python for Data Manipulation
    - **Track 3:** Solidity & Smart Contract
  - Setiap card menampilkan: nama skill, deskripsi singkat, ikon/ilustrasi, status (belum diambil / cooldown / tersertifikasi), dan tombol "Mulai Ujian (1 BOT)"
  - Status card dibaca dari state smart contract (via Wagmi hooks)

- [ ] **2.5** Buat halaman **My Badges** (`app/badges/page.tsx`):
  - Tampilkan semua SBT yang dimiliki oleh wallet yang terkoneksi
  - Setiap badge menampilkan: nama skill, skor, attempt ke-berapa, tanggal mint
  - Jika belum punya badge, tampilkan empty state

- [ ] **2.6** Apply **design system dark mode** sesuai PRD Section 9.1:
  - Background gelap (#0A0E17), card surface (#131B2E)
  - Warna aksen neon (cyber sky blue, emerald green)
  - Font Inter untuk body, JetBrains Mono untuk code
  - Micro-animation & hover effects untuk feel Web3 modern

---

## Fase 3 — AI Evaluation Engine (API Layer)

**Tujuan:** Buat serverless API endpoints untuk generate soal dan evaluasi jawaban menggunakan OpenAI GPT-4o.

### Langkah-langkah:

- [ ] **3.1** Buat API route `POST /api/assessment/generate` (`app/api/assessment/generate/route.ts`):
  - Terima `walletAddress` dan `skillId` dari request body
  - Buat system prompt sesuai PRD Section 7.2 (Dynamic Question Generator)
  - Panggil OpenAI GPT-4o API dengan temperature rendah (~0.3) untuk generate soal studi kasus
  - Parse response JSON dari AI
  - Generate `sessionId` unik dan simpan soal ke memory/store (untuk validasi saat evaluate)
  - Return response sesuai format PRD Section 8.1

- [ ] **3.2** Buat API route `POST /api/assessment/evaluate` (`app/api/assessment/evaluate/route.ts`):
  - Terima `sessionId`, `walletAddress`, `skillId`, dan `solutionText`
  - Ambil soal asli berdasarkan `sessionId`
  - Buat evaluation prompt sesuai PRD Section 7.3 (Rubrik penilaian 4 dimensi)
  - Panggil OpenAI GPT-4o API dengan temperature 0.1 untuk konsistensi evaluasi
  - Parse response JSON dan validasi schema
  - **Jika skor ≥ 80:**
    - Generate ECDSA signature dari `(walletAddress, skillId, score, attempt)` menggunakan `SIGNER_PRIVATE_KEY`
    - Return response dengan `mintAuthorization` (signature + tokenURI)
  - **Jika skor < 80:**
    - Return response dengan feedback detail dan `cooldownUntil`

- [ ] **3.3** Buat utility function untuk ECDSA signing:
  - File: `lib/signer.ts`
  - Fungsi yang menerima data (wallet, skillId, score, attempt) dan menandatangani menggunakan private key
  - Signature harus compatible dengan `ECDSA.recover` di smart contract

- [ ] **3.4** Buat API route `GET /api/metadata/[tokenId]` (`app/api/metadata/[tokenId]/route.ts`):
  - Return metadata JSON standar ERC-721 (name, description, image, attributes)
  - Attributes meliputi: skill name, score, attempt, completion date
  - Ini digunakan sebagai fallback jika IPFS belum tersedia

---

## Fase 4 — Integrasi Frontend ↔ Smart Contract

**Tujuan:** Hubungkan alur UI dengan smart contract dan API sehingga flow end-to-end berjalan.

### Langkah-langkah:

- [ ] **4.1** Buat custom hooks Wagmi untuk interaksi dengan contract:
  - `useContractABI()` — load ABI contract
  - `useCandidateState(walletAddress, skillId)` — baca status kandidat (attempts, cooldown, isCertified)
  - `useStartAssessment(skillId)` — panggil `startAssessment()` dengan pembayaran fee
  - `useMintCertificate(...)` — panggil `mintCertificate()` dengan signature dari API

- [ ] **4.2** Buat halaman **Assessment Studio** (`app/assessment/[skillId]/page.tsx`):
  - **Layout dua panel:**
    - Panel Kiri: Tampilkan skenario bisnis, skema data, dan instruksi dari soal yang di-generate
    - Panel Kanan: Code/Query editor (bisa pakai textarea dengan monospace font, atau integrasikan library code editor seperti Monaco/CodeMirror jika sempat)
  - **Alur di halaman ini:**
    1. Saat masuk, panggil `startAssessment()` di contract (bayar fee)
    2. Setelah transaksi sukses, panggil `/api/assessment/generate` untuk ambil soal
    3. User menulis jawaban di editor
    4. Klik "Submit for AI Review" → panggil `/api/assessment/evaluate`
    5. Tampilkan hasil evaluasi (skor, breakdown, feedback)

- [ ] **4.3** Buat komponen **Evaluation Result Modal/Section**:
  - Loading state: animasi "AI Lead is analyzing your submission..."
  - Skor gauge melingkar (0-100) dengan warna sesuai range
  - Breakdown 4 metrik rubrik (logic, efficiency, edge cases, syntax)
  - Feedback tertulis dari AI
  - Jika lulus: Tombol "Mint Soulbound Badge on BOT Chain" → trigger `mintCertificate()`
  - Jika gagal: Tampilkan notifikasi cooldown 24 jam

- [ ] **4.4** Integrate flow state di Dashboard:
  - Update status card Assessment berdasarkan on-chain state (cooldown timer, certified badge)
  - Tampilkan countdown timer jika user sedang dalam cooldown
  - Disable tombol "Mulai Ujian" jika sudah certified atau dalam cooldown

---

## Fase 5 — Decentralized Storage & Metadata

**Tujuan:** Upload metadata dan badge image ke IPFS untuk setiap SBT yang di-mint.

### Langkah-langkah:

- [ ] **5.1** Buat utility function untuk upload ke IPFS (via Pinata API):
  - File: `lib/ipfs.ts`
  - Fungsi `uploadMetadataToIPFS(metadata)` → return IPFS URI (`ipfs://...`)
  - Fungsi `uploadImageToIPFS(imageBuffer)` → return IPFS URI

- [ ] **5.2** Buat generator badge image:
  - Buat SVG badge template yang menampilkan: nama skill, skor, tanggal, branding PoS
  - Bisa generate secara server-side di API route evaluate (sebelum mint)
  - Upload badge SVG ke IPFS

- [ ] **5.3** Buat metadata JSON standar ERC-721:
  ```json
  {
    "name": "ProofOfSkill - SQL for Data Analytics",
    "description": "Soulbound certificate verifying competence in SQL for Data Analytics with score 88/100",
    "image": "ipfs://...(badge SVG)...",
    "attributes": [
      { "trait_type": "Skill", "value": "SQL for Data Analytics" },
      { "trait_type": "Score", "value": 88 },
      { "trait_type": "Attempt", "value": 1 },
      { "trait_type": "Date", "value": "2026-09-22" }
    ]
  }
  ```
  Upload metadata JSON ini ke IPFS dan gunakan URI-nya sebagai `tokenURI` saat mint.

- [ ] **5.4** Integrasikan upload IPFS ke flow evaluate API:
  - Setelah AI evaluation selesai dan skor ≥ 80, otomatis generate badge + metadata → upload ke IPFS → sertakan `tokenURI` di response `mintAuthorization`

---

## Fase 6 — Halaman Verifikasi Publik

**Tujuan:** Buat halaman publik dimana siapa saja bisa memverifikasi credential seseorang berdasarkan wallet address.

### Langkah-langkah:

- [ ] **6.1** Buat halaman `/verify/[wallet]` (`app/verify/[wallet]/page.tsx`):
  - Baca semua SBT yang dimiliki oleh wallet address dari smart contract
  - Tampilkan header profil (wallet address, jumlah badge)
  - Tampilkan galeri badge/lencana yang dimiliki

- [ ] **6.2** Buat komponen **Badge Detail Modal**:
  - Saat badge diklik, tampilkan detail: nama skill, skor, percobaan ke-N, tanggal ujian
  - Link ke transaction hash di block explorer BOT Chain
  - Link ke metadata di IPFS

- [ ] **6.3** Tambahkan fitur **search/input wallet address** di halaman Verify:
  - User bisa navigate ke `/verify` dan memasukkan wallet address manual
  - Atau langsung akses via URL `/verify/0x123...`

- [ ] **6.4** Buat empty state jika wallet belum memiliki badge apapun

---

## Fase 7 — Polish, Testing & Deployment

**Tujuan:** Pastikan semua berjalan baik, UI polished, dan deploy ke production.

### Langkah-langkah:

- [ ] **7.1** End-to-end testing manual:
  - Connect wallet → pilih skill → bayar fee → dapatkan soal → submit jawaban → lihat hasil → mint SBT
  - Test cooldown enforcement (coba ujian ulang sebelum 24 jam)
  - Test verifikasi badge di halaman verify
  - Test dengan wallet berbeda

- [ ] **7.2** UI/UX Polish:
  - Pastikan semua loading state ditangani (skeleton, spinner, dll)
  - Error handling yang user-friendly (wallet not connected, insufficient balance, tx failed, dll)
  - Responsive design (mobile & desktop)
  - Smooth animations dan transitions

- [ ] **7.3** Security checklist:
  - API key OpenAI HANYA di server-side (jangan pernah expose ke client)
  - Signer private key HANYA di server-side environment variable
  - Validasi input di semua API routes
  - Rate limiting di API routes (opsional tapi recommended)

- [ ] **7.4** Deploy ke Vercel:
  - Push ke GitHub repository (publik)
  - Connect repo ke Vercel
  - Set semua environment variables di Vercel dashboard
  - Deploy dan verifikasi di live domain

- [ ] **7.5** Pastikan contract sudah terverifikasi di BOT Chain block explorer

---

## Fase 8 — Submission & Dokumentasi

**Tujuan:** Lengkapi semua syarat submission hackathon.

### Langkah-langkah:

- [ ] **8.1** Tulis `README.md` yang komprehensif:
  - Deskripsi project
  - Tech stack
  - Setup & installation guide
  - Arsitektur sistem
  - Smart contract address & link explorer
  - Live demo URL
  - Screenshot/GIF demo
  - Tim (Ardi Gunawan Pratama & Azel)

- [ ] **8.2** Compliance 7 syarat hackathon (PRD Section 2.3):
  1. ✅ Smart contract address di BOT Chain (verified)
  2. ✅ Live domain accessible publik
  3. ✅ GitHub repo publik
  4. ⬜ Post di X/Twitter dengan mention @BOTChain_ai
  5. ⬜ Aktivitas akun X memenuhi syarat
  6. ⬜ Artikel rilis produk di Mirror/Medium
  7. ✅ Logo & link BOT Chain di footer

- [ ] **8.3** Rekam video demo produk (2-3 menit) yang mencakup:
  - Connect wallet
  - Mulai assessment
  - Submit dan dapatkan hasil AI evaluation
  - Mint SBT
  - Verifikasi badge di halaman publik

---

## Catatan Penting & Referensi

### ⚠️ Hal yang Perlu Diperhatikan

1. **BOT Chain Network Config:**
   - Cari dan konfirmasi RPC URL, Chain ID, native currency, dan block explorer URL dari dokumentasi resmi BOT Chain
   - Pastikan MetaMask bisa ditambahkan network BOT Chain

2. **ECDSA Signature Compatibility:**
   - Signature yang dihasilkan backend HARUS bisa diverifikasi oleh smart contract menggunakan `ECDSA.recover` dari OpenZeppelin
   - Test ini secara terpisah sebelum integrasi penuh

3. **OpenAI API:**
   - Gunakan model `gpt-4o` 
   - Temperature rendah (0.1) untuk evaluasi, sedikit lebih tinggi (0.3) untuk generate soal
   - Selalu enforce JSON output mode
   - Handle error/timeout gracefully

4. **Cost & Rate Limiting:**
   - OpenAI API ada rate limit dan biaya per token
   - Pertimbangkan caching soal yang sudah digenerate (untuk development/testing)
   - Jangan panggil API tanpa validasi input terlebih dahulu

5. **Soulbound Token:**
   - SBT TIDAK BISA ditransfer — pastikan override `_update()` bekerja dengan benar
   - User hanya bisa punya 1 SBT per skill track

### 📎 Referensi Utama

- [PRD.md](file:///d:/Project/Proof-Of-Skills/PRD.md) — Spesifikasi lengkap produk
- [OpenZeppelin ERC-721 Docs](https://docs.openzeppelin.com/contracts/5.x/erc721)
- [Wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Pinata IPFS API](https://docs.pinata.cloud/)

---

> **Dokumen ini adalah panduan implementasi tingkat tinggi.** Setiap fase bisa dikerjakan secara berurutan. Untuk detail spesifikasi (struct, prompt AI, API schema, dll), selalu rujuk ke [PRD.md](file:///d:/Project/Proof-Of-Skills/PRD.md).
