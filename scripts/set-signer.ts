import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { botChain, CONTRACT_ADDRESS, proofOfSkillAbi } from '../src/lib/contract';

/**
 * Utility script for the contract owner to separate the backend AI signer
 * from the owner wallet on BOT Chain Mainnet without redeploying.
 *
 * Usage:
 *   NEW_SIGNER_ADDRESS=0x... DEPLOYER_PRIVATE_KEY=0x... npx tsx scripts/set-signer.ts
 */
async function main() {
  const newSigner = process.env.NEW_SIGNER_ADDRESS;
  const ownerPk = process.env.DEPLOYER_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY;

  if (!newSigner || !ownerPk) {
    console.error('Error: NEW_SIGNER_ADDRESS and DEPLOYER_PRIVATE_KEY must be provided as environment variables.');
    process.exit(1);
  }

  const formattedPk = (ownerPk.startsWith('0x') ? ownerPk : `0x${ownerPk}`) as `0x${string}`;
  const account = privateKeyToAccount(formattedPk);
  const client = createWalletClient({
    account,
    chain: botChain,
    transport: http(),
  });

  console.log(`Setting AI signer address on contract ${CONTRACT_ADDRESS} to ${newSigner} using owner ${account.address}...`);

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    abi: proofOfSkillAbi,
    functionName: 'setAiSignerAddress',
    args: [newSigner as `0x${string}`],
  });

  console.log(`Transaction submitted: ${txHash}`);
  console.log(`Explorer: ${botChain.blockExplorers.default.url}/tx/${txHash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
