# Proofly

Proofly is a decentralized on-chain skill verification platform built on BOT Chain. Candidates solve dynamic AI-generated case studies evaluated by an independent AI Technical Lead, earning Soulbound Token (SBT) certificates upon scoring 80+.

## Features

- **Dynamic Case Studies**: Fresh business problem sets per session generated via AI.
- **On-Chain Assessment Gating**: 1 BOT fee payment verified directly on BOT Chain Mainnet (`startAssessment`).
- **Cooldown & Certification Guards**: 24-hour cooldown per track and single-issuance Soulbound tokens enforced by smart contracts.
- **Independent Evaluation**: Automated multi-criteria rubric evaluation and feedback.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS
- **Web3**: Wagmi, Viem, Hardhat
- **Blockchain**: BOT Chain Mainnet (Chain ID: 677)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_BOT_CHAIN_ID=677
   NEXT_PUBLIC_BOT_CHAIN_RPC=https://rpc.botchain.ai
   NEXT_PUBLIC_BOT_CHAIN_NAME="BOT Chain Mainnet"
   NEXT_PUBLIC_BOT_CHAIN_EXPLORER=https://scan.botchain.ai
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B
   OPENAI_API_KEY=your_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

