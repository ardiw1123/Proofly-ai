import { createPublicClient, defineChain, http, type Abi, type Address } from 'viem';
import proofOfSkillAbiJson from './abi/ProofOfSkillSBT.json';

export const BOT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_BOT_CHAIN_ID ?? 677);
export const BOT_CHAIN_NAME = process.env.NEXT_PUBLIC_BOT_CHAIN_NAME ?? 'BOT Chain Mainnet';
export const BOT_CHAIN_RPC = process.env.NEXT_PUBLIC_BOT_CHAIN_RPC ?? 'https://rpc.botchain.ai';
export const BOT_CHAIN_EXPLORER = process.env.NEXT_PUBLIC_BOT_CHAIN_EXPLORER ?? 'https://scan.botchain.ai/';
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  '0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B') as Address;

export const botChain = defineChain({
  id: BOT_CHAIN_ID,
  name: BOT_CHAIN_NAME,
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [BOT_CHAIN_RPC],
    },
    public: {
      http: [BOT_CHAIN_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOT Scan',
      url: BOT_CHAIN_EXPLORER,
    },
  },
  testnet: false,
});

export const proofOfSkillAbi = proofOfSkillAbiJson as Abi;

export const ASSESSMENT_FEE_BOT = '1';
export const ASSESSMENT_FEE_WEI = BigInt('1000000000000000000'); // 1 BOT (18 decimals)
export const COOLDOWN_PERIOD_SECONDS = 86400; // 24 hours

export function getExplorerTxUrl(txHash: string): string {
  const base = BOT_CHAIN_EXPLORER.replace(/\/+$/, '');
  return `${base}/tx/${txHash}`;
}

export interface CandidateOnChainState {
  currentAttempts: number;
  lastAttemptTime: number; // Unix timestamp in seconds
  isCertified: boolean;
  isCooldownActive: boolean;
  cooldownUntil: number; // Unix timestamp in seconds
  remainingMs: number;
}

export function getPublicClient() {
  const rpcUrl =
    process.env.BOT_CHAIN_RPC ||
    process.env.NEXT_PUBLIC_BOT_CHAIN_RPC ||
    'https://rpc.botchain.ai';

  return createPublicClient({
    chain: botChain,
    transport: http(rpcUrl),
  });
}

/**
 * Fetches the on-chain candidate progress for a specific skill track.
 * Single source of truth for cooldown and certification status.
 */
export async function fetchCandidateState(
  walletAddress: Address,
  skillId: number,
): Promise<CandidateOnChainState> {
  const client = getPublicClient();

  const res = (await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: proofOfSkillAbi,
    functionName: 'getCandidateState',
    args: [walletAddress, skillId],
  })) as
    | { currentAttempts: number; lastAttemptTime: bigint; isCertified: boolean }
    | [number, bigint, boolean];

  const currentAttempts = Array.isArray(res) ? res[0] : res.currentAttempts;
  const lastAttemptTimeBigInt = Array.isArray(res) ? res[1] : res.lastAttemptTime;
  const isCertified = Array.isArray(res) ? res[2] : res.isCertified;

  const lastAttemptTime = Number(lastAttemptTimeBigInt);
  const nowSec = Math.floor(Date.now() / 1000);
  const cooldownUntil = lastAttemptTime > 0 ? lastAttemptTime + COOLDOWN_PERIOD_SECONDS : 0;
  const isCooldownActive = !isCertified && cooldownUntil > nowSec;
  const remainingMs = isCooldownActive ? (cooldownUntil - nowSec) * 1000 : 0;

  return {
    currentAttempts: Number(currentAttempts),
    lastAttemptTime,
    isCertified,
    isCooldownActive,
    cooldownUntil,
    remainingMs,
  };
}

