# Proofly (ProofOfSkill)

> **Decentralized, AI-Evaluated Skill Verification Protocol on BOT Chain**

Proofly transforms tech credentialing from passive "certificates of completion" into dynamic, tamper-proof **Proof of Competence**. Candidates solve uniquely generated real-world case studies evaluated by an autonomous AI Technical Lead, earning non-transferable **Soulbound Token (SBT)** credentials permanently verified on-chain.

🌐 **Live Application:** [https://proofly.my.id](https://proofly.my.id)

---

## 📌 Table of Contents

- [Live Deployment](#live-deployment)
- [Overview](#overview)
- [The Problem & The Solution](#the-problem--the-solution)
- [Core Features](#core-features)
- [Supported Skill Tracks](#supported-skill-tracks)
- [End-to-End Architecture & Workflow](#end-to-end-architecture--workflow)
- [Evaluation Rubric & Scoring](#evaluation-rubric--scoring)
- [Smart Contract Details](#smart-contract-details)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Security & Economic Design](#security--economic-design)

---

## 🌐 Live Deployment

| Resource | URL / Address |
| :--- | :--- |
| **Web App** | [https://proofly.my.id](https://proofly.my.id) |
| **Network** | BOT Chain Mainnet (`Chain ID: 677`) |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Explorer** | [https://scan.botchain.ai](https://scan.botchain.ai) |
| **Smart Contract** | [`0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B`](https://scan.botchain.ai/address/0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B) |

---

## 📖 Overview

Online certifications suffer from a massive credibility deficit: static multiple-choice tests can be searched, code challenges can be leaked, and completion certificates prove attendance rather than competence. Meanwhile, recruiters spend hundreds of engineering hours filtering unverified resumes.

**Proofly** introduces an on-chain, verifiable talent evaluation pipeline:
1. **Dynamic Generation**: Every assessment session generates a novel business scenario with customized datasets.
2. **Economic Anti-Sybil Gating**: Candidates pay a micro-fee (1 BOT) and face an enforced 24-hour on-chain cooldown between failed attempts.
3. **Multi-Dimensional AI Evaluation**: An LLM-powered Technical Lead grades submissions across 4 objective criteria (Logic, Efficiency, Edge Cases, Syntax).
4. **Cryptographic Attestation & SBT Minting**: Passing scores ($\ge 80$) receive an ECDSA signature from the backend signer, allowing the candidate to mint an immutable Soulbound Token (ERC-721).
5. **Instant Portability & Verification**: Credentials can be publicly verified on-chain by recruiters, startups, and DAOs without revealing private personal data.

---

## ⚡ The Problem & The Solution

| The Old Paradigm (Web2 Certificates) | The Proofly Protocol (Web3 Proof-of-Skill) |
| :--- | :--- |
| **Static Question Banks:** Answers easily leaked and copied. | **Dynamic LLM Scenarios:** Unique business problems and schemas per session. |
| **Assessment Fatigue:** Repetitive 4–8 hour coding interviews per company. | **Portable Credential:** Complete once, verifiable everywhere on-chain. |
| **Resume Inflation:** Unverifiable claims requiring costly screening. | **Zero-Trust Verification:** Scores, attempt counts, and timestamps recorded on-chain. |
| **Sybil & Brute-Force Cheating:** Free retries until lucky. | **Economic Stake & Cooldown:** 1 BOT assessment fee + strict 24h on-chain cooldown. |

---

## 🚀 Core Features

- **Dynamic Case Studies:** Tailored business contexts with 3 progressive problem levels (Basic, Intermediate, Advanced).
- **Interactive Code Workspace:** Integrated in-browser editor with live state persistence.
- **Independent AI Technical Lead:** Rigorous rubric evaluation providing structured verdicts, actionable feedback, strengths, and areas for improvement.
- **Cryptographic Backend Attestation:** EIP-191 ECDSA signatures ensure on-chain minting occurs only with verified passing scores.
- **Soulbound Token (ERC-721):** Non-transferable credential bound to the candidate's wallet address.
- **Public Verification Explorer (`/verify`):** Instant verification tool allowing employers to check token validity, recipient address, score, and completion timestamp.
- **Candidate Credential Showcase (`/badges`):** Visual wallet gallery displaying earned SBT badges and metadata.

---

## 🎯 Supported Skill Tracks

Proofly currently supports 3 specialized engineering tracks:

1. **SQL for Data Analytics (Track ID: 1)**
   - *Topics:* Complex aggregations, window functions, CTEs, self-joins, query optimization, and schema analytics.
2. **Python for Data Manipulation (Track ID: 2)**
   - *Topics:* Pandas/Polars operations, missing data imputation, outlier detection, vectorized operations, and pipeline design.
3. **Solidity & Smart Contracts (Track ID: 3)**
   - *Topics:* Reentrancy guards, access control, custom ERC standards, storage optimization, and event logging patterns.

---

## 🔄 End-to-End Architecture & Workflow

```
[ Candidate Wallet ]
       │
       ▼  1. Connect Wallet & Check Cooldown / Certification Status
[ Proofly dApp (Next.js) ] ────► [ Smart Contract (BOT Chain) ]
       │
       ▼  2. Pay 1 BOT Assessment Fee (`startAssessment`)
[ BOT Chain Transaction Confirmed (Attempt +1, Cooldown Clock Starts) ]
       │
       ▼  3. Request Dynamic Assessment (Verifies Tx on-chain)
[ Backend AI Generator (OpenAI Structured Outputs) ]
       │
       ▼  4. Return Business Scenario + 3 Progressive Problems
[ Interactive Candidate Workspace ]
       │
       ▼  5. Submit Solutions
[ Backend AI Evaluator (Multi-Criteria Rubric Engine) ]
       │
   ┌───┴──────────────────────────────┐
   │                                  │
[ Score < 80: Failed ]       [ Score >= 80: Passed ]
   │                                  │
   ▼                                  ▼
Detailed Feedback &            Generate Metadata (IPFS / Pinata)
24-hour Cooldown Enforced      + ECDSA Cryptographic Signature
                                      │
                                      ▼
                               Call `mintCertificate` on Smart Contract
                                      │
                                      ▼
                               [ Soulbound Token (SBT) Issued to Wallet ]
                                      │
                                      ▼
                               [ Publicly Verifiable via /verify ]
```

---

## 📊 Evaluation Rubric & Scoring

Every assessment is evaluated out of **100 points** across four pillars:

- **Logic & Correctness (40 pts):** Does the solution solve the core business problem and return accurate results?
- **Efficiency & Performance (25 pts):** Big-O algorithmic complexity, vectorized operations, query efficiency, or gas optimization.
- **Edge Case Handling (20 pts):** Handling null/empty inputs, unexpected boundaries, overflow, or invalid states.
- **Syntax & Idiomatic Conventions (15 pts):** Clean code standards, formatting, language idioms, and readability.

> **Passing Benchmark:** $\ge 80$ points required to qualify for Soulbound Certificate minting.

---

## 📜 Smart Contract Details

- **Contract Name:** `ProofOfSkillSBT`
- **Token Standard:** ERC-721 (Non-Transferable / Soulbound)
- **Deployed Address:** `0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B`
- **Network:** BOT Chain Mainnet (`Chain ID: 677`)
- **Key Functions:**
  - `startAssessment(uint8 skillId)`: Locks in 1 BOT fee, increments attempts, and activates cooldown.
  - `mintCertificate(uint8 skillId, uint16 score, uint8 attempt, string uri, bytes signature)`: Validates backend ECDSA attestation and mints non-transferable SBT.
  - `getCandidateState(address candidate, uint8 skillId)`: Returns current attempts, last attempt timestamp, and certification status.
  - `getUserCertificate(address candidate, uint8 skillId)`: Fetches token ID and certificate metadata for a candidate.

---

## 🛠 Tech Stack

- **Frontend & App Framework:** [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), TypeScript
- **Styling & UI:** Tailwind CSS, Lucide Icons
- **Web3 & Wallet Layer:** [Wagmi v2](https://wagmi.sh/), [Viem](https://viem.sh/)
- **Smart Contracts:** Solidity `^0.8.37`, [OpenZeppelin Contracts v5](https://openzeppelin.com/contracts/)
- **Development Tooling:** [Hardhat](https://hardhat.org/)
- **AI Engine:** [OpenAI API](https://platform.openai.com/) (GPT models with strict JSON schema validation)
- **Decentralized Storage:** [Pinata](https://www.pinata.cloud/) (IPFS)
- **Deployment:** [Vercel](https://vercel.com/)
- **Target Network:** [BOT Chain](https://botchain.ai) (EVM-compatible Layer-1/2)

---

## 📁 Project Structure

```bash
Proof-Of-Skills/
├── contracts/                  # Solidity smart contracts
│   └── ProofOfSkillSBT.sol     # ERC-721 Soulbound Token with ECDSA verification
├── src/
│   ├── app/
│   │   ├── api/assessment/     # Endpoints for generating & evaluating assessments
│   │   ├── assessment/[skillId]# Dynamic workspace & assessment interface
│   │   ├── badges/             # Candidate credentials showcase
│   │   ├── verify/             # Public certificate verification portal
│   │   └── page.tsx            # Landing page
│   ├── components/             # Reusable UI (Navbar, Editor, Gauges, Panels)
│   ├── lib/
│   │   ├── contract.ts         # Chain definition, ABI, and viem client config
│   │   ├── openai.ts           # OpenAI client integration
│   │   ├── payment-verification.ts # On-chain transaction validation
│   │   └── prompts.ts          # AI system prompts and evaluation rubrics
│   └── types/                  # Data contracts and TypeScript definitions
├── hardhat.config.ts           # Smart contract compilation config
└── README.md
```

---

## 🔐 Security & Economic Design

1. **Replay & Tamper Prevention:** Mint transactions require an ECDSA signature containing the candidate address, skill ID, exact score, and attempt count signed exclusively by the authorized backend key.
2. **Anti-Cheat Randomness:** Case studies are dynamically generated per assessment ID to eliminate answer sharing.
3. **Sybil Resistance:** Financial cost (1 BOT) paired with a 24-hour timeout per attempt eliminates automated brute-force attacks.
4. **Soulbound Enforcement:** Overrides OpenZeppelin's `_update` to reject any transfer of certificates between non-zero addresses.
