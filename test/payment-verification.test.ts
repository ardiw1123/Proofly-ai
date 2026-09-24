import { describe, it } from 'node:test';
import { expect } from 'chai';
import { isTxHashUsed, recordUsedTxHash, getAttemptCooldown, recordAttempt } from '../src/lib/assessment-store';
import { generateRequestSchema } from '../src/lib/schemas';
import { BOT_CHAIN_ID, CONTRACT_ADDRESS, ASSESSMENT_FEE_WEI, COOLDOWN_PERIOD_SECONDS } from '../src/lib/contract';

describe('Server-Side Assessment Payment & Store Logic', () => {
  it('should enforce contract constants and chain configuration', () => {
    expect(BOT_CHAIN_ID).to.equal(968);
    expect(CONTRACT_ADDRESS.toLowerCase()).to.equal('0x9EBe0474c229878dfb64D3D0AE628D6B01B5585B'.toLowerCase());
    expect(ASSESSMENT_FEE_WEI.toString()).to.equal('1000000000000000000');
    expect(COOLDOWN_PERIOD_SECONDS).to.equal(86400);
  });

  it('should validate generate request schemas with txHash requirement', () => {
    // Missing txHash
    const invalidNoTx = generateRequestSchema.safeParse({
      walletAddress: '0xd109648075DC72F2ADCFeA5b5869cd75188Ba294',
      skillId: 1,
    });
    expect(invalidNoTx.success).to.equal(false);

    // Invalid txHash format
    const invalidHash = generateRequestSchema.safeParse({
      walletAddress: '0xd109648075DC72F2ADCFeA5b5869cd75188Ba294',
      skillId: 1,
      txHash: '0xinvalid',
    });
    expect(invalidHash.success).to.equal(false);

    // Valid request
    const valid = generateRequestSchema.safeParse({
      walletAddress: '0xd109648075DC72F2ADCFeA5b5869cd75188Ba294',
      skillId: 1,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });
    expect(valid.success).to.equal(true);
  });

  it('should prevent replay of consumed transaction hashes', () => {
    const dummyHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(isTxHashUsed(dummyHash)).to.equal(false);

    recordUsedTxHash(dummyHash, {
      walletAddress: '0xd109648075DC72F2ADCFeA5b5869cd75188Ba294',
      skillId: 1,
    });

    expect(isTxHashUsed(dummyHash)).to.equal(true);
    expect(isTxHashUsed(dummyHash.toUpperCase())).to.equal(true);
  });

  it('should track cooldowns per (wallet, skillId) without cross-track blocking', () => {
    const wallet = '0x1111111111111111111111111111111111111111';

    // Before attempt
    const beforeTrack1 = getAttemptCooldown(wallet, 1);
    expect(beforeTrack1.active).to.equal(false);

    // Record attempt for Track 1 (SQL)
    recordAttempt(wallet, 1);

    // Track 1 should now be in cooldown
    const afterTrack1 = getAttemptCooldown(wallet, 1);
    expect(afterTrack1.active).to.equal(true);
    expect(afterTrack1.cooldownUntil).to.be.greaterThan(0);

    // Track 2 (Python) should NOT be blocked
    const track2 = getAttemptCooldown(wallet, 2);
    expect(track2.active).to.equal(false);
  });
});
