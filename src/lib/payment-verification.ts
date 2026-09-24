import { decodeFunctionData, parseEther, type Address, type Hash } from 'viem';
import { CONTRACT_ADDRESS, getPublicClient, proofOfSkillAbi } from './contract';
import { isTxHashUsed, recordUsedTxHash } from './assessment-store';

export interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Verifies that a transaction hash represents a valid, confirmed, and unspent
 * assessment fee payment on BOT Chain testnet.
 *
 * Security & Anti-Replay Enforcements:
 * 1. Checks anti-replay memory store to ensure the txHash has not been used previously.
 * 2. Fetches transaction and receipt from BOT Chain testnet RPC node.
 * 3. Confirms the transaction succeeded on-chain (receipt.status === 'success').
 * 4. Confirms destination address matches NEXT_PUBLIC_CONTRACT_ADDRESS.
 * 5. Confirms sender address matches the candidate wallet address (case-insensitive).
 * 6. Confirms payment value is at least 1 BOT (1e18 wei).
 * 7. Decodes transaction calldata to verify that `startAssessment(skillId)` was called
 *    and that the target skill track matches `skillId`.
 * 8. Records the txHash as used in the store so it cannot be replayed.
 *
 * Architectural Limitations & Production Hardening Notes:
 * - RPC Dependency: Relies on the configured BOT Chain RPC node availability and accuracy.
 *   If the RPC is unreachable or desynchronized, verification will fail-safe (reject).
 * - In-Memory Storage: Used transaction hashes and attempt records currently live in an in-memory Map
 *   (cached on globalThis to survive Next.js development hot-reloads). In a horizontally scaled
 *   or multi-instance production environment, this MUST be backed by a persistent shared store
 *   such as Redis, DynamoDB, or PostgreSQL to prevent cross-instance replay attacks and data loss on server restarts.
 * - Reorganization / Finality: For higher security in production, the server could wait for multiple block
 *   confirmations before accepting the transaction.
 */
export async function verifyAssessmentPayment({
  txHash,
  walletAddress,
  skillId,
}: {
  txHash: Hash;
  walletAddress: Address;
  skillId: number;
}): Promise<PaymentVerificationResult> {
  const normalizedTxHash = txHash.trim().toLowerCase() as Hash;
  const normalizedWallet = walletAddress.trim().toLowerCase();

  // 1. Anti-replay check
  if (isTxHashUsed(normalizedTxHash)) {
    return {
      valid: false,
      statusCode: 409,
      error: 'This transaction hash has already been used for an assessment attempt.',
    };
  }

  const client = getPublicClient();

  // 2. Fetch transaction and receipt from RPC
  let tx;
  let receipt;
  try {
    [tx, receipt] = await Promise.all([
      client.getTransaction({ hash: normalizedTxHash }),
      client.getTransactionReceipt({ hash: normalizedTxHash }),
    ]);
  } catch {
    return {
      valid: false,
      statusCode: 400,
      error: 'Transaction could not be retrieved from BOT Chain testnet. Please verify the hash and confirmation status.',
    };
  }

  if (!tx || !receipt) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Transaction or receipt not found on BOT Chain testnet.',
    };
  }

  // 3. Status check
  if (receipt.status !== 'success') {
    return {
      valid: false,
      statusCode: 400,
      error: 'Transaction failed or was reverted on BOT Chain testnet.',
    };
  }

  // 4. Contract destination check
  if (!tx.to || tx.to.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
    return {
      valid: false,
      statusCode: 400,
      error: `Transaction was not sent to the ProofOfSkill contract (expected ${CONTRACT_ADDRESS}, got ${tx.to ?? 'none'}).`,
    };
  }

  // 5. Sender wallet check
  if (tx.from.toLowerCase() !== normalizedWallet) {
    return {
      valid: false,
      statusCode: 403,
      error: 'Transaction sender does not match the candidate wallet address.',
    };
  }

  // 6. Payment value check (1 BOT = 1e18 wei)
  const EXPECTED_FEE = parseEther('1');
  if (tx.value < EXPECTED_FEE) {
    return {
      valid: false,
      statusCode: 400,
      error: `Incorrect payment value: sent ${tx.value.toString()} wei, required ${EXPECTED_FEE.toString()} wei (1 BOT).`,
    };
  }

  // 7. Calldata verification: function must be startAssessment(uint8 skillId)
  try {
    const decoded = decodeFunctionData({
      abi: proofOfSkillAbi,
      data: tx.input,
    });

    if (decoded.functionName !== 'startAssessment') {
      return {
        valid: false,
        statusCode: 400,
        error: `Invalid contract method: expected 'startAssessment', got '${decoded.functionName}'.`,
      };
    }

    if (!decoded.args || decoded.args.length === 0) {
      return {
        valid: false,
        statusCode: 400,
        error: 'Missing arguments in startAssessment transaction call.',
      };
    }

    const calledSkillId = Number(decoded.args[0]);
    if (calledSkillId !== skillId) {
      return {
        valid: false,
        statusCode: 400,
        error: `Transaction was registered for skill track #${calledSkillId}, not #${skillId}.`,
      };
    }
  } catch {
    return {
      valid: false,
      statusCode: 400,
      error: 'Failed to decode transaction calldata for ProofOfSkill contract.',
    };
  }

  // 8. Record txHash as consumed so it cannot be re-used
  recordUsedTxHash(normalizedTxHash, {
    walletAddress: normalizedWallet,
    skillId,
    timestamp: Date.now(),
  });

  return { valid: true };
}
